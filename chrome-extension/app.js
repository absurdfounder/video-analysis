const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const state = {
  videos: [],
  priceRows: [],
  videoAnalysis: {},
  runningTask: '',
  currentStep: 1,
  lastSync: null,
  batchRunning: false,
  batchLogCursor: 0,
  batchJob: null,
  aiBatchRunning: false,
  aiBatchJob: null,
  aiBatchLogCursor: 0,
  chatMessages: [],
  vectorIndexStatus: null,
  chatBusy: false,
};

const $ = (id) => document.getElementById(id);

function getOpenAiKey() {
  const fromInput = ($('openaiKey')?.value || '').trim();
  if (fromInput) return fromInput;
  return (localStorage.getItem('fruitTranscriptMinerOpenAIKey') || '').trim();
}

async function persistOpenAiKey() {
  const key = getOpenAiKey();
  if (key) localStorage.setItem('fruitTranscriptMinerOpenAIKey', key);
  else localStorage.removeItem('fruitTranscriptMinerOpenAIKey');
  if (chrome.storage?.local) {
    if (key) await chrome.storage.local.set({ fruitTranscriptMinerOpenAIKey: key });
    else await chrome.storage.local.remove('fruitTranscriptMinerOpenAIKey');
  }
}

async function applyOpenAiKeyToInput() {
  if (!$('openaiKey')) return;
  let saved = (localStorage.getItem('fruitTranscriptMinerOpenAIKey') || '').trim();
  if (!saved && chrome.storage?.local) {
    const stored = await chrome.storage.local.get('fruitTranscriptMinerOpenAIKey');
    saved = (stored.fruitTranscriptMinerOpenAIKey || '').trim();
    if (saved) localStorage.setItem('fruitTranscriptMinerOpenAIKey', saved);
  }
  if (saved) $('openaiKey').value = saved;
}

function setDisabled(id, disabled) {
  const el = $(id);
  if (el) el.disabled = disabled;
}

function log(message, { level = 'info' } = {}) {
  const box = $('log');
  if (!box) return;
  const now = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;
  entry.innerHTML = `
    <span class="log-time">${escapeHtml(now)}</span>
    <span class="log-level">${escapeHtml(level)}</span>
    <span class="log-message">${escapeHtml(message)}</span>
  `;
  box.append(entry);
  while (box.children.length > 250) box.firstElementChild?.remove();
  box.scrollTop = box.scrollHeight;
}

function syncBatchLogFromJob(job) {
  if (!Array.isArray(job?.log)) return;
  const cursor = state.batchLogCursor || 0;
  for (const entry of job.log.slice(cursor)) {
    log(entry.message, { level: entry.level || 'info' });
  }
  state.batchLogCursor = job.log.length;
}

function updateAnalysisStatusUI(job) {
  const el = $('analysisStatusText');
  if (!el) return;
  const analysisStats = analysisQueueStats();
  if (!job?.running) {
    if (job?.finishedAt) {
      const stillPending = analysisStats.waiting + analysisStats.failed;
      if (stillPending > 0) {
        el.textContent = `Analysis incomplete · ${stillPending} still pending. Click Analyze again.`;
        return;
      }
      const failed = job.failed || 0;
      el.textContent = failed
        ? `Analysis finished with ${failed} failed video(s). Retry from this step.`
        : 'Analysis finished.';
    } else if (job?.stoppedAt) {
      el.textContent = `Analysis stopped${job.stopReason ? `: ${job.stopReason}` : '.'}`;
    } else {
      el.textContent = analysisStats.waiting
        ? `${analysisStats.waiting} transcript(s) ready to analyze.`
        : '';
    }
    return;
  }
  const done = job.done || 0;
  const total = job.total || 0;
  const remaining = Array.isArray(job.queue) ? job.queue.length : 0;
  const current = job.currentTitle || job.currentId || 'next video';
  const progress = job.lastProgress ? ` · ${job.lastProgress}` : '';
  const err = job.lastError ? ` Last error: ${job.lastError}` : '';
  el.textContent = `Analyzing ${done}/${total} done · ${remaining} left · now: ${current}.${progress}${err}`;
}

function syncAiBatchLogFromJob(job) {
  if (!Array.isArray(job?.log)) return;
  const cursor = state.aiBatchLogCursor || 0;
  for (const entry of job.log.slice(cursor)) {
    log(entry.message, { level: entry.level || 'info' });
  }
  state.aiBatchLogCursor = job.log.length;
}
function updateBatchStatusUI(job) {
  const el = $('batchStatusText');
  if (!el) return;
  if (!job?.running) {
    if (job?.finishedAt) {
      const failed = job.failed || 0;
      el.textContent = failed
        ? `Batch finished with ${failed} failed item(s). Check Activity log and retry failed rows.`
        : 'Batch finished.';
    } else if (job?.stoppedAt) {
      el.textContent = `Batch stopped${job.stopReason ? `: ${job.stopReason}` : '.'}`;
    } else {
      el.textContent = '';
    }
    return;
  }

  const done = job.done || 0;
  const total = job.total || 0;
  const remaining = Array.isArray(job.queue) ? job.queue.length : 0;
  const current = job.currentTitle || job.currentId || 'next video';
  const err = job.lastError ? ` Last error: ${job.lastError}` : '';
  el.textContent = `Batch running ${done}/${total} done · ${remaining} left · now: ${current}.${err}`;
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

function safeVideoId(value) {
  const text = String(value || '').trim();
  const direct = text.match(/^[a-zA-Z0-9_-]{6,}$/);
  if (direct) return text;
  const fromWatch = text.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (fromWatch) return fromWatch[1];
  const fromShort = text.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  return fromShort ? fromShort[1] : '';
}

function videoThumbnailUrl(video) {
  const id = safeVideoId(video?.id || video?.url);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '';
}

function renderVideoThumb(video) {
  const src = videoThumbnailUrl(video);
  if (!src) return '<div class="video-thumb video-thumb-empty" aria-hidden="true"></div>';
  const title = escapeHtml(video.title || video.id || 'YouTube video');
  return `
    <a class="video-thumb" href="${escapeHtml(video.url || `https://www.youtube.com/watch?v=${video.id}`)}" target="_blank" rel="noreferrer" aria-label="Open ${title}">
      <img src="${escapeHtml(src)}" alt="${title}" loading="lazy" />
    </a>
  `;
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

function normalizeVideos({ keepRunning = false, keepAiRunning = false } = {}) {
  for (const video of state.videos) {
    if (!keepRunning && video.status === 'running') video.status = 'pending';
    if (!keepAiRunning && video.priceStatus === 'running') video.priceStatus = 'pending';
    if (video.status === 'ok' && !hasTranscriptData(video)) video.status = 'pending';
    if (hasTranscriptData(video)) video.status = 'ok';
    if (hasTranscriptData(video) && !video.priceStatus) video.priceStatus = 'pending';
    if (!hasTranscriptData(video) && video.priceStatus === 'pending') video.priceStatus = '';
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

function displayPriceStatus(video) {
  if (!hasTranscriptData(video)) return 'no-transcript';
  if (video.priceStatus === 'running') return 'running';
  if (video.priceStatus === 'ok') return 'ok';
  if (video.priceStatus === 'failed') return 'failed';
  if (video.priceStatus === 'skipped') return 'skipped';
  return 'pending';
}

function analysisListVideos() {
  return state.videos
    .filter((video) => isProcessable(video) && hasTranscriptData(video))
    .sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));
}

function analysisQueueStats() {
  const stats = { ready: 0, waiting: 0, running: 0, failed: 0, missing: 0, total: 0 };
  for (const video of analysisListVideos()) {
    stats.total++;
    const priceStatus = displayPriceStatus(video);
    if (priceStatus === 'ok') stats.ready++;
    else if (priceStatus === 'running') stats.running++;
    else if (priceStatus === 'failed') stats.failed++;
    else stats.waiting++;
  }
  stats.missing = stats.waiting + stats.running + stats.failed;
  return stats;
}

function pendingAnalysis() {
  return analysisListVideos().filter((video) => displayPriceStatus(video) !== 'ok');
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

function getVideoAnalysisMeta(video) {
  if (video?.analysisMeta?.video_id) return video.analysisMeta;
  if (state.videoAnalysis?.[video.id]) return state.videoAnalysis[video.id];
  return null;
}

function renderVideoAnalysisBody(video, { compact = false } = {}) {
  const meta = getVideoAnalysisMeta(video);
  if (!meta?.fruits?.length) return '';

  const partyTags = (meta.parties || []).slice(0, compact ? 4 : 8)
    .map((party) => tag(party, 'relevance-relevant')).join('');
  const areaTags = (meta.areas || []).slice(0, compact ? 4 : 8)
    .map((area) => tag(area, 'relevance-relevant')).join('');

  const fruitBlocks = meta.fruits.slice(0, compact ? 4 : 12).map((fruit) => {
    const mentionLinks = fruit.mentions.slice(0, compact ? 3 : 8).map((mention) => {
      const price = formatPriceRange(mention.min_price_inr, mention.max_price_inr);
      const detail = [mention.quality_grade, mention.party_name, price !== 'Rate not stated' ? price : '']
        .filter(Boolean).join(' · ');
      return `<a class="timestamp-link" href="${escapeHtml(mention.timestamp_url)}" target="_blank" rel="noreferrer">▶ ${escapeHtml(mention.timestamp_label)}${detail ? ` · ${escapeHtml(detail)}` : ''}</a>`;
    }).join('');

    const gradeTags = (fruit.quality_grades || []).map((grade) => tag(`Grade ${grade}`, 'relevance-relevant')).join('');
    const fruitParties = (fruit.parties || []).slice(0, 3).map((party) => tag(party, 'relevance-relevant')).join('');

    return `
      <section class="video-fruit-block">
        <div class="video-fruit-head">
          <strong>${escapeHtml(fruit.fruit)}${fruit.fruit_hindi ? ` · ${escapeHtml(fruit.fruit_hindi)}` : ''}</strong>
          <span>${escapeHtml(formatPriceRange(fruit.min_price_inr, fruit.max_price_inr))}${fruit.unit && fruit.unit !== 'unknown' ? ` / ${escapeHtml(fruit.unit)}` : ''}</span>
        </div>
        <div class="card-tags">${gradeTags}${fruitParties}</div>
        ${mentionLinks ? `<div class="video-mention-links">${mentionLinks}</div>` : ''}
        ${fruit.mentions[0]?.line ? `<div class="price-hindi">${escapeHtml(fruit.mentions[0].line)}</div>` : ''}
      </section>
    `;
  }).join('');

  return `
    <div class="video-analysis-body ${compact ? 'is-compact' : ''}">
      ${partyTags ? `<div class="analysis-meta-row"><span class="analysis-meta-label">Parties</span><div class="card-tags">${partyTags}</div></div>` : ''}
      ${areaTags ? `<div class="analysis-meta-row"><span class="analysis-meta-label">Areas</span><div class="card-tags">${areaTags}</div></div>` : ''}
      <div class="video-fruit-list">${fruitBlocks}</div>
    </div>
  `;
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

  const analysisMeta = getVideoAnalysisMeta(video);
  const analysisPreview = analysisMeta && displayPriceStatus(video) === 'ok'
    ? renderVideoAnalysisBody(video, { compact: true })
    : '';

  return `
    <article class="video-card status-${status} ${video.isNew ? 'is-new' : ''} ${status === 'skipped' ? 'is-skipped' : ''} ${hasData ? 'has-transcript' : ''} ${analysisMeta ? 'has-analysis' : ''}">
      ${renderVideoThumb(video)}
      <div class="video-card-main">
        <h3><a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">${escapeHtml(video.title || video.id)}</a></h3>
        <div class="card-tags">
          ${video.channelIndex ? tag(`#${video.channelIndex}`, 'channel-index') : ''}
          ${tag(status, status)}
          ${tag(video.relevance || 'unclassified', `relevance-${video.relevance || 'unclassified'}`)}
          ${hasData ? tag(`${segCount} lines`, 'relevance-relevant') : ''}
          ${analysisMeta ? tag(`${analysisMeta.mention_count} mention${analysisMeta.mention_count === 1 ? '' : 's'}`, 'ok') : ''}
          ${analysisMeta?.fruits?.length ? tag(`${analysisMeta.fruits.length} fruit${analysisMeta.fruits.length === 1 ? '' : 's'}`, 'relevance-relevant') : ''}
        </div>
        ${analysisPreview}
        ${video.relevanceReason ? `<div class="mini">${escapeHtml(video.relevanceReason)}</div>` : ''}
        ${showBtn ? `
          <div class="card-actions">
            <a class="btn-open-youtube" href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">Open YouTube</a>
            <button type="button" class="btn-view-transcript" data-open-transcript="${escapeHtml(video.id)}">${escapeHtml(btnLabel)}</button>
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

function renderVideoIndexList(videos, containerId, emptyMessage) {
  const container = $(containerId);
  if (!container) return;

  const q = (containerId === 'videoList' ? ($('videoSearch')?.value || '') : '').toLowerCase().trim();
  const filtered = videos.filter((v) => {
    if (!q) return true;
    const hay = [v.title, v.status, v.relevance, v.channelIndex, parseVideoDate(v).label].join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));
  container.innerHTML = sorted.map((video) => renderVideoCard(video)).join('');
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

function renderAnalysisCard(video) {
  const priceStatus = displayPriceStatus(video);
  const analysisMeta = getVideoAnalysisMeta(video);
  const rowCount = Number(video.priceRowCount || 0);
  const videoRows = state.priceRows.filter((row) => row.video_id === video.id).length;
  const shownRows = analysisMeta?.mention_count || rowCount || videoRows;
  const marketDay = analysisMeta?.market_date || parseVideoDate(video).label;
  const fruitList = analysisMeta?.fruits?.map((fruit) => fruit.fruit)
    || (Array.isArray(video.analysisSummary?.fruits) ? video.analysisSummary.fruits : []);
  const partyCount = analysisMeta?.parties?.length
    || (Array.isArray(video.analysisSummary?.parties) ? video.analysisSummary.parties.length : 0);
  const areaCount = analysisMeta?.areas?.length
    || (Array.isArray(video.analysisSummary?.areas) ? video.analysisSummary.areas.length : 0);
  const statusLabel = priceStatus === 'ok'
    ? 'analyzed'
    : priceStatus === 'running'
      ? 'analyzing'
      : priceStatus === 'failed'
        ? 'failed'
        : priceStatus === 'no-transcript'
          ? 'no transcript'
          : 'pending';
  const analysisBody = priceStatus === 'ok' ? renderVideoAnalysisBody(video) : '';

  const queuePos = state.aiBatchRunning && Array.isArray(state.aiBatchJob?.queue)
    ? state.aiBatchJob.queue.indexOf(video.id)
    : -1;
  const isCurrent = state.aiBatchRunning && state.aiBatchJob?.currentId === video.id;
  const canAnalyzeOne = (priceStatus === 'pending' || priceStatus === 'failed') && !state.aiBatchRunning && !state.runningTask;

  return `
    <article class="video-card analysis-${priceStatus} ${isCurrent || priceStatus === 'running' ? 'is-running' : ''} ${priceStatus === 'ok' ? 'has-transcript has-analysis' : ''}" data-video-id="${escapeHtml(video.id)}">
      ${renderVideoThumb(video)}
      <div class="video-card-main">
        <h3>
          ${video.channelIndex ? `<span class="channel-index-label">#${video.channelIndex}</span> ` : ''}
          <a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">${escapeHtml(video.title || video.id)}</a>
        </h3>
        <div class="card-meta">${escapeHtml(marketDay)}${analysisMeta?.source ? ` · ${escapeHtml(analysisMeta.source)} extraction` : ''}</div>
        <div class="card-tags">
          ${tag(statusLabel, priceStatus === 'ok' ? 'ok' : priceStatus)}
          ${tag(`${segmentCount(video)} lines`, 'relevance-relevant')}
          ${shownRows ? tag(`${shownRows} mention${shownRows === 1 ? '' : 's'}`, 'relevance-relevant') : ''}
          ${fruitList.length ? tag(`${fruitList.length} fruit${fruitList.length === 1 ? '' : 's'}`, 'relevance-relevant') : ''}
          ${partyCount ? tag(`${partyCount} part${partyCount === 1 ? 'y' : 'ies'}`, 'relevance-relevant') : ''}
          ${areaCount ? tag(`${areaCount} area${areaCount === 1 ? '' : 's'}`, 'relevance-relevant') : ''}
          ${queuePos >= 0 && state.aiBatchRunning ? tag(`queue #${queuePos + 1}`, isCurrent ? 'running' : 'relevance-relevant') : ''}
          ${isCurrent ? tag('processing now', 'running') : ''}
        </div>
        ${fruitList.length && !analysisBody ? `<div class="analysis-summary-line">${fruitList.slice(0, 8).map((fruit) => tag(fruit, 'relevance-relevant')).join('')}</div>` : ''}
        ${analysisBody}
        ${canAnalyzeOne ? `
          <div class="card-actions-row">
            <button type="button" class="btn-secondary btn-analyze-one" data-analyze-one="${escapeHtml(video.id)}">
              Analyze this video
            </button>
          </div>
        ` : ''}
        ${video.priceError ? `<div class="mini error-text">${escapeHtml(video.priceError)}</div>` : ''}
      </div>
    </article>
  `;
}

function formatPriceRange(min, max) {
  const hasMin = min !== '' && min !== null && min !== undefined;
  const hasMax = max !== '' && max !== null && max !== undefined;
  if (!hasMin && !hasMax) return 'Rate not stated';
  const low = hasMin ? Number(min) : Number(max);
  const high = hasMax ? Number(max) : Number(min);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return 'Rate not stated';
  if (low === high) return `₹${low}`;
  return `₹${low} – ₹${high}`;
}

function parsePriceRowDate(row) {
  if (row.market_date_sort && row.market_date) {
    return { sortKey: row.market_date_sort, label: row.market_date };
  }
  const video = state.videos.find((item) => item.id === row.video_id);
  if (video) return parseVideoDate(video);
  return { sortKey: '0000-00-00', label: row.market_date || 'Unknown date' };
}

function groupPriceRows(rows) {
  const byDate = new Map();
  for (const row of rows) {
    const { sortKey, label } = parsePriceRowDate(row);
    if (!byDate.has(sortKey)) {
      byDate.set(sortKey, { sortKey, label, fruits: new Map(), rows: [] });
    }
    const group = byDate.get(sortKey);
    group.rows.push(row);
    const fruitKey = [row.fruit, row.fruit_hindi].filter(Boolean).join(' / ').toLowerCase() || 'unknown';
    if (!group.fruits.has(fruitKey)) {
      group.fruits.set(fruitKey, {
        key: fruitKey,
        fruit: row.fruit || row.fruit_hindi || 'unknown',
        fruitHindi: row.fruit_hindi || '',
        rows: [],
      });
    }
    group.fruits.get(fruitKey).rows.push(row);
  }
  return [...byDate.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map((row) => String(row[field] || '').trim()).filter(Boolean))];
}

function renderRichPriceRow(row) {
  const timeLabel = row.timestamp_label || secondsToClock(row.timestamp_seconds);
  const timeUrl = row.timestamp_url || timestampUrl(row.video_url, row.timestamp_seconds);
  const detailBadges = [
    row.quality_grade ? tag(`Grade ${row.quality_grade}`, 'relevance-relevant') : '',
    row.quality_label ? tag(row.quality_label, 'relevance-relevant') : '',
    row.party_name ? tag(row.party_name, 'relevance-relevant') : '',
    row.area_name ? tag(row.area_name, 'relevance-relevant') : '',
    row.mandi_name ? tag(row.mandi_name, 'relevance-relevant') : '',
    row.variety ? tag(row.variety, 'relevance-relevant') : '',
    row.origin ? tag(row.origin, 'relevance-relevant') : '',
  ].filter(Boolean).join('');

  return `
    <article class="price-card price-rich">
      <div class="price-head">
        <a class="timestamp-link" href="${escapeHtml(timeUrl)}" target="_blank" rel="noreferrer">▶ ${escapeHtml(timeLabel)}</a>
        <div class="card-tags">${detailBadges}</div>
      </div>
      <div class="price-amount">${escapeHtml(formatPriceRange(row.min_price_inr, row.max_price_inr))}${row.unit && row.unit !== 'unknown' ? ` <span class="price-unit">/ ${escapeHtml(row.unit)}</span>` : ''}</div>
      ${row.price_notes ? `<div class="price-note">${escapeHtml(row.price_notes)}</div>` : ''}
      ${row.clean_hindi_line || row.original_line ? `<div class="price-hindi">${escapeHtml(row.clean_hindi_line || row.original_line)}</div>` : ''}
      ${row.context ? `<div class="price-context">${escapeHtml(row.context)}</div>` : ''}
      <div class="price-meta">
        <a href="${escapeHtml(row.video_url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(row.video_title || row.video_id || 'Video')}</a>
        ${row.confidence ? ` · ${escapeHtml(row.confidence)} confidence` : ''}
      </div>
    </article>
  `;
}

function renderGroupedPrices(rows) {
  const groups = groupPriceRows(rows);
  return groups.map((group) => {
    const fruitCount = group.fruits.size;
    const partyCount = uniqueValues(group.rows, 'party_name').length;
    const areaCount = uniqueValues(group.rows, 'area_name').length + uniqueValues(group.rows, 'mandi_name').length;
    const fruitSections = [...group.fruits.values()]
      .sort((a, b) => a.fruit.localeCompare(b.fruit))
      .map((fruitGroup) => `
        <section class="fruit-group">
          <h4 class="fruit-group-head">
            ${escapeHtml(fruitGroup.fruit)}${fruitGroup.fruitHindi ? ` · ${escapeHtml(fruitGroup.fruitHindi)}` : ''}
            <span>${fruitGroup.rows.length} mention${fruitGroup.rows.length === 1 ? '' : 's'}</span>
          </h4>
          <div class="card-list">${fruitGroup.rows
            .slice()
            .sort((a, b) => (Number(a.timestamp_seconds) || 0) - (Number(b.timestamp_seconds) || 0))
            .map(renderRichPriceRow)
            .join('')}</div>
        </section>
      `).join('');

    return `
      <section class="date-group">
        <header class="date-group-head">
          <h3>${escapeHtml(group.label)}</h3>
          <span>${fruitCount} fruit${fruitCount === 1 ? '' : 's'} · ${group.rows.length} mention${group.rows.length === 1 ? '' : 's'}${partyCount ? ` · ${partyCount} part${partyCount === 1 ? 'y' : 'ies'}` : ''}${areaCount ? ` · ${areaCount} area${areaCount === 1 ? '' : 's'}` : ''}</span>
        </header>
        <div class="fruit-sections">${fruitSections}</div>
      </section>
    `;
  }).join('');
}

function renderPrices() {
  const list = $('priceList');
  if (!list) return;

  const q = ($('priceSearch')?.value || '').toLowerCase().trim();
  const rows = state.priceRows.filter(row => !q || Object.values(row).join(' ').toLowerCase().includes(q));

  if (!rows.length) {
    list.innerHTML = '<div class="empty-state">No prices yet. Complete step 3.</div>';
  } else {
    list.innerHTML = renderGroupedPrices(rows);
  }

  const preview = $('pricePreview');
  if (preview) {
    preview.innerHTML = rows.length
      ? renderGroupedPrices(rows.slice(0, 24))
      : '<div class="empty-state">Run AI analysis first.</div>';
  }

  if ($('priceRowCountLabel')) $('priceRowCountLabel').textContent = String(state.priceRows.length);

  updateUI();
}

function renderAnalysisList() {
  const container = $('analysisList');
  if (!container) return;

  const q = ($('analysisSearch')?.value || '').toLowerCase().trim();
  const videos = analysisListVideos().filter((video) => {
    if (!q) return true;
    const hay = [video.title, video.priceStatus, video.channelIndex, video.priceError].join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (!videos.length) {
    container.innerHTML = '<div class="empty-state">No transcripts ready. Complete step 2 first.</div>';
    return;
  }

  const groups = groupVideosByDate(videos);
  container.innerHTML = groups.map((group) => `
    <section class="date-group">
      <header class="date-group-head">
        <h3>${escapeHtml(group.label)}</h3>
        <span>${group.videos.length} video${group.videos.length === 1 ? '' : 's'}</span>
      </header>
      <div class="card-list">
        ${group.videos
          .sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999))
          .map((video) => renderAnalysisCard(video))
          .join('')}
      </div>
    </section>
  `).join('');

  const runningId = state.aiBatchJob?.currentId;
  if (runningId) {
    const runningCard = container.querySelector(`[data-video-id="${runningId}"]`);
    runningCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderAll() {
  renderAnalysisList();
  renderVideos();
  renderPrices();
}

function renderVideos() {
  renderVideoIndexList(
    state.videos,
    'videoList',
    'No videos yet. Click “Fetch full channel index” in step 1.',
  );
  renderDateGroups(
    state.videos.filter(v => isProcessable(v)),
    'transcriptList',
    'No relevant videos. Fetch videos in step 1 first.',
  );
  renderAnalysisList();
  updateUI();
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

  const analysisStats = analysisQueueStats();
  const analysisMeta = analysisStats.missing
    ? [
      analysisStats.waiting ? `${analysisStats.waiting} pending` : '',
      analysisStats.running ? `${analysisStats.running} running` : '',
      analysisStats.failed ? `${analysisStats.failed} failed` : '',
    ].filter(Boolean).join(' · ')
    : analysisStats.ready ? `${analysisStats.ready} analyzed` : 'Waiting';
  const analysisDesc = analysisStats.missing
    ? analysisStats.failed && analysisStats.waiting
      ? `${analysisStats.waiting} waiting and ${analysisStats.failed} failed — runs in channel index order.`
      : analysisStats.failed
        ? `${analysisStats.failed} video(s) failed analysis. Retry from this step.`
        : analysisStats.running
          ? `${analysisStats.running} video(s) currently being analyzed.`
          : `${analysisStats.waiting} transcript(s) to analyze in sequence.`
    : prices ? `${prices} price rows from ${analysisStats.ready} video(s).` : 'Analyze each transcript in order.';

  return {
    1: { done: total > 0, meta: total ? `${total} indexed` : 'Start here', desc: total ? `${total} videos indexed (${relevant} relevant). #1 = newest upload.` : 'Paginate the full channel uploads list.' },
    2: { done: relevant > 0 && pending === 0, meta: transcriptMeta, desc: transcriptDesc },
    3: {
      done: analysisStats.total > 0 && analysisStats.missing === 0,
      meta: analysisMeta,
      desc: analysisDesc,
    },
    4: { done: Boolean(state.lastSync), meta: state.lastSync ? 'Synced' : 'Waiting', desc: state.lastSync ? `Last pushed ${new Date(state.lastSync).toLocaleString()}` : 'Push to Cloudflare D1 via Worker API (see cloudflare/README.md).' },
    5: {
      done: Boolean(state.vectorIndexStatus?.chunk_count),
      meta: state.vectorIndexStatus?.chunk_count
        ? `${state.vectorIndexStatus.chunk_count} chunks`
        : state.lastSync ? 'Build index' : 'Sync first',
      desc: state.vectorIndexStatus?.indexed_at
        ? `Search index ready · ${state.vectorIndexStatus.backend || 'vectors'} · built ${new Date(state.vectorIndexStatus.indexed_at).toLocaleString()}`
        : state.lastSync
          ? 'Build the vector search index, then chat about your mandi data.'
          : 'Complete Step 4 sync first, then build the search index here.',
    },
  };
}

function suggestedStep() {
  if (!state.videos.length) return 1;
  if (pendingTranscripts().length) return 2;
  if (pendingAnalysis().length) return 3;
  if (!state.lastSync) return 4;
  return 5;
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
  if (step === 5) {
    refreshVectorIndexStatus().catch(() => {});
    renderChatMessages();
  }
}

function updateUI() {
  const status = deriveStepStatus();
  const transcriptStats = transcriptQueueStats();
  const analysisStats = analysisQueueStats();
  for (let i = 1; i <= 5; i++) {
    const meta = $(`stepMeta${i}`);
    if (meta) meta.textContent = status[i].meta;
    const desc = $(`stepDesc${i}`);
    if (desc) desc.textContent = status[i].desc;
  }

  if ($('statVideos')) $('statVideos').textContent = state.videos.length;
  if ($('statDone')) $('statDone').textContent = transcriptReady().length;
  if ($('statPrices')) $('statPrices').textContent = state.priceRows.length;

  const workflowBusy = state.batchRunning || state.aiBatchRunning || Boolean(state.runningTask) || state.chatBusy;
  for (let i = 1; i <= 5; i++) setDisabled(`stepBtn${i}`, workflowBusy);
  setDisabled('stopTranscriptBatchBtn', !state.batchRunning);
  setDisabled('stopAiAnalysisBatchBtn', !state.aiBatchRunning);
  setDisabled('stepBtn5Index', workflowBusy);
  setDisabled('chatSendBtn', workflowBusy);

  if ($('stepBtn2')) {
    $('stepBtn2').textContent = transcriptStats.failed && transcriptStats.waiting
      ? `Start ${transcriptStats.waiting} + retry ${transcriptStats.failed}`
      : transcriptStats.failed
        ? `Start retry for ${transcriptStats.failed} failed transcript${transcriptStats.failed === 1 ? '' : 's'}`
        : transcriptStats.waiting
          ? `Fetch ${transcriptStats.waiting} transcript${transcriptStats.waiting === 1 ? '' : 's'}`
          : 'Fetch all transcripts';
  }

  if ($('stepBtn3')) {
    $('stepBtn3').textContent = analysisStats.failed && analysisStats.waiting
      ? `Analyze ${analysisStats.waiting} + retry ${analysisStats.failed}`
      : analysisStats.failed
        ? `Retry analysis for ${analysisStats.failed} failed`
        : analysisStats.waiting
          ? `Analyze ${analysisStats.waiting} transcript${analysisStats.waiting === 1 ? '' : 's'}`
          : 'Analyze all transcripts';
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

function applyOpenUiMode() {
  const mode = ($('openUIMode')?.value || localStorage.getItem('fruitMinerOpenUIMode') || 'sidepanel').trim();
  if ($('openUIMode')) $('openUIMode').value = mode;
  localStorage.setItem('fruitMinerOpenUIMode', mode);
  if (chrome.storage?.local) {
    chrome.storage.local.set({ fruitMinerOpenUIMode: mode }).catch(() => {});
  }
  const queryMode = new URLSearchParams(location.search).get('mode');
  const inSidepanel = queryMode === 'sidepanel' || document.body.classList.contains('sidepanel-mode');
  const inPopup = queryMode === 'popup' || document.body.classList.contains('popup-mode');
  document.body.classList.toggle('sidepanel-mode', inSidepanel);
  document.body.classList.toggle('popup-mode', inPopup);
  if ($('openFullTabBtn')) {
    $('openFullTabBtn').style.display = (inSidepanel || inPopup) ? '' : 'none';
  }
}

function initUiMode() {
  const queryMode = new URLSearchParams(location.search).get('mode');
  if (queryMode === 'sidepanel') {
    document.body.classList.add('sidepanel-mode');
  } else if (queryMode === 'popup') {
    document.body.classList.add('popup-mode');
  }
  const saved = localStorage.getItem('fruitMinerOpenUIMode') || 'sidepanel';
  if ($('openUIMode')) $('openUIMode').value = saved;
  applyOpenUiMode();
}

function resetProjectState() {
  state.videos = [];
  state.priceRows = [];
  state.videoAnalysis = {};
  state.lastSync = null;
  state.currentStep = 1;
  state.chatMessages = [];
  state.vectorIndexStatus = null;
  state.batchRunning = false;
  state.aiBatchRunning = false;
  state.batchJob = null;
  state.aiBatchJob = null;
  state.batchLogCursor = 0;
  state.aiBatchLogCursor = 0;
  state.runningTask = '';
}

async function clearLocalProjectStorage() {
  try {
    localStorage.removeItem('fruitTranscriptMinerStateV2');
  } catch {
    // ignore
  }
  if (chrome.storage?.local) {
    await chrome.storage.local.remove([
      'fruitTranscriptMinerStateV2',
      'transcriptBatchJob',
      'aiAnalysisBatchJob',
    ]);
  }
}

async function saveLocal() {
  normalizeVideos({ keepRunning: state.batchRunning, keepAiRunning: state.aiBatchRunning });
  const payload = {
    videos: state.videos,
    priceRows: state.priceRows,
    videoAnalysis: state.videoAnalysis || {},
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
  if (saved.videoAnalysis && typeof saved.videoAnalysis === 'object') {
    state.videoAnalysis = saved.videoAnalysis;
  } else {
    state.videoAnalysis = {};
    for (const video of state.videos) {
      if (video.analysisMeta?.video_id) state.videoAnalysis[video.id] = video.analysisMeta;
    }
  }
  for (const video of state.videos) {
    if (!video.analysisMeta && state.videoAnalysis[video.id]) {
      video.analysisMeta = state.videoAnalysis[video.id];
    }
  }
  if (saved.lastSync) state.lastSync = saved.lastSync;
  if (saved.currentStep) state.currentStep = saved.currentStep;

  normalizeVideos();

  applyOpenAiKeyToInput().catch(() => {});
  renderVideos();
  renderAnalysisList();
  renderPrices();
  goToStep(state.currentStep || suggestedStep());
}

async function markVideosProcessed(videoIds) {
  if (!videoIds.length) return;
  await chrome.runtime.sendMessage({ type: 'api', path: '/api/mark-processed', body: { videoIds } });
}

async function classifyCurrentVideos() {
  const apiKey = getOpenAiKey();
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
  const maxVideos = Number($('maxVideos')?.value ?? 0);

  log(maxVideos === 0 ? 'Fetching full channel index (paginated)...' : `Fetching up to ${maxVideos} videos...`);
  const data = await api('/api/list-videos', { channelUrl, maxVideos });
  const existingById = new Map(state.videos.map(video => [video.id, video]));
  const indexedIds = new Set(data.videos.map(video => video.id));

  state.videos = data.videos.map((fresh) => {
    const prev = existingById.get(fresh.id);
    if (!prev) return fresh;
    return {
      ...fresh,
      ...prev,
      channelIndex: fresh.channelIndex,
      title: fresh.title || prev.title,
      upload_date: fresh.upload_date || prev.upload_date,
      duration: fresh.duration || prev.duration,
    };
  });

  for (const [id, prev] of existingById) {
    if (!indexedIds.has(id)) state.videos.push(prev);
  }

  state.videos.sort((a, b) => (a.channelIndex || 999999) - (b.channelIndex || 999999));
  log(`Indexed ${data.count} videos${data.pagesFetched ? ` (${data.pagesFetched} page(s))` : ''} — newest is #1.`);

  await classifyCurrentVideos();
  renderVideos();
  goToStep(2);
}

async function fetchTranscriptsStep() {
  const delayMs = Number($('delayMs')?.value || 200);
  const pending = pendingTranscripts();
  if (!pending.length) {
    log('No pending transcripts.');
    goToStep(3);
    return;
  }

  await saveLocal();
  state.batchLogCursor = 0;
  if ($('log')) $('log').textContent = '';
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
  state.batchRunning = true;
  updateUI();
  goToStep(2);
}

async function stopTranscriptsStep() {
  const data = await api('/api/stop-transcripts-batch', { reason: 'Stopped by user.' });
  if (data.stopped) {
    setBusy(false);
    state.batchRunning = false;
    normalizeVideos();
    renderVideos();
    log('Transcript batch stopped.');
    updateUI();
  }
}

function applySavedProject(saved, { keepRunning = false, keepAiRunning = false } = {}) {
  if (!saved) return;
  if (Array.isArray(saved.videos)) state.videos = saved.videos;
  if (Array.isArray(saved.priceRows)) state.priceRows = saved.priceRows;
  if (saved.videoAnalysis && typeof saved.videoAnalysis === 'object') {
    state.videoAnalysis = saved.videoAnalysis;
  } else {
    state.videoAnalysis = {};
    for (const video of state.videos) {
      if (video.analysisMeta?.video_id) state.videoAnalysis[video.id] = video.analysisMeta;
    }
  }
  for (const video of state.videos) {
    if (!video.analysisMeta && state.videoAnalysis[video.id]) {
      video.analysisMeta = state.videoAnalysis[video.id];
    }
  }
  if (saved.lastSync) state.lastSync = saved.lastSync;
  if (saved.currentStep) state.currentStep = saved.currentStep;
  normalizeVideos({ keepRunning, keepAiRunning });
  renderVideos();
  renderAnalysisList();
  renderPrices();
  updateUI();
}

function syncFromStorageChanges(changes) {
  const batchRunning = Boolean(changes.transcriptBatchJob?.newValue?.running);
  const aiBatchRunning = Boolean(changes.aiAnalysisBatchJob?.newValue?.running);

  if (changes.transcriptBatchJob?.newValue) {
    state.batchRunning = batchRunning;
    state.batchJob = changes.transcriptBatchJob.newValue;
    syncBatchLogFromJob(state.batchJob);
    updateBatchStatusUI(state.batchJob);
  }

  if (changes.aiAnalysisBatchJob?.newValue) {
    state.aiBatchRunning = aiBatchRunning;
    state.aiBatchJob = changes.aiAnalysisBatchJob.newValue;
    syncAiBatchLogFromJob(state.aiBatchJob);
    updateAnalysisStatusUI(state.aiBatchJob);
  }

  if (changes.fruitTranscriptMinerStateV2) {
    const next = changes.fruitTranscriptMinerStateV2.newValue;
    if (next) {
      applySavedProject(next, {
        keepRunning: state.batchRunning || batchRunning,
        keepAiRunning: state.aiBatchRunning || aiBatchRunning,
      });
      if (state.currentStep) goToStep(state.currentStep);
    } else {
      resetProjectState();
      renderAll();
      goToStep(1);
    }
  }

  if (changes.transcriptBatchJob) {
    if (changes.transcriptBatchJob.newValue) {
      const job = changes.transcriptBatchJob.newValue;
      if (!job?.running && job?.finishedAt) goToStep(3);
    } else {
      state.batchRunning = false;
      state.batchJob = null;
    }
  }

  if (changes.aiAnalysisBatchJob) {
    if (changes.aiAnalysisBatchJob.newValue) {
      const job = changes.aiAnalysisBatchJob.newValue;
      if (!job?.running && job?.finishedAt && !pendingAnalysis().length) goToStep(4);
    } else {
      state.aiBatchRunning = false;
      state.aiBatchJob = null;
    }
  }

  updateUI();
}

async function analyzeOneVideo(videoId) {
  const video = state.videos.find((item) => item.id === videoId);
  if (!video || !hasTranscriptData(video)) {
    throw new Error('Video not ready for analysis.');
  }

  setBusy(true);
  video.priceStatus = 'running';
  video.priceError = '';
  renderAnalysisList();
  const apiKey = getOpenAiKey();
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  await persistOpenAiKey();
  const model = ($('openaiModel')?.value || 'gpt-4o-mini').trim();
  log(`Analyzing ${video.title || videoId} with OpenAI (${model}) from the extension background worker...`);

  try {
    const data = await api('/api/analyze-single-video', {
      videoId,
      apiKey: getOpenAiKey(),
      model,
      maxCharsPerCall: Number($('aiMaxChars')?.value || 10000),
      pendingVideo: {
        id: video.id,
        title: video.title,
        url: video.url,
        upload_date: video.upload_date,
        segments: video.segments,
        channelIndex: video.channelIndex,
        relevance: video.relevance,
        status: video.status,
        priceStatus: video.priceStatus,
        language: video.language,
        transcriptText: video.transcriptText,
      },
    });
    await loadLocal();
    renderAll();
    log(data.count
      ? `OK ${video.title || videoId} (${data.count} mention${data.count === 1 ? '' : 's'})`
      : `OpenAI returned no price rows for ${video.title || videoId}.`, { level: data.count ? 'info' : 'warn' });
  } finally {
    setBusy(false);
  }
}

async function aiAnalysisStep() {
  const pending = pendingAnalysis();
  if (!analysisListVideos().length) {
    throw new Error('No transcripts ready. Complete step 2 first.');
  }
  if (!pending.length) {
    log('All transcripts already analyzed.');
    goToStep(4);
    return;
  }

  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error('Add your OpenAI API key in Settings before running AI analysis.');
  }
  await persistOpenAiKey();

  await saveLocal();
  state.aiBatchLogCursor = 0;
  const model = ($('openaiModel')?.value || 'gpt-4o-mini').trim();
  log(`Starting OpenAI analysis for ${pending.length} transcript(s) using ${model}. Requests run in the extension background worker, not Cloudflare.`);

  const data = await api('/api/fetch-ai-analysis-batch', {
    delayMs: 400,
    apiKey,
    model,
    maxCharsPerCall: Number($('aiMaxChars')?.value || 10000),
    pendingVideos: pending.map((video) => ({
      id: video.id,
      title: video.title,
      url: video.url,
      upload_date: video.upload_date,
      segments: video.segments,
      channelIndex: video.channelIndex,
      relevance: video.relevance,
      status: video.status,
      priceStatus: video.priceStatus,
      language: video.language,
      transcriptText: video.transcriptText,
    })),
  });

  if (data.alreadyRunning) {
    log('AI analysis already running.');
    state.aiBatchRunning = true;
    updateUI();
    return;
  }

  if (!data.started) {
    log(data.message || 'AI analysis did not start. Reload the page and try again.', { level: 'warn' });
    return;
  }

  state.aiBatchRunning = true;
  updateUI();
  goToStep(3);
}

async function stopAiAnalysisStep() {
  const data = await api('/api/stop-ai-analysis-batch', { reason: 'Stopped by user.' });
  if (data.stopped) {
    state.aiBatchRunning = false;
    normalizeVideos({ keepAiRunning: false });
    renderAll();
    log('AI analysis stopped.');
    updateUI();
  }
}

async function updateDatasetStep() {
  const { siteUrl, token } = {
    siteUrl: ($('syncSiteUrl')?.value || localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '').trim().replace(/\/$/, ''),
    token: ($('syncToken')?.value || localStorage.getItem('fruitTranscriptMinerSyncToken') || '').trim(),
  };
  if (!siteUrl) throw new Error('Set your Cloudflare Worker API URL in Settings first.');
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
      videoAnalysis: state.videoAnalysis || {},
      knownVideoIds: state.videos.map(v => v.id),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Sync failed: ${res.status}`);

  state.lastSync = new Date().toISOString();
  if ($('syncSummary')) {
    $('syncSummary').textContent = `Dataset updated · ${data.counts.videos} videos · ${data.counts.priceRows} price rows${data.storage ? ` · ${data.storage}` : ''}`;
  }
  log(`Dataset synced to ${data.storage || 'API'}.`);
  updateUI();
  saveLocal();
  await refreshVectorIndexStatus();
  goToStep(5);
}

function getWorkerApiConfig() {
  return {
    siteUrl: ($('syncSiteUrl')?.value || localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '').trim().replace(/\/$/, ''),
    token: ($('syncToken')?.value || localStorage.getItem('fruitTranscriptMinerSyncToken') || '').trim(),
  };
}

async function workerApiFetch(path, { method = 'GET', body = null } = {}) {
  const { siteUrl, token } = getWorkerApiConfig();
  if (!siteUrl) throw new Error('Set your Cloudflare Worker API URL in Settings first.');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${siteUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `API failed: ${res.status}`);
  return data;
}

function renderChatMessages() {
  const box = $('chatMessages');
  if (!box) return;
  if (!state.chatMessages.length) {
    box.innerHTML = '<div class="chat-empty">Build the search index, then ask questions like “What was garlic price on the latest market day?”</div>';
    return;
  }

  box.innerHTML = state.chatMessages.map((entry) => {
    const sources = Array.isArray(entry.sources) && entry.sources.length
      ? `<div class="chat-sources">${entry.sources.slice(0, 4).map((source) => `
          <div class="chat-source">${escapeHtml([
            source.market_date,
            source.fruit,
            source.video_title,
            source.excerpt,
          ].filter(Boolean).join(' · '))}</div>
        `).join('')}</div>`
      : '';
    return `
      <div class="chat-bubble ${escapeHtml(entry.role)}${entry.error ? ' error' : ''}">
        ${escapeHtml(entry.content)}
        ${sources}
      </div>
    `;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

function updateVectorIndexStatusUI() {
  const el = $('vectorIndexStatus');
  if (!el) return;
  const status = state.vectorIndexStatus;
  if (!status) {
    el.textContent = 'Index not built yet.';
    return;
  }
  el.textContent = status.chunk_count
    ? `${status.chunk_count} chunks · ${status.backend || 'vectors'}${status.indexed_at ? ` · ${new Date(status.indexed_at).toLocaleString()}` : ''}`
    : 'Index empty — click Build search index.';
}

async function refreshVectorIndexStatus() {
  try {
    const data = await workerApiFetch('/api/vectors/status');
    state.vectorIndexStatus = data;
    updateVectorIndexStatusUI();
    updateUI();
  } catch (error) {
    if ($('vectorIndexStatus')) $('vectorIndexStatus').textContent = `Index status unavailable: ${error.message}`;
  }
}

async function buildVectorIndexStep() {
  const apiKey = getOpenAiKey();
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  await persistOpenAiKey();

  log('Building vector search index from database...');
  const data = await workerApiFetch('/api/vectors/index', {
    method: 'POST',
    body: {
      apiKey,
      model: ($('openaiModel')?.value || 'gpt-4o-mini').trim(),
    },
  });

  state.vectorIndexStatus = {
    backend: data.backend,
    chunk_count: data.indexed,
    indexed_at: data.indexed_at,
  };
  updateVectorIndexStatusUI();
  updateUI();
  log(`Search index built: ${data.indexed} chunks (${data.price_chunks || 0} prices, ${data.analysis_chunks || 0} analysis).`);
}

async function sendChatMessage(messageText) {
  const message = String(messageText || '').trim();
  if (!message) return;

  const apiKey = getOpenAiKey();
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  await persistOpenAiKey();

  state.chatMessages.push({ role: 'user', content: message });
  renderChatMessages();

  const history = state.chatMessages
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .slice(0, -1)
    .map((entry) => ({ role: entry.role, content: entry.content }));

  const data = await workerApiFetch('/api/vectors/chat', {
    method: 'POST',
    body: {
      apiKey,
      model: ($('openaiModel')?.value || 'gpt-4o-mini').trim(),
      message,
      history,
    },
  });

  state.chatMessages.push({
    role: 'assistant',
    content: data.answer || 'No answer returned.',
    sources: data.sources || [],
  });
  renderChatMessages();
  log('Chat answer received.');
}

async function loadWatchSettings() {
  applyOpenAiKeyToInput().catch(() => {});
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
  catch (e) { log(`Step 1 failed: ${e.message}`, { level: 'error' }); }
  finally { setBusy(false); }
});

$('stepBtn2')?.addEventListener('click', async () => {
  try { await fetchTranscriptsStep(); }
  catch (e) { log(`Step 2 failed: ${e.message}`, { level: 'error' }); setBusy(false); }
});

$('stopTranscriptBatchBtn')?.addEventListener('click', async () => {
  try { await stopTranscriptsStep(); }
  catch (e) { log(`Stop failed: ${e.message}`, { level: 'error' }); }
});

$('stepBtn3')?.addEventListener('click', async () => {
  try { await aiAnalysisStep(); }
  catch (e) { log(`Step 3 failed: ${e.message}`, { level: 'error' }); }
});

$('stopAiAnalysisBatchBtn')?.addEventListener('click', async () => {
  try { await stopAiAnalysisStep(); }
  catch (e) { log(`Stop analysis failed: ${e.message}`, { level: 'error' }); }
});

$('stepBtn4')?.addEventListener('click', async () => {
  try { setBusy(true); await updateDatasetStep(); }
  catch (e) { log(`Step 4 failed: ${e.message}`, { level: 'error' }); }
  finally { setBusy(false); }
});

$('stepBtn5Index')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    state.chatBusy = true;
    updateUI();
    await buildVectorIndexStep();
  } catch (e) {
    log(`Index build failed: ${e.message}`, { level: 'error' });
  } finally {
    state.chatBusy = false;
    setBusy(false);
  }
});

$('chatForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('chatInput');
  const message = (input?.value || '').trim();
  if (!message || state.chatBusy) return;
  try {
    state.chatBusy = true;
    updateUI();
    if (input) input.value = '';
    await sendChatMessage(message);
  } catch (e) {
    state.chatMessages.push({ role: 'assistant', content: e.message, error: true });
    renderChatMessages();
    log(`Chat failed: ${e.message}`, { level: 'error' });
  } finally {
    state.chatBusy = false;
    updateUI();
  }
});

$('chatSuggestions')?.addEventListener('click', async (event) => {
  const chip = event.target.closest('[data-chat-prompt]');
  if (!chip || state.chatBusy) return;
  const prompt = chip.getAttribute('data-chat-prompt');
  if (!prompt) return;
  if ($('chatInput')) $('chatInput').value = prompt;
  try {
    state.chatBusy = true;
    updateUI();
    await sendChatMessage(prompt);
    if ($('chatInput')) $('chatInput').value = '';
  } catch (e) {
    state.chatMessages.push({ role: 'assistant', content: e.message, error: true });
    renderChatMessages();
    log(`Chat failed: ${e.message}`, { level: 'error' });
  } finally {
    state.chatBusy = false;
    updateUI();
  }
});

$('saveWatchBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await persistOpenAiKey();
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
    if (!siteUrl) throw new Error('Set Cloudflare Worker API URL in Settings first.');
    const res = await fetch(`${siteUrl}/api/data`);
    const data = await res.json();
    if (Array.isArray(data.data?.videos)) state.videos = data.data.videos;
    if (Array.isArray(data.data?.priceRows)) state.priceRows = data.data.priceRows;
    if (data.data?.videoAnalysis && typeof data.data.videoAnalysis === 'object') {
      state.videoAnalysis = data.data.videoAnalysis;
    }
    for (const video of state.videos) {
      if (!video.analysisMeta && state.videoAnalysis?.[video.id]) {
        video.analysisMeta = state.videoAnalysis[video.id];
      }
    }
    renderAll();
    log('Loaded from API.');
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

$('clearBtn')?.addEventListener('click', async () => {
  if (!confirm('Clear all local data?')) return;
  try {
    setBusy(true);
    await api('/api/clear-project');
    resetProjectState();
    await clearLocalProjectStorage();
    if ($('log')) $('log').textContent = '';
    if ($('syncSummary')) $('syncSummary').textContent = 'Nothing pushed yet.';
    if ($('batchStatusText')) $('batchStatusText').textContent = '';
    if ($('analysisStatusText')) $('analysisStatusText').textContent = '';
    updateVectorIndexStatusUI();
    renderAll();
    goToStep(1);
    updateUI();
    log('All local project data cleared.');
  } catch (error) {
    log(`Clear failed: ${error.message}`, { level: 'error' });
  } finally {
    setBusy(false);
  }
});

$('openaiKey')?.addEventListener('change', () => {
  persistOpenAiKey().catch(() => {});
});
$('analysisSearch')?.addEventListener('input', renderAnalysisList);

$('analysisList')?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-analyze-one]');
  if (!button || state.aiBatchRunning || state.runningTask) return;
  const videoId = button.getAttribute('data-analyze-one');
  if (!videoId) return;
  try {
    await analyzeOneVideo(videoId);
  } catch (error) {
    log(`Analyze failed: ${error.message}`, { level: 'error' });
    await loadLocal();
    renderAll();
  }
});

$('openUIMode')?.addEventListener('change', applyOpenUiMode);

$('openFullTabBtn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

initUiMode();
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

  if (message?.type === 'transcript-batch-event') {
    if (message.event === 'log') {
      log(message.message, { level: message.level || 'info' });
      return;
    }
    if (message.event === 'complete') {
      state.batchRunning = false;
      state.batchJob = { ...state.batchJob, running: false, finishedAt: new Date().toISOString(), failed: message.failed || 0 };
      updateBatchStatusUI(state.batchJob);
      updateUI();
      goToStep(3);
      return;
    }
    if (message.event === 'progress') {
      if (message.status === 'running') {
        updateBatchStatusUI({
          ...(state.batchJob || {}),
          running: true,
          currentId: message.videoId,
          currentTitle: message.title || message.videoId,
        });
      } else if (message.status === 'failed') {
        updateBatchStatusUI({
          ...(state.batchJob || {}),
          running: true,
          lastError: message.error || 'unknown error',
        });
      }
    }
    return;
  }

  if (message?.type === 'ai-analysis-batch-event') {
    if (message.event === 'log') {
      log(message.message, { level: message.level || 'info' });
      return;
    }
    if (message.event === 'complete') {
      state.aiBatchRunning = false;
      state.aiBatchJob = { ...state.aiBatchJob, running: false, finishedAt: new Date().toISOString(), failed: message.failed || 0 };
      updateAnalysisStatusUI(state.aiBatchJob);
      loadLocal().then(() => {
        renderAll();
        if (!pendingAnalysis().length) goToStep(4);
        updateUI();
      }).catch(() => {});
      return;
    }
    if (message.event === 'stopped') {
      state.aiBatchRunning = false;
      updateUI();
      return;
    }
    if (message.event === 'progress') {
      if (message.status === 'running') {
        updateAnalysisStatusUI({
          ...(state.aiBatchJob || {}),
          running: true,
          currentId: message.videoId,
          currentTitle: message.title || message.videoId,
        });
      } else if (message.status === 'ok') {
        loadLocal().then(() => {
          normalizeVideos({ keepAiRunning: true });
          renderAll();
          updateUI();
        }).catch(() => {});
      } else if (message.status === 'failed') {
        loadLocal().then(() => {
          normalizeVideos({ keepAiRunning: true });
          renderAnalysisList();
          updateUI();
        }).catch(() => {});
        updateAnalysisStatusUI({
          ...(state.aiBatchJob || {}),
          running: true,
          lastError: message.error || 'unknown error',
        });
      }
    }
  }
});

Promise.all([
  api('/api/transcript-batch-status'),
  api('/api/ai-analysis-batch-status'),
]).then(([transcriptData, aiData]) => {
  state.batchRunning = Boolean(transcriptData?.job?.running);
  state.batchJob = transcriptData?.job || null;
  if (transcriptData?.job) {
    syncBatchLogFromJob(transcriptData.job);
    updateBatchStatusUI(transcriptData.job);
  }

  state.aiBatchRunning = Boolean(aiData?.job?.running);
  state.aiBatchJob = aiData?.job || null;
  if (aiData?.job) {
    if (!aiData.job.running && aiData.job.finishedAt && pendingAnalysis().length) {
      state.aiBatchJob = null;
      chrome.storage.local.remove('aiAnalysisBatchJob').catch(() => {});
    } else {
      syncAiBatchLogFromJob(aiData.job);
      updateAnalysisStatusUI(aiData.job);
    }
  } else if (pendingAnalysis().length) {
    updateAnalysisStatusUI(null);
  }

  normalizeVideos({
    keepRunning: state.batchRunning,
    keepAiRunning: state.aiBatchRunning,
  });
  renderAll();
  updateUI();
}).catch(() => {});
loadWatchSettings();

(async () => {
  try {
    const data = await api('/api/status');
    if ($('statusText')) $('statusText').textContent = 'Transcript fetch v1.6.5 — popup, thumbnails, logs';
  } catch (error) {
    if ($('statusText')) $('statusText').textContent = 'Reload extension at chrome://extensions';
    log(error.message);
  }
})();
