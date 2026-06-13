export const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Delhi Fruit Market Intelligence</title>
  <style>
    :root {
      --bg: #f6f7f3;
      --panel: #ffffff;
      --ink: #18231d;
      --muted: #647067;
      --line: #dfe6dc;
      --green: #1b7a4a;
      --green-dark: #105834;
      --green-soft: #e8f5ec;
      --amber: #9a6800;
      --amber-soft: #fff6df;
      --red: #b63b3b;
      --red-soft: #fff0f0;
      --blue: #285da8;
      --blue-soft: #edf4ff;
      --shadow: 0 12px 34px rgba(22, 35, 29, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--bg);
    }
    .app {
      width: min(1240px, calc(100% - 28px));
      margin: 0 auto;
      padding: 20px 0 40px;
    }
    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: end;
      margin-bottom: 14px;
    }
    .eyebrow {
      margin: 0 0 5px;
      color: var(--green-dark);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1, h2, h3, p { margin: 0; }
    h1 {
      font-size: clamp(30px, 4vw, 46px);
      line-height: 1;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      line-height: 1.15;
    }
    .sub {
      margin-top: 7px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.4;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(86px, 1fr));
      gap: 8px;
    }
    .kpi, .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .kpi {
      border-radius: 14px;
      padding: 10px 12px;
      min-width: 0;
    }
    .kpi strong {
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .kpi span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(360px, 0.85fr) minmax(0, 1.15fr);
      gap: 14px;
      align-items: start;
    }
    .panel {
      border-radius: 18px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 12px;
    }
    .panel-head-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    input, select {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 11px;
      padding: 10px 11px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: rgba(27, 122, 74, 0.45);
      box-shadow: 0 0 0 3px rgba(27, 122, 74, 0.1);
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .span-2 { grid-column: 1 / -1; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 10px 14px;
      background: var(--green);
      color: #fff;
      font: inherit;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
    }
    button:hover { background: var(--green-dark); }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    button.secondary {
      background: var(--green-soft);
      color: var(--green-dark);
    }
    button.secondary:hover { background: #d9eddf; }
    button.ghost {
      background: #eef1ec;
      color: var(--muted);
    }
    .hint, .status {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }
    .status {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #f7faf7;
      border: 1px solid var(--line);
    }
    .status.ok {
      background: var(--green-soft);
      color: var(--green-dark);
      border-color: rgba(27, 122, 74, 0.18);
    }
    .status.bad {
      background: var(--red-soft);
      color: var(--red);
      border-color: rgba(182, 59, 59, 0.18);
    }
    .video-preview {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 10px;
      margin-top: 10px;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 13px;
      background: #fbfcfa;
      align-items: center;
    }
    .video-preview img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 9px;
      background: #e8eee7;
    }
    .video-preview strong {
      display: block;
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .video-preview a {
      color: var(--green-dark);
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
    }
    .transcript-box {
      max-height: 330px;
      overflow: auto;
      display: grid;
      gap: 7px;
      padding-right: 3px;
    }
    .segment {
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 9px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 11px;
      background: #fbfcfa;
      font-size: 13px;
      line-height: 1.35;
    }
    .segment time {
      color: var(--green-dark);
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }
    .filters {
      display: grid;
      grid-template-columns: 1.2fr repeat(5, minmax(120px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .mini-kpi {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fbfcfa;
      padding: 8px 10px;
    }
    .mini-kpi strong {
      display: block;
      font-size: 18px;
      line-height: 1;
    }
    .mini-kpi span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .chart-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fbfcfa;
    }
    .chart-wrap svg {
      display: block;
      min-width: 960px;
      width: 100%;
      height: auto;
    }
    .axis, .gridline {
      stroke: #dce5db;
      stroke-width: 1;
    }
    .axis-label, .point-label {
      fill: var(--muted);
      font-size: 11px;
      font-weight: 800;
    }
    .point-label {
      fill: var(--ink);
      paint-order: stroke;
      stroke: #fbfcfa;
      stroke-width: 4px;
    }
    .legend {
      display: grid;
      gap: 6px;
      margin-top: 8px;
    }
    .legend-item {
      display: grid;
      grid-template-columns: 12px minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      padding: 7px 9px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      font-size: 12px;
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 999px;
    }
    .delta.up { color: var(--red); }
    .delta.down { color: var(--green-dark); }
    .delta.flat { color: var(--muted); }
    .table-wrap {
      max-height: 420px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 13px;
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #fff;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f5f8f3;
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 7px;
      background: var(--green-soft);
      color: var(--green-dark);
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .empty {
      padding: 20px;
      text-align: center;
      color: var(--muted);
      font-weight: 800;
      border: 1px dashed var(--line);
      border-radius: 13px;
      background: #fbfcfa;
    }
    .log {
      max-height: 170px;
      overflow: auto;
      margin-top: 10px;
      padding: 10px;
      border-radius: 12px;
      background: #101b14;
      color: #d9ffe4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    @media (max-width: 980px) {
      .topbar, .grid, .filters, .stats-row {
        grid-template-columns: 1fr;
      }
      .kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 680px) {
      .app {
        width: min(100% - 18px, 1240px);
        padding-top: 12px;
      }
      .form-grid, .video-preview {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div>
        <p class="eyebrow">Delhi fruit market intelligence</p>
        <h1>Transcribe, extract, compare prices</h1>
        <p class="sub">Test the Worker transcript route, then analyze price movement by fruit, quality, size, area, party, and date.</p>
      </div>
      <div class="kpis">
        <div class="kpi"><strong id="kpiVideos">0</strong><span>Videos</span></div>
        <div class="kpi"><strong id="kpiPrices">0</strong><span>Prices</span></div>
        <div class="kpi"><strong id="kpiAnalysis">0</strong><span>Analysis</span></div>
        <div class="kpi"><strong id="kpiAI">Off</strong><span>Worker AI</span></div>
      </div>
    </header>

    <section class="grid">
      <div>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Test transcript worker</h2>
              <p class="sub">Paste a YouTube URL, then provide audio as a URL or upload. The Worker stores timestamped Hindi/Hinglish segments.</p>
            </div>
          </div>
          <div class="form-grid">
            <label class="span-2">
              YouTube video URL
              <input id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <label class="span-2">
              Direct audio URL
              <input id="audioUrl" placeholder="https://.../audio.mp3 or .wav" />
            </label>
            <label>
              Audio upload
              <input id="audioFile" type="file" accept="audio/*,video/mp4,video/webm" />
            </label>
            <label>
              Language
              <select id="language">
                <option value="hi">Hindi / Hinglish</option>
                <option value="en">English</option>
              </select>
            </label>
            <label class="span-2">
              Sync token, if your Worker has one
              <input id="syncToken" type="password" placeholder="optional" autocomplete="off" />
            </label>
          </div>
          <div class="panel-head" style="margin-top: 12px; margin-bottom: 0;">
            <div class="panel-head-actions">
              <button id="runTranscriptBtn">Run transcript</button>
              <button id="loadStoredBtn" class="secondary">Load stored transcript</button>
              <button id="clearTranscriptBtn" class="ghost">Clear result</button>
            </div>
          </div>
          <div id="videoPreview" class="video-preview" hidden>
            <img id="videoThumb" alt="" />
            <div>
              <strong id="videoIdLabel"></strong>
              <a id="openVideoLink" href="#" target="_blank" rel="noreferrer">Open video</a>
              <p class="hint" id="videoHint"></p>
            </div>
          </div>
          <div id="transcriptStatus" class="status">Ready.</div>
          <div class="log" id="log"></div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Transcript result</h2>
              <p class="sub" id="transcriptMeta">No transcript loaded.</p>
            </div>
          </div>
          <div id="transcriptBox" class="transcript-box">
            <div class="empty">Run a transcript or load a stored one.</div>
          </div>
        </section>
      </div>

      <div>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Price movement explorer</h2>
              <p class="sub">Filter rows, then compare average midpoint prices across qualities, sizes, areas, and dates.</p>
            </div>
            <div class="panel-head-actions">
              <button id="loadPricesBtn">Load prices</button>
              <button id="resetFiltersBtn" class="secondary">Reset filters</button>
            </div>
          </div>
          <div class="filters">
            <label>Search<input id="searchFilter" placeholder="fruit, area, party, note" /></label>
            <label>Fruit<select id="fruitFilter"><option value="">All</option></select></label>
            <label>Quality / size<select id="qualityFilter"><option value="">All</option></select></label>
            <label>Area<select id="areaFilter"><option value="">All</option></select></label>
            <label>Date from<input id="dateFrom" type="date" /></label>
            <label>Date to<input id="dateTo" type="date" /></label>
          </div>
          <div class="stats-row">
            <div class="mini-kpi"><strong id="statRows">0</strong><span>Filtered rows</span></div>
            <div class="mini-kpi"><strong id="statAvg">-</strong><span>Avg price</span></div>
            <div class="mini-kpi"><strong id="statMin">-</strong><span>Low</span></div>
            <div class="mini-kpi"><strong id="statMax">-</strong><span>High</span></div>
            <div class="mini-kpi"><strong id="statSeries">0</strong><span>Series</span></div>
          </div>
          <div class="chart-wrap" id="chartWrap">
            <div class="empty">Load prices to draw the trend chart.</div>
          </div>
          <div class="legend" id="legend"></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produce</th>
                  <th>Quality</th>
                  <th>Area</th>
                  <th>Party</th>
                  <th>Price</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody id="priceTable">
                <tr><td colspan="7" class="empty">No rows loaded.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
    var priceRows = [];
    var filteredRows = [];
    var colors = ['#1b7a4a', '#285da8', '#9a6800', '#b63b3b', '#6650a4', '#0f766e', '#b45309', '#be185d'];
    var produceNames = {
      mango: '🥭 Mango / Aam',
      aam: '🥭 Mango / Aam',
      apple: '🍎 Apple / Seb',
      seb: '🍎 Apple / Seb',
      banana: '🍌 Banana / Kela',
      kela: '🍌 Banana / Kela',
      watermelon: '🍉 Watermelon / Tarbooj',
      tarbooj: '🍉 Watermelon / Tarbooj',
      pomegranate: '🍎 Pomegranate / Anar',
      anar: '🍎 Pomegranate / Anar',
      orange: '🍊 Orange / Santra',
      santra: '🍊 Orange / Santra',
      mausambi: '🍊 Sweet lime / Mausambi',
      litchi: '🍒 Litchi / Litchi',
      lychee: '🍒 Lychee / Litchi',
      grapes: '🍇 Grapes / Angoor',
      angoor: '🍇 Grapes / Angoor',
      papaya: '🟠 Papaya / Papita',
      papita: '🟠 Papaya / Papita',
      melon: '🍈 Melon / Kharbooja',
      kharbooja: '🍈 Melon / Kharbooja',
      onion: '🧅 Onion / Pyaaz',
      potato: '🥔 Potato / Aloo',
      tomato: '🍅 Tomato / Tamatar',
      garlic: '🧄 Garlic / Lahsun'
    };

    function el(id) { return document.getElementById(id); }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function log(message) {
      var now = new Date().toLocaleTimeString();
      el('log').textContent += '[' + now + '] ' + message + '\n';
      el('log').scrollTop = el('log').scrollHeight;
    }

    function setStatus(message, kind) {
      var node = el('transcriptStatus');
      node.className = 'status' + (kind ? ' ' + kind : '');
      node.textContent = message;
    }

    function extractVideoId(value) {
      var raw = String(value || '').trim();
      if (!raw) return '';
      if (/^[\w-]{11}$/.test(raw)) return raw;
      try {
        var url = new URL(raw);
        if (url.hostname.indexOf('youtu.be') >= 0) return (url.pathname.split('/').filter(Boolean)[0] || '').trim();
        if (url.searchParams.get('v')) return url.searchParams.get('v').trim();
        var parts = url.pathname.split('/').filter(Boolean);
        for (var i = 0; i < parts.length; i += 1) {
          if (['embed', 'shorts', 'live'].indexOf(parts[i]) >= 0) return (parts[i + 1] || '').trim();
        }
      } catch (error) {}
      var match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
      return match ? match[1] : '';
    }

    function authHeaders() {
      var token = el('syncToken').value.trim();
      return token ? { Authorization: 'Bearer ' + token } : {};
    }

    async function fetchJson(path, options) {
      var response = await fetch(path, options || {});
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || ('Request failed: ' + response.status));
      }
      return data;
    }

    function updatePreview() {
      var videoUrl = el('videoUrl').value.trim();
      var id = extractVideoId(videoUrl);
      if (!id) {
        el('videoPreview').hidden = true;
        return;
      }
      el('videoPreview').hidden = false;
      el('videoThumb').src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
      el('videoIdLabel').textContent = 'Video ID: ' + id;
      el('openVideoLink').href = videoUrl || ('https://www.youtube.com/watch?v=' + id);
      el('videoHint').textContent = 'Server transcription needs an audio URL or upload. Pasting only the YouTube page will return a clear setup error.';
    }

    async function runTranscript() {
      var videoUrl = el('videoUrl').value.trim();
      var audioUrl = el('audioUrl').value.trim();
      var file = el('audioFile').files[0];
      var language = el('language').value;
      var button = el('runTranscriptBtn');
      button.disabled = true;
      setStatus('Starting transcription...', '');
      log('Starting transcript request.');
      try {
        var data;
        if (file) {
          var form = new FormData();
          form.append('videoUrl', videoUrl);
          form.append('language', language);
          form.append('audio', file);
          data = await fetchJson('/api/transcripts/transcribe', {
            method: 'POST',
            headers: authHeaders(),
            body: form
          });
        } else {
          data = await fetchJson('/api/transcripts/transcribe', {
            method: 'POST',
            headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
            body: JSON.stringify({
              videoUrl: videoUrl,
              audioUrl: audioUrl,
              language: language
            })
          });
        }
        renderTranscript(data);
        setStatus('Transcript run finished: ' + data.job.segment_count + ' segment(s).', data.job.segment_count ? 'ok' : '');
        log('Transcript job ' + data.job.id + ' finished with ' + data.job.segment_count + ' segment(s).');
      } catch (error) {
        setStatus(error.message, 'bad');
        log('ERROR: ' + error.message);
      } finally {
        button.disabled = false;
      }
    }

    async function loadStoredTranscript() {
      var id = extractVideoId(el('videoUrl').value.trim());
      if (!id) {
        setStatus('Paste a YouTube URL or video ID first.', 'bad');
        return;
      }
      setStatus('Loading stored transcript...', '');
      try {
        var data = await fetchJson('/api/transcripts/' + encodeURIComponent(id));
        renderTranscript(data);
        setStatus('Loaded stored transcript: ' + data.segments.length + ' segment(s).', data.segments.length ? 'ok' : '');
        log('Loaded stored transcript for ' + id + '.');
      } catch (error) {
        setStatus(error.message, 'bad');
        log('ERROR: ' + error.message);
      }
    }

    function renderTranscript(data) {
      var segments = Array.isArray(data.segments) ? data.segments : [];
      var job = data.job || {};
      el('transcriptMeta').textContent = job.id ? ('Job ' + job.id + ' · ' + (job.status || '') + ' · ' + segments.length + ' line(s)') : (segments.length + ' line(s)');
      if (!segments.length) {
        el('transcriptBox').innerHTML = '<div class="empty">No transcript lines returned.</div>';
        return;
      }
      el('transcriptBox').innerHTML = segments.map(function (segment) {
        return '<div class="segment"><time>' + escapeHtml(segment.timestamp_label || secondsToClock(segment.start_seconds)) + '</time><div>' + escapeHtml(segment.text) + '</div></div>';
      }).join('');
    }

    function secondsToClock(seconds) {
      var total = Math.max(0, Math.floor(Number(seconds) || 0));
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      return m + ':' + String(s).padStart(2, '0');
    }

    function priceValue(row) {
      var min = Number(row.min_price_inr);
      var max = Number(row.max_price_inr);
      if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
      if (Number.isFinite(min)) return min;
      if (Number.isFinite(max)) return max;
      return null;
    }

    function money(value) {
      if (!Number.isFinite(Number(value))) return '-';
      return '₹' + Math.round(Number(value)).toLocaleString('en-IN');
    }

    function rowDate(row) {
      return String(row.market_date_sort || row.upload_date || row.market_date || '').slice(0, 10);
    }

    function normalizeProduce(row) {
      var raw = String(row.fruit || row.fruit_hindi || '').trim();
      var key = raw.toLowerCase();
      return produceNames[key] || raw || 'Unknown';
    }

    function qualityLabel(row) {
      return String(row.quality_label || row.quality_grade || row.variety || '').trim() || 'Unspecified';
    }

    function seriesKey(row) {
      return [normalizeProduce(row), qualityLabel(row), row.area_name || row.mandi_name || 'Unknown area', row.unit || 'unit'].join(' · ');
    }

    async function loadPrices() {
      el('loadPricesBtn').disabled = true;
      log('Loading up to 5,000 price rows.');
      try {
        var data = await fetchJson('/api/prices?limit=5000');
        priceRows = Array.isArray(data.items) ? data.items : [];
        populateFilters();
        applyFilters();
        log('Loaded ' + priceRows.length + ' price row(s).');
      } catch (error) {
        log('ERROR: ' + error.message);
      } finally {
        el('loadPricesBtn').disabled = false;
      }
    }

    function uniqueValues(rows, getter) {
      var seen = {};
      rows.forEach(function (row) {
        var value = String(getter(row) || '').trim();
        if (value) seen[value] = true;
      });
      return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
    }

    function setOptions(id, values, current) {
      var select = el(id);
      select.innerHTML = '<option value="">All</option>' + values.map(function (value) {
        return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>';
      }).join('');
      if (current && values.indexOf(current) >= 0) select.value = current;
    }

    function populateFilters() {
      setOptions('fruitFilter', uniqueValues(priceRows, normalizeProduce), el('fruitFilter').value);
      setOptions('qualityFilter', uniqueValues(priceRows, qualityLabel), el('qualityFilter').value);
      setOptions('areaFilter', uniqueValues(priceRows, function (row) { return row.area_name || row.mandi_name; }), el('areaFilter').value);
    }

    function applyFilters() {
      var q = el('searchFilter').value.trim().toLowerCase();
      var fruit = el('fruitFilter').value;
      var quality = el('qualityFilter').value;
      var area = el('areaFilter').value;
      var from = el('dateFrom').value;
      var to = el('dateTo').value;
      filteredRows = priceRows.filter(function (row) {
        var d = rowDate(row);
        if (fruit && normalizeProduce(row) !== fruit) return false;
        if (quality && qualityLabel(row) !== quality) return false;
        if (area && String(row.area_name || row.mandi_name || '') !== area) return false;
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
        if (q) {
          var hay = [
            normalizeProduce(row),
            qualityLabel(row),
            row.area_name,
            row.mandi_name,
            row.party_name,
            row.price_notes,
            row.context,
            row.clean_hindi_line,
            row.video_title
          ].join(' ').toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return priceValue(row) != null;
      });
      renderStats();
      renderChart();
      renderTable();
    }

    function renderStats() {
      var values = filteredRows.map(priceValue).filter(function (value) { return value != null; });
      var min = values.length ? Math.min.apply(null, values) : null;
      var max = values.length ? Math.max.apply(null, values) : null;
      var avg = values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : null;
      var series = uniqueValues(filteredRows, seriesKey).length;
      el('statRows').textContent = filteredRows.length.toLocaleString('en-IN');
      el('statAvg').textContent = avg == null ? '-' : money(avg);
      el('statMin').textContent = min == null ? '-' : money(min);
      el('statMax').textContent = max == null ? '-' : money(max);
      el('statSeries').textContent = series.toLocaleString('en-IN');
    }

    function buildSeries() {
      var groups = {};
      filteredRows.forEach(function (row) {
        var date = rowDate(row);
        var value = priceValue(row);
        if (!date || value == null) return;
        var key = seriesKey(row);
        if (!groups[key]) groups[key] = {};
        if (!groups[key][date]) groups[key][date] = [];
        groups[key][date].push(value);
      });
      return Object.keys(groups).map(function (key) {
        var points = Object.keys(groups[key]).sort().map(function (date) {
          var values = groups[key][date];
          return {
            date: date,
            value: values.reduce(function (sum, value) { return sum + value; }, 0) / values.length,
            count: values.length
          };
        });
        return { key: key, points: points, rowCount: points.reduce(function (sum, point) { return sum + point.count; }, 0) };
      }).filter(function (series) {
        return series.points.length > 0;
      }).sort(function (a, b) {
        if (b.points.length !== a.points.length) return b.points.length - a.points.length;
        return b.rowCount - a.rowCount;
      }).slice(0, 8);
    }

    function renderChart() {
      var series = buildSeries();
      if (!series.length) {
        el('chartWrap').innerHTML = '<div class="empty">No dated price points match these filters.</div>';
        el('legend').innerHTML = '';
        return;
      }
      var allDates = [];
      var allValues = [];
      series.forEach(function (item) {
        item.points.forEach(function (point) {
          allDates.push(point.date);
          allValues.push(point.value);
        });
      });
      allDates = Array.from(new Set(allDates)).sort();
      var width = 960;
      var height = 360;
      var left = 72;
      var right = 172;
      var top = 28;
      var bottom = 56;
      var innerW = width - left - right;
      var innerH = height - top - bottom;
      var minY = Math.min.apply(null, allValues);
      var maxY = Math.max.apply(null, allValues);
      if (minY === maxY) {
        minY = Math.max(0, minY - 1);
        maxY += 1;
      }
      function x(date) {
        var index = Math.max(0, allDates.indexOf(date));
        if (allDates.length === 1) return left + innerW / 2;
        return left + (index / (allDates.length - 1)) * innerW;
      }
      function y(value) {
        return top + innerH - ((value - minY) / (maxY - minY)) * innerH;
      }
      var html = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Price trend chart">';
      for (var i = 0; i < 5; i += 1) {
        var gy = top + (innerH / 4) * i;
        var gv = maxY - ((maxY - minY) / 4) * i;
        html += '<line class="gridline" x1="' + left + '" y1="' + gy.toFixed(1) + '" x2="' + (width - right) + '" y2="' + gy.toFixed(1) + '"></line>';
        html += '<text class="axis-label" x="12" y="' + (gy + 4).toFixed(1) + '">' + money(gv) + '</text>';
      }
      allDates.forEach(function (date, index) {
        if (index !== 0 && index !== allDates.length - 1 && index % Math.ceil(allDates.length / 5) !== 0) return;
        var tx = x(date);
        html += '<line class="axis" x1="' + tx.toFixed(1) + '" y1="' + top + '" x2="' + tx.toFixed(1) + '" y2="' + (height - bottom) + '"></line>';
        html += '<text class="axis-label" x="' + tx.toFixed(1) + '" y="' + (height - 20) + '" text-anchor="middle">' + escapeHtml(date.slice(5)) + '</text>';
      });
      series.forEach(function (item, index) {
        var color = colors[index % colors.length];
        var path = item.points.map(function (point, pointIndex) {
          return (pointIndex ? 'L' : 'M') + x(point.date).toFixed(1) + ' ' + y(point.value).toFixed(1);
        }).join(' ');
        html += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>';
        item.points.forEach(function (point) {
          html += '<circle cx="' + x(point.date).toFixed(1) + '" cy="' + y(point.value).toFixed(1) + '" r="4.5" fill="' + color + '"><title>' + escapeHtml(item.key + ' · ' + point.date + ' · ' + money(point.value) + ' · ' + point.count + ' rows') + '</title></circle>';
        });
        var last = item.points[item.points.length - 1];
        html += '<text class="point-label" x="' + (x(last.date) + 9).toFixed(1) + '" y="' + (y(last.value) + 4).toFixed(1) + '">' + escapeHtml(money(last.value)) + '</text>';
      });
      html += '</svg>';
      el('chartWrap').innerHTML = html;
      el('legend').innerHTML = series.map(function (item, index) {
        var first = item.points[0];
        var last = item.points[item.points.length - 1];
        var delta = last.value - first.value;
        var deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
        var deltaText = (delta > 0 ? '+' : '') + money(delta);
        return '<div class="legend-item"><span class="swatch" style="background:' + colors[index % colors.length] + '"></span><strong>' + escapeHtml(item.key) + '</strong><span class="delta ' + deltaClass + '">' + escapeHtml(deltaText) + '</span></div>';
      }).join('');
    }

    function renderTable() {
      var rows = filteredRows.slice().sort(function (a, b) {
        return rowDate(b).localeCompare(rowDate(a)) || seriesKey(a).localeCompare(seriesKey(b));
      }).slice(0, 250);
      if (!rows.length) {
        el('priceTable').innerHTML = '<tr><td colspan="7" class="empty">No rows match the current filters.</td></tr>';
        return;
      }
      el('priceTable').innerHTML = rows.map(function (row) {
        var amount = money(row.min_price_inr) + (row.max_price_inr && row.max_price_inr !== row.min_price_inr ? ' - ' + money(row.max_price_inr) : '') + (row.unit ? ' / ' + escapeHtml(row.unit) : '');
        var source = row.timestamp_url
          ? '<a href="' + escapeHtml(row.timestamp_url) + '" target="_blank" rel="noreferrer" class="badge">' + escapeHtml(row.timestamp_label || 'open') + '</a>'
          : '<span class="badge">' + escapeHtml(row.source || 'row') + '</span>';
        return '<tr><td>' + escapeHtml(rowDate(row)) + '</td><td><strong>' + escapeHtml(normalizeProduce(row)) + '</strong></td><td>' + escapeHtml(qualityLabel(row)) + '</td><td>' + escapeHtml(row.area_name || row.mandi_name || '') + '</td><td>' + escapeHtml(row.party_name || '') + '</td><td>' + amount + '</td><td>' + source + '</td></tr>';
      }).join('');
    }

    function resetFilters() {
      ['searchFilter', 'fruitFilter', 'qualityFilter', 'areaFilter', 'dateFrom', 'dateTo'].forEach(function (id) {
        el(id).value = '';
      });
      applyFilters();
    }

    async function loadHealth() {
      try {
        var data = await fetchJson('/api/health');
        el('kpiVideos').textContent = Number(data.counts.videos || 0).toLocaleString('en-IN');
        el('kpiPrices').textContent = Number(data.counts.priceRows || 0).toLocaleString('en-IN');
        el('kpiAnalysis').textContent = Number(data.counts.videoAnalysis || 0).toLocaleString('en-IN');
        el('kpiAI').textContent = data.features && data.features.transcription ? 'On' : 'Off';
      } catch (error) {
        log('Health check failed: ' + error.message);
      }
    }

    el('videoUrl').addEventListener('input', updatePreview);
    el('runTranscriptBtn').addEventListener('click', runTranscript);
    el('loadStoredBtn').addEventListener('click', loadStoredTranscript);
    el('clearTranscriptBtn').addEventListener('click', function () {
      el('transcriptBox').innerHTML = '<div class="empty">Run a transcript or load a stored one.</div>';
      el('transcriptMeta').textContent = 'No transcript loaded.';
      setStatus('Ready.', '');
    });
    el('loadPricesBtn').addEventListener('click', loadPrices);
    el('resetFiltersBtn').addEventListener('click', resetFilters);
    ['searchFilter', 'fruitFilter', 'qualityFilter', 'areaFilter', 'dateFrom', 'dateTo'].forEach(function (id) {
      el(id).addEventListener('input', applyFilters);
      el(id).addEventListener('change', applyFilters);
    });
    loadHealth();
  </script>
</body>
</html>`;
