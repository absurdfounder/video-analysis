importScripts('classify.js');

// #region agent log
async function debugLog(location, message, data, hypothesisId) {
  const payload = { sessionId: '016b85', location, message, data, hypothesisId, timestamp: Date.now(), runId: 'pre-fix' };
  try {
    await fetch('http://127.0.0.1:7637/ingest/079449d1-fbfd-42c5-8d2f-f90f056ba0f5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '016b85' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Debug server may be unavailable.
  }
  console.log('[debug]', location, message, data);
}
// #endregion

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
  await resumeTranscriptBatchIfNeeded();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const storedId = await getStoredWorkerTabId();
  if (tabId === cachedYouTubeTabId || tabId === storedId) {
    cachedYouTubeTabId = null;
    await setStoredWorkerTabId(null);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const workerId = cachedYouTubeTabId || await getStoredWorkerTabId();
  if (!workerId || tabId !== workerId) return;
  cachedYouTubeTabId = workerId;
  if (changeInfo.audible || changeInfo.status === 'complete') {
    muteWorkerTab(tabId).catch(() => {});
  }
  if (changeInfo.status === 'complete') {
    installMuteHook(tabId).catch(() => {});
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'processNextTranscript') {
    await processNextTranscriptInBatch();
    return;
  }
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
  if (path === '/api/fetch-transcripts-batch') return fetchTranscriptsBatch(body);
  if (path === '/api/transcript-batch-status') return transcriptBatchStatus();
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

const PROJECT_STATE_KEY = 'fruitTranscriptMinerStateV2';
const TRANSCRIPT_BATCH_KEY = 'transcriptBatchJob';
let batchProcessing = false;

function hasTranscriptSegments(video) {
  return Array.isArray(video?.segments) && video.segments.length > 0;
}

function isBatchProcessable(video) {
  return video?.relevance !== 'irrelevant' && video?.status !== 'skipped' && !hasTranscriptSegments(video);
}

async function loadProjectState() {
  const stored = await chrome.storage.local.get(PROJECT_STATE_KEY);
  return stored[PROJECT_STATE_KEY] || { videos: [], priceRows: [], currentStep: 1 };
}

async function saveProjectState(patch) {
  const current = await loadProjectState();
  const next = {
    ...current,
    ...patch,
    videos: patch.videos || current.videos || [],
    priceRows: patch.priceRows || current.priceRows || [],
  };
  await chrome.storage.local.set({ [PROJECT_STATE_KEY]: next });
  return next;
}

function broadcastTranscriptBatchEvent(payload) {
  chrome.runtime.sendMessage({ type: 'transcript-batch-event', ...payload }).catch(() => {});
}

async function transcriptBatchStatus() {
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  return { ok: true, job: stored[TRANSCRIPT_BATCH_KEY] || null };
}

async function fetchTranscriptsBatch(body) {
  const delayMs = Math.max(500, Number(body.delayMs || 1500));
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  const project = await loadProjectState();
  const pending = (project.videos || []).filter(isBatchProcessable);

  if (!pending.length) {
    return { ok: true, started: false, total: 0, message: 'No pending transcripts.' };
  }

  const existing = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  if (existing[TRANSCRIPT_BATCH_KEY]?.running) {
    return { ok: true, started: false, alreadyRunning: true, total: existing[TRANSCRIPT_BATCH_KEY].total || 0 };
  }

  await chrome.storage.local.set({
    [TRANSCRIPT_BATCH_KEY]: {
      running: true,
      queue: pending.map(video => video.id),
      delayMs,
      languages,
      total: pending.length,
      done: 0,
      currentId: null,
      currentTitle: null,
      startedAt: new Date().toISOString(),
    },
  });

  processNextTranscriptInBatch().catch(error => console.warn('Transcript batch failed:', error));

  return { ok: true, started: true, total: pending.length };
}

async function resumeTranscriptBatchIfNeeded() {
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  const job = stored[TRANSCRIPT_BATCH_KEY];
  if (job?.running && job.queue?.length) {
    processNextTranscriptInBatch().catch(error => console.warn('Transcript batch resume failed:', error));
  }
}

async function finishTranscriptBatch(job, doneCount) {
  await chrome.storage.local.set({
    [TRANSCRIPT_BATCH_KEY]: {
      ...job,
      running: false,
      queue: [],
      currentId: null,
      currentTitle: null,
      finishedAt: new Date().toISOString(),
    },
  });
  await saveProjectState({ currentStep: 3 });
  broadcastTranscriptBatchEvent({ event: 'complete', done: doneCount, total: job.total || doneCount });
}

async function processNextTranscriptInBatch() {
  if (batchProcessing) return;

  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  const job = stored[TRANSCRIPT_BATCH_KEY];
  if (!job?.running || !job.queue?.length) {
    if (job?.running) await finishTranscriptBatch(job, job.done || 0);
    return;
  }

  batchProcessing = true;
  const videoId = job.queue[0];
  const project = await loadProjectState();
  const videos = [...(project.videos || [])];
  const index = videos.findIndex(video => video.id === videoId);

  if (index === -1) {
    const nextJob = { ...job, queue: job.queue.slice(1), done: job.done + 1 };
    if (!nextJob.queue.length) {
      batchProcessing = false;
      await finishTranscriptBatch(nextJob, nextJob.done);
      return;
    }
    await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });
    batchProcessing = false;
    chrome.alarms.create('processNextTranscript', { when: Date.now() + job.delayMs });
    return;
  }

  const video = { ...videos[index] };
  video.status = 'running';
  video.error = '';
  videos[index] = video;

  await chrome.storage.local.set({
    [TRANSCRIPT_BATCH_KEY]: { ...job, currentId: videoId, currentTitle: video.title || videoId },
  });
  await saveProjectState({ videos, currentStep: 2 });
  broadcastTranscriptBatchEvent({ event: 'progress', videoId, status: 'running', title: video.title || videoId });

  try {
    const result = await transcript({ id: video.id, videoUrl: video.url, languages: job.languages });
    Object.assign(video, {
      status: 'ok',
      language: result.language,
      transcriptText: result.transcriptText,
      segments: result.segments || [],
      error: '',
      isNew: false,
      needsWork: false,
    });
    await markProcessed({ videoIds: [video.id] });
    broadcastTranscriptBatchEvent({
      event: 'progress',
      videoId,
      status: 'ok',
      title: video.title || videoId,
      segmentCount: result.segmentCount || video.segments.length,
      method: result.method || '',
    });
  } catch (error) {
    video.status = 'failed';
    video.error = safeText(error?.message || error).slice(0, 200);
    // #region agent log
    await debugLog('background.js:processNextTranscriptInBatch:fail', 'batch video failed', { videoId, error: video.error }, 'H5');
    // #endregion
    broadcastTranscriptBatchEvent({
      event: 'progress',
      videoId,
      status: 'failed',
      title: video.title || videoId,
      error: video.error,
    });
  }

  videos[index] = video;
  const nextQueue = job.queue.slice(1);
  const nextJob = {
    ...job,
    queue: nextQueue,
    done: job.done + 1,
    currentId: null,
    currentTitle: null,
    running: nextQueue.length > 0,
  };

  await saveProjectState({ videos, currentStep: nextQueue.length ? 2 : 3 });
  await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });
  batchProcessing = false;

  if (nextQueue.length) {
    chrome.alarms.create('processNextTranscript', { when: Date.now() + job.delayMs });
  } else {
    await finishTranscriptBatch(nextJob, nextJob.done);
  }
}

chrome.runtime.onStartup.addListener(() => {
  resumeTranscriptBatchIfNeeded().catch(() => {});
});

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
  const tabId = await ensureYouTubeTab();
  const html = await fetchText(videoUrl);
  const result = await buildTranscriptFromPlayerHtml(html, id, languages, tabId, 'html-fallback');
  return { ...result, ok: true };
}

async function fetchTranscriptInYouTubeTab(videoUrl, videoId, languages) {
  const tabId = await ensureYouTubeTab();
  // #region agent log
  await debugLog('background.js:fetchTranscriptInYouTubeTab:start', 'transcript fetch started', { videoId, tabId, videoUrl }, 'H1');
  // #endregion
  await prepareWorkerTab(tabId);
  await navigateYouTubeTabQuietly(tabId, videoUrl, videoId);

  let tabUrl = '';
  try {
    const tab = await chrome.tabs.get(tabId);
    tabUrl = tab?.url || '';
  } catch {
    tabUrl = 'tab-missing';
  }
  // #region agent log
  await debugLog('background.js:fetchTranscriptInYouTubeTab:after-nav', 'worker tab after navigation', { videoId, tabId, tabUrl, urlHasVideoId: tabUrl.includes(videoId) }, 'H1');
  // #endregion

  let lastHtml = '';
  let apiErrorMsg = '';
  try {
    lastHtml = await fetchTextViaYouTubeTab(videoUrl);
    // #region agent log
    await debugLog('background.js:fetchTranscriptInYouTubeTab:html', 'fetched watch page html', { videoId, htmlLen: lastHtml.length, hasPlayerMarker: lastHtml.includes('ytInitialPlayerResponse') }, 'H2');
    // #endregion
    const apiResult = await buildTranscriptFromPlayerHtml(lastHtml, videoId, languages, tabId, 'page-html');
    if (apiResult?.ok) {
      // #region agent log
      await debugLog('background.js:fetchTranscriptInYouTubeTab:api-ok', 'API path succeeded', { videoId, method: apiResult.method, segmentCount: apiResult.segments?.length || 0 }, 'H2');
      // #endregion
      return apiResult;
    }
  } catch (apiError) {
    apiErrorMsg = String(apiError?.message || apiError);
    // #region agent log
    await debugLog('background.js:fetchTranscriptInYouTubeTab:api-catch', 'API path threw', { videoId, error: apiErrorMsg }, 'H3');
    // #endregion
  }

  // #region agent log
  await debugLog('background.js:fetchTranscriptInYouTubeTab:panel-start', 'starting panel fallback', { videoId, tabId, priorApiError: apiErrorMsg }, 'H4');
  // #endregion
  const panelResult = await withBriefTabFocus(tabId, async () => {
    return runInYouTubeTab(fetchTranscriptFromPanelInPage, [], tabId);
  });

  // #region agent log
  await debugLog('background.js:fetchTranscriptInYouTubeTab:panel-result', 'panel fallback finished', {
    videoId,
    ok: Boolean(panelResult?.ok),
    error: panelResult?.error || '',
    segmentCount: panelResult?.segments?.length || 0,
    debug: panelResult?.debug || null,
  }, 'H4');
  // #endregion

  if (panelResult?.ok && panelResult.segments?.length) {
    return {
      ok: true,
      language: 'unknown',
      fileName: 'youtube-transcript-panel',
      segments: panelResult.segments,
      method: `panel-${panelResult.format || 'dom'}`,
    };
  }

  throw new Error(panelResult?.error || apiErrorMsg || 'Could not download captions. Stay signed in at youtube.com and retry.');
}

async function withBriefTabFocus(tabId, fn) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.update(tabId, { active: true });
    await sleep(400);
    return await fn();
  } finally {
    if (activeTab?.id && activeTab.id !== tabId) {
      try {
        await chrome.tabs.update(activeTab.id, { active: true });
      } catch {
        // Previous tab may have closed.
      }
    }
  }
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
const WORKER_TAB_KEY = 'youtubeWorkerTabId';
const WORKER_TAB_URL = 'https://www.youtube.com/?fruit_miner=worker';

async function getStoredWorkerTabId() {
  const data = await chrome.storage.local.get(WORKER_TAB_KEY);
  return data[WORKER_TAB_KEY] || null;
}

async function setStoredWorkerTabId(tabId) {
  if (tabId) await chrome.storage.local.set({ [WORKER_TAB_KEY]: tabId });
  else await chrome.storage.local.remove(WORKER_TAB_KEY);
}

async function muteWorkerTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.mutedInfo?.muted) await chrome.tabs.update(tabId, { muted: true });
  } catch {
    // Tab may have been closed.
  }
}

function installMuteHookInPage() {
  if (window.__fruitMinerMuteHook) return true;
  window.__fruitMinerMuteHook = true;

  const enforce = () => {
    const video = document.querySelector('video');
    if (!video) return;
    video.muted = true;
    video.volume = 0;
    video.defaultMuted = true;
    try {
      video.pause();
    } catch {
      // ignore
    }
  };

  enforce();
  new MutationObserver(enforce).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('play', (event) => {
    const target = event.target;
    if (target?.tagName === 'VIDEO') {
      target.muted = true;
      target.volume = 0;
    }
  }, true);
  document.addEventListener('volumechange', (event) => {
    const target = event.target;
    if (target?.tagName === 'VIDEO' && !target.muted) {
      target.muted = true;
      target.volume = 0;
    }
  }, true);
  return true;
}

async function installMuteHook(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: installMuteHookInPage,
    });
  } catch {
    // Page may still be loading.
  }
}

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

async function prepareWorkerTab(tabId) {
  try {
    await chrome.tabs.update(tabId, { muted: true, autoDiscardable: false });
  } catch {
    // Tab may have been closed.
  }
  await muteWorkerTab(tabId);
}

async function ensureYouTubeTab() {
  if (cachedYouTubeTabId) {
    try {
      await chrome.tabs.get(cachedYouTubeTabId);
      await prepareWorkerTab(cachedYouTubeTabId);
      return cachedYouTubeTabId;
    } catch {
      cachedYouTubeTabId = null;
      await setStoredWorkerTabId(null);
    }
  }

  const storedId = await getStoredWorkerTabId();
  if (storedId) {
    try {
      await chrome.tabs.get(storedId);
      cachedYouTubeTabId = storedId;
      await prepareWorkerTab(storedId);
      return storedId;
    } catch {
      await setStoredWorkerTabId(null);
    }
  }

  const tab = await chrome.tabs.create({
    url: WORKER_TAB_URL,
    active: false,
  });
  cachedYouTubeTabId = tab.id;
  await setStoredWorkerTabId(tab.id);
  await waitForTabComplete(cachedYouTubeTabId, 25000);
  await prepareWorkerTab(cachedYouTubeTabId);
  try {
    await chrome.tabs.move(cachedYouTubeTabId, { index: -1 });
  } catch {
    // ignore
  }
  await installMuteHook(cachedYouTubeTabId);
  return cachedYouTubeTabId;
}

async function navigateYouTubeTabQuietly(tabId, videoUrl, videoId) {
  await prepareWorkerTab(tabId);
  const tab = await chrome.tabs.get(tabId);
  const currentUrl = String(tab.url || '');
  if (!currentUrl.includes(videoId)) {
    await chrome.tabs.update(tabId, { url: videoUrl, active: false, autoDiscardable: false });
    await waitForTabComplete(tabId, 45000, videoId);
  }
  await prepareWorkerTab(tabId);
  await installMuteHook(tabId);
}

async function runInYouTubeTab(func, args = [], tabId = null) {
  const targetTabId = tabId || await ensureYouTubeTab();
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
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

async function buildTranscriptFromPlayerHtml(html, videoId, languages, tabId, methodPrefix) {
  const player = extractJsonObject(html, 'ytInitialPlayerResponse');
  const playerVideoId = player?.videoDetails?.videoId || '';
  if (playerVideoId !== videoId) {
    throw new Error(`Player HTML did not match requested video (${playerVideoId || 'missing'}).`);
  }

  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  let captionSegCount = 0;
  let captionFormat = '';
  if (tracks.length) {
    const selected = chooseCaptionTrack(tracks, languages);
    const captionResult = await runInYouTubeTab(fetchCaptionTrackInPage, [selected.baseUrl], tabId);
    captionSegCount = captionResult?.segments?.length || 0;
    captionFormat = captionResult?.format || captionResult?.error || 'none';
    if (captionSegCount) {
      return {
        ok: true,
        language: selected.languageCode || 'unknown',
        fileName: selected.name?.simpleText || selected.languageCode || 'caption',
        segments: captionResult.segments,
        method: `${methodPrefix}-${captionResult.format}`,
      };
    }
  }

  const params = extractTranscriptParams(player, html);
  let innerTubeOk = false;
  let innerTubeError = '';
  if (params) {
    const innerTubeResult = await runInYouTubeTab(fetchInnerTubeTranscriptInPage, [params], tabId);
    innerTubeOk = Boolean(innerTubeResult?.ok);
    innerTubeError = innerTubeResult?.error || '';
    if (innerTubeOk) {
      return {
        ok: true,
        language: chooseCaptionTrack(tracks, languages)?.languageCode || 'unknown',
        fileName: 'innertube-transcript',
        segments: innerTubeResult.segments,
        method: `${methodPrefix}-innertube`,
      };
    }
  }

  // #region agent log
  await debugLog('background.js:buildTranscriptFromPlayerHtml:fail', 'API build failed', {
    videoId,
    trackCount: tracks.length,
    captionSegCount,
    captionFormat,
    hasParams: Boolean(params),
    innerTubeOk,
    innerTubeError,
  }, 'H2');
  // #endregion

  throw new Error(tracks.length ? 'Caption track download returned empty.' : 'No caption tracks on this video.');
}

function fetchTranscriptFromPanelInPage() {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  function parseClockLabel(label) {
    const parts = String(label || '').trim().split(':').map(Number);
    if (parts.some(part => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function secondsToClock(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function mutePlayer() {
    const video = document.querySelector('video');
    if (!video) return;
    video.muted = true;
    video.volume = 0;
    try { video.pause(); } catch { /* ignore */ }
  }

  function findShowTranscriptButton() {
    const section = document.querySelector('ytd-video-description-transcript-section-renderer');
    if (section) {
      const button = section.querySelector('button, yt-button-shape button');
      if (button) return button;
    }
    return document.querySelector('button[aria-label="Show transcript"]')
      || [...document.querySelectorAll('button')].find((btn) => /show transcript/i.test(btn.getAttribute('aria-label') || ''));
  }

  function transcriptPanelRoot() {
    return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]')
      || document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]');
  }

  function extractSegmentsFromPanel() {
    const panel = transcriptPanelRoot();
    const scope = panel || document;
    const nodes = scope.querySelectorAll('ytd-transcript-segment-renderer, transcript-segment-view-model');
    if (!nodes.length) return [];

    const segments = [];
    for (const node of nodes) {
      const timestampEl = node.querySelector('.segment-timestamp, .segment-start-offset');
      const textEl = node.querySelector('.segment-text, yt-formatted-string.segment-text');
      const text = stripHtml(textEl?.textContent || '');
      const start = parseClockLabel(timestampEl?.textContent || '');
      if (!text) continue;
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

  return (async () => {
    mutePlayer();

    const moreButton = document.querySelector('#expand, ytd-text-inline-expander #expand, tp-yt-paper-button#expand');
    if (moreButton) {
      moreButton.click();
      await sleep(800);
    }

    const transcriptButton = findShowTranscriptButton();
    const pageUrl = window.location.href;
    const debugBase = {
      pageUrl,
      hasMoreButton: Boolean(moreButton),
      hasTranscriptButton: Boolean(transcriptButton),
    };
    if (!transcriptButton) {
      return { ok: false, error: 'Show transcript button not found on this video.', debug: { ...debugBase, nodeCount: 0, panelFound: false } };
    }

    transcriptButton.click();
    await sleep(1200);

    for (let attempt = 0; attempt < 40; attempt++) {
      mutePlayer();
      const panel = transcriptPanelRoot();
      const nodes = (panel || document).querySelectorAll('ytd-transcript-segment-renderer, transcript-segment-view-model');
      const segments = extractSegmentsFromPanel();
      if (segments.length) {
        return {
          ok: true,
          segments,
          format: 'dom',
          debug: { ...debugBase, panelFound: Boolean(panel), nodeCount: nodes.length, attempts: attempt + 1 },
        };
      }
      await sleep(500);
    }

    const panel = transcriptPanelRoot();
    const nodes = (panel || document).querySelectorAll('ytd-transcript-segment-renderer, transcript-segment-view-model');
    return {
      ok: false,
      error: 'Transcript panel opened but segments did not load.',
      debug: { ...debugBase, panelFound: Boolean(panel), nodeCount: nodes.length, attempts: 40 },
    };
  })();
}

function extractTranscriptParams(player, html) {
  const fromPlayer = player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams;
  if (fromPlayer) return fromPlayer;

  const htmlText = String(html || '');
  const patterns = [
    /"openTranscriptParams":"([^"]+)"/,
    /"getTranscriptEndpoint":\{"params":"([^"]+)"/,
  ];
  for (const pattern of patterns) {
    const match = htmlText.match(pattern);
    if (match?.[1]) return match[1].replace(/\\u0026/g, '&');
  }
  return '';
}

function parseJson3Captions(jsonText) {
  let data = null;
  try {
    data = JSON.parse(String(jsonText || ''));
  } catch {
    return [];
  }

  const segments = [];
  for (const event of data?.events || []) {
    const text = (event?.segs || []).map(seg => seg?.utf8 || '').join('').replace(/\n/g, ' ').trim();
    if (!text || text === '\n') continue;
    const start = Number(event.tStartMs || 0) / 1000;
    const duration = Number(event.dDurationMs || 0) / 1000;
    const end = start + duration;
    segments.push({
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      duration: Number(Math.max(0, duration).toFixed(3)),
      timestamp_label: secondsToClock(start),
      text: stripHtml(text),
    });
  }
  return segments.filter(segment => segment.text);
}

function fetchCaptionTrackInPage(baseUrl) {
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

  function parseJson3(jsonText) {
    let data = null;
    try {
      data = JSON.parse(String(jsonText || ''));
    } catch {
      return [];
    }
    const segments = [];
    for (const event of data?.events || []) {
      const text = (event?.segs || []).map(seg => seg?.utf8 || '').join('').replace(/\n/g, ' ').trim();
      if (!text || text === '\n') continue;
      const start = Number(event.tStartMs || 0) / 1000;
      const duration = Number(event.dDurationMs || 0) / 1000;
      const end = start + duration;
      segments.push({
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        duration: Number(Math.max(0, duration).toFixed(3)),
        timestamp_label: secondsToClock(start),
        text: stripHtml(text),
      });
    }
    return segments.filter(segment => segment.text);
  }

  return (async () => {
    const formats = [
      { fmt: 'vtt', parser: parseVtt },
      { fmt: '', parser: parseXmlCaptions },
      { fmt: 'json3', parser: parseJson3 },
      { fmt: 'srv3', parser: parseXmlCaptions },
      { fmt: 'srv1', parser: parseXmlCaptions },
    ];

    for (const { fmt, parser } of formats) {
      try {
        const url = new URL(baseUrl);
        if (fmt) url.searchParams.set('fmt', fmt);
        else url.searchParams.delete('fmt');
        const response = await fetch(url.toString(), { credentials: 'include' });
        const text = await response.text();
        if (!response.ok || !text.trim()) continue;
        const segments = parser(text);
        if (segments.length) return { ok: true, segments, format: fmt || 'xml' };
      } catch {
        continue;
      }
    }

    return { ok: false, error: 'All caption formats returned empty.' };
  })();
}

function fetchInnerTubeTranscriptInPage(params) {
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

  function secondsToClock(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function cuesToSegments(cues) {
    const segments = [];
    for (const group of cues || []) {
      for (const cue of group?.transcriptCueGroupRenderer?.cues || []) {
        const renderer = cue?.transcriptCueRenderer;
        const text = stripHtml(renderer?.cue?.simpleText || renderer?.cue?.runs?.map(run => run.text).join('') || '');
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
    return segments;
  }

  function parseInnerTubeResponse(data) {
    const cuePaths = [
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.transcriptSectionHeaderRenderer?.transcript?.body?.transcriptBodyRenderer?.cueGroups,
    ];
    for (const cues of cuePaths) {
      const segments = cuesToSegments(cues);
      if (segments.length) return segments;
    }
    return [];
  }

  return (async () => {
    if (!params) return { ok: false, error: 'No transcript params available.' };

    const apiKey = window.ytcfg?.data_?.INNERTUBE_API_KEY || window.ytcfg?.get?.('INNERTUBE_API_KEY') || '';
    const clientVersion = window.ytcfg?.data_?.INNERTUBE_CLIENT_VERSION || window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '2.20260101.00.00';
    const visitorData = window.ytcfg?.data_?.VISITOR_DATA || window.ytcfg?.get?.('VISITOR_DATA') || '';
    const hl = window.ytcfg?.data_?.HL || window.ytcfg?.get?.('HL') || 'en';
    const gl = window.ytcfg?.data_?.GL || window.ytcfg?.get?.('GL') || 'US';

    if (!apiKey) return { ok: false, error: 'YouTube API key missing in page context.' };

    const headers = {
      'content-type': 'application/json',
      'X-Youtube-Client-Name': '1',
      'X-Youtube-Client-Version': clientVersion,
    };
    if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;

    const response = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion,
            hl,
            gl,
            userAgent: navigator.userAgent,
            originalUrl: window.location.href,
          },
          user: {},
          request: { useSsl: true },
        },
        params,
      }),
    });

    const raw = await response.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: `innerTube transcript parse failed (HTTP ${response.status}).` };
    }

    const segments = parseInnerTubeResponse(data);
    if (!segments.length) {
      const apiError = data?.error?.message || data?.errors?.[0]?.message || '';
      return {
        ok: false,
        error: apiError
          ? `innerTube error: ${apiError}`
          : `innerTube transcript empty (HTTP ${response.status}).`,
      };
    }

    return { ok: true, segments, format: 'innertube' };
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
