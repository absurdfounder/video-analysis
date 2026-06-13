const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const state = {
  videos: [],
  priceRows: [],
  runningTask: '',
  currentStep: 1,
  lastSync: null,
  batchRunning: false,
};

const $ = (id) => document.getElementById(id);

function setDisabled(id, disabled) {
  const el = $(id);
  if (el) el.disabled = disabled;
}

function log(message) {
  const box = $('log');
  if (!box) return;
  const now = new Date().toLocaleTimeString();
  box.textContent += `[${now}] ${message}\n`;
  box.scrollTop = box.scrollHeight;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(path, body) {
  const data = await chrome.runtime.sendMessage({ type: 'api', path, body });
  if (!data || !data.ok) throw new Error(data?.error || 'Extension request failed.');
  return data;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tag(text, cls) {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function isProcessable(video) {
  return video.relevance !== 'irrelevant' && video.status !== 'skipped';
}

function segmentCount(video) {
  return Array.isArray(video?.segments) ? video.segments.length : 0;
}

function hasTranscriptData(video) {
  return segmentCount(video) > 0;
}

function displayStatus(video) {
  if (hasTranscriptData(video)) return 'ok';
  if (video.status === 'running') return 'running';
  if (video.status === 'failed') return 'failed';
  if (video.status === 'skipped') return 'skipped';
  return 'pending';
}

function normalizeVideos({ keepRunning = false } = {}) {
  for (const video of state.videos) {
    if (!keepRunning && video.status === 'running') video.status = 'pending';
    if (video.status === 'ok' && !hasTranscriptData(video)) video.status = 'pending';
    if (hasTranscriptData(video)) video.status = 'ok';
  }
}

function pendingTranscripts() {
  return state.videos.filter(v => isProcessable(v) && !hasTranscriptData(v));
}

function transcriptQueueStats() {
  const stats = { ready: 0, waiting: 0, running: 0, failed: 0, missing: 0 };
  for (const video of state.videos.filter(isProcessable)) {
    if (hasTranscriptData(video)) {
      stats.ready++;
    } else if (video.status === 'running') {
      stats.running++;
    } else if (video.status === 'failed') {
      stats.failed++;
    } else {
      stats.waiting++;
    }
  }
  stats.missing = stats.waiting + stats.running + stats.failed;
  return stats;
}

function transcriptReady() {
  return state.videos.filter(v => hasTranscriptData(v));
}

function parseVideoDate(video) {
  const title = String(video.title || '');
  const upload = String(video.upload_date || '').trim();

  const dmy = title.match(/\b(\d{1,2})\s*(st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = MONTHS.indexOf(dmy[3].toLowerCase());
    const year = Number(dmy[4]);
    if (month >= 0) return makeDateKey(year, month, day);
  }

  const mdy = title.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (mdy) {
    const month = MONTHS.indexOf(mdy[1].toLowerCase());
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month >= 0) return makeDateKey(year, month, day);
  }

  if (/^\d{8}$/.test(upload)) {
    const year = Number(upload.slice(0, 4));
    const month = Number(upload.slice(4, 6)) - 1;
    const day = Number(upload.slice(6, 8));
    return makeDateKey(year, month, day);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(upload)) {
    const [year, month, day] = upload.slice(0, 10).split('-').map(Number);
    return makeDateKey(year, month - 1, day);
  }

  return { sortKey: '0000-00-00', label: 'Unknown date' };
}

function makeDateKey(year, monthIndex, day) {
  const sortKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const label = `${day}/${MONTH_SHORT[monthIndex]}/${year}`;
  return { sortKey, label };
}

function groupVideosByDate(videos) {
  const groups = new Map();
  for (const video of videos) {
    const { sortKey, label } = parseVideoDate(video);
    if (!groups.has(sortKey)) groups.set(sortKey, { sortKey, label, videos: [] });
    groups.get(sortKey).videos.push(video);
  }
  return [...groups.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function renderVideoCard(video) {
  const segCount = segmentCount(video);
  const hasData = hasTranscriptData(video);
  const status = displayStatus(video);
  const showBtn = isProcessable(video);
  const btnLabel = hasData
    ? `Read transcript (${segCount} lines)`
    : status === 'failed'
      ? 'Retry visible transcript'
      : status === 'running'
        ? 'Fetching transcript...'
        : 'Capture visible transcript';

  return `
    <article class="video-card ${video.isNew ? 'is-new' : ''} ${status === 'skipped' ? 'is-skipped' : ''} ${hasData ? 'has-transcript' : ''}">
      <h3><a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">${escapeHtml(video.title || video.id)}</a></h3>
      <div class="card-tags">
        ${tag(status, status)}
        ${tag(video.relevance || 'unclassified', `relevance-${video.relevance || 'unclassified'}`)}
        ${hasData ? tag(`${segCount} lines`, 'relevance-relevant') : ''}
      </div>
      ${video.relevanceReason ? `<div class="mini">${escapeHtml(video.relevanceReason)}</div>` : ''}
      ${showBtn ? `
        <div class="card-actions">
          <a class="btn-open-youtube" href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">Open YouTube</a>
          <button type="button" class="btn-view-transcript" data-open-transcript="${escapeHtml(video.id)}">${escapeHtml(btnLabel)}</button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderDateGroups(videos, containerId, emptyMessage) {
  const container = $(containerId);
  if (!container) return;

  const q = (containerId === 'videoList' ? ($('videoSearch')?.value || '') : '').toLowerCase().trim();
  const filtered = videos.filter(v => {
    if (!q) return true;
    const hay = [v.title, v.status, v.relevance, parseVideoDate(v).label].join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  const groups = groupVideosByDate(filtered);
  container.innerHTML = groups.map(group => `
    <section class="date-group">
      <header class="date-group-head">
        <h3>${escapeHtml(group.label)}</h3>
        <span>${group.videos.length} video${group.videos.length === 1 ? '' : 's'}</span>
      </header>
      <div class="card-list">
        ${group.videos.map(renderVideoCard).join('')}
      </div>
    </section>
  `).join('');
}

function timestampUrl(videoUrl, seconds) {
  try {
    const url = new URL(videoUrl);
    url.searchParams.set('t', `${Math.max(0, Math.floor(Number(seconds) || 0))}s`);
    return url.toString();
  } catch {
    return videoUrl;
  }
}

let modalVideoId = '';

async function fetchTranscriptForVideo(video) {
  const previousStatus = video.status;
  const previousError = video.error;
  const languages = ($('languages')?.value || 'hi.*,hi,en.*').trim();
  try {
    const data = await api('/api/capture-visible-transcript', {
      id: video.id,
      videoUrl: video.url,
      languages,
    });
    if (!data.segments?.length) throw new Error('Transcript returned zero caption lines.');
    Object.assign(video, {
      status: 'ok',
      language: data.language,
      transcriptText: data.transcriptText,
      segments: data.segments || [],
      error: '',
      isNew: false,
      needsWork: false,
    });
    const batch = data.batch || null;
    log(`Transcript captured: ${video.title} (${segmentCount(video)} lines${data.method ? ` · ${data.method}` : ''})`);
    if (batch?.complete) log('Transcript batch complete.');
    else if (batch?.advanced) log(`Batch advanced (${batch.done || 0}/${batch.total || 0}).`);
    return { data, batch };
  } catch (error) {
    const message = /Unknown extension API route/i.test(error.message)
      ? 'Extension background is stale. Reload the unpacked extension at chrome://extensions, then retry.'
      : error.message;
    video.status = previousStatus || 'pending';
    video.error = previousError || '';
    log(`Transcript capture failed: ${video.title}: ${message}`);
    throw new Error(message);
  } finally {
    renderVideos();
    await saveLocal();
  }
}

async function openTranscriptModal(videoId) {
  const video = state.videos.find(v => v.id === videoId);
  const modal = $('transcriptModal');
  if (!video || !modal) return;

  modalVideoId = videoId;
  if ($('modalTitle')) $('modalTitle').textContent = video.title || video.id;
  if ($('modalYoutube')) $('modalYoutube').href = video.url;
  if ($('modalSearch')) $('modalSearch').value = '';
  if ($('modalCapture')) $('modalCapture').disabled = false;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  renderTranscriptModalState(video);
}

function renderTranscriptModalState(video) {
  if (!video) return;
  if (hasTranscriptData(video)) {
    if ($('modalMeta')) {
      $('modalMeta').textContent = `${segmentCount(video)} lines · ${video.language || 'unknown'} · ${parseVideoDate(video).label}`;
    }
    if ($('modalCapture')) $('modalCapture').textContent = 'Recapture now';
    renderModalSegments(video);
    return;
  }

  if ($('modalMeta')) $('modalMeta').textContent = 'Fetching in background worker tab — you can keep using other tabs.';
  if ($('modalCapture')) $('modalCapture').textContent = 'Capture now';
  if ($('modalSegments')) {
    $('modalSegments').innerHTML = `
      <div class="empty-state">
        Press Capture now to fetch via the hidden background worker tab.
      </div>
    `;
  }
}

async function captureTranscriptFromModal() {
  const video = state.videos.find(v => v.id === modalVideoId);
  if (!video) return;
  if ($('modalCapture')) {
    $('modalCapture').disabled = true;
    $('modalCapture').textContent = 'Capturing...';
  }
  if ($('modalMeta')) $('modalMeta').textContent = 'Fetching in background worker tab...';
  if ($('modalSegments')) $('modalSegments').innerHTML = '<div class="empty-state">Starting capture...</div>';

  try {
    const result = await fetchTranscriptForVideo(video);
    renderTranscriptModalState(video);
    if (result?.batch?.advanced && result.batch.nextId) {
      closeTranscriptModal();
    }
  } catch (error) {
    if ($('modalMeta')) $('modalMeta').textContent = 'Capture needs the exact YouTube tab.';
    if ($('modalSegments')) {
      $('modalSegments').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
    if ($('modalCapture')) {
      $('modalCapture').disabled = false;
      $('modalCapture').textContent = 'Capture now';
    }
  }
}

function closeTranscriptModal() {
  $('transcriptModal')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  modalVideoId = '';
}

function renderModalSegments(video) {
  const list = $('modalSegments');
  if (!list) return;

  const q = ($('modalSearch')?.value || '').toLowerCase().trim();
  const segments = (video.segments || []).filter(seg => {
    if (!q) return true;
    const hay = [seg.timestamp_label, seg.text].join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (!segments.length) {
    list.innerHTML = '<div class="empty-state">No segments match this search.</div>';
    return;
  }

  list.innerHTML = segments.map(seg => {
    const label = seg.timestamp_label || secondsToClock(seg.start);
    const url = timestampUrl(video.url, seg.start);
    return `
      <article class="segment-row">
        <a class="segment-time" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>
        <p class="segment-text">${escapeHtml(seg.text)}</p>
      </article>
    `;
  }).join('');
}

function secondsToClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function renderPrices() {
  const list = $('priceList');
  if (!list) return;

  const q = ($('priceSearch')?.value || '').toLowerCase().trim();
  const rows = state.priceRows.filter(row => !q || Object.values(row).join(' ').toLowerCase().includes(q));

  const renderCard = (row) => `
    <article class="price-card">
      <h3>${escapeHtml(row.fruit || 'unknown')}${row.fruit_hindi ? ` · ${escapeHtml(row.fruit_hindi)}` : ''}</h3>
      <div class="card-meta">${escapeHtml(row.video_title || row.video_id)}</div>
      <div class="price-grid">
        <div><span>Min</span><strong>₹${escapeHtml(row.min_price_inr)}</strong></div>
        <div><span>Max</span><strong>₹${escapeHtml(row.max_price_inr)}</strong></div>
        <div><span>Unit</span><strong>${escapeHtml(row.unit || '-')}</strong></div>
        <div><span>Time</span><strong>${escapeHtml(row.timestamp_label || secondsToClock(row.timestamp_seconds))}</strong></div>
      </div>
    </article>
  `;

  if (!rows.length) {
    list.innerHTML = '<div class="empty-state">No prices yet. Complete step 3.</div>';
  } else {
    list.innerHTML = rows.map(renderCard).join('');
  }

  const preview = $('pricePreview');
  if (preview) {
    preview.innerHTML = rows.length
      ? rows.slice(0, 6).map(renderCard).join('')
      : '<div class="empty-state">Run AI analysis first.</div>';
  }

  updateUI();
  saveLocal();
}

function renderVideos() {
  renderDateGroups(
    state.videos,
    'videoList',
    'No videos yet. Click “Fetch videos from channel” in step 1.',
  );
  renderDateGroups(
    state.videos.filter(v => isProcessable(v)),
    'transcriptList',
    'No relevant videos. Fetch videos in step 1 first.',
  );
  updateUI();
  saveLocal();
}

function deriveStepStatus() {
  const total = state.videos.length;
  const relevant = state.videos.filter(isProcessable).length;
  const transcriptStats = transcriptQueueStats();
  const done = transcriptStats.ready;
  const pending = transcriptStats.missing;
  const prices = state.priceRows.length;
  const transcriptMeta = pending
    ? [
      transcriptStats.waiting ? `${transcriptStats.waiting} pending` : '',
      transcriptStats.running ? `${transcriptStats.running} running` : '',
      transcriptStats.failed ? `${transcriptStats.failed} failed` : '',
    ].filter(Boolean).join(' · ')
    : done ? `${done} done` : 'Waiting';
  const transcriptDesc = pending
    ? transcriptStats.failed && transcriptStats.waiting
      ? `${transcriptStats.waiting} new and ${transcriptStats.failed} failed transcript(s) need fetching.`
      : transcriptStats.failed
        ? `${transcriptStats.failed} transcript(s) failed. Retry them from this step.`
        : transcriptStats.running
          ? `${transcriptStats.running} transcript(s) currently fetching.`
          : `${transcriptStats.waiting} transcript(s) to fetch.`
    : done ? 'All relevant transcripts fetched.' : 'Fetch all transcripts in the background worker tab.';

  return {
    1: { done: total > 0, meta: total ? `${total} videos` : 'Start here', desc: total ? `${total} videos loaded (${relevant} relevant).` : 'Pull latest videos from the channel.' },
    2: { done: relevant > 0 && pending === 0, meta: transcriptMeta, desc: transcriptDesc },
    3: { done: prices > 0, meta: prices ? `${prices} rows` : 'Waiting', desc: prices ? `${prices} price rows extracted.` : 'Run AI on transcripts to extract mandi prices.' },
    4: { done: Boolean(state.lastSync), meta: state.lastSync ? 'Synced' : 'Waiting', desc: state.lastSync ? `Last pushed ${new Date(state.lastSync).toLocaleString()}` : 'Push results to your website dataset.' },
  };
}

function suggestedStep() {
  if (!state.videos.length) return 1;
  if (pendingTranscripts().length) return 2;
  if (!state.priceRows.length) return 3;
  return 4;
}

function goToStep(step) {
  state.currentStep = step;
  document.querySelectorAll('.step').forEach(el => {
    const n = Number(el.dataset.step);
    el.classList.toggle('active', n === step);
    el.classList.toggle('done', n < step || (deriveStepStatus()[n]?.done && n !== step));
  });
  document.querySelectorAll('.step-panel').forEach(el => el.classList.remove('active'));
  $(`panel-${step}`)?.classList.add('active');
}

function updateUI() {
  const status = deriveStepStatus();
  const transcriptStats = transcriptQueueStats();
  for (let i = 1; i <= 4; i++) {
    const meta = $(`stepMeta${i}`);
    if (meta) meta.textContent = status[i].meta;
    const desc = $(`stepDesc${i}`);
    if (desc) desc.textContent = status[i].desc;
  }

  if ($('statVideos')) $('statVideos').textContent = state.videos.length;
  if ($('statDone')) $('statDone').textContent = transcriptReady().length;
  if ($('statPrices')) $('statPrices').textContent = state.priceRows.length;

  const busy = Boolean(state.runningTask);
  for (let i = 1; i <= 4; i++) setDisabled(`stepBtn${i}`, busy);
  setDisabled('stopTranscriptBatchBtn', !busy);
  if ($('stepBtn2')) {
    $('stepBtn2').textContent = transcriptStats.failed && transcriptStats.waiting
      ? `Start ${transcriptStats.waiting} + retry ${transcriptStats.failed}`
      : transcriptStats.failed
        ? `Start retry for ${transcriptStats.failed} failed transcript${transcriptStats.failed === 1 ? '' : 's'}`
        : transcriptStats.waiting
          ? `Fetch ${transcriptStats.waiting} transcript${transcriptStats.waiting === 1 ? '' : 's'}`
          : 'Fetch all transcripts';
  }

  document.querySelectorAll('.step').forEach(el => {
    const n = Number(el.dataset.step);
    el.classList.toggle('done', status[n].done);
  });

  if ($('syncSummary') && state.lastSync) {
    $('syncSummary').textContent = `Last dataset update: ${new Date(state.lastSync).toLocaleString()} · ${state.priceRows.length} price rows · ${state.videos.length} videos`;
  }
}

function setBusy(busy) {
  state.runningTask = busy ? 'busy' : '';
  updateUI();
}

async function saveLocal() {
  normalizeVideos();
  const payload = {
    videos: state.videos,
    priceRows: state.priceRows,
    lastSync: state.lastSync,
    currentStep: state.currentStep,
  };

  try {
    localStorage.setItem('fruitTranscriptMinerStateV2', JSON.stringify(payload));
  } catch (error) {
    log(`localStorage save failed (${error.message}). Using chrome.storage.`);
  }

  if (chrome.storage?.local) {
    await chrome.storage.local.set({ fruitTranscriptMinerStateV2: payload });
  }
}

async function loadLocal() {
  let saved = null;

  if (chrome.storage?.local) {
    const stored = await chrome.storage.local.get('fruitTranscriptMinerStateV2');
    saved = stored.fruitTranscriptMinerStateV2 || null;
  }

  if (!saved) {
    try {
      saved = JSON.parse(localStorage.getItem('fruitTranscriptMinerStateV2') || '{}');
    } catch {
      saved = {};
    }
  }

  if (Array.isArray(saved.videos)) state.videos = saved.videos;
  if (Array.isArray(saved.priceRows)) state.priceRows = saved.priceRows;
  if (saved.lastSync) state.lastSync = saved.lastSync;
  if (saved.currentStep) state.currentStep = saved.currentStep;

  normalizeVideos();

  const savedKey = localStorage.getItem('fruitTranscriptMinerOpenAIKey') || '';
  if (savedKey && $('openaiKey')) $('openaiKey').value = savedKey;
  renderVideos();
  renderPrices();
  goToStep(state.currentStep || suggestedStep());
}

async function markVideosProcessed(videoIds) {
  if (!videoIds.length) return;
  await chrome.runtime.sendMessage({ type: 'api', path: '/api/mark-processed', body: { videoIds } });
}

async function classifyCurrentVideos() {
  const apiKey = ($('openaiKey')?.value || '').trim();
  const model = ($('openaiModel')?.value || 'gpt-4o-mini').trim();
  const data = await api('/api/classify-videos', { videos: state.videos, apiKey, model });
  const byId = new Map(data.videos.map(video => [video.id, video]));
  state.videos = state.videos.map(video => ({ ...video, ...byId.get(video.id) }));
  const skipped = state.videos.filter(video => video.status === 'skipped').map(video => video.id);
  if (skipped.length) await markVideosProcessed(skipped);
  renderVideos();
  return data;
}

async function fetchVideosStep() {
  const channelUrl = ($('channelUrl')?.value || '').trim();
  const maxVideos = Number($('maxVideos')?.value || 25);

  try {
    const check = await api('/api/check-new-videos', {
      channelUrl,
      maxVideos,
      pollIntervalMinutes: Number($('pollIntervalMinutes')?.value || 360),
      notificationsEnabled: $('notificationsEnabled')?.checked !== false,
    });
    if (check.videos?.length) {
      const merged = new Map(state.videos.map(video => [video.id, video]));
      for (const video of check.videos) merged.set(video.id, { ...merged.get(video.id), ...video });
      state.videos = [...merged.values()];
      log(check.newCount ? `Found ${check.newCount} new video(s).` : `Loaded ${check.videos.length} videos.`);
    }
  } catch {
    const data = await api('/api/list-videos', { channelUrl, maxVideos });
    state.videos = data.videos;
    log(`Fetched ${data.count} videos.`);
  }

  await classifyCurrentVideos();
  renderVideos();
  goToStep(2);
}

async function fetchTranscriptsStep() {
  const delayMs = Number($('delayMs')?.value || 1500);
  const pending = pendingTranscripts();
  if (!pending.length) {
    log('No pending transcripts.');
    goToStep(3);
    return;
  }

  await saveLocal();
  log(`Fetching ${pending.length} transcript(s) in background — your current tab will not switch.`);

  const data = await api('/api/fetch-transcripts-batch', {
    delayMs,
    languages: ($('languages')?.value || 'hi.*,hi,en.*').trim(),
  });

  if (data.alreadyRunning) {
    log('Transcript batch already running. Use Stop to pause it.');
    setBusy(true);
    return;
  }

  if (!data.started) {
    goToStep(3);
    return;
  }

  setBusy(true);
  goToStep(2);
}

async function stopTranscriptsStep() {
  const data = await api('/api/stop-transcripts-batch', { reason: 'Stopped by user.' });
  if (data.stopped) {
    setBusy(false);
    normalizeVideos();
    renderVideos();
    log('Transcript batch stopped.');
  }
}

function applySavedProject(saved, { keepRunning } = {}) {
  if (!saved) return;
  if (Array.isArray(saved.videos)) state.videos = saved.videos;
  if (Array.isArray(saved.priceRows)) state.priceRows = saved.priceRows;
  if (saved.lastSync) state.lastSync = saved.lastSync;
  if (saved.currentStep) state.currentStep = saved.currentStep;
  const preserveRunning = keepRunning ?? (saved.videos || []).some(video => video.status === 'running');
  normalizeVideos({ keepRunning: preserveRunning });
  renderVideos();
  renderPrices();
  updateUI();
}

function syncFromStorageChanges(changes) {
  const batchRunning = Boolean(changes.transcriptBatchJob?.newValue?.running);
  if (changes.transcriptBatchJob?.newValue) {
    state.batchRunning = batchRunning;
  }

  if (changes.fruitTranscriptMinerStateV2?.newValue) {
    applySavedProject(changes.fruitTranscriptMinerStateV2.newValue, {
      keepRunning: state.batchRunning || batchRunning,
    });
    if (state.currentStep) goToStep(state.currentStep);
  }

  if (changes.transcriptBatchJob?.newValue) {
    const job = changes.transcriptBatchJob.newValue;
    setBusy(Boolean(job?.running));
    if (!job?.running && job?.stoppedAt) {
      log('Transcript batch stopped.');
      return;
    }
    if (!job?.running && job?.finishedAt) {
      log(`Background transcript batch finished (${job.done || 0}/${job.total || 0}).`);
      goToStep(3);
    }
  }
}

async function aiAnalysisStep() {
  const items = transcriptReady();
  if (!items.length) throw new Error('No transcripts ready. Complete step 2 first.');

  const apiKey = ($('openaiKey')?.value || '').trim();
  if (apiKey) localStorage.setItem('fruitTranscriptMinerOpenAIKey', apiKey);

  if (apiKey) {
    const data = await api('/api/extract-prices-ai', {
      items,
      apiKey,
      model: ($('openaiModel')?.value || 'gpt-4o-mini').trim(),
      maxVideos: Number($('aiMaxVideos')?.value || items.length),
      maxCharsPerCall: Number($('aiMaxChars')?.value || 10000),
    });
    state.priceRows = data.rows;
    log(`AI extracted ${data.count} price rows.`);
  } else {
    const data = await api('/api/extract-prices', { items });
    state.priceRows = data.rows;
    log(`Regex extracted ${data.count} rows. Add OpenAI key in Settings for better results.`);
  }

  renderPrices();
  goToStep(4);
}

async function updateDatasetStep() {
  const { siteUrl, token } = {
    siteUrl: ($('syncSiteUrl')?.value || localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '').trim().replace(/\/$/, ''),
    token: ($('syncToken')?.value || localStorage.getItem('fruitTranscriptMinerSyncToken') || '').trim(),
  };
  if (!siteUrl) throw new Error('Set your Netlify URL in Settings first.');
  localStorage.setItem('fruitTranscriptMinerSyncSiteUrl', siteUrl);
  if (token) localStorage.setItem('fruitTranscriptMinerSyncToken', token);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${siteUrl}/api/data`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      channelUrl: ($('channelUrl')?.value || '').trim(),
      videos: state.videos,
      priceRows: state.priceRows,
      knownVideoIds: state.videos.map(v => v.id),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Sync failed: ${res.status}`);

  state.lastSync = new Date().toISOString();
  if ($('syncSummary')) {
    $('syncSummary').textContent = `Dataset updated · ${data.counts.videos} videos · ${data.counts.priceRows} price rows`;
  }
  log(`Dataset updated on website.`);
  updateUI();
  saveLocal();
}

async function loadWatchSettings() {
  const data = await chrome.runtime.sendMessage({ type: 'api', path: '/api/channel-settings', body: { method: 'get' } });
  if (!data?.ok) return;
  const settings = data.settings || {};
  if ($('pollIntervalMinutes')) $('pollIntervalMinutes').value = settings.pollIntervalMinutes || 360;
  if ($('notificationsEnabled')) $('notificationsEnabled').checked = settings.notificationsEnabled !== false;
  if ($('lastPollText')) {
    $('lastPollText').textContent = settings.lastPollAt
      ? `Last check: ${new Date(settings.lastPollAt).toLocaleString()}`
      : 'Last check: never';
  }
}

document.querySelectorAll('.step').forEach(btn => {
  btn.addEventListener('click', () => goToStep(Number(btn.dataset.step)));
});

$('stepBtn1')?.addEventListener('click', async () => {
  try { setBusy(true); await fetchVideosStep(); }
  catch (e) { log(`Step 1 failed: ${e.message}`); }
  finally { setBusy(false); }
});

$('stepBtn2')?.addEventListener('click', async () => {
  try { await fetchTranscriptsStep(); }
  catch (e) { log(`Step 2 failed: ${e.message}`); setBusy(false); }
});

$('stopTranscriptBatchBtn')?.addEventListener('click', async () => {
  try { await stopTranscriptsStep(); }
  catch (e) { log(`Stop failed: ${e.message}`); }
});

$('stepBtn3')?.addEventListener('click', async () => {
  try { setBusy(true); await aiAnalysisStep(); }
  catch (e) { log(`Step 3 failed: ${e.message}`); }
  finally { setBusy(false); }
});

$('stepBtn4')?.addEventListener('click', async () => {
  try { setBusy(true); await updateDatasetStep(); }
  catch (e) { log(`Step 4 failed: ${e.message}`); }
  finally { setBusy(false); }
});

$('saveWatchBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await api('/api/channel-settings', {
      method: 'set',
      channelUrl: ($('channelUrl')?.value || '').trim(),
      pollIntervalMinutes: Number($('pollIntervalMinutes')?.value || 360),
      notificationsEnabled: $('notificationsEnabled')?.checked !== false,
    });
    log('Watch settings saved.');
    await loadWatchSettings();
  } catch (e) { log(e.message); }
  finally { setBusy(false); }
});

$('pullDataBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    const siteUrl = ($('syncSiteUrl')?.value || '').trim().replace(/\/$/, '');
    if (!siteUrl) throw new Error('Set Netlify URL first.');
    const res = await fetch(`${siteUrl}/api/data`);
    const data = await res.json();
    if (Array.isArray(data.data?.videos)) state.videos = data.data.videos;
    if (Array.isArray(data.data?.priceRows)) state.priceRows = data.data.priceRows;
    renderVideos();
    renderPrices();
    log('Loaded from website.');
  } catch (e) { log(e.message); }
  finally { setBusy(false); }
});

$('exportJsonBtn')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fruit_project.json';
  a.click();
});

$('clearBtn')?.addEventListener('click', () => {
  if (!confirm('Clear all local data?')) return;
  state.videos = [];
  state.priceRows = [];
  state.lastSync = null;
  if ($('log')) $('log').textContent = '';
  renderVideos();
  renderPrices();
  goToStep(1);
});

$('videoSearch')?.addEventListener('input', renderVideos);
$('priceSearch')?.addEventListener('input', renderPrices);

document.addEventListener('click', (event) => {
  const openBtn = event.target.closest('[data-open-transcript]');
  if (openBtn) {
    event.preventDefault();
    openTranscriptModal(openBtn.dataset.openTranscript).catch((error) => {
      log(`Transcript popup failed: ${error.message}`);
    });
    return;
  }
  if (event.target.closest('[data-close-modal]') || event.target.closest('#modalClose')) {
    closeTranscriptModal();
  }
});

$('modalSearch')?.addEventListener('input', () => {
  const video = state.videos.find(v => v.id === modalVideoId);
  if (video) renderModalSegments(video);
});

$('modalCapture')?.addEventListener('click', () => {
  captureTranscriptFromModal().catch((error) => {
    log(`Transcript capture failed: ${error.message}`);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeTranscriptModal();
});

if ($('syncSiteUrl')) $('syncSiteUrl').value = localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '';
if ($('syncToken')) $('syncToken').value = localStorage.getItem('fruitTranscriptMinerSyncToken') || '';

loadLocal().catch((error) => log(`Load failed: ${error.message}`));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  syncFromStorageChanges(changes);
});

const CAPTURE_STAGE_LABELS = {
  quick: 'Checking active YouTube tab',
  worker: 'Working in background worker tab',
  load: 'Loading video in background',
  fetch: 'Fetching captions in background',
  done: 'Capture complete',
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'capture-progress' && message.videoId === modalVideoId) {
    const label = CAPTURE_STAGE_LABELS[message.stage] || message.stage || 'Working';
    const text = message.detail || label;
    if ($('modalMeta')) $('modalMeta').textContent = text;
    if ($('modalSegments')) {
      $('modalSegments').innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
    }
    return;
  }
  if (message?.type !== 'transcript-batch-event') return;
  if (message.event === 'complete') {
    setBusy(false);
    goToStep(3);
    log(`Transcript batch complete (${message.done || 0} videos).`);
    return;
  }
  if (message.event === 'next') {
    setBusy(true);
    log(`Opened next missing video: ${message.title || message.videoId} (${message.done || 0}/${message.total || 0} done).`);
    return;
  }
  if (message.event === 'progress') {
    if (message.status === 'running') {
      log(`Fetching transcript: ${message.title || message.videoId}...`);
      return;
    }
    if (message.status === 'ok') {
      log(`Transcript loaded: ${message.title || message.videoId} (${message.segmentCount || 0} lines${message.method ? ` · ${message.method}` : ''})`);
      return;
    }
    if (message.status === 'failed') {
      log(`Transcript failed: ${message.title || message.videoId}: ${message.error || 'unknown error'}`);
    }
  }
});

api('/api/transcript-batch-status').then((data) => {
  state.batchRunning = Boolean(data?.job?.running);
  if (data?.job?.running) {
    setBusy(true);
    normalizeVideos({ keepRunning: true });
    renderVideos();
  } else {
    normalizeVideos();
    renderVideos();
  }
}).catch(() => {});
loadWatchSettings();

(async () => {
  try {
    const data = await api('/api/status');
    if ($('statusText')) $('statusText').textContent = 'Transcript fetch v1.5.23 — fixed inject + full fetch';
  } catch (error) {
    if ($('statusText')) $('statusText').textContent = 'Reload extension at chrome://extensions';
    log(error.message);
  }
})();
