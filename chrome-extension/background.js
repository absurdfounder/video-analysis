importScripts('classify.js');

const STORAGE_DEFAULTS = {
  channelUrl: 'https://www.youtube.com/@delhifruitmarket/videos',
  knownVideoIds: [],
  processedVideoIds: [],
  pollIntervalMinutes: 360,
  notificationsEnabled: true,
  lastPollAt: null,
};

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadChannelSettings();
  await schedulePoll(settings.pollIntervalMinutes);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pollChannel') return;
  await checkForNewVideosBackground();
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html#pending') });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'api') return false;
  handleApi(message.path, message.body || {})
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
  return true;
});

async function handleApi(path, body) {
  if (path === '/api/status') return status();
  if (path === '/api/list-videos') return listVideos(body);
  if (path === '/api/transcript') return transcript(body);
  if (path === '/api/extract-prices') return extractPrices(body);
  if (path === '/api/extract-prices-ai') return extractPricesAi(body);
  if (path === '/api/classify-videos') return classifyVideos(body);
  if (path === '/api/check-new-videos') return checkNewVideos(body);
  if (path === '/api/channel-settings') return channelSettings(body);
  if (path === '/api/mark-processed') return markProcessed(body);
  return { ok: false, error: `Unknown extension API route: ${path}` };
}

function status() {
  return {
    ok: true,
    extensionMode: true,
    ytdlpVersion: 'not needed in Chrome extension',
    youtubeCookiesConfigured: true,
    openaiConfigured: false,
    note: 'Chrome extension mode uses your browser YouTube session instead of Netlify/yt-dlp.',
    features: ['classify-videos', 'check-new-videos', 'channel-watch'],
  };
}

async function loadChannelSettings() {
  const stored = await chrome.storage.local.get(STORAGE_DEFAULTS);
  return { ...STORAGE_DEFAULTS, ...stored };
}

async function saveChannelSettings(patch) {
  const current = await loadChannelSettings();
  const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const next = { ...current, ...clean };
  await chrome.storage.local.set(next);
  return next;
}

async function schedulePoll(intervalMinutes) {
  const minutes = Math.max(30, Math.min(Number(intervalMinutes) || 360, 24 * 60));
  await chrome.alarms.clear('pollChannel');
  await chrome.alarms.create('pollChannel', { periodInMinutes: minutes });
  return minutes;
}

function pendingCount(settings, videos = []) {
  const processed = new Set(settings.processedVideoIds || []);
  const fromVideos = videos.filter(video => video?.id && !processed.has(video.id) && isProcessableVideo(video));
  const fromKnown = (settings.knownVideoIds || []).filter(id => !processed.has(id));
  return Math.max(fromVideos.length, fromKnown.length);
}

async function updateActionBadge(settings, extraPending = 0) {
  const count = Math.max(0, (settings.knownVideoIds || []).length - (settings.processedVideoIds || []).length, extraPending);
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(Math.min(count, 99)) });
    await chrome.action.setBadgeBackgroundColor({ color: '#b43b3b' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
  return count;
}

async function notifyNewVideos(newVideos, settings) {
  if (!settings.notificationsEnabled || !newVideos.length) return;
  const title = newVideos.length === 1
    ? '1 new mandi video'
    : `${newVideos.length} new mandi videos`;
  const message = newVideos.slice(0, 2).map(video => video.title).join(' · ').slice(0, 180);
  await chrome.notifications.create(`new-videos-${Date.now()}`, {
    type: 'basic',
    title,
    message: message || 'Open the extension to classify and process.',
  });
}

function enrichVideos(videos, settings, { markNew = false } = {}) {
  const known = new Set(settings.knownVideoIds || []);
  const processed = new Set(settings.processedVideoIds || []);
  return videos.map(video => {
    const classified = applyClassification(
      {
        ...video,
        relevance: video.relevance || 'unclassified',
        relevanceCategory: video.relevanceCategory || '',
        relevanceScore: video.relevanceScore || 0,
        relevanceReason: video.relevanceReason || '',
        relevanceSource: video.relevanceSource || '',
      },
      video.relevance && video.relevance !== 'unclassified'
        ? {
            relevance: video.relevance,
            relevanceCategory: video.relevanceCategory,
            relevanceScore: video.relevanceScore,
            relevanceReason: video.relevanceReason,
            relevanceSource: video.relevanceSource,
          }
        : classifyByTitle(video.title),
    );
    return {
      ...classified,
      isNew: markNew ? !known.has(video.id) : Boolean(video.isNew),
      needsWork: !processed.has(video.id) && isProcessableVideo(classified),
    };
  });
}

async function classifyVideos(body) {
  const items = Array.isArray(body.videos) ? body.videos : [];
  if (!items.length) return { ok: false, error: 'No videos to classify.' };

  const apiKey = safeText(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const result = apiKey
    ? await classifyVideosWithAi(items, apiKey, model, classifyCallOpenAI)
    : { videos: classifyVideosHeuristic(items), aiUsed: false, counts: countRelevance(classifyVideosHeuristic(items)) };

  return { ok: true, ...result };
}

async function classifyCallOpenAI({ apiKey, model, system, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed: ${response.status}`);
  return extractJson(data?.choices?.[0]?.message?.content || '');
}

async function checkNewVideos(body = {}) {
  const settings = await loadChannelSettings();
  const channelUrl = normalizeChannelUrl(body.channelUrl || settings.channelUrl);
  const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || 15), 50));
  const listed = await listVideos({ channelUrl, maxVideos });
  if (!listed.ok) return listed;

  const known = new Set(settings.knownVideoIds || []);
  const newVideos = listed.videos.filter(video => !known.has(video.id));
  const enriched = enrichVideos(listed.videos, settings, { markNew: true });
  const nextKnown = [...new Set([...(settings.knownVideoIds || []), ...listed.videos.map(video => video.id)])];

  const nextSettings = await saveChannelSettings({
    channelUrl,
    knownVideoIds: nextKnown,
    lastPollAt: new Date().toISOString(),
    pollIntervalMinutes: Number(body.pollIntervalMinutes || settings.pollIntervalMinutes),
    notificationsEnabled: body.notificationsEnabled ?? settings.notificationsEnabled,
  });

  if (body.pollIntervalMinutes) await schedulePoll(nextSettings.pollIntervalMinutes);
  if (newVideos.length) await notifyNewVideos(newVideos, nextSettings);
  const badge = await updateActionBadge(nextSettings);

  return {
    ok: true,
    newCount: newVideos.length,
    newVideos: enrichVideos(newVideos, settings, { markNew: true }),
    videos: enriched,
    pendingCount: badge,
    lastPollAt: nextSettings.lastPollAt,
  };
}

async function checkForNewVideosBackground() {
  try {
    await checkNewVideos({});
  } catch (error) {
    console.warn('Channel poll failed:', error);
  }
}

async function channelSettings(body = {}) {
  const method = body.method || 'get';
  if (method === 'set') {
    const next = await saveChannelSettings({
      channelUrl: body.channelUrl ? normalizeChannelUrl(body.channelUrl) : undefined,
      pollIntervalMinutes: body.pollIntervalMinutes,
      notificationsEnabled: body.notificationsEnabled,
    });
    if (body.pollIntervalMinutes) await schedulePoll(next.pollIntervalMinutes);
    const badge = await updateActionBadge(next);
    return { ok: true, settings: next, pendingCount: badge };
  }

  const settings = await loadChannelSettings();
  const badge = await updateActionBadge(settings);
  return { ok: true, settings, pendingCount: badge };
}

async function markProcessed(body) {
  const ids = Array.isArray(body.videoIds) ? body.videoIds.filter(Boolean) : [];
  const settings = await loadChannelSettings();
  const nextProcessed = [...new Set([...(settings.processedVideoIds || []), ...ids])];
  const next = await saveChannelSettings({ processedVideoIds: nextProcessed });
  const badge = await updateActionBadge(next);
  return { ok: true, processedVideoIds: next.processedVideoIds, pendingCount: badge };
}

async function listVideos(body) {
  const channelUrl = normalizeChannelUrl(body.channelUrl);
  const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || 25), 100));
  if (!/^https?:\/\//i.test(channelUrl) || !/(youtube\.com|youtu\.be)/i.test(channelUrl)) {
    return { ok: false, error: 'Please enter a valid YouTube channel/video/playlist URL.' };
  }

  let html = '';
  let initialData = null;
  let scrapeError = '';

  try {
    html = await fetchText(channelUrl);
    initialData = extractJsonObject(html, 'ytInitialData');
  } catch (error) {
    scrapeError = cleanError(error);
  }

  const videos = [];
  if (initialData) collectVideos(initialData, videos);

  if (!videos.length && html) {
    try {
      const rssVideos = await listVideosFromRss(html, initialData, maxVideos);
      videos.push(...rssVideos);
    } catch (error) {
      scrapeError = scrapeError || cleanError(error);
    }
  }

  const seen = new Set();
  const unique = videos
    .filter(video => {
      if (!video.id || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    })
    .slice(0, maxVideos)
    .map(video => ({
      id: video.id,
      title: video.title || video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      upload_date: video.upload_date || '',
      duration: video.duration || '',
      channel: video.channel || '',
      status: 'pending',
      language: '',
      transcriptText: '',
      segments: [],
      error: '',
      relevance: 'unclassified',
      relevanceCategory: '',
      relevanceScore: 0,
      relevanceReason: '',
      relevanceSource: '',
      isNew: false,
      needsWork: true,
    }));

  const settings = await loadChannelSettings();
  const enriched = enrichVideos(unique, settings, { markNew: true });
  const skippedIds = enriched.filter(video => video.status === 'skipped').map(video => video.id);
  const nextKnown = [...new Set([...(settings.knownVideoIds || []), ...enriched.map(video => video.id)])];
  const nextProcessed = [...new Set([...(settings.processedVideoIds || []), ...skippedIds])];
  await saveChannelSettings({ channelUrl, knownVideoIds: nextKnown, processedVideoIds: nextProcessed });
  await updateActionBadge({ ...settings, knownVideoIds: nextKnown, processedVideoIds: nextProcessed });

  if (!enriched.length) {
    return {
      ok: false,
      error: scrapeError
        || 'Found 0 videos. Open youtube.com in this Chrome profile, confirm you are signed in, then retry. YouTube may have changed its page layout.',
    };
  }

  return { ok: true, count: enriched.length, videos: enriched };
}

async function transcript(body) {
  const videoUrl = safeText(body.videoUrl || body.url);
  const id = safeText(body.id || getVideoId(videoUrl));
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  if (!/^https?:\/\//i.test(videoUrl)) return { ok: false, error: 'Invalid video URL.' };

  let result = null;
  try {
    result = await fetchTranscriptInYouTubeTab(videoUrl, id, languages);
  } catch (tabError) {
    try {
      result = await fetchTranscriptFromHtml(videoUrl, id, languages);
    } catch (fallbackError) {
      return {
        ok: false,
        id,
        error: `${tabError.message || tabError}. Open youtube.com in this Chrome profile, sign in, play the video once, then retry.`,
      };
    }
  }

  if (!result?.ok) {
    return { ok: false, id, error: result?.error || 'Transcript fetch failed.' };
  }

  const segments = result.segments || [];
  const transcriptText = segments.map(segment => segment.text).join(' ');

  return {
    ok: true,
    id,
    language: result.language || 'unknown',
    fileName: result.fileName || 'caption',
    segmentCount: segments.length,
    transcriptText,
    segments,
    method: result.method || 'youtube-tab',
  };
}

async function fetchTranscriptFromHtml(videoUrl, id, languages) {
  const html = await fetchText(videoUrl);
  const player = extractJsonObject(html, 'ytInitialPlayerResponse');
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) throw new Error('No caption tracks in page HTML.');

  const selected = chooseCaptionTrack(tracks, languages);
  const captionUrl = withCaptionFormat(selected.baseUrl);
  const vtt = await fetchText(captionUrl);
  const segments = parseVtt(vtt);
  if (!segments.length) throw new Error('Caption file was empty or unreadable.');

  return {
    ok: true,
    language: selected.languageCode || 'unknown',
    fileName: selected.name?.simpleText || selected.languageCode || 'caption',
    segments,
    method: 'html-fallback',
  };
}

function extractPrices(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const rows = [];
  for (const item of items) rows.push(...extractPricesFromSegments(item));
  return { ok: true, count: rows.length, rows };
}

async function extractPricesAi(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const apiKey = safeText(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || items.length || 1), 100));
  const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 10000), 20000));
  if (!apiKey) return { ok: false, error: 'OpenAI API key required in extension mode.' };

  const rows = [];
  for (const item of items.slice(0, maxVideos)) {
    const chunks = chunkSegments(item.segments || [], maxCharsPerCall);
    for (let i = 0; i < chunks.length; i++) {
      const segmentText = chunks[i].map(seg => `[${Math.floor(Number(seg.start) || 0)}s | ${secondsToClock(seg.start)}] ${safeText(seg.text)}`).join('\n');
      const prompt = [
        `Video title: ${item.title || ''}`,
        `Video URL: ${item.url || ''}`,
        `Upload date if known: ${item.upload_date || ''}`,
        `Chunk ${i + 1} of ${chunks.length}`,
        '',
        'Transcript segments:',
        segmentText,
      ].join('\n');
      const json = await callOpenAI({ apiKey, model, prompt });
      for (const raw of Array.isArray(json.rows) ? json.rows : []) {
        const min = normalizeNumeric(raw.min_price_inr);
        const max = normalizeNumeric(raw.max_price_inr);
        const timestamp = normalizeNumeric(raw.timestamp_seconds);
        if (min === '' || max === '' || timestamp === '') continue;
        rows.push(withLinks({
          fruit: safeText(raw.fruit),
          fruit_hindi: safeText(raw.fruit_hindi),
          variety: safeText(raw.variety),
          unit: safeText(raw.unit) || 'unknown',
          min_price_inr: Math.min(min, max),
          max_price_inr: Math.max(min, max),
          market_name: safeText(raw.market_name),
          confidence: ['high', 'medium', 'low'].includes(String(raw.confidence).toLowerCase()) ? String(raw.confidence).toLowerCase() : 'low',
          original_line: safeText(raw.original_line),
          clean_hindi_line: safeText(raw.clean_hindi_line),
          context: safeText(raw.context),
          notes: safeText(raw.notes),
          source: 'ai',
        }, item, timestamp));
      }
    }
  }
  return { ok: true, count: rows.length, rows: dedupeRows(rows) };
}

let cachedYouTubeTabId = null;

function isYouTubeUrl(url) {
  return /(youtube\.com|youtu\.be|googlevideo\.com)/i.test(String(url || ''));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTabComplete(tabId, timeoutMs = 20000, expectedVideoId = '') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') {
      if (!expectedVideoId || String(tab.url || '').includes(expectedVideoId)) return tab;
    }
    await sleep(250);
  }
  throw new Error('YouTube tab took too long to load.');
}

async function ensureYouTubeTab() {
  if (cachedYouTubeTabId) {
    try {
      const tab = await chrome.tabs.get(cachedYouTubeTabId);
      if (tab?.id) return cachedYouTubeTabId;
    } catch {
      cachedYouTubeTabId = null;
    }
  }

  const tab = await chrome.tabs.create({
    url: 'https://www.youtube.com/',
    active: false,
    muted: true,
  });
  cachedYouTubeTabId = tab.id;
  await waitForTabComplete(cachedYouTubeTabId, 25000);
  try {
    await chrome.tabs.update(cachedYouTubeTabId, { muted: true });
  } catch {
    cachedYouTubeTabId = null;
  }
  return cachedYouTubeTabId;
}

async function navigateYouTubeTabQuietly(tabId, videoUrl, videoId) {
  await chrome.tabs.update(tabId, { url: videoUrl, active: false, muted: true });
  await waitForTabComplete(tabId, 30000, videoId);
  try {
    await chrome.tabs.update(tabId, { muted: true });
  } catch {
    // Tab may have closed; caller will handle fetch errors.
  }
}

async function runInYouTubeTab(func, args = []) {
  const tabId = await ensureYouTubeTab();
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func,
    args,
  });
  return result;
}

async function fetchTextViaYouTubeTab(url) {
  const result = await runInYouTubeTab(async (fetchUrl) => {
    try {
      const response = await fetch(fetchUrl, { credentials: 'include' });
      const text = await response.text();
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}`, preview: text.slice(0, 180) };
      return { ok: true, text };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }, [url]);

  if (!result?.ok) {
    throw new Error(result?.error || 'YouTube tab fetch failed. Open youtube.com and sign in.');
  }
  return result.text;
}

async function fetchTranscriptInYouTubeTab(videoUrl, videoId, languages) {
  const tabId = await ensureYouTubeTab();
  await navigateYouTubeTabQuietly(tabId, videoUrl, videoId);

  const result = await runInYouTubeTab(fetchTranscriptInPageContext, [videoId, languages]);
  if (!result?.ok) {
    throw new Error(result?.error || 'Failed to fetch transcript in YouTube tab.');
  }
  return result;
}

function fetchTranscriptInPageContext(expectedVideoId, languages) {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function mutePlayer() {
    const video = document.querySelector('video');
    if (!video) return false;
    video.muted = true;
    video.volume = 0;
    return true;
  }

  function readBalancedJson(text, start) {
    let depth = 0;
    let inString = false;
    let quote = '';
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) inString = false;
        continue;
      }
      if (char === '"' || char === "'") {
        inString = true;
        quote = char;
      } else if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return '';
  }

  function parsePlayerFromScripts() {
    if (window.ytInitialPlayerResponse?.videoDetails?.videoId) {
      return { player: window.ytInitialPlayerResponse, method: 'window' };
    }

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      const markerIndex = text.indexOf('ytInitialPlayerResponse');
      if (markerIndex === -1) continue;
      const brace = text.indexOf('{', markerIndex);
      if (brace === -1) continue;
      const json = readBalancedJson(text, brace);
      if (!json) continue;
      try {
        const player = JSON.parse(json);
        if (player?.videoDetails?.videoId) return { player, method: 'script-tag' };
      } catch {
        continue;
      }
    }

    const html = document.documentElement?.outerHTML || '';
    const markerIndex = html.indexOf('ytInitialPlayerResponse');
    if (markerIndex !== -1) {
      const brace = html.indexOf('{', markerIndex);
      const json = brace === -1 ? '' : readBalancedJson(html, brace);
      if (json) {
        try {
          const player = JSON.parse(json);
          if (player?.videoDetails?.videoId) return { player, method: 'html' };
        } catch {
          // fall through
        }
      }
    }

    return null;
  }

  function chooseTrack(tracks, wantedLanguages) {
    const wanted = String(wantedLanguages || '')
      .split(',')
      .map(value => value.trim().replace('.*', '').toLowerCase())
      .filter(Boolean);
    return [...tracks].sort((a, b) => {
      const aScore = wanted.findIndex(lang => String(a.languageCode || '').toLowerCase().startsWith(lang));
      const bScore = wanted.findIndex(lang => String(b.languageCode || '').toLowerCase().startsWith(lang));
      return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
    })[0];
  }

  function vttTimeToSeconds(ts) {
    const parts = String(ts).replace(',', '.').split(':');
    if (parts.length === 3) return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
    return Number(ts) || 0;
  }

  function secondsToClock(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function stripHtml(text) {
    return String(text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseVtt(vttText) {
    const lines = String(vttText || '').replace(/\r/g, '').split('\n');
    const segments = [];
    let current = null;

    function pushCurrent() {
      if (!current || !current.textParts.length) return;
      const text = stripHtml(current.textParts.join(' '));
      if (!text) return;
      segments.push({
        start: Number(current.start.toFixed(3)),
        end: Number(current.end.toFixed(3)),
        duration: Number(Math.max(0, current.end - current.start).toFixed(3)),
        timestamp_label: secondsToClock(current.start),
        text,
      });
    }

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
      if (/^(NOTE|STYLE|REGION)\b/.test(line)) continue;
      const match = line.match(/(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
      if (match) {
        pushCurrent();
        current = { start: vttTimeToSeconds(match[1]), end: vttTimeToSeconds(match[2]), textParts: [] };
      } else if (current && !/^\d+$/.test(line)) {
        current.textParts.push(line);
      }
    }
    pushCurrent();
    return segments.filter((seg, index) => seg.text && (!index || seg.text !== segments[index - 1].text));
  }

  function parseXmlCaptions(xmlText) {
    const segments = [];
    const blocks = [...String(xmlText || '').matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)];
    for (const block of blocks) {
      const attrs = block[1] || '';
      const start = Number((attrs.match(/\bstart="([^"]+)"/) || [])[1] || 0);
      const duration = Number((attrs.match(/\bdur="([^"]+)"/) || [])[1] || 0);
      const text = stripHtml(block[2] || '');
      if (!text) continue;
      const end = start + duration;
      segments.push({
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        duration: Number(Math.max(0, duration).toFixed(3)),
        timestamp_label: secondsToClock(start),
        text,
      });
    }
    return segments;
  }

  async function fetchCaptionSegments(track) {
    const baseUrl = track?.baseUrl;
    if (!baseUrl) throw new Error('Caption track has no URL.');

    const vttUrl = new URL(baseUrl);
    vttUrl.searchParams.set('fmt', 'vtt');
    const vttResponse = await fetch(vttUrl.toString(), { credentials: 'include' });
    const vttText = await vttResponse.text();
    let segments = parseVtt(vttText);
    if (segments.length) return { segments, format: 'vtt' };

    const xmlResponse = await fetch(baseUrl, { credentials: 'include' });
    const xmlText = await xmlResponse.text();
    segments = parseXmlCaptions(xmlText);
    if (segments.length) return { segments, format: 'xml' };

    throw new Error(`Caption download failed (HTTP ${vttResponse.status || xmlResponse.status || 'unknown'}).`);
  }

  function parseClockLabel(label) {
    const parts = String(label || '').trim().split(':').map(Number);
    if (parts.some(part => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function findClickableByText(patterns) {
    const nodes = document.querySelectorAll('button, yt-button-shape button, tp-yt-paper-button, a, span, yt-formatted-string');
    for (const node of nodes) {
      const text = (node.textContent || node.getAttribute('aria-label') || '').trim();
      if (!text) continue;
      if (patterns.some(pattern => pattern.test(text))) return node;
    }
    return null;
  }

  function findTranscriptButton() {
    const selectors = [
      'ytd-video-description-transcript-section-renderer button',
      'ytd-video-description-transcript-section-renderer yt-button-shape button',
      'button[aria-label="Show transcript"]',
      'button[aria-label*="transcript" i]',
      'button[aria-label*="Transcript" i]',
      'button[aria-label*="प्रतिलिपि" i]',
      'button[aria-label*="ट्रांसक्रिप्ट" i]',
    ];
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    return findClickableByText([/show transcript/i, /transcript/i, /प्रतिलिपि/i, /ट्रांसक्रिप्ट/i]);
  }

  function forceTranscriptPanelOpen() {
    const panels = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
    for (const panel of panels) {
      const targetId = panel.getAttribute('target-id') || '';
      if (targetId.includes('transcript')) {
        panel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
      }
    }
  }

  async function openTranscriptPanel() {
    mutePlayer();
    const moreButton = document.querySelector('#expand, ytd-text-inline-expander #expand, tp-yt-paper-button#expand')
      || findClickableByText([/^\.\.\.more$/i, /^…more$/i, /^show more$/i, /^और दिखाएं$/i]);
    if (moreButton) {
      moreButton.click();
      await sleep(900);
    }

    const transcriptButton = findTranscriptButton();
    if (transcriptButton) {
      transcriptButton.click();
      await sleep(1200);
    }

    forceTranscriptPanelOpen();
    await sleep(800);
  }

  function extractSegmentsFromDom() {
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      'transcript-segment-view-model',
      'ytd-transcript-segment-list-renderer .segment',
    ];

    let nodes = [];
    for (const selector of segmentSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length) {
        nodes = [...found];
        break;
      }
    }

    if (!nodes.length) {
      const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]');
      if (panel) {
        const textNodes = panel.querySelectorAll('.segment-text, yt-formatted-string.segment-text');
        const timestampNodes = panel.querySelectorAll('.segment-timestamp, .segment-start-offset');
        if (textNodes.length) {
          const segments = [];
          const count = Math.max(textNodes.length, timestampNodes.length);
          for (let i = 0; i < count; i++) {
            const text = stripHtml(textNodes[i]?.textContent || '');
            const start = parseClockLabel(timestampNodes[i]?.textContent || `${i}`);
            if (!text) continue;
            segments.push({
              start: Number(start.toFixed(3)),
              end: Number(start.toFixed(3)),
              duration: 0,
              timestamp_label: secondsToClock(start),
              text,
            });
          }
          return segments;
        }
      }
      return [];
    }

    const segments = [];
    for (const node of nodes) {
      const timestampEl = node.querySelector('.segment-timestamp, .segment-start-offset, [class*="timestamp"]');
      const textEl = node.querySelector('.segment-text, yt-formatted-string.segment-text, yt-formatted-string');
      const text = stripHtml(textEl?.textContent || '');
      const start = parseClockLabel(timestampEl?.textContent || '');
      if (!text || (timestampEl && text === stripHtml(timestampEl.textContent || ''))) continue;
      segments.push({
        start: Number(start.toFixed(3)),
        end: Number(start.toFixed(3)),
        duration: 0,
        timestamp_label: secondsToClock(start),
        text,
      });
    }

    for (let i = 0; i < segments.length; i++) {
      const nextStart = segments[i + 1]?.start;
      if (Number.isFinite(nextStart) && nextStart > segments[i].start) {
        segments[i].end = Number(nextStart.toFixed(3));
        segments[i].duration = Number((segments[i].end - segments[i].start).toFixed(3));
      }
    }

    return segments;
  }

  async function fetchTranscriptFromDom() {
    await openTranscriptPanel();
    for (let attempt = 0; attempt < 30; attempt++) {
      const segments = extractSegmentsFromDom();
      if (segments.length) return { segments, format: 'dom' };
      if (attempt % 4 === 3) {
        const button = findTranscriptButton();
        if (button) button.click();
        forceTranscriptPanelOpen();
      }
      await sleep(500);
    }
    return null;
  }

  async function fetchViaInnerTube(player) {
    const params = player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams
      || player?.engagementPanels
        ?.map(panel => panel?.engagementPanelSectionListRenderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint?.params)
        .find(Boolean);

    if (!params) return null;

    const apiKey = window.ytcfg?.data_?.INNERTUBE_API_KEY
      || window.ytcfg?.get?.('INNERTUBE_API_KEY')
      || '';
    const clientVersion = window.ytcfg?.data_?.INNERTUBE_CLIENT_VERSION
      || window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION')
      || '2.20260101.00.00';

    if (!apiKey) return null;

    const response = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion,
          },
        },
        params,
      }),
    });

    const data = await response.json().catch(() => null);
    const cues = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups
      || [];

    const segments = [];
    for (const group of cues) {
      for (const cue of group?.transcriptCueGroupRenderer?.cues || []) {
        const renderer = cue?.transcriptCueRenderer;
        const text = stripHtml(renderer?.cue?.simpleText || '');
        const startMs = Number(renderer?.startOffsetMs || renderer?.startMs || 0);
        if (!text) continue;
        const start = startMs / 1000;
        const duration = Number(renderer?.durationMs || 0) / 1000;
        const end = start + duration;
        segments.push({
          start: Number(start.toFixed(3)),
          end: Number(end.toFixed(3)),
          duration: Number(Math.max(0, duration).toFixed(3)),
          timestamp_label: secondsToClock(start),
          text,
        });
      }
    }

    return segments.length ? { segments, format: 'innertube' } : null;
  }

  return (async () => {
    mutePlayer();

    let playerResult = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (attempt % 3 === 0) mutePlayer();
      playerResult = parsePlayerFromScripts();
      if (playerResult?.player?.videoDetails?.videoId === expectedVideoId) break;
      await sleep(500);
    }

    if (!playerResult?.player) {
      return { ok: false, error: 'YouTube player data not ready. Keep youtube.com open, sign in, and retry.' };
    }

    if (playerResult.player.videoDetails?.videoId !== expectedVideoId) {
      return {
        ok: false,
        error: `Loaded wrong video in YouTube tab (${playerResult.player.videoDetails?.videoId || 'unknown'}). Retry transcript fetch.`,
      };
    }

    const tracks = playerResult.player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    const domResult = await fetchTranscriptFromDom();
    if (domResult?.segments?.length) {
      return {
        ok: true,
        language: chooseTrack(tracks, languages)?.languageCode || 'unknown',
        fileName: 'youtube-transcript-panel',
        segments: domResult.segments,
        method: `panel-${domResult.format}`,
      };
    }

    if (!tracks.length) {
      const innerTube = await fetchViaInnerTube(playerResult.player);
      if (innerTube?.segments?.length) {
        return {
          ok: true,
          language: 'unknown',
          fileName: 'innertube-transcript',
          segments: innerTube.segments,
          method: `innertube-${innerTube.format}`,
        };
      }
      return { ok: false, error: 'Could not load transcript panel. Open the video on YouTube, click Show transcript manually once, then retry.' };
    }

    const selected = chooseTrack(tracks, languages);
    try {
      const captionResult = await fetchCaptionSegments(selected);
      return {
        ok: true,
        language: selected.languageCode || 'unknown',
        fileName: selected.name?.simpleText || selected.languageCode || 'caption',
        segments: captionResult.segments,
        method: `${playerResult.method}-${captionResult.format}`,
      };
    } catch (captionError) {
      const innerTube = await fetchViaInnerTube(playerResult.player);
      if (innerTube?.segments?.length) {
        return {
          ok: true,
          language: selected.languageCode || 'unknown',
          fileName: selected.name?.simpleText || selected.languageCode || 'caption',
          segments: innerTube.segments,
          method: `innertube-fallback-${innerTube.format}`,
        };
      }
      return { ok: false, error: String(captionError?.message || captionError) };
    }
  })();
}

async function fetchText(url) {
  if (isYouTubeUrl(url)) {
    try {
      return await fetchTextViaYouTubeTab(url);
    } catch (tabError) {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`${tabError.message || tabError} (HTTP ${response.status}). Open youtube.com and sign in.`);
      }
      return response.text();
    }
  }

  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.text();
}

function extractJsonObject(html, name) {
  const patterns = [`var ${name} =`, `window["${name}"] =`, `${name} =`];
  for (const pattern of patterns) {
    const start = html.indexOf(pattern);
    if (start === -1) continue;
    const brace = html.indexOf('{', start);
    if (brace === -1) continue;
    const json = readBalancedJson(html, brace);
    if (json) return JSON.parse(json);
  }
  throw new Error(`Could not find ${name} in YouTube page.`);
}

function readBalancedJson(text, start) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function normalizeChannelUrl(url) {
  const raw = safeText(url);
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes('youtube.com')) return raw;
    let pathname = parsed.pathname.replace(/\/$/, '');
    if (/^\/@[^/]+$/.test(pathname)) pathname += '/videos';
    parsed.pathname = pathname;
    parsed.searchParams.delete('shelf_id');
    parsed.searchParams.delete('view');
    parsed.searchParams.delete('sort');
    return parsed.toString();
  } catch {
    return raw;
  }
}

function extractChannelId(html, initialData) {
  const fromMeta = initialData?.metadata?.channelMetadataRenderer?.externalId;
  if (fromMeta) return fromMeta;
  const match = String(html || '').match(/"externalId":"(UC[^"]+)"/);
  return match?.[1] || '';
}

async function listVideosFromRss(html, initialData, maxVideos) {
  const channelId = extractChannelId(html, initialData);
  if (!channelId) throw new Error('Could not resolve YouTube channel ID for RSS fallback.');

  const rss = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const entries = [...String(rss).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, maxVideos);
  return entries.map(entry => {
    const block = entry[1];
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] || '';
    const title = decodeXmlEntities(block.match(/<title>([^<]*)<\/title>/)?.[1] || '');
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    return {
      id,
      title,
      upload_date: published ? published.slice(0, 10) : '',
      duration: '',
      channel: '',
    };
  }).filter(video => video.id);
}

function decodeXmlEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractPublishedFromLockup(meta) {
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const text = part.text?.content || part.accessibilityLabel || '';
      if (/(ago|hour|day|week|month|year|minute)/i.test(text)) return text;
    }
  }
  return '';
}

function collectVideos(node, out) {
  if (!node || out.length >= 150) return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out);
    return;
  }
  if (typeof node !== 'object') return;

  const lockup = node.lockupViewModel;
  if (lockup?.contentId && lockup.contentType !== 'SHORTS') {
    const meta = lockup.metadata?.lockupMetadataViewModel;
    out.push({
      id: lockup.contentId,
      title: meta?.title?.content || textFromRuns(meta?.title),
      upload_date: extractPublishedFromLockup(meta),
      duration: '',
      channel: '',
    });
  }

  const renderer = node.videoRenderer || node.gridVideoRenderer || node.compactVideoRenderer || node.playlistVideoRenderer;
  if (renderer?.videoId) {
    out.push({
      id: renderer.videoId,
      title: textFromRuns(renderer.title),
      upload_date: textFromRuns(renderer.publishedTimeText),
      duration: textFromRuns(renderer.lengthText),
      channel: textFromRuns(renderer.ownerText || renderer.shortBylineText),
    });
  }

  if (node.richItemRenderer?.content) collectVideos(node.richItemRenderer.content, out);

  for (const value of Object.values(node)) collectVideos(value, out);
}

function textFromRuns(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map(run => run.text || '').join('');
  return '';
}

function getVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.replace('/', '');
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function chooseCaptionTrack(tracks, languages) {
  const wanted = languages.split(',').map(value => value.trim().replace('.*', '').toLowerCase()).filter(Boolean);
  return [...tracks].sort((a, b) => {
    const aScore = wanted.findIndex(lang => String(a.languageCode || '').toLowerCase().startsWith(lang));
    const bScore = wanted.findIndex(lang => String(b.languageCode || '').toLowerCase().startsWith(lang));
    return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
  })[0];
}

function withCaptionFormat(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'vtt');
  return url.toString();
}

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function vttTimeToSeconds(ts) {
  const parts = String(ts).replace(',', '.').split(':');
  if (parts.length === 3) return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(ts) || 0;
}

function secondsToClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timestampUrl(videoUrl, seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const url = new URL(videoUrl);
  url.searchParams.delete('t');
  url.searchParams.set('t', `${sec}s`);
  return url.toString();
}

function parseVtt(vttText) {
  const lines = String(vttText || '').replace(/\r/g, '').split('\n');
  const segments = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(line)) continue;
    const match = line.match(/(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
    if (match) {
      pushSegment(segments, current);
      current = { start: vttTimeToSeconds(match[1]), end: vttTimeToSeconds(match[2]), textParts: [] };
    } else if (current && !/^\d+$/.test(line)) {
      current.textParts.push(line);
    }
  }
  pushSegment(segments, current);
  return segments.filter((seg, index) => seg.text && (!index || seg.text !== segments[index - 1].text));
}

function pushSegment(segments, current) {
  if (!current || !current.textParts.length) return;
  const text = stripHtml(current.textParts.join(' '));
  if (!text) return;
  segments.push({
    start: Number(current.start.toFixed(3)),
    end: Number(current.end.toFixed(3)),
    duration: Number(Math.max(0, current.end - current.start).toFixed(3)),
    timestamp_label: secondsToClock(current.start),
    text,
  });
}

const FRUITS = [
  { name: 'mango', terms: ['आम', 'mango', 'kesar', 'alphonso', 'hapus', 'dasheri', 'langra', 'chausa', 'safeda', 'totapuri'] },
  { name: 'apple', terms: ['सेब', 'apple'] },
  { name: 'banana', terms: ['केला', 'banana'] },
  { name: 'orange', terms: ['संतरा', 'orange', 'kinnow'] },
  { name: 'lychee', terms: ['लीची', 'litchi', 'lychee'] },
  { name: 'grapes', terms: ['अंगूर', 'grapes'] },
  { name: 'pomegranate', terms: ['अनार', 'pomegranate'] },
  { name: 'papaya', terms: ['पपीता', 'papaya'] },
  { name: 'guava', terms: ['अमरूद', 'guava'] },
];

function extractPricesFromSegments(item) {
  const rows = [];
  const segments = Array.isArray(item.segments) ? item.segments : [];
  for (const seg of segments) {
    const text = safeText(seg.text);
    const prices = [...text.matchAll(/(?:rs\.?|₹|रुप(?:ए|ये)?|भाव|rate|price)?\s*(\d{1,5})(?:\s*(?:-|से|to)\s*(\d{1,5}))?/gi)];
    if (!prices.length) continue;
    const fruits = detectFruits(text);
    if (!fruits.length) continue;
    for (const match of prices.slice(0, 3)) {
      const min = normalizeNumeric(match[1]);
      const max = normalizeNumeric(match[2] || match[1]);
      if (min === '' || max === '' || min <= 0 || max > 100000) continue;
      for (const fruit of fruits) {
        rows.push(withLinks({
          fruit,
          fruit_hindi: '',
          variety: '',
          unit: detectUnit(text),
          min_price_inr: Math.min(min, max),
          max_price_inr: Math.max(min, max),
          market_name: '',
          confidence: 'medium',
          original_line: text,
          clean_hindi_line: text,
          context: text,
          notes: '',
          source: 'regex',
        }, item, seg.start));
      }
    }
  }
  return dedupeRows(rows);
}

function detectFruits(text) {
  const lower = text.toLowerCase();
  return FRUITS.filter(fruit => fruit.terms.some(term => lower.includes(term.toLowerCase()))).map(fruit => fruit.name);
}

function detectUnit(text) {
  const lower = text.toLowerCase();
  if (/(किलो|kg|kilo|kilogram|प्रति किलो)/i.test(lower)) return 'kg';
  if (/(पेटी|peti|box|carton)/i.test(lower)) return 'box/peti';
  if (/(क्रेट|crate|caret)/i.test(lower)) return 'crate';
  if (/(क्विंटल|quintal|qtl)/i.test(lower)) return 'quintal';
  if (/(दर्जन|dozen)/i.test(lower)) return 'dozen';
  if (/(पीस|piece|pcs|नग)/i.test(lower)) return 'piece';
  return 'unknown';
}

function normalizeNumeric(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : '';
}

function withLinks(row, item, timestamp) {
  return {
    ...row,
    upload_date: item.upload_date || '',
    video_id: item.id || '',
    video_title: item.title || '',
    video_url: item.url || '',
    timestamp_seconds: Math.floor(Number(timestamp) || 0),
    timestamp_label: secondsToClock(timestamp),
    timestamp_url: timestampUrl(item.url, timestamp),
  };
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = [row.video_id, row.fruit, row.unit, row.min_price_inr, row.max_price_inr, row.timestamp_seconds, row.original_line].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chunkSegments(segments, maxChars) {
  const chunks = [];
  let chunk = [];
  let size = 0;
  for (const seg of segments) {
    const line = `[${Math.floor(Number(seg.start) || 0)}s] ${safeText(seg.text)}`;
    if (chunk.length && size + line.length > maxChars) {
      chunks.push(chunk);
      chunk = [];
      size = 0;
    }
    chunk.push(seg);
    size += line.length;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Extract fruit mandi/wholesale price rows from noisy Hindi captions. Return JSON only: {"rows":[{"fruit":"","fruit_hindi":"","variety":"","unit":"","min_price_inr":0,"max_price_inr":0,"market_name":"","timestamp_seconds":0,"confidence":"high|medium|low","original_line":"","clean_hindi_line":"","context":"","notes":""}]}',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed: ${response.status}`);
  return extractJson(data?.choices?.[0]?.message?.content || '');
}

function extractJson(text) {
  const start = String(text).indexOf('{');
  const end = String(text).lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('AI did not return JSON.');
  return JSON.parse(String(text).slice(start, end + 1));
}

function cleanError(error) {
  const text = safeText(error?.message || error);
  if (/sign in to confirm.*not a bot/i.test(text)) {
    return 'YouTube blocked the request. Open youtube.com in this same Chrome profile, confirm you are signed in, then retry from the extension.';
  }
  return text || 'Extension request failed.';
}
