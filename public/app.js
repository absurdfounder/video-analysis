const state = {
  videos: [],
  priceRows: [],
};

const $ = (id) => document.getElementById(id);

function log(message) {
  const now = new Date().toLocaleTimeString();
  $('log').textContent += `[${now}] ${message}\n`;
  $('log').scrollTop = $('log').scrollHeight;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

function setStatus(kind, text) {
  const card = $('statusCard');
  card.classList.remove('ok', 'bad');
  if (kind) card.classList.add(kind);
  $('statusText').textContent = text;
}

function counts() {
  $('videoCount').textContent = state.videos.length;
  $('okCount').textContent = state.videos.filter(v => v.status === 'ok').length;
  $('failCount').textContent = state.videos.filter(v => v.status === 'failed').length;
  $('priceCount').textContent = state.priceRows.length;
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
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timestampUrl(videoUrl, seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  try {
    const url = new URL(videoUrl);
    url.searchParams.delete('t');
    url.searchParams.set('t', `${sec}s`);
    return url.toString();
  } catch {
    const joiner = String(videoUrl || '').includes('?') ? '&' : '?';
    return `${videoUrl}${joiner}t=${sec}s`;
  }
}

function renderVideos() {
  const q = $('videoSearch').value.toLowerCase().trim();
  const rows = state.videos.filter(v => {
    const hay = [v.title, v.status, v.language, v.error].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  $('videoTable').innerHTML = rows.map(v => {
    const firstSegment = Array.isArray(v.segments) && v.segments.length ? v.segments[0] : null;
    const firstUrl = firstSegment ? timestampUrl(v.url, firstSegment.start) : v.url;
    return `
      <tr>
        <td><span class="badge ${escapeHtml(v.status || 'pending')}">${escapeHtml(v.status || 'pending')}</span></td>
        <td>
          <a href="${escapeHtml(v.url)}" target="_blank" rel="noreferrer">${escapeHtml(v.title || v.id)}</a>
          ${firstSegment ? `<div class="mini"><a href="${escapeHtml(firstUrl)}" target="_blank" rel="noreferrer">open at ${escapeHtml(firstSegment.timestamp_label || '0:00')}</a></div>` : ''}
        </td>
        <td>${escapeHtml(v.language || '')}</td>
        <td>${Array.isArray(v.segments) ? v.segments.length.toLocaleString() : 0}</td>
        <td>${(v.transcriptText || '').length.toLocaleString()}</td>
        <td>${escapeHtml(v.error || '')}</td>
      </tr>
    `;
  }).join('');

  renderSegmentsPreview();
  counts();
  saveLocal();
}

function renderSegmentsPreview() {
  const select = $('segmentVideoSelect');
  if (!select) return;

  const current = select.value;
  const okVideos = state.videos.filter(v => v.status === 'ok' && Array.isArray(v.segments) && v.segments.length);
  select.innerHTML = '<option value="">Choose a video with transcript...</option>' + okVideos.map(v => `
    <option value="${escapeHtml(v.id)}">${escapeHtml(v.title || v.id)}</option>
  `).join('');
  if (current && okVideos.some(v => v.id === current)) select.value = current;

  const selected = okVideos.find(v => v.id === select.value) || okVideos[0];
  if (!select.value && selected) select.value = selected.id;

  const q = $('segmentSearch')?.value.toLowerCase().trim() || '';
  const segments = selected ? selected.segments.filter(seg => {
    const hay = [seg.timestamp_label, seg.text].join(' ').toLowerCase();
    return !q || hay.includes(q);
  }).slice(0, 400) : [];

  $('segmentTable').innerHTML = segments.map(seg => {
    const url = timestampUrl(selected.url, seg.start);
    return `
      <tr>
        <td><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(seg.timestamp_label || secondsToClock(seg.start))}</a></td>
        <td>${escapeHtml(seg.text)}</td>
      </tr>
    `;
  }).join('');
}

function renderPrices() {
  const q = $('priceSearch').value.toLowerCase().trim();
  const rows = state.priceRows.filter(row => {
    const hay = Object.values(row).join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  $('priceTable').innerHTML = rows.map(row => {
    const timeUrl = row.timestamp_url || timestampUrl(row.video_url, row.timestamp_seconds);
    const label = row.timestamp_label || secondsToClock(row.timestamp_seconds);
    const clean = row.clean_hindi_line || row.original_line || row.context || '';
    return `
      <tr>
        <td><span class="source-pill ${escapeHtml(row.source || 'regex')}">${escapeHtml(row.source || 'regex')}</span></td>
        <td>${escapeHtml(row.fruit || '')}<div class="mini">${escapeHtml(row.fruit_hindi || '')}</div></td>
        <td>${escapeHtml(row.variety || '')}</td>
        <td>${escapeHtml(row.unit || '')}</td>
        <td>${escapeHtml(row.min_price_inr)}</td>
        <td>${escapeHtml(row.max_price_inr)}</td>
        <td><a href="${escapeHtml(timeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a></td>
        <td><a href="${escapeHtml(row.video_url)}" target="_blank" rel="noreferrer">${escapeHtml(row.video_title || row.video_id)}</a></td>
        <td>${escapeHtml(clean)}${row.notes ? `<div class="mini">${escapeHtml(row.notes)}</div>` : ''}</td>
        <td>${escapeHtml(row.confidence || '')}</td>
      </tr>
    `;
  }).join('');

  counts();
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
    const saved = JSON.parse(localStorage.getItem('fruitTranscriptMinerStateV2') || localStorage.getItem('fruitTranscriptMinerState') || '{}');
    if (Array.isArray(saved.videos)) state.videos = saved.videos;
    if (Array.isArray(saved.priceRows)) state.priceRows = saved.priceRows;
  } catch {}
  try {
    const savedKey = localStorage.getItem('fruitTranscriptMinerOpenAIKey') || '';
    if (savedKey && $('openaiKey')) $('openaiKey').value = savedKey;
  } catch {}
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

$('checkBtn').addEventListener('click', async () => {
  try {
    const data = await api('/api/status');
    const ai = data.openaiConfigured ? 'OpenAI key found in server env' : 'OpenAI key not set in server env';
    setStatus('ok', `yt-dlp ready: ${data.ytdlpVersion}`);
    log(`yt-dlp ready: ${data.ytdlpVersion}. ${ai}.`);
  } catch (error) {
    setStatus('bad', 'yt-dlp missing');
    log(`Setup problem: ${error.message}`);
  }
});

$('fetchVideosBtn').addEventListener('click', async () => {
  try {
    $('fetchVideosBtn').disabled = true;
    const channelUrl = $('channelUrl').value.trim();
    const maxVideos = Number($('maxVideos').value || 50);
    log(`Fetching up to ${maxVideos} videos...`);
    const data = await api('/api/list-videos', { channelUrl, maxVideos });
    state.videos = data.videos;
    state.priceRows = [];
    renderVideos();
    renderPrices();
    log(`Found ${data.count} videos.`);
  } catch (error) {
    log(`Video fetch failed: ${error.message}`);
  } finally {
    $('fetchVideosBtn').disabled = false;
  }
});

$('fetchTranscriptsBtn').addEventListener('click', async () => {
  const languages = $('languages').value.trim() || 'hi.*,hi,en.*';
  const delayMs = Number($('delayMs').value || 1000);
  const pending = state.videos.filter(v => v.status !== 'ok');

  if (!state.videos.length) {
    log('Fetch videos first.');
    return;
  }

  $('fetchTranscriptsBtn').disabled = true;
  log(`Pulling transcripts for ${pending.length} videos...`);

  for (let i = 0; i < state.videos.length; i++) {
    const video = state.videos[i];
    if (video.status === 'ok') continue;

    video.status = 'running';
    video.error = '';
    renderVideos();

    try {
      log(`Transcript ${i + 1}/${state.videos.length}: ${video.title}`);
      const data = await api('/api/transcript', {
        id: video.id,
        videoUrl: video.url,
        languages,
      });
      video.status = 'ok';
      video.language = data.language;
      video.transcriptText = data.transcriptText;
      video.segments = data.segments;
      video.error = '';
      log(`✓ ${video.title} (${data.segmentCount} timestamped segments, ${data.language})`);
    } catch (error) {
      video.status = 'failed';
      video.error = error.message.slice(0, 500);
      log(`× ${video.title}: ${error.message}`);
    }

    renderVideos();
    if (delayMs > 0) await sleep(delayMs);
  }

  $('fetchTranscriptsBtn').disabled = false;
  log('Transcript pull complete.');
});

$('extractPricesBtn').addEventListener('click', async () => {
  try {
    const items = state.videos.filter(v => v.status === 'ok' && v.transcriptText);
    if (!items.length) {
      log('No transcripts found yet.');
      return;
    }
    log(`Extracting basic timestamped price rows from ${items.length} transcripts...`);
    const data = await api('/api/extract-prices', { items });
    state.priceRows = data.rows;
    renderPrices();
    log(`Extracted ${data.count} regex price rows. Use AI extraction for messy Hindi captions.`);
  } catch (error) {
    log(`Price extraction failed: ${error.message}`);
  }
});

$('extractAiBtn').addEventListener('click', async () => {
  try {
    const items = state.videos.filter(v => v.status === 'ok' && Array.isArray(v.segments) && v.segments.length);
    if (!items.length) {
      log('No timestamped transcripts found yet.');
      return;
    }

    const apiKey = $('openaiKey').value.trim();
    const model = $('openaiModel').value.trim() || 'gpt-4o-mini';
    const maxVideos = Number($('aiMaxVideos').value || items.length);
    const maxCharsPerCall = Number($('aiMaxChars').value || 10000);

    if (apiKey) localStorage.setItem('fruitTranscriptMinerOpenAIKey', apiKey);

    $('extractAiBtn').disabled = true;
    log(`AI extracting prices from ${Math.min(maxVideos, items.length)} video(s) using ${model}...`);
    const data = await api('/api/extract-prices-ai', {
      items,
      apiKey,
      model,
      maxVideos,
      maxCharsPerCall,
    });
    state.priceRows = data.rows;
    renderPrices();
    log(`AI extracted ${data.count} price rows with timestamps. Review confidence + context before final analysis.`);
  } catch (error) {
    log(`AI extraction failed: ${error.message}`);
  } finally {
    $('extractAiBtn').disabled = false;
  }
});

$('exportTranscriptsBtn').addEventListener('click', () => {
  const rows = state.videos.map(v => ({
    video_id: v.id,
    title: v.title,
    url: v.url,
    upload_date: v.upload_date,
    language: v.language,
    status: v.status,
    error: v.error,
    segment_count: Array.isArray(v.segments) ? v.segments.length : 0,
    transcript_text: v.transcriptText || '',
  }));
  const csv = toCsv(rows, ['video_id', 'title', 'url', 'upload_date', 'language', 'status', 'error', 'segment_count', 'transcript_text']);
  downloadFile('delhi_fruit_market_transcripts.csv', csv, 'text/csv;charset=utf-8');
});

$('exportSegmentsBtn').addEventListener('click', () => {
  const rows = [];
  for (const v of state.videos) {
    for (const seg of (v.segments || [])) {
      rows.push({
        video_id: v.id,
        title: v.title,
        upload_date: v.upload_date,
        language: v.language,
        timestamp_seconds: Math.floor(Number(seg.start) || 0),
        timestamp_label: seg.timestamp_label || secondsToClock(seg.start),
        timestamp_url: timestampUrl(v.url, seg.start),
        duration: seg.duration,
        text: seg.text,
      });
    }
  }
  const csv = toCsv(rows, ['video_id', 'title', 'upload_date', 'language', 'timestamp_seconds', 'timestamp_label', 'timestamp_url', 'duration', 'text']);
  downloadFile('delhi_fruit_market_segments_with_timestamps.csv', csv, 'text/csv;charset=utf-8');
});

$('exportPricesBtn').addEventListener('click', () => {
  const cols = [
    'source', 'upload_date', 'fruit', 'fruit_hindi', 'variety', 'unit', 'min_price_inr', 'max_price_inr',
    'market_name', 'confidence', 'timestamp_seconds', 'timestamp_label', 'timestamp_url', 'video_title', 'video_url',
    'original_line', 'clean_hindi_line', 'context', 'notes'
  ];
  const csv = toCsv(state.priceRows, cols);
  downloadFile('fruit_price_mentions_with_timestamps.csv', csv, 'text/csv;charset=utf-8');
});

$('exportJsonBtn').addEventListener('click', () => {
  downloadFile('fruit_transcript_project_with_timestamps.json', JSON.stringify(state, null, 2), 'application/json;charset=utf-8');
});

$('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear saved local app data?')) return;
  localStorage.removeItem('fruitTranscriptMinerState');
  localStorage.removeItem('fruitTranscriptMinerStateV2');
  state.videos = [];
  state.priceRows = [];
  $('log').textContent = '';
  renderVideos();
  renderPrices();
});

$('videoSearch').addEventListener('input', renderVideos);
$('priceSearch').addEventListener('input', renderPrices);
$('segmentVideoSelect').addEventListener('change', renderSegmentsPreview);
$('segmentSearch').addEventListener('input', renderSegmentsPreview);

loadLocal();
