importScripts('classify.js', 'transcript-fetch.js');

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
  await resumeAiAnalysisBatchIfNeeded();
  await configureActionPopup();
  try {
    await chrome.sidePanel.setOptions({
      path: 'index.html?mode=sidepanel',
      enabled: true,
    });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch {
    // sidePanel unavailable on older Chrome builds
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.fruitMinerOpenUIMode) return;
  configureActionPopup().catch(() => {});
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
  if (alarm.name === 'transcriptBatchWatchdog') {
    await kickTranscriptBatchIfStalled();
    return;
  }
  if (alarm.name === 'processNextAiAnalysis') {
    await processNextAiAnalysisInBatch();
    return;
  }
  if (alarm.name === 'aiAnalysisBatchWatchdog') {
    await kickAiAnalysisBatchIfStalled();
    return;
  }
  if (alarm.name !== 'pollChannel') return;
  await checkForNewVideosBackground();
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html#pending') });
});

chrome.action.onClicked.addListener(async (tab) => {
  const stored = await chrome.storage.local.get('fruitMinerOpenUIMode');
  const mode = stored.fruitMinerOpenUIMode || 'sidepanel';
  if (mode === 'popup') {
    await configureActionPopup('popup');
    if (chrome.action.openPopup) {
      try {
        await chrome.action.openPopup();
      } catch {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html?mode=popup') });
      }
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html?mode=popup') });
    }
    return;
  }
  if (mode === 'tab') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    return;
  }
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html?mode=sidepanel') });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'api') return false;
  handleApi(message.path, message.body || {})
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
  return true;
});

async function configureActionPopup(modeOverride = '') {
  const stored = modeOverride ? {} : await chrome.storage.local.get('fruitMinerOpenUIMode');
  const mode = modeOverride || stored.fruitMinerOpenUIMode || 'sidepanel';
  await chrome.action.setPopup({
    popup: mode === 'popup' ? 'index.html?mode=popup' : '',
  });
}

configureActionPopup().catch(() => {});

async function handleApi(path, body) {
  if (path === '/api/status') return status();
  if (path === '/api/list-videos') return listVideos(body);
  if (path === '/api/transcript') return transcript(body);
  if (path === '/api/capture-visible-transcript') return captureVisibleTranscript(body);
  if (path === '/api/extract-prices') return extractPrices(body);
  if (path === '/api/extract-prices-ai') return extractPricesAi(body);
  if (path === '/api/classify-videos') return classifyVideos(body);
  if (path === '/api/check-new-videos') return checkNewVideos(body);
  if (path === '/api/channel-settings') return channelSettings(body);
  if (path === '/api/mark-processed') return markProcessed(body);
  if (path === '/api/fetch-transcripts-batch') return fetchTranscriptsBatch(body);
  if (path === '/api/stop-transcripts-batch') return stopTranscriptBatch(body);
  if (path === '/api/complete-transcript-batch-item') return completeTranscriptBatchItem(body);
  if (path === '/api/transcript-batch-status') return transcriptBatchStatus();
  if (path === '/api/extract-prices-ai-video') return extractPricesAiForVideo(body);
  if (path === '/api/fetch-ai-analysis-batch') return fetchAiAnalysisBatch(body);
  if (path === '/api/analyze-single-video') return analyzeSingleVideo(body);
  if (path === '/api/stop-ai-analysis-batch') return stopAiAnalysisBatch(body);
  if (path === '/api/ai-analysis-batch-status') return aiAnalysisBatchStatus();
  if (path === '/api/clear-project') return clearProjectData();
  return { ok: false, error: `Unknown extension API route: ${path}` };
}

async function status() {
  const storedKey = await resolveOpenAiKey('');
  return {
    ok: true,
    extensionMode: true,
    ytdlpVersion: 'not needed in Chrome extension',
    youtubeCookiesConfigured: true,
    openaiConfigured: Boolean(storedKey),
    aiProvider: 'openai',
    aiTransport: 'extension-background',
    note: 'Chrome extension mode uses your browser YouTube session for transcripts and sends Step 3 analysis directly from the extension background worker to OpenAI.',
    features: ['classify-videos', 'check-new-videos', 'channel-watch', 'openai-price-analysis'],
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
      max_tokens: 6000,
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
const OPENAI_KEY_STORAGE = 'fruitTranscriptMinerOpenAIKey';

async function getStoredOpenAiKey() {
  const stored = await chrome.storage.local.get(OPENAI_KEY_STORAGE);
  return safeText(stored[OPENAI_KEY_STORAGE]);
}

async function saveStoredOpenAiKey(apiKey) {
  const key = safeText(apiKey);
  if (key) await chrome.storage.local.set({ [OPENAI_KEY_STORAGE]: key });
  else await chrome.storage.local.remove(OPENAI_KEY_STORAGE);
}

async function resolveOpenAiKey(preferred = '') {
  const direct = safeText(preferred);
  if (direct) return direct;
  return getStoredOpenAiKey();
}
const TRANSCRIPT_BATCH_KEY = 'transcriptBatchJob';
const BATCH_LOG_LIMIT = 80;
const BATCH_LOCK_STALE_MS = 90000;
const TRANSCRIPT_FETCH_TIMEOUT_MS = 45000;
const AI_OPENAI_TIMEOUT_MS = 180000;
const AI_BATCH_STALE_MS = 240000;
let batchProcessing = false;
let batchProcessingStartedAt = 0;

function hasTranscriptSegments(video) {
  return Array.isArray(video?.segments) && video.segments.length > 0;
}

function isBatchProcessable(video) {
  return video?.relevance !== 'irrelevant' && video?.status !== 'skipped' && !hasTranscriptSegments(video);
}

async function loadProjectState() {
  const stored = await chrome.storage.local.get(PROJECT_STATE_KEY);
  return stored[PROJECT_STATE_KEY] || { videos: [], priceRows: [], videoAnalysis: {}, currentStep: 1 };
}

async function saveProjectState(patch) {
  const current = await loadProjectState();
  const next = {
    ...current,
    ...patch,
    videos: patch.videos || current.videos || [],
    priceRows: patch.priceRows || current.priceRows || [],
    videoAnalysis: patch.videoAnalysis || current.videoAnalysis || {},
  };
  await chrome.storage.local.set({ [PROJECT_STATE_KEY]: next });
  return next;
}

async function clearProjectData() {
  await chrome.alarms.clear('processNextTranscript');
  await chrome.alarms.clear('processNextAiAnalysis');
  await clearBatchWatchdog();
  await clearAiBatchWatchdog();

  batchProcessing = false;
  batchProcessingStartedAt = 0;
  aiBatchProcessing = false;
  aiBatchProcessingStartedAt = 0;

  await chrome.storage.local.remove([
    PROJECT_STATE_KEY,
    TRANSCRIPT_BATCH_KEY,
    AI_ANALYSIS_BATCH_KEY,
  ]);

  return { ok: true, cleared: true };
}

function addUniqueStrings(target, value) {
  const text = safeText(value);
  if (!text) return;
  const seen = new Set(target.map((item) => item.toLowerCase()));
  if (seen.has(text.toLowerCase())) return;
  target.push(text);
}

function uniqueRowValues(rows, field) {
  const values = [];
  for (const row of rows) addUniqueStrings(values, row[field]);
  return values;
}

function mergeAiVideoMetadata(existing, chunkMeta, item) {
  if (!chunkMeta || typeof chunkMeta !== 'object') return existing;
  const next = existing || {
    market_date: '',
    parties: [],
    areas: [],
    qualities: [],
    fruits: [],
    notes: '',
  };

  const mergeList = (target, values) => {
    const list = [...(target || [])];
    for (const value of values || []) addUniqueStrings(list, value);
    return list;
  };

  if (chunkMeta.market_date) next.market_date = safeText(chunkMeta.market_date);
  next.parties = mergeList(next.parties, chunkMeta.parties);
  next.areas = mergeList(next.areas, chunkMeta.areas);
  next.qualities = mergeList(next.qualities, chunkMeta.qualities);
  if (chunkMeta.notes) next.notes = [next.notes, safeText(chunkMeta.notes)].filter(Boolean).join(' · ');

  const fruitMap = new Map((next.fruits || []).map((fruit) => [
    [fruit.fruit, fruit.fruit_hindi].filter(Boolean).join(' / ').toLowerCase(),
    fruit,
  ]));

  for (const rawFruit of Array.isArray(chunkMeta.fruits) ? chunkMeta.fruits : []) {
    const key = [rawFruit.fruit, rawFruit.fruit_hindi].filter(Boolean).join(' / ').toLowerCase() || 'unknown';
    if (!fruitMap.has(key)) {
      fruitMap.set(key, {
        fruit: safeText(rawFruit.fruit) || safeText(rawFruit.fruit_hindi) || 'unknown',
        fruit_hindi: safeText(rawFruit.fruit_hindi),
        quality_grades: [],
        parties: [],
        areas: [],
        varieties: [],
        min_price_inr: null,
        max_price_inr: null,
        unit: safeText(rawFruit.unit) || 'unknown',
        mentions: [],
      });
    }
    const fruitEntry = fruitMap.get(key);
    for (const grade of rawFruit.quality_grades || []) addUniqueStrings(fruitEntry.quality_grades, grade);
    for (const party of rawFruit.parties || []) addUniqueStrings(fruitEntry.parties, party);
    for (const area of rawFruit.areas || []) addUniqueStrings(fruitEntry.areas, area);
    for (const variety of rawFruit.varieties || []) addUniqueStrings(fruitEntry.varieties, variety);

    const min = normalizeNumeric(rawFruit.min_price_inr);
    const max = normalizeNumeric(rawFruit.max_price_inr);
    if (min !== '' && max !== '') {
      fruitEntry.min_price_inr = fruitEntry.min_price_inr == null
        ? Math.min(min, max)
        : Math.min(fruitEntry.min_price_inr, Math.min(min, max));
      fruitEntry.max_price_inr = fruitEntry.max_price_inr == null
        ? Math.max(min, max)
        : Math.max(fruitEntry.max_price_inr, Math.max(min, max));
    }
    if (fruitEntry.unit === 'unknown' && rawFruit.unit) fruitEntry.unit = safeText(rawFruit.unit);

    for (const mention of Array.isArray(rawFruit.mentions) ? rawFruit.mentions : []) {
      const timestamp = normalizeNumeric(mention.timestamp_seconds);
      fruitEntry.mentions.push({
        timestamp_seconds: timestamp === '' ? 0 : timestamp,
        timestamp_label: secondsToClock(timestamp === '' ? 0 : timestamp),
        timestamp_url: timestampUrl(item?.url || '', timestamp === '' ? 0 : timestamp),
        quality_grade: safeText(mention.quality_grade),
        quality_label: safeText(mention.quality_label),
        party_name: safeText(mention.party_name),
        area_name: safeText(mention.area_name),
        min_price_inr: mention.min_price_inr ?? '',
        max_price_inr: mention.max_price_inr ?? '',
        unit: safeText(mention.unit),
        line: safeText(mention.line || mention.clean_hindi_line || mention.original_line),
        context: safeText(mention.context),
      });
    }
  }

  next.fruits = [...fruitMap.values()];
  return next;
}

function applyAiVideoMetadataToAnalysisMeta(base, item, aiMetadata) {
  if (!aiMetadata || typeof aiMetadata !== 'object') return base;
  const merged = mergeAiVideoMetadata({
    market_date: base.market_date,
    parties: [...(base.parties || [])],
    areas: [...(base.areas || [])],
    qualities: [...(base.qualities || [])],
    fruits: (base.fruits || []).map((fruit) => ({
      ...fruit,
      mentions: [...(fruit.mentions || [])],
      quality_grades: [...(fruit.quality_grades || [])],
      parties: [...(fruit.parties || [])],
      areas: [...(fruit.areas || [])],
      varieties: [...(fruit.varieties || [])],
    })),
    notes: '',
  }, aiMetadata, item);

  const fruitMap = new Map((base.fruits || []).map((fruit) => [
    [fruit.fruit, fruit.fruit_hindi].filter(Boolean).join(' / ').toLowerCase(),
    fruit,
  ]));

  for (const aiFruit of merged.fruits || []) {
    const key = [aiFruit.fruit, aiFruit.fruit_hindi].filter(Boolean).join(' / ').toLowerCase() || 'unknown';
    if (!fruitMap.has(key)) {
      fruitMap.set(key, {
        fruit: aiFruit.fruit,
        fruit_hindi: aiFruit.fruit_hindi || '',
        mention_count: 0,
        quality_grades: [...(aiFruit.quality_grades || [])],
        parties: [...(aiFruit.parties || [])],
        areas: [...(aiFruit.areas || [])],
        varieties: [...(aiFruit.varieties || [])],
        min_price_inr: aiFruit.min_price_inr,
        max_price_inr: aiFruit.max_price_inr,
        unit: aiFruit.unit || 'unknown',
        mentions: (aiFruit.mentions || []).map((mention) => ({
          ...mention,
          timestamp_url: mention.timestamp_url || timestampUrl(item.url, mention.timestamp_seconds),
        })),
      });
      continue;
    }
    const fruitEntry = fruitMap.get(key);
    for (const grade of aiFruit.quality_grades || []) addUniqueStrings(fruitEntry.quality_grades, grade);
    for (const party of aiFruit.parties || []) addUniqueStrings(fruitEntry.parties, party);
    for (const area of aiFruit.areas || []) addUniqueStrings(fruitEntry.areas, area);
    for (const mention of aiFruit.mentions || []) {
      fruitEntry.mentions.push({
        ...mention,
        timestamp_url: mention.timestamp_url || timestampUrl(item.url, mention.timestamp_seconds),
      });
    }
  }

  const fruits = [...fruitMap.values()]
    .map((fruitEntry) => ({
      ...fruitEntry,
      mention_count: Math.max(fruitEntry.mention_count || 0, fruitEntry.mentions?.length || 0),
      mentions: (fruitEntry.mentions || []).sort(
        (a, b) => (Number(a.timestamp_seconds) || 0) - (Number(b.timestamp_seconds) || 0),
      ),
    }))
    .sort((a, b) => a.fruit.localeCompare(b.fruit));

  const parties = merged.parties?.length ? merged.parties : base.parties;
  const areas = merged.areas?.length ? merged.areas : base.areas;
  const qualities = merged.qualities?.length ? merged.qualities : base.qualities;

  return {
    ...base,
    market_date: merged.market_date || base.market_date,
    fruits,
    parties,
    areas,
    qualities,
    mention_count: Math.max(base.mention_count || 0, fruits.reduce((sum, fruit) => sum + (fruit.mentions?.length || 0), 0)),
    summary: {
      fruits: fruits.map((fruitEntry) => fruitEntry.fruit),
      parties,
      areas,
      qualities,
    },
  };
}

function buildVideoAnalysisMeta(item, rows, summary = {}, source = 'ai', aiMetadata = null) {
  const marketDate = parseMarketDate(item.title, item.upload_date);
  const fruitMap = new Map();

  for (const row of rows) {
    const key = [row.fruit, row.fruit_hindi].filter(Boolean).join(' / ').toLowerCase() || 'unknown';
    if (!fruitMap.has(key)) {
      fruitMap.set(key, {
        fruit: row.fruit || row.fruit_hindi || 'unknown',
        fruit_hindi: row.fruit_hindi || '',
        mention_count: 0,
        quality_grades: [],
        parties: [],
        areas: [],
        varieties: [],
        min_price_inr: null,
        max_price_inr: null,
        unit: row.unit || 'unknown',
        mentions: [],
      });
    }
    const fruitEntry = fruitMap.get(key);
    fruitEntry.mention_count += 1;
    addUniqueStrings(fruitEntry.quality_grades, row.quality_grade);
    addUniqueStrings(fruitEntry.parties, row.party_name);
    addUniqueStrings(fruitEntry.areas, row.area_name || row.mandi_name || row.market_name);
    addUniqueStrings(fruitEntry.varieties, row.variety);

    const min = normalizeNumeric(row.min_price_inr);
    const max = normalizeNumeric(row.max_price_inr);
    if (min !== '' && max !== '') {
      fruitEntry.min_price_inr = fruitEntry.min_price_inr == null
        ? Math.min(min, max)
        : Math.min(fruitEntry.min_price_inr, Math.min(min, max));
      fruitEntry.max_price_inr = fruitEntry.max_price_inr == null
        ? Math.max(min, max)
        : Math.max(fruitEntry.max_price_inr, Math.max(min, max));
    }
    if (fruitEntry.unit === 'unknown' && row.unit) fruitEntry.unit = row.unit;

    fruitEntry.mentions.push({
      timestamp_seconds: row.timestamp_seconds || 0,
      timestamp_label: row.timestamp_label || secondsToClock(row.timestamp_seconds),
      timestamp_url: row.timestamp_url || timestampUrl(item.url, row.timestamp_seconds),
      quality_grade: safeText(row.quality_grade),
      quality_label: safeText(row.quality_label),
      party_name: safeText(row.party_name),
      area_name: safeText(row.area_name || row.mandi_name || row.market_name),
      min_price_inr: row.min_price_inr ?? '',
      max_price_inr: row.max_price_inr ?? '',
      unit: safeText(row.unit),
      line: safeText(row.clean_hindi_line || row.original_line),
      context: safeText(row.context),
    });
  }

  const fruits = [...fruitMap.values()]
    .map((fruitEntry) => ({
      ...fruitEntry,
      mentions: fruitEntry.mentions.sort(
        (a, b) => (Number(a.timestamp_seconds) || 0) - (Number(b.timestamp_seconds) || 0),
      ),
    }))
    .sort((a, b) => a.fruit.localeCompare(b.fruit));

  const parties = Array.isArray(summary.parties) && summary.parties.length
    ? summary.parties
    : uniqueRowValues(rows, 'party_name');
  const areas = Array.isArray(summary.areas) && summary.areas.length
    ? summary.areas
    : [...new Set([
      ...uniqueRowValues(rows, 'area_name'),
      ...uniqueRowValues(rows, 'mandi_name'),
      ...uniqueRowValues(rows, 'market_name'),
    ])];
  const qualities = Array.isArray(summary.qualities) && summary.qualities.length
    ? summary.qualities
    : uniqueRowValues(rows, 'quality_grade');

  const base = {
    video_id: item.id || '',
    video_title: item.title || '',
    video_url: item.url || '',
    upload_date: item.upload_date || '',
    market_date: marketDate.label,
    market_date_sort: marketDate.sortKey,
    analyzed_at: new Date().toISOString(),
    source,
    mention_count: rows.length,
    fruits,
    parties,
    areas,
    qualities,
    summary: {
      fruits: fruits.map((fruitEntry) => fruitEntry.fruit),
      parties,
      areas,
      qualities,
    },
  };

  return aiMetadata ? applyAiVideoMetadataToAnalysisMeta(base, item, aiMetadata) : base;
}

async function mergeProjectPriceRowsForVideo(videoId, newRows, videoPatch = {}) {
  const project = await loadProjectState();
  const priceRows = [
    ...(project.priceRows || []).filter((row) => row.video_id !== videoId),
    ...newRows,
  ];
  const videos = [...(project.videos || [])];
  const index = videos.findIndex((video) => video.id === videoId);
  const videoAnalysis = { ...(project.videoAnalysis || {}) };

  if (index >= 0) {
    const video = { ...videos[index] };
    const aiVideoMetadata = videoPatch.aiVideoMetadata || null;
    const hasAnalysis = newRows.length || aiVideoMetadata?.fruits?.length;
    if (videoPatch.priceStatus === 'ok' && hasAnalysis) {
      const analysisMeta = buildVideoAnalysisMeta(
        videoToAnalysisItem(video),
        newRows,
        videoPatch.analysisSummary || {},
        videoPatch.analysisSource || 'ai',
        aiVideoMetadata,
      );
      videoPatch.analysisMeta = analysisMeta;
      videoPatch.analysisSummary = analysisMeta.summary;
      videoAnalysis[videoId] = analysisMeta;
    } else if (videoPatch.priceStatus === 'failed' || videoPatch.priceStatus === 'skipped') {
      delete videoPatch.analysisMeta;
      delete videoAnalysis[videoId];
    }
    delete videoPatch.aiVideoMetadata;
    videos[index] = { ...video, ...videoPatch };
  }

  await saveProjectState({ videos, priceRows, videoAnalysis, currentStep: 3 });
  return { priceRows, videos, videoAnalysis };
}

function broadcastTranscriptBatchEvent(payload) {
  chrome.runtime.sendMessage({ type: 'transcript-batch-event', ...payload }).catch(() => {});
}

async function getTranscriptBatchJob() {
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  return stored[TRANSCRIPT_BATCH_KEY] || null;
}

async function saveTranscriptBatchJob(patch) {
  const current = await getTranscriptBatchJob();
  const next = { ...(current || {}), ...patch };
  await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: next });
  return next;
}

async function appendBatchJobLog(message, level = 'info', meta = {}) {
  const job = await getTranscriptBatchJob();
  if (!job) return null;

  const entry = {
    at: new Date().toISOString(),
    level,
    message: safeText(message),
    videoId: safeText(meta.videoId || ''),
    title: safeText(meta.title || ''),
  };
  const log = [...(job.log || []), entry].slice(-BATCH_LOG_LIMIT);
  const nextJob = {
    ...job,
    log,
    lastLogAt: entry.at,
    lastError: level === 'error' ? entry.message : job.lastError || '',
  };
  await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });
  broadcastTranscriptBatchEvent({ event: 'log', ...entry });
  return nextJob;
}

function releaseBatchProcessingLock() {
  batchProcessing = false;
  batchProcessingStartedAt = 0;
}

function isBatchJobStopped(job) {
  return !job?.running;
}

async function markVideoFailedInProject(videoId, videoIndex, video, errorMessage) {
  if (!video || videoIndex < 0) return;
  video.status = 'failed';
  video.error = safeText(errorMessage).slice(0, 240);
  const project = await loadProjectState();
  const videos = [...(project.videos || [])];
  if (videos[videoIndex]?.id === videoId) {
    videos[videoIndex] = video;
    await saveProjectState({ videos, currentStep: 2 });
  }
  broadcastTranscriptBatchEvent({
    event: 'progress',
    videoId,
    status: 'failed',
    title: video.title || videoId,
    error: video.error,
  });
}
async function transcriptBatchStatus() {
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  return { ok: true, job: stored[TRANSCRIPT_BATCH_KEY] || null };
}

async function fetchTranscriptsBatch(body) {
  const delayMs = Math.max(50, Number(body.delayMs ?? 200));
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  const project = await loadProjectState();
  const pending = (project.videos || [])
    .filter(isBatchProcessable)
    .sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));

  if (!pending.length) {
    return { ok: true, started: false, total: 0, message: 'No pending transcripts.' };
  }

  const existing = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  if (existing[TRANSCRIPT_BATCH_KEY]?.running) {
    return { ok: true, started: false, alreadyRunning: true, total: existing[TRANSCRIPT_BATCH_KEY].total || 0 };
  }

  cachedYouTubeTabId = null;
  await setStoredWorkerTabId(null);

  await chrome.storage.local.set({
    [TRANSCRIPT_BATCH_KEY]: {
      running: true,
      mode: 'auto',
      queue: pending.map(video => video.id),
      delayMs,
      languages,
      total: pending.length,
      done: 0,
      failed: 0,
      currentId: null,
      currentTitle: null,
      startedAt: new Date().toISOString(),
      log: [{
        at: new Date().toISOString(),
        level: 'info',
        message: `Started batch for ${pending.length} video(s).`,
      }],
      lastError: '',
    },
  });

  processNextTranscriptInBatch().catch((error) => {
    console.warn('Transcript batch failed:', error);
    appendBatchJobLog(`Batch start failed: ${cleanError(error)}`, 'error').catch(() => {});
  });
  await ensureBatchWatchdog();

  return { ok: true, started: true, total: pending.length };
}

async function resumeTranscriptBatchIfNeeded() {
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  const job = stored[TRANSCRIPT_BATCH_KEY];
  if (job?.running && job.mode === 'auto' && job.queue?.length) {
    processNextTranscriptInBatch().catch(error => console.warn('Transcript batch resume failed:', error));
  }
}

async function openBatchVideo(video) {
  if (!video?.url) return;
  const existing = await findOpenWatchTab(video.id);
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: false });
    return;
  }
  await chrome.tabs.create({ url: video.url, active: false });
}

async function saveTranscriptToProject(videoId, result) {
  const project = await loadProjectState();
  const videos = [...(project.videos || [])];
  const index = videos.findIndex(video => video.id === videoId);
  if (index === -1) return project;

  const segments = result.segments || [];
  videos[index] = {
    ...videos[index],
    status: 'ok',
    language: result.language || videos[index].language || 'unknown',
    transcriptText: segments.map(segment => segment.text).join(' '),
    segments,
    error: '',
    isNew: false,
    needsWork: false,
  };

  await saveProjectState({ videos, currentStep: 2 });
  await markProcessed({ videoIds: [videoId] });
  return { ...project, videos };
}

async function completeTranscriptBatchItem(body = {}) {
  const id = safeText(body.id);
  if (!id) return { ok: false, error: 'Missing completed video ID.' };

  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  const job = stored[TRANSCRIPT_BATCH_KEY];
  if (!job?.running) return { ok: true, advanced: false, reason: 'No running batch.' };

  const queue = Array.isArray(job.queue) ? job.queue : [];
  if (!queue.includes(id)) {
    return { ok: true, advanced: false, reason: 'Video is not in the active batch queue.' };
  }

  if (job.mode === 'auto') {
    const nextQueue = queue.filter(videoId => videoId !== id);
    const done = (job.done || 0) + 1;
    const nextJob = {
      ...job,
      queue: nextQueue,
      done,
      currentId: null,
      currentTitle: null,
      running: nextQueue.length > 0,
    };
    await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });
    if (!nextQueue.length) {
      await finishTranscriptBatch(nextJob, done);
      return { ok: true, advanced: true, complete: true, done, total: job.total || done };
    }
    if (!batchProcessing) {
      processNextTranscriptInBatch().catch(error => console.warn('Transcript batch continue failed:', error));
    }
    return {
      ok: true,
      advanced: true,
      complete: false,
      done,
      total: job.total || done,
    };
  }

  const nextQueue = queue.filter(videoId => videoId !== id);
  const done = (job.done || 0) + 1;

  if (!nextQueue.length) {
    await finishTranscriptBatch({ ...job, queue: [], done }, done);
    return { ok: true, advanced: true, complete: true, done, total: job.total || done };
  }

  const project = await loadProjectState();
  const nextVideo = (project.videos || []).find(video => video.id === nextQueue[0]);
  const nextJob = {
    ...job,
    queue: nextQueue,
    done,
    currentId: nextQueue[0],
    currentTitle: nextVideo?.title || nextQueue[0],
    running: true,
  };
  await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });
  if (nextVideo) await openBatchVideo(nextVideo);
  broadcastTranscriptBatchEvent({
    event: 'next',
    videoId: nextJob.currentId,
    title: nextJob.currentTitle,
    done,
    total: nextJob.total || done,
  });
  return {
    ok: true,
    advanced: true,
    complete: false,
    nextId: nextJob.currentId,
    nextTitle: nextJob.currentTitle,
    done,
    total: nextJob.total || done,
  };
}

async function scheduleNextTranscriptInBatch(delayMs = 200) {
  const waitMs = Math.max(50, Number(delayMs) || 200);
  await chrome.alarms.clear('processNextTranscript');
  await chrome.alarms.create('processNextTranscript', { when: Date.now() + waitMs });
  await ensureBatchWatchdog();
}

async function ensureBatchWatchdog() {
  await chrome.alarms.clear('transcriptBatchWatchdog');
  await chrome.alarms.create('transcriptBatchWatchdog', { periodInMinutes: 0.5 });
}

async function clearBatchWatchdog() {
  await chrome.alarms.clear('transcriptBatchWatchdog');
}

async function kickTranscriptBatchIfStalled() {
  const job = await getTranscriptBatchJob();
  if (!job?.running || job.mode !== 'auto' || !job.queue?.length) {
    await clearBatchWatchdog();
    return;
  }

  if (batchProcessing) {
    if (batchProcessingStartedAt && Date.now() - batchProcessingStartedAt > BATCH_LOCK_STALE_MS) {
      releaseBatchProcessingLock();
      await appendBatchJobLog('Released stuck batch lock after timeout.', 'warn');
    } else {
      return;
    }
  }

  const headId = job.queue[0];
  const lastAttemptAt = job.lastAttemptAt ? new Date(job.lastAttemptAt).getTime() : 0;
  const stalledOnHead = job.currentId === headId && lastAttemptAt && Date.now() - lastAttemptAt > BATCH_LOCK_STALE_MS;
  if (stalledOnHead) {
    const project = await loadProjectState();
    const videoIndex = (project.videos || []).findIndex(item => item.id === headId);
    const video = videoIndex >= 0 ? { ...(project.videos[videoIndex]) } : { id: headId, title: job.currentTitle || headId };
    await markVideoFailedInProject(headId, videoIndex, video, 'Batch timed out on this video and moved to the next item.');
    await appendBatchJobLog(`Skipping stalled video: ${job.currentTitle || headId}`, 'warn', {
      videoId: headId,
      title: job.currentTitle || headId,
    });
    await saveTranscriptBatchJob({ failed: (job.failed || 0) + 1 });
    await advanceTranscriptBatchQueue({ reason: 'watchdog-skip' });
    return;
  }

  processNextTranscriptInBatch().catch((error) => {
    console.warn('Transcript batch watchdog kick failed:', error);
    appendBatchJobLog(`Watchdog retry failed: ${cleanError(error)}`, 'error').catch(() => {});
  });
}

function transcriptWithTimeout(body, timeoutMs = TRANSCRIPT_FETCH_TIMEOUT_MS) {
  return Promise.race([
    transcript(body),
    sleep(timeoutMs).then(() => {
      throw new Error(`Transcript fetch timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }),
  ]);
}

async function advanceTranscriptBatchQueue(meta = {}) {
  const job = await getTranscriptBatchJob();
  if (!job?.running || !job.queue?.length) return false;

  const skippedId = job.queue[0];
  const nextQueue = job.queue.slice(1);
  const nextJob = {
    ...job,
    queue: nextQueue,
    done: (job.done || 0) + 1,
    currentId: null,
    currentTitle: null,
    lastFinishedAt: new Date().toISOString(),
    lastFinishedId: skippedId,
    running: nextQueue.length > 0,
  };

  await chrome.storage.local.set({ [TRANSCRIPT_BATCH_KEY]: nextJob });

  if (!nextQueue.length) {
    await clearBatchWatchdog();
    await finishTranscriptBatch(nextJob, nextJob.done);
    return true;
  }

  if (meta.reason) {
    await appendBatchJobLog(`Advanced (${nextJob.done}/${nextJob.total || nextJob.done}) · ${meta.reason}`, 'info');
  }

  await scheduleNextTranscriptInBatch(job.delayMs || 200);
  return true;
}

async function finishTranscriptBatch(job, doneCount) {
  const failed = job.failed || 0;
  await appendBatchJobLog(
    `Batch finished: ${doneCount}/${job.total || doneCount} processed${failed ? `, ${failed} failed` : ''}.`,
    failed ? 'warn' : 'info',
  );
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
  await clearBatchWatchdog();
  releaseBatchProcessingLock();
  broadcastTranscriptBatchEvent({
    event: 'complete',
    done: doneCount,
    total: job.total || doneCount,
    failed,
    lastError: job.lastError || '',
  });
}

async function stopTranscriptBatch(body = {}) {
  await chrome.alarms.clear('processNextTranscript');
  await clearBatchWatchdog();
  const stored = await chrome.storage.local.get(TRANSCRIPT_BATCH_KEY);
  const job = stored[TRANSCRIPT_BATCH_KEY] || {};
  const project = await loadProjectState();
  const videos = (project.videos || []).map(video => (
    video.status === 'running'
      ? { ...video, status: 'pending', error: '' }
      : video
  ));

  await saveProjectState({ videos, currentStep: 2 });
  await appendBatchJobLog(safeText(body.reason || 'Stopped by user.'), 'warn');
  await chrome.storage.local.set({
    [TRANSCRIPT_BATCH_KEY]: {
      ...job,
      running: false,
      queue: [],
      currentId: null,
      currentTitle: null,
      stoppedAt: new Date().toISOString(),
      stopReason: safeText(body.reason || 'Stopped by user.'),
    },
  });
  batchProcessing = false;
  releaseBatchProcessingLock();
  broadcastTranscriptBatchEvent({ event: 'stopped', reason: safeText(body.reason || 'Stopped by user.') });
  return { ok: true, stopped: true };
}

async function processNextTranscriptInBatch() {
  if (batchProcessing) {
    if (batchProcessingStartedAt && Date.now() - batchProcessingStartedAt > BATCH_LOCK_STALE_MS) {
      releaseBatchProcessingLock();
      await appendBatchJobLog('Recovered from stale in-flight batch item.', 'warn');
    } else {
      return;
    }
  }

  const job = await getTranscriptBatchJob();
  if (job?.mode === 'guided') return;
  if (!job?.running || !job.queue?.length) {
    if (job?.running) await finishTranscriptBatch(job, job.done || 0);
    await clearBatchWatchdog();
    return;
  }

  batchProcessing = true;
  batchProcessingStartedAt = Date.now();
  const videoId = job.queue[0];
  let video = null;
  let videoIndex = -1;
  let shouldAdvance = false;
  let stopped = false;

  try {
    const project = await loadProjectState();
    const videos = [...(project.videos || [])];
    videoIndex = videos.findIndex(item => item.id === videoId);

    if (videoIndex === -1) {
      await appendBatchJobLog(`Removed missing video from queue: ${videoId}`, 'warn', { videoId });
      shouldAdvance = true;
      return;
    }

    video = { ...videos[videoIndex] };

    if (video.relevance === 'irrelevant' || video.status === 'skipped' || hasTranscriptSegments(video)) {
      await appendBatchJobLog(`Skipping ${video.title || videoId}: ${hasTranscriptSegments(video) ? 'already has transcript' : 'not processable'}.`, 'info', {
        videoId,
        title: video.title || videoId,
      });
      shouldAdvance = true;
      return;
    }

    video.status = 'running';
    video.error = '';
    videos[videoIndex] = video;

    await saveTranscriptBatchJob({
      currentId: videoId,
      currentTitle: video.title || videoId,
      lastAttemptAt: new Date().toISOString(),
    });
    await saveProjectState({ videos, currentStep: 2 });
    broadcastTranscriptBatchEvent({ event: 'progress', videoId, status: 'running', title: video.title || videoId });
    await appendBatchJobLog(`Fetching ${video.title || videoId}...`, 'info', { videoId, title: video.title || videoId });

    const latestBefore = await getTranscriptBatchJob();
    if (isBatchJobStopped(latestBefore)) {
      stopped = true;
      return;
    }

    const result = await transcriptWithTimeout({
      id: video.id,
      videoUrl: video.url,
      languages: job.languages || 'hi.*,hi,en.*',
      preferWorker: true,
    });

    const latestAfter = await getTranscriptBatchJob();
    if (isBatchJobStopped(latestAfter)) {
      stopped = true;
      return;
    }

    if (!result?.ok || !result.segments?.length) {
      throw new Error(result?.error || 'Transcript returned zero caption lines.');
    }

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
    await appendBatchJobLog(
      `OK ${video.title || videoId} (${result.segmentCount || video.segments.length} lines${result.method ? ` · ${result.method}` : ''})`,
      'info',
      { videoId, title: video.title || videoId },
    );
    shouldAdvance = true;
  } catch (error) {
    const latest = await getTranscriptBatchJob();
    if (isBatchJobStopped(latest)) {
      stopped = true;
      return;
    }

    const message = cleanError(error);
    if (video && videoIndex >= 0) {
      await markVideoFailedInProject(videoId, videoIndex, video, message);
      await saveTranscriptBatchJob({ failed: (latest?.failed || 0) + 1, lastError: message });
    }
    await appendBatchJobLog(`Failed ${video?.title || videoId}: ${message}`, 'error', {
      videoId,
      title: video?.title || videoId,
    });
    shouldAdvance = true;
  } finally {
    try {
      if (video && videoIndex >= 0 && !stopped) {
        const project = await loadProjectState();
        const videos = [...(project.videos || [])];
        if (videos[videoIndex]?.id === videoId) {
          videos[videoIndex] = video;
          await saveProjectState({ videos, currentStep: 2 });
        }
      }

      if (shouldAdvance && !stopped) {
        const latest = await getTranscriptBatchJob();
        if (latest?.running) {
          await advanceTranscriptBatchQueue({ reason: 'item-complete' });
        }
      }
    } finally {
      releaseBatchProcessingLock();
    }
  }
}

chrome.runtime.onStartup.addListener(() => {
  configureActionPopup().catch(() => {});
  resumeTranscriptBatchIfNeeded().catch(() => {});
  resumeAiAnalysisBatchIfNeeded().catch(() => {});
});

const AI_ANALYSIS_BATCH_KEY = 'aiAnalysisBatchJob';
let aiBatchProcessing = false;
let aiBatchProcessingStartedAt = 0;

async function ensureAiBatchWatchdog() {
  await chrome.alarms.clear('aiAnalysisBatchWatchdog');
  await chrome.alarms.create('aiAnalysisBatchWatchdog', { periodInMinutes: 0.5 });
}

async function clearAiBatchWatchdog() {
  await chrome.alarms.clear('aiAnalysisBatchWatchdog');
}

async function touchAiBatchHeartbeat(videoId, title, message) {
  const job = await getAiAnalysisBatchJob();
  if (!job?.running) return;
  await chrome.storage.local.set({
    [AI_ANALYSIS_BATCH_KEY]: {
      ...job,
      currentId: videoId,
      currentTitle: title || videoId,
      lastAttemptAt: new Date().toISOString(),
      lastProgress: safeText(message),
    },
  });
  await appendAiBatchJobLog(message, 'info', { videoId, title: title || videoId });
}

async function kickAiAnalysisBatchIfStalled() {
  const job = await getAiAnalysisBatchJob();
  if (!job?.running || !job.queue?.length) {
    await clearAiBatchWatchdog();
    return;
  }

  if (aiBatchProcessing) {
    if (aiBatchProcessingStartedAt && Date.now() - aiBatchProcessingStartedAt > AI_BATCH_STALE_MS) {
      aiBatchProcessing = false;
      aiBatchProcessingStartedAt = 0;
      await appendAiBatchJobLog('Released stuck AI batch lock after timeout.', 'warn');
    } else {
      return;
    }
  }

  const headId = job.queue[0];
  const lastAttemptAt = job.lastAttemptAt ? new Date(job.lastAttemptAt).getTime() : 0;
  const stalledOnHead = job.currentId === headId && lastAttemptAt && Date.now() - lastAttemptAt > AI_BATCH_STALE_MS;
  if (!stalledOnHead) {
    processNextAiAnalysisInBatch().catch((error) => {
      console.warn('AI analysis batch watchdog kick failed:', error);
      appendAiBatchJobLog(`Watchdog retry failed: ${cleanError(error)}`, 'error').catch(() => {});
    });
    return;
  }

  const message = 'AI analysis timed out on this video and moved to the next item.';
  await mergeProjectPriceRowsForVideo(headId, [], {
    priceStatus: 'failed',
    priceRowCount: 0,
    priceError: message,
  });
  await chrome.storage.local.set({
    [AI_ANALYSIS_BATCH_KEY]: {
      ...job,
      failed: (job.failed || 0) + 1,
      lastError: message,
    },
  });
  await appendAiBatchJobLog(`Skipping stalled video: ${job.currentTitle || headId}`, 'warn', {
    videoId: headId,
    title: job.currentTitle || headId,
  });
  broadcastAiAnalysisBatchEvent({
    event: 'progress',
    videoId: headId,
    status: 'failed',
    title: job.currentTitle || headId,
    error: message,
  });
  await advanceAiAnalysisBatchQueue();
}

function isAiAnalysisProcessable(video) {
  return video?.relevance !== 'irrelevant'
    && video?.status !== 'skipped'
    && hasTranscriptSegments(video)
    && video?.priceStatus !== 'ok';
}

function broadcastAiAnalysisBatchEvent(payload) {
  chrome.runtime.sendMessage({ type: 'ai-analysis-batch-event', ...payload }).catch(() => {});
}

async function getAiAnalysisBatchJob() {
  const stored = await chrome.storage.local.get(AI_ANALYSIS_BATCH_KEY);
  return stored[AI_ANALYSIS_BATCH_KEY] || null;
}

async function appendAiBatchJobLog(message, level = 'info', meta = {}) {
  const job = await getAiAnalysisBatchJob();
  if (!job) return null;
  const entry = {
    at: new Date().toISOString(),
    level,
    message: safeText(message),
    videoId: safeText(meta.videoId || ''),
    title: safeText(meta.title || ''),
  };
  const log = [...(job.log || []), entry].slice(-80);
  const nextJob = {
    ...job,
    log,
    lastLogAt: entry.at,
    lastError: level === 'error' ? entry.message : job.lastError || '',
  };
  await chrome.storage.local.set({ [AI_ANALYSIS_BATCH_KEY]: nextJob });
  broadcastAiAnalysisBatchEvent({ event: 'log', ...entry });
  return nextJob;
}

async function aiAnalysisBatchStatus() {
  const job = await getAiAnalysisBatchJob();
  return { ok: true, job };
}

async function fetchAiAnalysisBatch(body) {
  const delayMs = Math.max(100, Number(body.delayMs ?? 400));
  const apiKey = await resolveOpenAiKey(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 10000), 20000));
  if (!apiKey) {
    return {
      ok: false,
      started: false,
      error: 'OpenAI API key required for AI analysis. Add it in Settings, save, then retry.',
    };
  }
  await saveStoredOpenAiKey(apiKey);
  let project = await loadProjectState();
  let videos = [...(project.videos || [])];

  if (Array.isArray(body.pendingVideos) && body.pendingVideos.length) {
    for (const patch of body.pendingVideos) {
      if (!patch?.id) continue;
      const index = videos.findIndex((video) => video.id === patch.id);
      if (index >= 0) {
        videos[index] = { ...videos[index], ...patch };
      } else {
        videos.push(patch);
      }
    }
    project = await saveProjectState({ videos, currentStep: 3 });
    videos = [...(project.videos || [])];
  }

  const existing = await getAiAnalysisBatchJob();
  if (existing?.running && existing.queue?.length) {
    return { ok: true, started: false, alreadyRunning: true, total: existing.total || 0 };
  }
  if (existing) {
    await chrome.storage.local.remove(AI_ANALYSIS_BATCH_KEY);
  }

  const pending = videos
    .filter(isAiAnalysisProcessable)
    .sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));

  if (!pending.length) {
    return {
      ok: true,
      started: false,
      total: 0,
      message: 'No transcripts waiting for AI analysis. Reload the extension page and try again.',
    };
  }

  const startLog = `Started OpenAI analysis for ${pending.length} video(s) using ${model}. Requests are sent from the extension background service worker to OpenAI.`;

  await chrome.storage.local.set({
    [AI_ANALYSIS_BATCH_KEY]: {
      running: true,
      queue: pending.map(video => video.id),
      delayMs,
      apiKey,
      model,
      maxCharsPerCall,
      total: pending.length,
      done: 0,
      failed: 0,
      currentId: null,
      currentTitle: null,
      startedAt: new Date().toISOString(),
      log: [{
        at: new Date().toISOString(),
        level: 'info',
        message: startLog,
      }],
      lastError: '',
    },
  });

  processNextAiAnalysisInBatch().catch((error) => {
    console.warn('AI analysis batch failed:', error);
    appendAiBatchJobLog(`Batch start failed: ${cleanError(error)}`, 'error').catch(() => {});
  });
  await ensureAiBatchWatchdog();

  return {
    ok: true,
    started: true,
    total: pending.length,
    aiProvider: 'openai',
    aiTransport: 'extension-background',
    model,
  };
}

async function resumeAiAnalysisBatchIfNeeded() {
  const job = await getAiAnalysisBatchJob();
  if (job?.running && job.queue?.length) {
    await ensureAiBatchWatchdog();
    processNextAiAnalysisInBatch().catch((error) => console.warn('AI analysis batch resume failed:', error));
  }
}

async function scheduleNextAiAnalysisInBatch(delayMs = 400) {
  const waitMs = Math.max(100, Number(delayMs) || 400);
  await chrome.alarms.clear('processNextAiAnalysis');
  await chrome.alarms.create('processNextAiAnalysis', { when: Date.now() + waitMs });
  await ensureAiBatchWatchdog();
}

async function advanceAiAnalysisBatchQueue() {
  const job = await getAiAnalysisBatchJob();
  if (!job?.running || !job.queue?.length) return false;

  const nextQueue = job.queue.slice(1);
  const nextJob = {
    ...job,
    queue: nextQueue,
    done: (job.done || 0) + 1,
    currentId: null,
    currentTitle: null,
    lastFinishedAt: new Date().toISOString(),
    running: nextQueue.length > 0,
  };
  await chrome.storage.local.set({ [AI_ANALYSIS_BATCH_KEY]: nextJob });

  if (!nextQueue.length) {
    await finishAiAnalysisBatch(nextJob, nextJob.done);
    return true;
  }

  await scheduleNextAiAnalysisInBatch(job.delayMs || 400);
  return true;
}

async function finishAiAnalysisBatch(job, doneCount) {
  const failed = job.failed || 0;
  await appendAiBatchJobLog(
    `AI analysis finished: ${doneCount}/${job.total || doneCount} video(s)${failed ? `, ${failed} failed` : ''}.`,
    failed ? 'warn' : 'info',
  );
  await chrome.storage.local.set({
    [AI_ANALYSIS_BATCH_KEY]: {
      ...job,
      running: false,
      queue: [],
      currentId: null,
      currentTitle: null,
      finishedAt: new Date().toISOString(),
    },
  });
  await saveProjectState({ currentStep: 4 });
  aiBatchProcessing = false;
  aiBatchProcessingStartedAt = 0;
  await clearAiBatchWatchdog();
  broadcastAiAnalysisBatchEvent({
    event: 'complete',
    done: doneCount,
    total: job.total || doneCount,
    failed,
    lastError: job.lastError || '',
  });
}

async function stopAiAnalysisBatch(body = {}) {
  await chrome.alarms.clear('processNextAiAnalysis');
  await clearAiBatchWatchdog();
  const job = (await getAiAnalysisBatchJob()) || {};
  const project = await loadProjectState();
  const videos = (project.videos || []).map((video) => (
    video.priceStatus === 'running'
      ? { ...video, priceStatus: 'pending', priceError: '' }
      : video
  ));
  await saveProjectState({ videos, currentStep: 3 });
  await appendAiBatchJobLog(safeText(body.reason || 'Stopped by user.'), 'warn');
  await chrome.storage.local.set({
    [AI_ANALYSIS_BATCH_KEY]: {
      ...job,
      running: false,
      queue: [],
      currentId: null,
      currentTitle: null,
      stoppedAt: new Date().toISOString(),
      stopReason: safeText(body.reason || 'Stopped by user.'),
    },
  });
  aiBatchProcessing = false;
  aiBatchProcessingStartedAt = 0;
  broadcastAiAnalysisBatchEvent({ event: 'stopped', reason: safeText(body.reason || 'Stopped by user.') });
  return { ok: true, stopped: true };
}

function videoToAnalysisItem(video) {
  return {
    id: video.id,
    title: video.title || video.id,
    url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
    upload_date: video.upload_date || '',
    segments: video.segments || [],
  };
}

async function analyzeVideoForPrices(video, { apiKey, model, maxCharsPerCall, logFallback = null, requireAi = false }) {
  const analysisItem = videoToAnalysisItem(video);
  let rows = [];
  let summary = null;
  let aiVideoMetadata = null;
  let analysisSource = 'regex';
  const resolvedKey = await resolveOpenAiKey(apiKey);

  if (resolvedKey) {
    const result = await extractPricesAiForVideo({
      item: analysisItem,
      apiKey: resolvedKey,
      model,
      maxCharsPerCall,
    });
    if (!result?.ok) throw new Error(result?.error || 'AI price extraction failed.');
    rows = result.rows || [];
    summary = result.summary || null;
    aiVideoMetadata = result.aiVideoMetadata || null;
    const hasAiOutput = rows.length || aiVideoMetadata?.fruits?.length;
    if (!hasAiOutput) {
      throw new Error('AI returned no price rows or video metadata. Check the Activity log and retry.');
    }
    analysisSource = 'ai';
  } else {
    if (requireAi) throw new Error('OpenAI API key required for AI analysis.');
    if (!logFallback) throw new Error('OpenAI API key required for AI analysis.');
    if (logFallback) await logFallback('No OpenAI key — using regex extraction.');
    rows = extractPricesFromSegments(analysisItem);
  }

  return { rows, summary, aiVideoMetadata, analysisSource };
}

async function analyzeSingleVideo(body) {
  const videoId = safeText(body.videoId);
  const apiKey = await resolveOpenAiKey(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 10000), 20000));
  if (!videoId) return { ok: false, error: 'Missing video id.' };
  if (!apiKey) return { ok: false, error: 'OpenAI API key required for AI analysis. Add it in Settings and save, then retry.' };
  await saveStoredOpenAiKey(apiKey);

  let project = await loadProjectState();
  let videos = [...(project.videos || [])];
  if (body.pendingVideo?.id) {
    const index = videos.findIndex((video) => video.id === body.pendingVideo.id);
    if (index >= 0) videos[index] = { ...videos[index], ...body.pendingVideo };
    else videos.push(body.pendingVideo);
    project = await saveProjectState({ videos, currentStep: 3 });
    videos = [...(project.videos || [])];
  }

  const index = videos.findIndex((video) => video.id === videoId);
  if (index === -1) return { ok: false, error: 'Video not found in project.' };

  const video = { ...videos[index] };
  if (!hasTranscriptSegments(video)) {
    return { ok: false, error: 'Video has no transcript segments.' };
  }

  video.priceStatus = 'running';
  video.priceError = '';
  videos[index] = video;
  await saveProjectState({ videos, currentStep: 3 });
  broadcastAiAnalysisBatchEvent({
    event: 'progress',
    videoId,
    status: 'running',
    title: video.title || videoId,
  });

  try {
    const { rows, summary, analysisSource, aiVideoMetadata } = await analyzeVideoForPrices(video, {
      apiKey,
      model,
      maxCharsPerCall,
      requireAi: true,
    });
    const hasAnalysis = rows.length || aiVideoMetadata?.fruits?.length;
    await mergeProjectPriceRowsForVideo(videoId, rows, {
      priceStatus: hasAnalysis ? 'ok' : 'failed',
      priceRowCount: rows.length,
      priceError: hasAnalysis ? '' : 'No prices or metadata extracted from transcript.',
      analysisSummary: summary,
      analysisSource,
      aiVideoMetadata,
    });
    broadcastAiAnalysisBatchEvent({
      event: 'progress',
      videoId,
      status: hasAnalysis ? 'ok' : 'failed',
      title: video.title || videoId,
      priceRowCount: rows.length,
      error: hasAnalysis ? '' : 'No prices or metadata extracted from transcript.',
    });
    return { ok: hasAnalysis, count: rows.length, rows, videoId };
  } catch (error) {
    const message = cleanError(error);
    await mergeProjectPriceRowsForVideo(videoId, [], {
      priceStatus: 'failed',
      priceRowCount: 0,
      priceError: message.slice(0, 240),
    });
    broadcastAiAnalysisBatchEvent({
      event: 'progress',
      videoId,
      status: 'failed',
      title: video.title || videoId,
      error: message,
    });
    return { ok: false, error: message, videoId };
  }
}

async function processNextAiAnalysisInBatch() {
  if (aiBatchProcessing) {
    if (aiBatchProcessingStartedAt && Date.now() - aiBatchProcessingStartedAt > AI_BATCH_STALE_MS) {
      aiBatchProcessing = false;
      aiBatchProcessingStartedAt = 0;
      await appendAiBatchJobLog('Released stuck AI batch lock after timeout.', 'warn');
    } else {
      return;
    }
  }

  const job = await getAiAnalysisBatchJob();
  if (!job?.running || !job.queue?.length) {
    if (job?.running) {
      const project = await loadProjectState();
      const remaining = (project.videos || [])
        .filter(isAiAnalysisProcessable)
        .sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));
      if (remaining.length) {
        await chrome.storage.local.set({
          [AI_ANALYSIS_BATCH_KEY]: {
            ...job,
            queue: remaining.map((video) => video.id),
            total: Math.max(job.total || 0, (job.done || 0) + remaining.length),
            currentId: null,
            currentTitle: null,
          },
        });
        await scheduleNextAiAnalysisInBatch(job.delayMs || 400);
        return;
      }
      await finishAiAnalysisBatch(job, job.done || 0);
    }
    return;
  }

  aiBatchProcessing = true;
  aiBatchProcessingStartedAt = Date.now();
  const videoId = job.queue[0];
  let shouldAdvance = false;
  let stopped = false;

  try {
    const project = await loadProjectState();
    const videos = [...(project.videos || [])];
    const videoIndex = videos.findIndex((item) => item.id === videoId);
    if (videoIndex === -1) {
      await appendAiBatchJobLog(`Removed missing video from AI queue: ${videoId}`, 'warn', { videoId });
      shouldAdvance = true;
      return;
    }

    const video = { ...videos[videoIndex] };
    if (!hasTranscriptSegments(video)) {
      await mergeProjectPriceRowsForVideo(videoId, [], {
        priceStatus: 'skipped',
        priceRowCount: 0,
        priceError: 'No transcript segments.',
      });
      shouldAdvance = true;
      return;
    }

    if (video.priceStatus === 'ok') {
      shouldAdvance = true;
      return;
    }

    video.priceStatus = 'running';
    video.priceError = '';
    videos[videoIndex] = video;
    await chrome.storage.local.set({
      [AI_ANALYSIS_BATCH_KEY]: {
        ...job,
        currentId: videoId,
        currentTitle: video.title || videoId,
        lastAttemptAt: new Date().toISOString(),
      },
    });
    await saveProjectState({ videos, currentStep: 3 });
    broadcastAiAnalysisBatchEvent({
      event: 'progress',
      videoId,
      status: 'running',
      title: video.title || videoId,
    });
    await appendAiBatchJobLog(`Analyzing ${video.title || videoId}...`, 'info', {
      videoId,
      title: video.title || videoId,
    });

    const latestBefore = await getAiAnalysisBatchJob();
    if (!latestBefore?.running) {
      stopped = true;
      return;
    }

    const { rows, summary, analysisSource, aiVideoMetadata } = await analyzeVideoForPrices(video, {
      apiKey: job.apiKey,
      model: job.model,
      maxCharsPerCall: job.maxCharsPerCall,
      requireAi: true,
      logFallback: (message) => appendAiBatchJobLog(message, 'warn', {
        videoId,
        title: video.title || videoId,
      }),
    });

    const latestAfter = await getAiAnalysisBatchJob();
    if (!latestAfter?.running) {
      stopped = true;
      return;
    }

    const hasAnalysis = rows.length || aiVideoMetadata?.fruits?.length;
    await mergeProjectPriceRowsForVideo(videoId, rows, {
      priceStatus: hasAnalysis ? 'ok' : 'failed',
      priceRowCount: rows.length,
      priceError: hasAnalysis ? '' : 'No prices or metadata extracted from transcript.',
      analysisSummary: summary,
      analysisSource,
      aiVideoMetadata,
    });
    broadcastAiAnalysisBatchEvent({
      event: 'progress',
      videoId,
      status: hasAnalysis ? 'ok' : 'failed',
      title: video.title || videoId,
      priceRowCount: rows.length,
      error: hasAnalysis ? '' : 'No prices or metadata extracted from transcript.',
    });
    await appendAiBatchJobLog(
      hasAnalysis
        ? `OK ${video.title || videoId} (${rows.length} row${rows.length === 1 ? '' : 's'}${aiVideoMetadata?.fruits?.length ? ` · ${aiVideoMetadata.fruits.length} fruit block(s) in metadata` : ''})`
        : `No analysis output for ${video.title || videoId}`,
      hasAnalysis ? 'info' : 'warn',
      { videoId, title: video.title || videoId },
    );
    shouldAdvance = true;
  } catch (error) {
    const latest = await getAiAnalysisBatchJob();
    if (!latest?.running) {
      stopped = true;
      return;
    }
    const message = cleanError(error);
    await mergeProjectPriceRowsForVideo(videoId, [], {
      priceStatus: 'failed',
      priceRowCount: 0,
      priceError: message.slice(0, 240),
    });
    await chrome.storage.local.set({
      [AI_ANALYSIS_BATCH_KEY]: {
        ...latest,
        failed: (latest.failed || 0) + 1,
        lastError: message,
      },
    });
    broadcastAiAnalysisBatchEvent({
      event: 'progress',
      videoId,
      status: 'failed',
      title: videoId,
      error: message,
    });
    await appendAiBatchJobLog(`Failed ${videoId}: ${message}`, 'error', { videoId });
    shouldAdvance = true;
  } finally {
    if (shouldAdvance && !stopped) {
      const latest = await getAiAnalysisBatchJob();
      if (latest?.running) await advanceAiAnalysisBatchQueue();
    }
    aiBatchProcessing = false;
    aiBatchProcessingStartedAt = 0;
  }
}

async function listVideos(body) {
  const channelUrl = normalizeChannelUrl(body.channelUrl);
  const requestedMax = Number(body.maxVideos ?? 0);
  const unlimited = requestedMax === 0;
  const maxVideos = unlimited ? 1000 : Math.max(1, Math.min(requestedMax, 1000));
  if (!/^https?:\/\//i.test(channelUrl) || !/(youtube\.com|youtu\.be)/i.test(channelUrl)) {
    return { ok: false, error: 'Please enter a valid YouTube channel/video/playlist URL.' };
  }

  let scrapeError = '';
  let indexed = { videos: [], pagesFetched: 0 };
  try {
    indexed = await listChannelVideosPaginated(channelUrl, maxVideos);
  } catch (error) {
    scrapeError = cleanError(error);
  }

  if (!indexed.videos.length) {
    return {
      ok: false,
      error: scrapeError
        || 'Found 0 videos. Open youtube.com in this Chrome profile, confirm you are signed in, then retry.',
    };
  }

  const unique = indexed.videos
    .map((video, index) => ({
      id: video.id,
      title: video.title || video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      upload_date: video.upload_date || '',
      duration: video.duration || '',
      channel: video.channel || '',
      channelIndex: index + 1,
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

  return {
    ok: true,
    count: enriched.length,
    totalIndexed: enriched.length,
    pagesFetched: indexed.pagesFetched || 1,
    videos: enriched,
  };
}

async function listChannelVideosPaginated(channelUrl, maxVideos) {
  let html = '';
  let initialData = null;
  try {
    html = await fetchText(channelUrl);
    initialData = extractJsonObject(html, 'ytInitialData');
  } catch (error) {
    throw new Error(cleanError(error));
  }

  const seen = new Set();
  const collected = [];
  let pagesFetched = 0;

  const addFromNode = (node) => {
    const batch = [];
    collectVideos(node, batch, maxVideos);
    for (const video of batch) {
      if (!video.id || seen.has(video.id)) continue;
      seen.add(video.id);
      collected.push(video);
      if (collected.length >= maxVideos) return true;
    }
    return collected.length >= maxVideos;
  };

  if (addFromNode(initialData)) {
    return { videos: collected, pagesFetched: 1 };
  }
  pagesFetched = 1;

  let continuation = findBrowseContinuationToken(initialData);
  const tabId = await ensureYouTubeTab();
  await injectTranscriptHelpers(tabId);

  while (continuation && collected.length < maxVideos && pagesFetched < 60) {
    const result = await runInYouTubeTab('fetchBrowseContinuationInPage', [continuation], tabId, { skipInject: true });
    if (!result?.ok || !result.data) break;

    pagesFetched += 1;
    if (addFromNode(result.data)) break;
    continuation = findBrowseContinuationToken(result.data);
  }

  if (!collected.length && html) {
    try {
      const rssVideos = await listVideosFromRss(html, initialData, maxVideos);
      for (const video of rssVideos) {
        if (!video.id || seen.has(video.id)) continue;
        seen.add(video.id);
        collected.push(video);
        if (collected.length >= maxVideos) break;
      }
      pagesFetched = Math.max(pagesFetched, 1);
    } catch {
      // RSS is a last resort for the first slice only.
    }
  }

  return { videos: collected, pagesFetched };
}

function findBrowseContinuationToken(node, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return '';
  seen.add(node);

  const direct = node.continuationCommand?.token
    || node.continuationEndpoint?.continuationCommand?.token
    || node.nextContinuationData?.continuation;
  if (typeof direct === 'string' && direct.length > 16) return direct;

  if (node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
    return node.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
  }

  for (const value of Object.values(node)) {
    const found = findBrowseContinuationToken(value, seen);
    if (found) return found;
  }
  return '';
}

function broadcastCaptureProgress(videoId, stage, detail = '') {
  chrome.runtime.sendMessage({ type: 'capture-progress', videoId, stage, detail }).catch(() => {});
}

async function fetchTranscriptFromActiveWatchTabIfMatch(videoId) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id || !/\/watch/.test(activeTab.url || '')) return null;
  const activeVideoId = getVideoId(activeTab.url || '');
  if (!activeVideoId || activeVideoId !== videoId) return null;
  return fetchVisibleTranscriptFromTab(activeTab, videoId, true);
}

async function transcript(body) {
  const rawVideoUrl = safeText(body.videoUrl || body.url);
  const id = safeText(body.id || getVideoId(rawVideoUrl));
  const videoUrl = normalizeWatchUrl(rawVideoUrl, id);
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  const preferWorker = Boolean(body.preferWorker);
  if (!/^https?:\/\//i.test(videoUrl) || !id) return { ok: false, error: 'Invalid YouTube video URL.' };

  let result = null;
  try {
    result = await fetchTranscriptInYouTubeTab(videoUrl, id, languages, { preferWorker });
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
  if (!segments.length) {
    return { ok: false, id, error: result?.error || 'Transcript returned zero caption lines.' };
  }

  return transcriptResponse(id, result);
}

async function captureVisibleTranscript(body) {
  const rawVideoUrl = safeText(body.videoUrl || body.url);
  const id = safeText(body.id || getVideoId(rawVideoUrl));
  const videoUrl = normalizeWatchUrl(rawVideoUrl, id);
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  if (!id) return { ok: false, error: 'Missing YouTube video ID.' };

  broadcastCaptureProgress(id, 'quick', 'Checking active YouTube tab...');
  let result = await fetchTranscriptFromActiveWatchTabIfMatch(id);

  if (!result?.ok || !result.segments?.length) {
    broadcastCaptureProgress(id, 'worker', 'Working in background worker tab...');
    try {
      result = await fetchTranscriptInYouTubeTab(videoUrl, id, languages, { preferWorker: true });
    } catch (error) {
      return {
        ok: false,
        id,
        error: cleanError(error) || result?.error || 'Could not capture transcript from YouTube.',
      };
    }
  }

  if (!result?.segments?.length) {
    return {
      ok: false,
      id,
      error: result?.error || 'Transcript returned zero caption lines.',
    };
  }

  broadcastCaptureProgress(id, 'done', `Captured ${result.segments.length} lines`);
  await saveTranscriptToProject(id, result);
  const batch = await completeTranscriptBatchItem({ id });

  return {
    ...transcriptResponse(id, result),
    batch,
  };
}

function transcriptResponse(id, result) {
  const segments = result.segments || [];
  return {
    ok: true,
    id,
    language: result.language || 'unknown',
    fileName: result.fileName || 'caption',
    segmentCount: segments.length,
    transcriptText: segments.map(segment => segment.text).join(' '),
    segments,
    method: result.method || 'youtube-tab',
    sourceUrl: result.sourceUrl || '',
  };
}

async function fetchTranscriptFromHtml(videoUrl, id, languages) {
  const tabId = await ensureYouTubeTab();
  const html = await fetchText(videoUrl);
  const result = await buildTranscriptFromPlayerHtml(html, id, languages, tabId, 'html-fallback');
  if (!result?.segments?.length) throw new Error('No captions found in page HTML.');
  return { ...result, ok: true };
}

function extractPrices(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const rows = [];
  for (const item of items) rows.push(...extractPricesFromSegments(item));
  return { ok: true, count: rows.length, rows };
}

function parseMarketDate(title, uploadDate = '') {
  const text = String(title || '');
  const upload = String(uploadDate || '').trim();
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const makeKey = (year, monthIndex, day) => ({
    sortKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    label: `${day} ${monthShort[monthIndex] || monthIndex + 1} ${year}`,
  });

  const dmy = text.match(/\b(\d{1,2})\s*(st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
  if (dmy) {
    const month = monthNames.indexOf(dmy[3].toLowerCase());
    if (month >= 0) return makeKey(Number(dmy[4]), month, Number(dmy[1]));
  }

  const mdy = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (mdy) {
    const month = monthNames.indexOf(mdy[1].toLowerCase());
    if (month >= 0) return makeKey(Number(mdy[3]), month, Number(mdy[2]));
  }

  if (/^\d{8}$/.test(upload)) {
    const year = Number(upload.slice(0, 4));
    const month = Number(upload.slice(4, 6)) - 1;
    const day = Number(upload.slice(6, 8));
    return makeKey(year, month, day);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(upload)) {
    const [year, month, day] = upload.slice(0, 10).split('-').map(Number);
    return makeKey(year, month - 1, day);
  }
  return { sortKey: '0000-00-00', label: text.slice(0, 48) || 'Unknown date' };
}

const PRICE_EXTRACTION_SYSTEM = [
  'You are a Delhi fruit/vegetable wholesale mandi intelligence extractor.',
  'Read noisy Hindi YouTube market-report captions carefully and write structured metadata the UI can render on video cards.',
  'Cover ALL commodities mentioned: fruits, vegetables, garlic, onion, potato, tomato, ginger, etc.',
  'All display fields MUST be English. Translate or transliterate Hindi words into English for fruit, variety, grade, party, area, market, notes, context, and video_metadata.',
  'Use Hindi/Devanagari only in fruit_hindi, original_line, and clean_hindi_line. Do not put Hindi in fruit, quality_grade, quality_label, party_name, area_name, mandi_name, context, notes, price_notes, video_metadata.parties, video_metadata.areas, video_metadata.qualities, or video_metadata.fruits[].mentions[].line.',
  'For video_metadata.fruits[].mentions[].line, write a short English summary of the mention, not the raw Hindi caption.',
  'Return JSON only with this exact shape:',
  '{"rows":[{"fruit":"","fruit_hindi":"","variety":"","quality_grade":"","quality_label":"","party_name":"","mandi_name":"","area_name":"","origin":"","unit":"","min_price_inr":null,"max_price_inr":null,"price_notes":"","market_name":"","timestamp_seconds":0,"confidence":"high|medium|low","original_line":"","clean_hindi_line":"","context":"","notes":""}],',
  '"chunk_summary":{"fruits":[],"parties":[],"areas":[],"qualities":[]},',
  '"video_metadata":{"market_date":"","parties":[],"areas":[],"qualities":[],"notes":"","fruits":[{"fruit":"","fruit_hindi":"","quality_grades":[],"parties":[],"areas":[],"varieties":[],"min_price_inr":null,"max_price_inr":null,"unit":"","mentions":[{"timestamp_seconds":0,"quality_grade":"","quality_label":"","party_name":"","area_name":"","min_price_inr":null,"max_price_inr":null,"unit":"","line":"","context":""}]}]}}',
  '',
  'Guidelines:',
  '- ALWAYS populate video_metadata from the transcript chunk — parties, areas, grades, commodities, and timestamped mentions for cards.',
  '- fruit: English commodity only (garlic, onion, mango, potato, pomegranate, lychee, sweet lime). fruit_hindi: Hindi when spoken.',
  '- One row per distinct commodity + quality/grade + party + price (or quality discussion) mention.',
  '- quality_grade: English only: Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, super, medium, ordinary, premium, second, third, etc. Translate "चार नंबर" to "Grade 4", "पांच नंबर" to "Grade 5", etc.',
  '- party_name: trader/party/seller names transliterated into English, e.g. "Rana Ji", "Babu Ji", "Aarti Fruit Company".',
  '- area_name / mandi_name: English/transliterated names: Azadpur Mandi, Pathankot, Ambeta, yards, blocks, localities, godowns.',
  '- context, notes, price_notes: concise English explanation.',
  '- min_price_inr/max_price_inr: use null if no price stated but commodity+quality+party still useful.',
  '- timestamp_seconds MUST match the [seconds] bracket on the source segment line.',
  '- rows and video_metadata must stay consistent; video_metadata is the structured rollup saved separately from flat rows.',
  '- Extract every commodity covered in the chunk; separate rows/fruit blocks when grades or parties differ.',
].join('\n');

function mergeAnalysisSummaries(existing, chunkSummary) {
  const next = {
    fruits: [...(existing?.fruits || [])],
    parties: [...(existing?.parties || [])],
    areas: [...(existing?.areas || [])],
    qualities: [...(existing?.qualities || [])],
    notes: safeText(existing?.notes || ''),
  };
  const addUnique = (target, values) => {
    const seen = new Set(target.map(v => v.toLowerCase()));
    for (const value of values || []) {
      const text = safeText(value);
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      target.push(text);
    }
  };
  addUnique(next.fruits, chunkSummary?.fruits);
  addUnique(next.parties, chunkSummary?.parties);
  addUnique(next.areas, chunkSummary?.areas);
  addUnique(next.qualities, chunkSummary?.qualities);
  return next;
}

function normalizeAiPriceRow(raw, item, fallbackTimestamp) {
  const min = normalizeNumeric(raw.min_price_inr);
  const max = normalizeNumeric(raw.max_price_inr);
  const timestamp = normalizeNumeric(raw.timestamp_seconds ?? fallbackTimestamp);
  const fruit = safeText(raw.fruit);
  const fruitHindi = safeText(raw.fruit_hindi);
  if (!fruit && !fruitHindi) return null;
  if (timestamp === '') return null;

  const hasPrice = min !== '' && max !== '';
  const hasDetail = safeText(raw.quality_grade)
    || safeText(raw.quality_label)
    || safeText(raw.party_name)
    || safeText(raw.area_name)
    || safeText(raw.mandi_name)
    || safeText(raw.market_name);
  if (!hasPrice && !hasDetail) return null;

  const marketDate = parseMarketDate(item.title, item.upload_date);
  return withLinks({
    fruit: fruit || fruitHindi,
    fruit_hindi: fruitHindi,
    variety: safeText(raw.variety),
    quality_grade: safeText(raw.quality_grade),
    quality_label: safeText(raw.quality_label),
    party_name: safeText(raw.party_name),
    mandi_name: safeText(raw.mandi_name || raw.market_name),
    area_name: safeText(raw.area_name),
    origin: safeText(raw.origin),
    unit: safeText(raw.unit) || 'unknown',
    min_price_inr: hasPrice ? Math.min(min, max) : '',
    max_price_inr: hasPrice ? Math.max(min, max) : '',
    price_notes: safeText(raw.price_notes),
    market_name: safeText(raw.market_name || raw.mandi_name),
    market_date: marketDate.label,
    market_date_sort: marketDate.sortKey,
    confidence: ['high', 'medium', 'low'].includes(String(raw.confidence).toLowerCase())
      ? String(raw.confidence).toLowerCase()
      : 'low',
    original_line: safeText(raw.original_line),
    clean_hindi_line: safeText(raw.clean_hindi_line),
    context: safeText(raw.context),
    notes: safeText(raw.notes),
    source: 'ai',
  }, item, timestamp);
}

async function extractPriceRowsForItem(item, apiKey, model, maxCharsPerCall) {
  const rows = [];
  let summary = { fruits: [], parties: [], areas: [], qualities: [], notes: '' };
  let aiVideoMetadata = null;
  const chunks = chunkSegments(item.segments || [], maxCharsPerCall);
  const resolvedKey = await resolveOpenAiKey(apiKey);
  if (!resolvedKey) throw new Error('OpenAI API key required for AI analysis.');

  await appendAiBatchJobLog(`Calling OpenAI (${model}) with extraction guidelines...`, 'info', {
    videoId: item.id,
    title: item.title || item.id,
  });

  for (let i = 0; i < chunks.length; i++) {
    await touchAiBatchHeartbeat(item.id, item.title, `Analyzing chunk ${i + 1}/${chunks.length}...`);
    const segmentText = chunks[i].map(seg => `[${Math.floor(Number(seg.start) || 0)}s | ${secondsToClock(seg.start)}] ${safeText(seg.text)}`).join('\n');
    const prompt = [
      `Video title: ${item.title || ''}`,
      `Video URL: ${item.url || ''}`,
      `Upload date if known: ${item.upload_date || ''}`,
      `Market day label: ${parseMarketDate(item.title, item.upload_date).label}`,
      `Chunk ${i + 1} of ${chunks.length}`,
      '',
      'Read the transcript below and return rows plus video_metadata for this chunk.',
      'Transcript segments (use bracket seconds for timestamp_seconds):',
      segmentText,
    ].join('\n');
    const json = await callOpenAIWithTimeout({
      apiKey: resolvedKey,
      model,
      prompt,
      system: PRICE_EXTRACTION_SYSTEM,
    });
    summary = mergeAnalysisSummaries(summary, json.chunk_summary);
    aiVideoMetadata = mergeAiVideoMetadata(aiVideoMetadata, json.video_metadata, item);
    let chunkCount = 0;
    for (const raw of Array.isArray(json.rows) ? json.rows : []) {
      const row = normalizeAiPriceRow(raw, item, raw.timestamp_seconds);
      if (row) {
        rows.push(row);
        chunkCount += 1;
      }
    }
    const metaFruits = Array.isArray(json.video_metadata?.fruits) ? json.video_metadata.fruits.length : 0;
    await appendAiBatchJobLog(
      `Chunk ${i + 1}/${chunks.length}: ${chunkCount} row(s)${metaFruits ? ` · ${metaFruits} metadata fruit block(s)` : ''}`,
      'info',
      { videoId: item.id, title: item.title || item.id },
    );
  }
  return { rows: dedupeRows(rows), summary, aiVideoMetadata };
}

async function extractPricesAiForVideo(body) {
  const item = body.item;
  const apiKey = await resolveOpenAiKey(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 10000), 20000));
  if (!item?.id) return { ok: false, error: 'Missing video item.' };
  if (!apiKey) return { ok: false, error: 'OpenAI API key required. Add it in Settings and save, then retry.' };
  if (!Array.isArray(item.segments) || !item.segments.length) {
    return { ok: false, error: 'Video has no transcript segments.' };
  }

  const result = await extractPriceRowsForItem(item, apiKey, model, maxCharsPerCall);
  return {
    ok: true,
    count: result.rows.length,
    rows: result.rows,
    summary: result.summary,
    aiVideoMetadata: result.aiVideoMetadata,
    videoId: item.id,
  };
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
    const result = await extractPriceRowsForItem(item, apiKey, model, maxCharsPerCall);
    rows.push(...result.rows);
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

async function waitForTabComplete(tabId, timeoutMs = 15000, expectedVideoId = '') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') {
      if (!expectedVideoId || String(tab.url || '').includes(expectedVideoId)) return tab;
    }
    await sleep(80);
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

async function injectTranscriptHelpers(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    files: ['transcript-fetch.js'],
  });
}

async function runInYouTubeTab(functionName, args = [], tabId = null, options = {}) {
  const targetTabId = tabId || await ensureYouTubeTab();
  if (!options.skipInject) {
    try {
      await injectTranscriptHelpers(targetTabId);
    } catch {
      // File may already be injected on this tab.
    }
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    world: 'MAIN',
    func: (name, fnArgs) => {
      const handler = globalThis[name];
      if (typeof handler !== 'function') {
        return { ok: false, error: `Missing in-page handler: ${name}` };
      }
      return handler(...fnArgs);
    },
    args: [functionName, args],
  });
  return result;
}

async function fetchTextViaYouTubeTab(url) {
  const result = await runInYouTubeTab('fetchTextInYouTubePage', [url]);

  if (!result?.ok) {
    throw new Error(result?.error || 'YouTube tab fetch failed. Open youtube.com and sign in.');
  }
  return result.text;
}

async function waitForYouTubePageReady(tabId, videoId) {
  const ready = await runInYouTubeTab('waitForYouTubeVideoReadyInPage', [videoId], tabId);
  if (!ready?.ok) throw new Error(ready?.error || 'YouTube watch page did not finish loading.');
}

async function listOpenWatchTabs(excludeTabId = null) {
  const tabs = await chrome.tabs.query({
    url: [
      'https://www.youtube.com/watch*',
      'https://youtube.com/watch*',
      'https://m.youtube.com/watch*',
    ],
  });
  return tabs.filter(tab => tab.id !== excludeTabId);
}

async function findOpenWatchTab(videoId, excludeTabId = null) {
  const tabs = await listOpenWatchTabs(excludeTabId);
  return tabs
    .filter(tab => getVideoId(tab.url || '') === videoId || String(tab.url || '').includes(videoId))
    .sort((a, b) => Number(b.active) - Number(a.active))[0] || null;
}

async function fetchTranscriptFromOpenWatchTab(videoId, excludeTabId = null) {
  const openTab = await findOpenWatchTab(videoId, excludeTabId);
  if (!openTab?.id) return null;

  return fetchVisibleTranscriptFromTab(openTab, videoId, true);
}

async function fetchTranscriptFromMatchingOpenWatchTab(videoId, excludeTabId = null) {
  const tabs = await listOpenWatchTabs(excludeTabId);
  if (!tabs.length) {
    return { ok: false, error: 'No YouTube watch tabs are open.', diagnostics: [] };
  }

  const matchingTabs = tabs
    .filter(tab => getVideoId(tab.url || '') === videoId || String(tab.url || '').includes(videoId))
    .sort((a, b) => Number(b.active) - Number(a.active));
  if (!matchingTabs.length) {
    return {
      ok: false,
      error: `Open this exact video on YouTube, click Show transcript, then capture again. Video ID: ${videoId}.`,
      diagnostics: tabs.map(tab => ({ url: tab.url || '', exact: false, error: 'Different YouTube video tab.' })),
    };
  }

  const diagnostics = [];

  for (const tab of matchingTabs) {
    try {
      const result = await fetchVisibleTranscriptFromTab(tab, videoId, true);
      if (result?.ok && result.segments?.length) {
        return { ...result, diagnostics };
      }
      diagnostics.push({
        url: tab.url || '',
        exact: true,
        error: result?.error || 'No transcript rows returned.',
      });
    } catch (error) {
      diagnostics.push({
        url: tab.url || '',
        exact: true,
        error: cleanError(error),
      });
    }
  }

  const summary = diagnostics
    .map(item => `matching tab: ${item.error}`)
    .join(' | ');
  return {
    ok: false,
    error: summary || 'Open YouTube tabs did not expose transcript lines.',
    diagnostics,
  };
}

async function fetchVisibleTranscriptFromTab(tab, videoId, exact) {
  if (!exact) {
    return {
      ok: false,
      error: `Refusing to capture a different YouTube video tab for ${videoId}.`,
    };
  }
  const visibleResult = await runInYouTubeTab('fetchVisibleTranscriptPanelOnlyInPage', [], tab.id);
  if (visibleResult?.ok && visibleResult.segments?.length) {
    return {
      ok: true,
      language: visibleResult.language || 'unknown',
      fileName: visibleResult.fileName || 'youtube-visible-panel',
      segments: visibleResult.segments,
      method: visibleResult.format || 'open-tab-panel',
      sourceUrl: tab.url || visibleResult.url || '',
    };
  }

  return {
    ok: false,
    error: visibleResult?.error || `Open YouTube tab did not expose transcript lines for ${videoId}.`,
  };
}

async function fetchTranscriptInYouTubeTab(videoUrl, videoId, languages, options = {}) {
  const preferWorker = Boolean(options.preferWorker);
  const errors = [];

  if (!preferWorker) {
    try {
      const openTabResult = await fetchTranscriptFromActiveWatchTabIfMatch(videoId);
      if (openTabResult?.ok && openTabResult.segments?.length) return openTabResult;
      if (openTabResult?.error) errors.push(openTabResult.error);
    } catch (error) {
      errors.push(cleanError(error));
    }
  }

  broadcastCaptureProgress(videoId, 'load', 'Loading in background worker tab...');
  const tabId = await ensureYouTubeTab();
  await prepareWorkerTab(tabId);
  await navigateYouTubeTabQuietly(tabId, videoUrl, videoId);
  await waitForYouTubePageReady(tabId, videoId);

  broadcastCaptureProgress(videoId, 'fetch', 'Fetching captions via API...');
  await injectTranscriptHelpers(tabId);

  let pageResult = null;
  try {
    pageResult = await runInYouTubeTab('fetchTranscriptInPage', [languages, true, true], tabId, { skipInject: true });
    if (pageResult?.segments?.length) {
      return {
        ok: true,
        language: pageResult.language || 'unknown',
        fileName: pageResult.fileName || 'youtube-transcript',
        segments: pageResult.segments,
        method: pageResult.method || 'youtube-tab-api',
      };
    }
    if (pageResult?.error) errors.push(pageResult.error);
  } catch (error) {
    errors.push(cleanError(error));
  }

  broadcastCaptureProgress(videoId, 'fetch', 'Retrying with page interaction...');
  try {
    pageResult = await runInYouTubeTab('fetchTranscriptInPage', [languages, true, false], tabId, { skipInject: true });
    if (pageResult?.segments?.length) {
      return {
        ok: true,
        language: pageResult.language || 'unknown',
        fileName: pageResult.fileName || 'youtube-transcript',
        segments: pageResult.segments,
        method: pageResult.method || 'youtube-tab',
      };
    }
    if (pageResult?.error) errors.push(pageResult.error);
  } catch (error) {
    errors.push(cleanError(error));
  }

  throw new Error(errors.filter(Boolean).join(' · ') || 'Could not download captions. Stay signed in at youtube.com and retry.');
}

async function buildTranscriptFromPlayerHtml(html, videoId, languages, tabId, methodPrefix) {
  try {
    const player = extractJsonObject(html, 'ytInitialPlayerResponse');
    if (player?.videoDetails?.videoId !== videoId) {
      return { ok: false, error: 'Player HTML did not match requested video.' };
    }

    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const selected = tracks.length ? chooseCaptionTrack(tracks, languages) : null;
    const params = extractTranscriptParams(player, html);

    const captionPromise = selected?.baseUrl
      ? runInYouTubeTab('fetchCaptionTrackInPage', [selected.baseUrl], tabId)
      : Promise.resolve(null);
    const innerTubePromise = params
      ? runInYouTubeTab('fetchInnerTubeTranscriptInPage', [params], tabId)
      : Promise.resolve(null);
    const [captionResult, innerTubeResult] = await Promise.all([captionPromise, innerTubePromise]);

    if (captionResult?.segments?.length) {
      return {
        ok: true,
        language: selected.languageCode || 'unknown',
        fileName: selected.name?.simpleText || selected.languageCode || 'caption',
        segments: captionResult.segments,
        method: `${methodPrefix}-${captionResult.format}`,
      };
    }

    if (innerTubeResult?.segments?.length) {
      return {
        ok: true,
        language: selected?.languageCode || 'unknown',
        fileName: 'innertube-transcript',
        segments: innerTubeResult.segments,
        method: `${methodPrefix}-innertube`,
      };
    }

    if (tracks.length) return { ok: false, error: 'Caption track download returned empty.' };
    if (params) return { ok: false, error: innerTubeResult?.error || 'innerTube transcript empty.' };

    return { ok: false, error: 'No caption tracks on this video.' };
  } catch (error) {
    return { ok: false, error: cleanError(error) };
  }
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

function collectVideos(node, out, max = 2000) {
  if (!node || out.length >= max) return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out, max);
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

  if (node.richItemRenderer?.content) collectVideos(node.richItemRenderer.content, out, max);

  for (const value of Object.values(node)) collectVideos(value, out, max);
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
    const fromQuery = parsed.searchParams.get('v');
    if (fromQuery) return fromQuery;
    const pathMatch = parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    return '';
  } catch {
    return '';
  }
}

function normalizeWatchUrl(url, id = '') {
  const videoId = id || getVideoId(url);
  if (!videoId) return url;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
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

const MANDI_PRODUCE = [
  { name: 'mango', terms: ['आम', 'mango', 'kesar', 'alphonso', 'hapus', 'dasheri', 'langra', 'chausa', 'safeda', 'totapuri'] },
  { name: 'apple', terms: ['सेब', 'apple'] },
  { name: 'banana', terms: ['केला', 'banana'] },
  { name: 'orange', terms: ['संतरा', 'orange', 'kinnow', 'santra'] },
  { name: 'lychee', terms: ['लीची', 'litchi', 'lychee'] },
  { name: 'grapes', terms: ['अंगूर', 'grapes', 'angoor'] },
  { name: 'pomegranate', terms: ['अनार', 'pomegranate'] },
  { name: 'papaya', terms: ['पपीता', 'papaya'] },
  { name: 'guava', terms: ['अमरूद', 'guava'] },
  { name: 'garlic', terms: ['लहसुन', 'garlic', 'lehsun', 'lahsun', 'garlicmarket'] },
  { name: 'onion', terms: ['प्याज', 'onion', 'pyaz', 'pyaaz', 'onionmarket'] },
  { name: 'potato', terms: ['आलू', 'aloo', 'potato', 'potatomarket'] },
  { name: 'tomato', terms: ['टमाटर', 'tamatar', 'tomato'] },
  { name: 'ginger', terms: ['अदरक', 'adrak', 'ginger'] },
  { name: 'cauliflower', terms: ['फूलगोभी', 'gobi', 'cauliflower'] },
  { name: 'cabbage', terms: ['पत्तागोभी', 'cabbage', 'bandgobi'] },
  { name: 'peas', terms: ['मटर', 'peas', 'matar'] },
  { name: 'carrot', terms: ['गाजर', 'carrot', 'gajar'] },
  { name: 'capsicum', terms: ['शिमला मिर्च', 'capsicum', 'shimla'] },
  { name: 'lemon', terms: ['नींबू', 'nimbu', 'lemon'] },
  { name: 'watermelon', terms: ['तरबूज', 'tarbuj', 'watermelon'] },
  { name: 'melon', terms: ['खरबूजा', 'kharbuja', 'melon'] },
  { name: 'cucumber', terms: ['खीरा', 'kheera', 'cucumber'] },
  { name: 'brinjal', terms: ['बैंगन', 'baingan', 'brinjal', 'eggplant'] },
  { name: 'chilli', terms: ['मिर्च', 'mirch', 'chilli', 'chili'] },
  { name: 'coriander', terms: ['धनिया', 'dhaniya', 'coriander'] },
  { name: 'spinach', terms: ['पालक', 'palak', 'spinach'] },
  { name: 'beans', terms: ['बीन्स', 'beans', 'sem'] },
  { name: 'coconut', terms: ['नारियल', 'nariyal', 'coconut'] },
  { name: 'pear', terms: ['नाशपाती', 'pear', 'nashpati'] },
];

function detectCommodities(text, title = '') {
  const hay = `${title} ${text}`.toLowerCase();
  const found = [];
  const seen = new Set();
  for (const item of MANDI_PRODUCE) {
    if (item.terms.some((term) => hay.includes(term.toLowerCase()))) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        found.push(item.name);
      }
    }
  }
  return found;
}

function isYearLikePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1900 && n <= 2100;
}

function extractPricesFromSegments(item) {
  const rows = [];
  const marketDate = parseMarketDate(item.title, item.upload_date);
  const titleCommodities = detectCommodities('', item.title || '');
  const segments = Array.isArray(item.segments) ? item.segments : [];
  const priceRe = /(?:₹|rs\.?|inr|रुप(?:ए|ये|या)?|भाव|rate|price|रेट)?\s*(\d{1,6})(?:\s*(?:से|to|तक|-|–|—)\s*(?:₹|rs\.?|inr)?\s*(\d{1,6}))?/gi;

  for (const seg of segments) {
    const text = safeText(seg.text);
    let match;
    while ((match = priceRe.exec(text)) !== null) {
      const min = normalizeNumeric(match[1]);
      const max = normalizeNumeric(match[2] || match[1]);
      if (min === '' || max === '' || min <= 0 || max > 100000) continue;
      if (isYearLikePrice(min) || isYearLikePrice(max)) continue;

      const commodities = detectCommodities(text, item.title);
      const targets = commodities.length ? commodities : titleCommodities;
      if (!targets.length) continue;

      for (const commodity of targets) {
        rows.push(withLinks({
          fruit: commodity,
          fruit_hindi: '',
          variety: '',
          quality_grade: '',
          quality_label: '',
          party_name: '',
          mandi_name: '',
          area_name: '',
          origin: '',
          unit: detectUnit(text),
          min_price_inr: Math.min(min, max),
          max_price_inr: Math.max(min, max),
          price_notes: '',
          market_name: '',
          market_date: marketDate.label,
          market_date_sort: marketDate.sortKey,
          confidence: match[2] ? 'medium' : 'low',
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
  return detectCommodities(text);
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
    const key = [
      row.video_id,
      row.fruit,
      row.quality_grade,
      row.party_name,
      row.unit,
      row.min_price_inr,
      row.max_price_inr,
      row.timestamp_seconds,
      row.original_line,
    ].join('|').toLowerCase();
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

async function callOpenAIWithTimeout(params, timeoutMs = AI_OPENAI_TIMEOUT_MS) {
  return Promise.race([
    callOpenAI(params),
    sleep(timeoutMs).then(() => {
      throw new Error(`OpenAI request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }),
  ]);
}

async function callOpenAI({ apiKey, model, prompt, system }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: system || PRICE_EXTRACTION_SYSTEM,
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
