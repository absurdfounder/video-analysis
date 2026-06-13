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
const BATCH_LOG_LIMIT = 80;
const BATCH_LOCK_STALE_MS = 90000;
const TRANSCRIPT_FETCH_TIMEOUT_MS = 45000;
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
  resumeTranscriptBatchIfNeeded().catch(() => {});
});

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
