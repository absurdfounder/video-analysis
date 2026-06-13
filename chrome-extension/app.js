const state = {
  videos: [],
  priceRows: [],
  runningTask: '',
};

const $ = (id) => document.getElementById(id);

function setDisabled(id, disabled) {
  const el = $(id);
  if (el) el.disabled = disabled;
}

function isChromeExtension() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
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

function isProcessable(video) {
  return video.relevance !== 'irrelevant' && video.status !== 'skipped';
}

function pendingVideos() {
  return state.videos.filter(video => video.needsWork !== false && isProcessable(video) && video.status !== 'ok');
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function secondsToClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timestampUrl(videoUrl, seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  try {
    const url = new URL(videoUrl);
    url.searchParams.set('t', `${sec}s`);
    return url.toString();
  } catch {
    return `${videoUrl}${String(videoUrl).includes('?') ? '&' : '?'}t=${sec}s`;
  }
}

function tag(text, cls) {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function updateStats() {
  const pending = pendingVideos();
  const done = state.videos.filter(v => v.status === 'ok').length;
  if ($('statPending')) $('statPending').textContent = pending.length;
  if ($('statDone')) $('statDone').textContent = done;
  if ($('statPrices')) $('statPrices').textContent = state.priceRows.length;
  if ($('videoCount')) $('videoCount').textContent = state.videos.length;
  if ($('okCount')) $('okCount').textContent = done;
  if ($('failCount')) $('failCount').textContent = state.videos.filter(v => v.status === 'failed').length;
  if ($('priceCount')) $('priceCount').textContent = state.priceRows.length;
}

function updateNextAction() {
  const pending = pendingVideos();
  const skipped = state.videos.filter(v => v.status === 'skipped' || v.relevance === 'irrelevant').length;
  const el = $('nextAction');
  if (!el) return;

  if (!state.videos.length) {
    el.textContent = 'Check the channel for new fruit/vegetable price videos.';
    return;
  }
  if (pending.length) {
    el.textContent = `${pending.length} video(s) ready to process${skipped ? ` · ${skipped} irrelevant skipped` : ''}.`;
    return;
  }
  if (!state.priceRows.length) {
    el.textContent = 'Transcripts are ready. Extract prices next.';
    return;
  }
  el.textContent = `${state.priceRows.length} price rows ready. Push to website when done.`;
}

function setBusy(busy) {
  state.runningTask = busy ? 'busy' : '';
  setDisabled('runAllBtn', busy);
  setDisabled('checkNewBtn', busy);
  setDisabled('fetchTranscriptsBtn', busy);
  setDisabled('extractAiBtn', busy);
  setDisabled('pushDataBtn', busy);
  setDisabled('fetchVideosBtn', busy);
  setDisabled('classifyBtn', busy);
  setDisabled('saveWatchBtn', busy);
}

function renderPendingPanel() {
  const pill = $('pendingPill');
  const list = $('pendingList');
  if (!pill || !list) return;

  const pending = pendingVideos();
  const fresh = pending.filter(video => video.isNew);
  pill.textContent = fresh.length ? `${fresh.length} new upload(s)` : `${pending.length} pending`;

  if (!fresh.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = fresh.slice(0, 6).map(video => `
    <article class="pending-item ${video.isNew ? 'is-new' : ''}">
      <strong>${escapeHtml(video.title || video.id)}</strong>
      <div class="mini">${escapeHtml(video.relevance || 'unclassified')}${video.relevanceCategory ? ` · ${escapeHtml(video.relevanceCategory)}` : ''}</div>
    </article>
  `).join('');
}

function renderVideos() {
  const q = ($('videoSearch')?.value || '').toLowerCase().trim();
  const list = $('videoList');
  if (!list) return;

  const rows = state.videos.filter(v => {
    const hay = [v.title, v.status, v.relevance, v.relevanceCategory, v.error].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  if (!rows.length) {
    list.innerHTML = `<div class="empty-state">${state.videos.length ? 'No videos match search.' : 'No videos yet. Click “Check & process new videos”.'}</div>`;
  } else {
    list.innerHTML = rows.map(v => `
      <article class="video-card ${v.isNew ? 'is-new' : ''} ${v.status === 'skipped' ? 'is-skipped' : ''}">
        <h3><a href="${escapeHtml(v.url)}" target="_blank" rel="noreferrer">${escapeHtml(v.title || v.id)}</a></h3>
        <div class="card-meta">${escapeHtml(v.upload_date || 'Unknown date')}${v.language ? ` · ${escapeHtml(v.language)}` : ''}${v.error ? ` · ${escapeHtml(v.error)}` : ''}</div>
        <div class="card-tags">
          ${tag(v.status || 'pending', v.status || 'pending')}
          ${tag(v.relevance || 'unclassified', `relevance-${v.relevance || 'unclassified'}`)}
          ${v.isNew ? tag('new', 'relevance-uncertain') : ''}
        </div>
        ${v.relevanceReason ? `<div class="mini">${escapeHtml(v.relevanceReason)}</div>` : ''}
      </article>
    `).join('');
  }

  renderPendingPanel();
  updateStats();
  updateNextAction();
  saveLocal();
}

function renderPrices() {
  const q = ($('priceSearch')?.value || '').toLowerCase().trim();
  const list = $('priceList');
  if (!list) return;

  const rows = state.priceRows.filter(row => {
    const hay = Object.values(row).join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  if (!rows.length) {
    list.innerHTML = '<div class="empty-state">No prices yet. Process videos first.</div>';
  } else {
    list.innerHTML = rows.map(row => {
      const timeUrl = row.timestamp_url || timestampUrl(row.video_url, row.timestamp_seconds);
      const label = row.timestamp_label || secondsToClock(row.timestamp_seconds);
      return `
        <article class="price-card">
          <h3>${escapeHtml(row.fruit || 'unknown')}${row.fruit_hindi ? ` · ${escapeHtml(row.fruit_hindi)}` : ''}</h3>
          <div class="card-meta"><a href="${escapeHtml(row.video_url)}" target="_blank" rel="noreferrer">${escapeHtml(row.video_title || row.video_id)}</a></div>
          <div class="price-grid">
            <div><span>Min</span><strong>₹${escapeHtml(row.min_price_inr)}</strong></div>
            <div><span>Max</span><strong>₹${escapeHtml(row.max_price_inr)}</strong></div>
            <div><span>Unit</span><strong>${escapeHtml(row.unit || '-')}</strong></div>
            <div><span>Jump</span><strong><a href="${escapeHtml(timeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a></strong></div>
          </div>
          <div class="card-tags">
            ${tag(row.source || 'regex', row.source === 'ai' ? 'source-pill ai' : 'relevance-relevant')}
            ${row.confidence ? tag(row.confidence, 'relevance-unclassified') : ''}
          </div>
          ${row.clean_hindi_line || row.original_line ? `<div class="mini">${escapeHtml(row.clean_hindi_line || row.original_line)}</div>` : ''}
        </article>
      `;
    }).join('');
  }

  updateStats();
  updateNextAction();
  saveLocal();
}

function saveLocal() {
  localStorage.setItem('fruitTranscriptMinerStateV2', JSON.stringify({
    videos: state.videos,
    priceRows: state.priceRows,
  }));
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem('fruitTranscriptMinerStateV2') || '{}');
    if (Array.isArray(saved.videos)) state.videos = saved.videos;
    if (Array.isArray(saved.priceRows)) state.priceRows = saved.priceRows;
  } catch {}
  const savedKey = localStorage.getItem('fruitTranscriptMinerOpenAIKey') || '';
  if (savedKey && $('openaiKey')) $('openaiKey').value = savedKey;
  renderVideos();
  renderPrices();
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => csvEscape(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function markVideosProcessed(videoIds) {
  if (!videoIds.length) return;
  await chrome.runtime.sendMessage({ type: 'api', path: '/api/mark-processed', body: { videoIds } });
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

function syncSettings() {
  return {
    siteUrl: ($('syncSiteUrl')?.value || localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '').trim().replace(/\/$/, ''),
    token: ($('syncToken')?.value || localStorage.getItem('fruitTranscriptMinerSyncToken') || '').trim(),
  };
}

async function remoteDataRequest(method, body) {
  const { siteUrl, token } = syncSettings();
  if (!siteUrl) throw new Error('Set your Netlify URL in Settings first.');
  if (siteUrl) localStorage.setItem('fruitTranscriptMinerSyncSiteUrl', siteUrl);
  if (token) localStorage.setItem('fruitTranscriptMinerSyncToken', token);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${siteUrl}/api/data`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Sync failed: ${res.status}`);
  return data;
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

async function pullTranscripts() {
  const languages = ($('languages')?.value || 'hi.*,hi,en.*').trim();
  const delayMs = Number($('delayMs')?.value || 1500);
  const pending = state.videos.filter(v => v.status !== 'ok' && isProcessable(v));
  if (!pending.length) return 0;

  log(`Pulling transcripts for ${pending.length} relevant video(s)...`);
  const processedIds = [];

  for (const video of state.videos) {
    if (video.status === 'ok' || !isProcessable(video)) continue;
    video.status = 'running';
    renderVideos();
    try {
      const data = await api('/api/transcript', { id: video.id, videoUrl: video.url, languages });
      Object.assign(video, {
        status: 'ok',
        language: data.language,
        transcriptText: data.transcriptText,
        segments: data.segments,
        error: '',
        isNew: false,
        needsWork: false,
      });
      processedIds.push(video.id);
      log(`✓ ${video.title}`);
    } catch (error) {
      video.status = 'failed';
      video.error = error.message.slice(0, 200);
      log(`× ${video.title}: ${error.message}`);
    }
    renderVideos();
    if (delayMs > 0) await sleep(delayMs);
  }

  await markVideosProcessed(processedIds);
  return processedIds.length;
}

async function extractPrices() {
  const items = state.videos.filter(v => v.status === 'ok' && Array.isArray(v.segments) && v.segments.length);
  if (!items.length) return 0;

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
    log(`Regex extracted ${data.count} price rows. Add OpenAI key in Settings for better Hindi cleanup.`);
  }

  renderPrices();
  return state.priceRows.length;
}

async function checkOrFetchVideos() {
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
      log(check.newCount ? `Found ${check.newCount} new upload(s).` : 'Channel checked, no new uploads.');
      return check.newCount || 0;
    }
  } catch (error) {
    log(`Check-new fallback: ${error.message}`);
  }

  const data = await api('/api/list-videos', { channelUrl, maxVideos });
  state.videos = data.videos;
  log(`Fetched ${data.count} videos.`);
  return data.count;
}

// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`)?.classList.add('active');
  });
});

$('runAllBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    log('Pipeline started: check → classify → transcripts → prices');
    await checkOrFetchVideos();
    renderVideos();
    await classifyCurrentVideos();
    await pullTranscripts();
    await extractPrices();
    log('Pipeline complete.');
    await loadWatchSettings();
  } catch (error) {
    log(`Pipeline failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('checkNewBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await checkOrFetchVideos();
    renderVideos();
    await loadWatchSettings();
  } catch (error) {
    log(`Check failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('fetchVideosBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    const data = await api('/api/list-videos', {
      channelUrl: ($('channelUrl')?.value || '').trim(),
      maxVideos: Number($('maxVideos')?.value || 25),
    });
    state.videos = data.videos;
    renderVideos();
    log(`Fetched ${data.count} videos.`);
  } catch (error) {
    log(`Fetch failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('classifyBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await classifyCurrentVideos();
    log('Titles re-classified.');
  } catch (error) {
    log(`Classify failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
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
  } catch (error) {
    log(`Save settings failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('fetchTranscriptsBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await pullTranscripts();
  } catch (error) {
    log(`Transcripts failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('extractAiBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    await extractPrices();
  } catch (error) {
    log(`Extract failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('extractPricesBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    const items = state.videos.filter(v => v.status === 'ok' && v.transcriptText);
    const data = await api('/api/extract-prices', { items });
    state.priceRows = data.rows;
    renderPrices();
    log(`Regex extracted ${data.count} rows.`);
  } catch (error) {
    log(`Regex extract failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('pushDataBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    const data = await remoteDataRequest('POST', {
      channelUrl: ($('channelUrl')?.value || '').trim(),
      videos: state.videos,
      priceRows: state.priceRows,
      knownVideoIds: state.videos.map(v => v.id),
    });
    log(`Pushed to website: ${data.counts.videos} videos, ${data.counts.priceRows} prices.`);
  } catch (error) {
    log(`Push failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('pullDataBtn')?.addEventListener('click', async () => {
  try {
    setBusy(true);
    const data = await remoteDataRequest('GET');
    if (Array.isArray(data.data?.videos)) state.videos = data.data.videos;
    if (Array.isArray(data.data?.priceRows)) state.priceRows = data.data.priceRows;
    if (data.data?.channelUrl && $('channelUrl')) $('channelUrl').value = data.data.channelUrl;
    renderVideos();
    renderPrices();
    log(`Loaded from website.`);
  } catch (error) {
    log(`Pull failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

$('exportPricesBtn')?.addEventListener('click', () => {
  const cols = ['source', 'fruit', 'fruit_hindi', 'variety', 'unit', 'min_price_inr', 'max_price_inr', 'timestamp_label', 'video_title', 'video_url', 'confidence'];
  downloadFile('fruit_prices.csv', toCsv(state.priceRows, cols), 'text/csv;charset=utf-8');
});

$('exportJsonBtn')?.addEventListener('click', () => {
  downloadFile('fruit_project.json', JSON.stringify(state, null, 2), 'application/json;charset=utf-8');
});

$('exportTranscriptsBtn')?.addEventListener('click', () => {
  const rows = state.videos.map(v => ({
    video_id: v.id, title: v.title, url: v.url, status: v.status, language: v.language, transcript_text: v.transcriptText || '',
  }));
  downloadFile('transcripts.csv', toCsv(rows, ['video_id', 'title', 'url', 'status', 'language', 'transcript_text']), 'text/csv;charset=utf-8');
});

$('exportSegmentsBtn')?.addEventListener('click', () => {
  const rows = [];
  for (const v of state.videos) {
    for (const seg of (v.segments || [])) {
      rows.push({ video_id: v.id, title: v.title, timestamp_label: seg.timestamp_label, text: seg.text });
    }
  }
  downloadFile('segments.csv', toCsv(rows, ['video_id', 'title', 'timestamp_label', 'text']), 'text/csv;charset=utf-8');
});

$('clearBtn')?.addEventListener('click', () => {
  if (!confirm('Clear all local data?')) return;
  state.videos = [];
  state.priceRows = [];
  if ($('log')) $('log').textContent = '';
  renderVideos();
  renderPrices();
});

$('videoSearch')?.addEventListener('input', renderVideos);
$('priceSearch')?.addEventListener('input', renderPrices);

loadLocal();
loadWatchSettings();
if ($('syncSiteUrl')) $('syncSiteUrl').value = localStorage.getItem('fruitTranscriptMinerSyncSiteUrl') || '';
if ($('syncToken')) $('syncToken').value = localStorage.getItem('fruitTranscriptMinerSyncToken') || '';
if (window.location.hash === '#pending') {
  document.querySelector('[data-tab="queue"]')?.click();
}

(async () => {
  try {
    const data = await api('/api/status');
    if ($('statusText')) $('statusText').textContent = data.note || 'Extension ready';
  } catch (error) {
    if ($('statusText')) $('statusText').textContent = 'Extension error — reload from chrome://extensions';
    log(error.message);
  }
})();
