export const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>YouTube Produce Intelligence</title>
  <style>
    :root {
      --bg: #212121;
      --side: #171717;
      --panel: #282828;
      --panel-2: #202020;
      --panel-3: #303030;
      --border: #3a3a3a;
      --muted: #9b9b9b;
      --text: #ececec;
      --soft: #cfcfcf;
      --white: #f4f4f4;
      --accent: #10a37f;
      --danger: #ff7777;
      --warn: #f7b731;
      --shadow: 0 22px 70px rgba(0, 0, 0, 0.34);
      --radius-xl: 24px;
      --radius-lg: 18px;
      --radius-md: 13px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      overflow: hidden;
    }

    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    a { color: inherit; }

    .app {
      display: block;
      height: 100vh;
      width: 100%;
    }

    .sidebar {
      width: 260px;
      background: var(--side);
      border-right: 1px solid #2f2f2f;
      display: flex;
      flex-direction: column;
      padding: 12px;
      flex-shrink: 0;
    }

    .new-chat {
      width: 100%;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--white);
      text-align: left;
      font-size: 14px;
      margin-bottom: 18px;
    }

    .new-chat:hover, .chat-item:hover, .chat-item.active, .profile:hover { background: #2a2a2a; }

    .history-title {
      color: var(--muted);
      font-size: 12px;
      margin: 10px 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .chat-item {
      padding: 11px 12px;
      border-radius: 10px;
      color: #d7d7d7;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #2f2f2f;
    }

    .profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 10px;
    }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #3ddc97);
      display: grid;
      place-items: center;
      color: white;
      font-weight: 750;
      font-size: 13px;
      flex-shrink: 0;
    }

    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
    }

    .topbar {
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      border-bottom: 1px solid #2f2f2f;
      background: rgba(33, 33, 33, 0.88);
      backdrop-filter: blur(16px);
      z-index: 4;
    }

    .top-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .model-pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 14px;
      color: #e8e8e8;
      background: #262626;
    }

    .share-btn, .primary-btn {
      background: var(--white);
      color: #111;
      border: none;
      padding: 8px 13px;
      border-radius: 999px;
      font-weight: 800;
    }

    .secondary-btn {
      background: #303030;
      color: #e8e8e8;
      border: 1px solid #444;
      padding: 8px 13px;
      border-radius: 999px;
      font-weight: 750;
    }

    .ghost-btn {
      background: transparent;
      color: #ddd;
      border: 1px solid #444;
      padding: 8px 12px;
      border-radius: 999px;
      font-weight: 750;
    }

    button:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .chat {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px 24px;
    }

    .chat-inner {
      max-width: 1380px;
      margin: 0 auto;
    }

    .welcome {
      text-align: center;
      margin: 2vh 0 24px;
    }

    .welcome h1 {
      font-size: clamp(30px, 4vw, 48px);
      font-weight: 740;
      margin-bottom: 10px;
      letter-spacing: 0;
    }

    .welcome p {
      color: #b4b4b4;
      font-size: 15px;
    }

    .suggestions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 24px;
      text-align: left;
    }

    .suggestion-card {
      border: 1px solid var(--border);
      background: #262626;
      border-radius: 16px;
      padding: 14px;
    }

    .suggestion-card strong {
      display: block;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .suggestion-card span {
      color: #a9a9a9;
      font-size: 12px;
      line-height: 1.4;
    }

    .dashboard {
      width: 100%;
      border: 1px solid #393939;
      background:
        radial-gradient(circle at top left, rgba(16, 163, 127, 0.14), transparent 32%),
        radial-gradient(circle at 88% 16%, rgba(247, 183, 49, 0.09), transparent 28%),
        linear-gradient(180deg, #282828, #222222);
      border-radius: 20px;
      padding: 14px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }

    .dashboard-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 16px;
    }

    .dashboard-kicker {
      color: #8f8f8f;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }

    .dashboard-title {
      font-size: 24px;
      font-weight: 740;
      letter-spacing: 0;
    }

    .dashboard-subtitle {
      color: #a9a9a9;
      font-size: 14px;
      margin-top: 6px;
      max-width: 760px;
      line-height: 1.5;
    }

    .dashboard-actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
      min-width: min(560px, 100%);
    }

    .dashboard-stat {
      border: 1px solid #3d3d3d;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 16px;
      padding: 12px;
    }

    .dashboard-stat span {
      color: var(--muted);
      font-size: 11px;
      display: block;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dashboard-stat strong {
      font-size: 22px;
      letter-spacing: 0;
      line-height: 1;
    }

    .single-fruit-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 12px;
      min-height: 36px;
    }

    .fruit-pill, .badge, .tab-btn {
      border: 1px solid #444;
      background: #303030;
      color: #ddd;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: 0.16s ease;
      user-select: none;
    }

    .fruit-pill {
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 800;
    }

    .badge, .tab-btn {
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 780;
    }

    .fruit-pill:hover, .badge:hover, .tab-btn:hover { background: #3a3a3a; }
    .fruit-pill.active, .badge.active, .tab-btn.active {
      background: var(--white);
      color: #111;
      border-color: var(--white);
    }

    .fruit-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) 150px 150px;
      gap: 8px;
      margin-bottom: 12px;
      padding: 10px;
      border: 1px solid #373737;
      border-radius: 16px;
      background: rgba(32, 32, 32, 0.78);
      align-items: start;
    }

    .filter-group label, .modal-grid label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 7px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 800;
    }

    .filter-group {
      min-width: 0;
      border: 1px solid #343434;
      border-radius: 13px;
      background: rgba(255, 255, 255, 0.025);
      padding: 8px;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 86px;
      overflow: auto;
      padding-right: 2px;
    }

    .dark-input, .search-box, select.dark-input {
      border: 1px solid #444;
      background: #1f1f1f;
      color: #fff;
      border-radius: 999px;
      padding: 10px 13px;
      outline: none;
      font-size: 13px;
      width: 100%;
    }

    .dark-input::placeholder, .search-box::placeholder { color: #777; }

    .chart-shell {
      position: relative;
      width: 100%;
      height: 410px;
      border: 1px solid #373737;
      background:
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        #202020;
      background-size: 100% 80px, 80px 100%;
      border-radius: 22px;
      overflow: hidden;
    }

    #produceChart {
      width: 100%;
      height: 100%;
      display: block;
    }

    .chart-empty {
      position: absolute;
      inset: 0;
      display: none;
      place-items: center;
      color: transparent;
      font-size: 14px;
      text-align: center;
      padding: 30px;
      background: transparent;
    }

    .chart-empty.show { display: grid; }

    .chart-help {
      color: #8d8d8d;
      font-size: 12px;
      margin-top: 8px;
      text-align: center;
    }

    .popup {
      position: absolute;
      min-width: 280px;
      max-width: 350px;
      background: #f7f7f7;
      color: #111;
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.45);
      z-index: 10;
      display: none;
    }

    .popup.show { display: block; }

    .popup-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .popup h3 {
      font-size: 15px;
      margin-bottom: 4px;
    }

    .popup-time, .popup-confidence {
      color: #666;
      font-size: 12px;
    }

    .popup-close, .modal-close {
      border: none;
      background: #e6e6e6;
      color: #111;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-weight: 850;
    }

    .popup-thumb {
      width: 100%;
      height: 135px;
      object-fit: cover;
      border-radius: 13px;
      margin: 8px 0 10px;
      background: #ddd;
      display: block;
    }

    .popup-video-title {
      color: #333;
      font-size: 13px;
      font-weight: 750;
      line-height: 1.35;
      margin-bottom: 8px;
    }

    .popup-price {
      font-size: 24px;
      font-weight: 850;
      letter-spacing: 0;
      margin: 8px 0;
    }

    .popup-note {
      color: #333;
      font-size: 13px;
      line-height: 1.45;
    }

    .popup-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      color: #111;
      background: #ececec;
      border-radius: 999px;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 850;
      text-decoration: none;
    }

    .dashboard-tabs {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      border-top: 1px solid #363636;
      padding-top: 12px;
      flex-wrap: wrap;
    }

    .tab-panel {
      display: none;
      margin-top: 14px;
    }

    .tab-panel.active { display: block; }

    .panel-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .panel-title {
      font-size: 15px;
      font-weight: 780;
    }

    .panel-note {
      color: #999;
      font-size: 12px;
      margin-top: 3px;
    }

    .search-box { min-width: 250px; max-width: 420px; }

    .table-wrap {
      overflow: auto;
      max-height: 520px;
      border: 1px solid #393939;
      border-radius: 18px;
      background: #202020;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1040px;
    }

    th, td {
      padding: 12px 13px;
      text-align: left;
      border-bottom: 1px solid #333;
      font-size: 13px;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-weight: 700;
      background: #252525;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td { color: #e8e8e8; }
    tr:last-child td { border-bottom: none; }

    .rate-price {
      font-weight: 850;
      color: #fff;
      white-space: nowrap;
    }

    .table-timestamp-link {
      color: #fff;
      text-decoration: none;
      border-bottom: 1px dotted #777;
      font-weight: 800;
    }

    .mini-source {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 220px;
    }

    .mini-thumb {
      width: 62px;
      height: 38px;
      object-fit: cover;
      border-radius: 8px;
      background: #111;
      flex-shrink: 0;
    }

    .mini-title {
      max-width: 260px;
      color: #ddd;
      font-size: 12px;
      line-height: 1.3;
    }

    .confidence-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid #444;
      background: #303030;
      color: #ddd;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 12px;
      white-space: nowrap;
    }

    .video-list {
      display: grid;
      gap: 12px;
      max-height: 620px;
      overflow: auto;
      padding-right: 4px;
    }

    .youtube-video-card {
      border: 1px solid #393939;
      background: #202020;
      border-radius: 20px;
      padding: 14px;
    }

    .youtube-video-head {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 14px;
      margin-bottom: 12px;
    }

    .youtube-thumb-wrap {
      position: relative;
      display: block;
      border-radius: 14px;
      overflow: hidden;
      background: #111;
      min-height: 112px;
    }

    .youtube-thumb {
      width: 100%;
      height: 112px;
      object-fit: cover;
      display: block;
    }

    .youtube-title {
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      line-height: 1.35;
    }

    .youtube-title:hover { text-decoration: underline; }

    .youtube-meta {
      color: #999;
      font-size: 12px;
      margin-top: 5px;
    }

    .youtube-summary {
      color: #d0d0d0;
      font-size: 13px;
      line-height: 1.45;
      margin-top: 10px;
    }

    .youtube-extractions {
      display: grid;
      gap: 10px;
    }

    .youtube-data-row {
      display: grid;
      grid-template-columns: 86px 1fr 130px;
      gap: 12px;
      align-items: start;
      border-top: 1px solid #333;
      padding-top: 11px;
    }

    .timestamp-chip {
      color: #111;
      background: #f4f4f4;
      border-radius: 999px;
      padding: 7px 9px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 850;
      text-align: center;
      white-space: nowrap;
    }

    .youtube-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 7px;
    }

    .youtube-tags span {
      background: #303030;
      border: 1px solid #444;
      color: #ddd;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
    }

    .youtube-note {
      color: #e3e3e3;
      font-size: 13px;
      line-height: 1.45;
    }

    .youtube-rate-box {
      text-align: right;
    }

    .youtube-rate-box strong {
      display: block;
      color: #fff;
      font-size: 15px;
    }

    .youtube-rate-box small {
      display: block;
      color: #999;
      font-size: 11px;
      margin-top: 4px;
    }

    .empty-list {
      border: 1px dashed #444;
      color: #999;
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      background: rgba(255,255,255,0.02);
      font-size: 13px;
    }

    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      place-items: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.62);
    }

    .modal.show { display: grid; }

    .modal-panel {
      width: min(840px, 100%);
      max-height: min(88vh, 820px);
      overflow: auto;
      border-radius: 24px;
      border: 1px solid #444;
      background: #f7f7f7;
      color: #111;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
    }

    .modal-head {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      border-bottom: 1px solid #dedede;
      background: rgba(247, 247, 247, 0.96);
      backdrop-filter: blur(12px);
    }

    .modal-head h2 {
      font-size: 20px;
      letter-spacing: 0;
    }

    .modal-body {
      padding: 18px;
      display: grid;
      gap: 14px;
    }

    .modal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .span-2 { grid-column: 1 / -1; }

    .modal-grid label { color: #5e5e5e; }

    .modal input, .modal select {
      width: 100%;
      border: 1px solid #d7d7d7;
      border-radius: 13px;
      padding: 11px 12px;
      color: #111;
      background: #fff;
      outline: none;
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      align-items: center;
    }

    .modal-actions .primary-btn {
      background: #111;
      color: #fff;
    }

    .modal-actions .secondary-btn {
      background: #e9e9e9;
      color: #111;
      border-color: #dedede;
    }

    .status {
      padding: 10px 12px;
      border: 1px solid #dedede;
      background: #fff;
      color: #555;
      border-radius: 13px;
      font-size: 13px;
      line-height: 1.4;
    }

    .status.ok {
      background: #e8f5ec;
      color: #105834;
      border-color: #cde7d5;
    }

    .status.bad {
      background: #fff0f0;
      color: #b63b3b;
      border-color: #f0c6c6;
    }

    .test-preview {
      display: none;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      padding: 10px;
      border: 1px solid #dedede;
      border-radius: 15px;
      background: #fff;
      align-items: center;
    }

    .test-preview.show { display: grid; }

    .test-preview img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 10px;
      background: #ddd;
    }

    .test-preview strong {
      display: block;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .transcript-box {
      max-height: 290px;
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
      border: 1px solid #dedede;
      border-radius: 11px;
      background: #fff;
      font-size: 13px;
      line-height: 1.35;
    }

    .segment time {
      color: #105834;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }

    .log {
      max-height: 140px;
      overflow: auto;
      padding: 10px;
      border-radius: 12px;
      background: #101b14;
      color: #d9ffe4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    @media (max-width: 1120px) {
      .dashboard-head { flex-direction: column; }
      .dashboard-actions { width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters-grid { grid-template-columns: 1fr 1fr; }
      .suggestions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 900px) {
      body { overflow: auto; height: auto; }
      .app { display: block; height: auto; }
      .main { min-height: 100vh; }
      .topbar { position: sticky; top: 0; }
      .chat { overflow: visible; padding: 18px 14px 28px; }
      .youtube-video-head, .youtube-data-row, .modal-grid { grid-template-columns: 1fr; }
      .youtube-rate-box { text-align: left; }
      .panel-toolbar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
    }

    @media (max-width: 640px) {
      .suggestions, .dashboard-actions, .filters-grid { grid-template-columns: 1fr; }
      .dashboard { padding: 14px; border-radius: 20px; }
      .chart-shell { height: 360px; }
      .dashboard-tabs { overflow-x: auto; flex-wrap: nowrap; }
      .popup { min-width: 260px; max-width: calc(100vw - 42px); }
      .test-preview { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <main class="main">
      <header class="topbar">
        <div class="model-pill">Produce Intelligence</div>
        <div class="top-actions">
          <button class="secondary-btn" id="refreshBtn">Refresh data</button>
          <button class="share-btn" id="openTesterTop">Test transcript</button>
        </div>
      </header>

      <section class="chat">
        <div class="chat-inner">
          <section class="dashboard" id="dashboard">
            <div class="single-fruit-picker" id="fruitPicker"></div>

            <div class="filters-grid">
              <div class="filter-group">
                <label>Grade / quality</label>
                <div class="filter-row" id="gradeFilters"></div>
              </div>
              <div class="filter-group">
                <label>Size / pack</label>
                <div class="filter-row" id="sizeFilters"></div>
              </div>
              <div class="filter-group">
                <label>Area / mandi</label>
                <div class="filter-row" id="areaFilters"></div>
              </div>
              <div class="filter-group">
                <label>Date from</label>
                <input class="dark-input" id="dateFrom" type="date" />
              </div>
              <div class="filter-group">
                <label>Date to</label>
                <input class="dark-input" id="dateTo" type="date" />
              </div>
            </div>

            <div class="chart-shell" id="chartShell">
              <svg id="produceChart" viewBox="0 0 1000 430" preserveAspectRatio="none"></svg>
              <div class="chart-empty" id="chartEmpty"></div>
              <div class="popup" id="chartPopup">
                <div class="popup-top">
                  <div>
                    <h3 id="popupTitle">Produce rate</h3>
                    <div class="popup-time" id="popupTime"></div>
                  </div>
                  <button class="popup-close" id="popupClose">×</button>
                </div>
                <img id="popupThumb" class="popup-thumb" alt="Video thumbnail" />
                <div class="popup-video-title" id="popupVideoTitle"></div>
                <div class="popup-price" id="popupPrice"></div>
                <div class="popup-note" id="popupNote"></div>
                <div class="popup-confidence" id="popupConfidence"></div>
                <a id="popupLink" class="popup-link" href="#" target="_blank" rel="noreferrer">▶ Play from timestamp</a>
              </div>
            </div>

            <div class="chart-help">Each line is a grade + size + area series. Click a dot for source video, transcript context, and confidence.</div>

            <div class="dashboard-tabs">
              <button class="tab-btn active" data-tab="rateList">Rate List</button>
              <button class="tab-btn" data-tab="allData">All Data</button>
            </div>

            <div class="tab-panel active" id="rateListPanel">
              <div class="panel-toolbar">
                <div>
                  <div class="panel-title">Latest rate list</div>
                  <div class="panel-note">Grouped by fruit, grade, size, and area. Each row links back to the timestamped source.</div>
                </div>
                <input id="rateSearch" class="search-box" placeholder="Search grade, size, area, source..." />
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fruit</th>
                      <th>Variety</th>
                      <th>Grade</th>
                      <th>Size</th>
                      <th>Area</th>
                      <th>Latest rate</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Source</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody id="rateListBody"></tbody>
                </table>
              </div>
            </div>

            <div class="tab-panel" id="allDataPanel">
              <div class="panel-toolbar">
                <div>
                  <div class="panel-title">All extracted price rows</div>
                  <div class="panel-note">Raw rows with timestamp, context, grade, size, area, party, and video source.</div>
                </div>
                <input id="dataSearch" class="search-box" placeholder="Search rows, transcript, party, area..." />
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Fruit</th>
                      <th>Grade</th>
                      <th>Size</th>
                      <th>Area</th>
                      <th>Party</th>
                      <th>Rate</th>
                      <th>Context</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody id="allDataBody"></tbody>
                </table>
              </div>
            </div>

          </section>
        </div>
      </section>
    </main>
  </div>

  <div class="modal" id="testModal" aria-hidden="true">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-head">
        <div>
          <h2 id="modalTitle">Test transcript worker</h2>
          <p style="margin-top:5px;color:#666;font-size:13px;">Paste a YouTube URL and run it. The Worker extracts the available timestamped transcript automatically; audio URL/upload is only a fallback.</p>
        </div>
        <button class="modal-close" id="closeTesterBtn">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-grid">
          <label class="span-2">YouTube video URL<input id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." /></label>
          <label class="span-2">Optional direct audio/video URL<input id="audioUrl" placeholder="https://.../audio.mp3, .wav, .m4a, .mp4" /></label>
          <label>Optional audio/video upload<input id="audioFile" type="file" accept="audio/*,video/*" /></label>
          <label>Language<select id="language"><option value="hi">Hindi / Hinglish</option><option value="en">English</option></select></label>
          <label class="span-2">Sync token, if your Worker has one<input id="syncToken" type="password" placeholder="optional" autocomplete="off" /></label>
        </div>
        <div class="test-preview" id="videoPreview">
          <img id="videoThumb" alt="" />
          <div>
            <strong id="videoIdLabel"></strong>
            <a id="openVideoLink" href="#" target="_blank" rel="noreferrer" style="color:#105834;font-weight:800;font-size:13px;">Open video</a>
            <p id="videoHint" style="margin-top:6px;color:#666;font-size:12px;line-height:1.4;"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary-btn" id="runTranscriptBtn">Run transcript</button>
          <button class="secondary-btn" id="loadStoredBtn">Load stored transcript</button>
          <button class="secondary-btn" id="clearTranscriptBtn">Clear result</button>
        </div>
        <div id="transcriptStatus" class="status">Ready.</div>
        <div class="log" id="log"></div>
        <div>
          <div style="font-weight:850;margin-bottom:8px;">Transcript result</div>
          <div id="transcriptMeta" style="font-size:13px;color:#666;margin-bottom:8px;">No transcript loaded.</div>
          <div id="transcriptBox" class="transcript-box"><div class="status">Run a transcript or load a stored one.</div></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    var state = {
      priceRows: [],
      filteredRows: [],
      selectedFruit: '',
      selectedGrade: '',
      selectedSize: '',
      selectedArea: '',
      pointRows: [],
      colors: ['#10a37f', '#f7b731', '#4dabf7', '#eb4d4b', '#be2edd', '#badc58', '#ff9f43', '#00d2d3']
    };

    var produceNames = {
      mango: '🥭 Mango / Aam',
      aam: '🥭 Mango / Aam',
      apple: '🍎 Apple / Seb',
      seb: '🍎 Apple / Seb',
      banana: '🍌 Banana / Kela',
      kela: '🍌 Banana / Kela',
      watermelon: '🍉 Watermelon / Tarbooj',
      tarbooj: '🍉 Watermelon / Tarbooj',
      pomegranate: '🔴 Pomegranate / Anar',
      anar: '🔴 Pomegranate / Anar',
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
      return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function log(message) {
      var now = new Date().toLocaleTimeString();
      el('log').textContent += '[' + now + '] ' + message + '\n';
      el('log').scrollTop = el('log').scrollHeight;
    }

    function fetchJson(path, options) {
      return fetch(path, options || {}).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || data.ok === false) throw new Error(data.error || ('Request failed: ' + response.status));
          return data;
        });
      });
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

    function videoThumb(row) {
      var id = row.video_id || extractVideoId(row.video_url);
      return id ? 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg' : '';
    }

    function timestampUrl(row) {
      if (row.timestamp_url) return row.timestamp_url;
      var url = row.video_url || '';
      var seconds = Math.max(0, Math.floor(Number(row.timestamp_seconds) || 0));
      if (!url) return '#';
      try {
        var parsed = new URL(url);
        parsed.searchParams.set('t', seconds + 's');
        return parsed.toString();
      } catch (error) {
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + seconds + 's';
      }
    }

    function secondsToClock(seconds) {
      var total = Math.max(0, Math.floor(Number(seconds) || 0));
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      return m + ':' + String(s).padStart(2, '0');
    }

    function rowDate(row) {
      return String(row.market_date_sort || row.upload_date || row.market_date || '').slice(0, 10);
    }

    function money(value) {
      if (!Number.isFinite(Number(value))) return '-';
      return '₹' + Math.round(Number(value)).toLocaleString('en-IN');
    }

    function priceValue(row) {
      var min = Number(row.min_price_inr);
      var max = Number(row.max_price_inr);
      if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
      if (Number.isFinite(min)) return min;
      if (Number.isFinite(max)) return max;
      return null;
    }

    function produceLabel(row) {
      var raw = String(row.fruit || row.fruit_hindi || '').trim();
      var key = raw.toLowerCase();
      return produceNames[key] || raw || 'Unknown produce';
    }

    function gradeLabel(row) {
      return String(row.quality_grade || row.quality_label || '').trim() || 'Unspecified';
    }

    function sizeLabel(row) {
      var raw = [row.size, row.size_label, row.quality_label, row.variety, row.price_notes, row.context].join(' ');
      var text = String(raw || '').toLowerCase();
      var count = text.match(/(\d+\s*(?:count|ct|number|num|no\.?|piece|pc))/i);
      if (count) return count[1].replace(/\s+/g, ' ').trim();
      if (text.indexOf('large') >= 0 || text.indexOf('bada') >= 0 || text.indexOf('big') >= 0) return 'Large';
      if (text.indexOf('medium') >= 0 || text.indexOf('madhyam') >= 0) return 'Medium';
      if (text.indexOf('small') >= 0 || text.indexOf('chhota') >= 0) return 'Small';
      return 'Any size';
    }

    function areaLabel(row) {
      return String(row.area_name || row.mandi_name || row.market_name || '').trim() || 'Unknown area';
    }

    function confidenceLabel(row) {
      var conf = String(row.confidence || '').trim();
      if (!conf) return 'unknown';
      var numeric = Number(conf);
      if (Number.isFinite(numeric) && numeric > 0 && numeric <= 1) return Math.round(numeric * 100) + '%';
      return conf;
    }

    function rateRange(row) {
      var min = Number(row.min_price_inr);
      var max = Number(row.max_price_inr);
      var unit = row.unit ? ' / ' + row.unit : '';
      if (Number.isFinite(min) && Number.isFinite(max) && min !== max) return money(min) + ' - ' + money(max) + unit;
      if (Number.isFinite(min)) return money(min) + unit;
      if (Number.isFinite(max)) return money(max) + unit;
      return 'Rate not stated';
    }

    function uniqueValues(rows, getter) {
      var map = {};
      rows.forEach(function (row) {
        var value = String(getter(row) || '').trim();
        if (value) map[value] = true;
      });
      return Object.keys(map).sort(function (a, b) { return a.localeCompare(b); });
    }

    function filteredBaseRows() {
      var from = el('dateFrom').value;
      var to = el('dateTo').value;
      return state.priceRows.filter(function (row) {
        if (priceValue(row) == null) return false;
        if (state.selectedFruit && produceLabel(row) !== state.selectedFruit) return false;
        if (state.selectedGrade && gradeLabel(row) !== state.selectedGrade) return false;
        if (state.selectedSize && sizeLabel(row) !== state.selectedSize) return false;
        if (state.selectedArea && areaLabel(row) !== state.selectedArea) return false;
        var date = rowDate(row);
        if (from && date && date < from) return false;
        if (to && date && date > to) return false;
        return true;
      });
    }

    function seriesKey(row) {
      return [gradeLabel(row), sizeLabel(row), areaLabel(row), row.unit || 'unit'].join(' · ');
    }

    function loadAllData() {
      el('refreshBtn').disabled = true;
      return fetchJson('/api/prices?limit=5000').then(function (result) {
        state.priceRows = Array.isArray(result.items) ? result.items : [];
        if (!state.selectedFruit) state.selectedFruit = uniqueValues(state.priceRows, produceLabel)[0] || '';
        renderEverything();
      }).catch(function (error) {
        el('chartEmpty').classList.add('show');
        el('chartEmpty').textContent = 'Could not load data: ' + error.message;
      }).finally(function () {
        el('refreshBtn').disabled = false;
      });
    }

    function renderFruitPicker() {
      var values = uniqueValues(state.priceRows, produceLabel);
      if (!values.length) {
        el('fruitPicker').innerHTML = '';
        return;
      }
      el('fruitPicker').innerHTML = values.map(function (fruit, index) {
        var active = fruit === state.selectedFruit ? ' active' : '';
        var color = state.colors[index % state.colors.length];
        return '<button class="fruit-pill' + active + '" data-fruit="' + escapeHtml(fruit) + '"><span class="fruit-dot" style="background:' + color + '"></span>' + escapeHtml(fruit) + '</button>';
      }).join('');
      el('fruitPicker').querySelectorAll('[data-fruit]').forEach(function (button) {
        button.addEventListener('click', function () {
          state.selectedFruit = button.getAttribute('data-fruit');
          state.selectedGrade = '';
          state.selectedSize = '';
          state.selectedArea = '';
          hidePopup();
          renderEverything();
        });
      });
    }

    function renderFilterButtons(id, values, selectedValue, attribute, setter) {
      var html = '<button class="badge' + (!selectedValue ? ' active' : '') + '" data-' + attribute + '="">All</button>';
      html += values.map(function (value) {
        return '<button class="badge' + (value === selectedValue ? ' active' : '') + '" data-' + attribute + '="' + escapeHtml(value) + '">' + escapeHtml(value) + '</button>';
      }).join('');
      var container = el(id);
      container.innerHTML = html;
      container.querySelectorAll('button').forEach(function (button) {
        button.addEventListener('click', function () {
          setter(button.getAttribute('data-' + attribute) || '');
          hidePopup();
          renderEverything();
        });
      });
    }

    function renderFilters() {
      var fruitRows = state.priceRows.filter(function (row) { return !state.selectedFruit || produceLabel(row) === state.selectedFruit; });
      renderFilterButtons('gradeFilters', uniqueValues(fruitRows, gradeLabel), state.selectedGrade, 'grade', function (value) { state.selectedGrade = value; });
      renderFilterButtons('sizeFilters', uniqueValues(fruitRows, sizeLabel), state.selectedSize, 'size', function (value) { state.selectedSize = value; });
      renderFilterButtons('areaFilters', uniqueValues(fruitRows, areaLabel), state.selectedArea, 'area', function (value) { state.selectedArea = value; });
    }

    function buildSeries() {
      var groups = {};
      filteredBaseRows().forEach(function (row) {
        var date = rowDate(row);
        if (!date) return;
        var key = seriesKey(row);
        if (!groups[key]) groups[key] = {};
        if (!groups[key][date]) groups[key][date] = [];
        groups[key][date].push(row);
      });
      return Object.keys(groups).map(function (key) {
        var points = Object.keys(groups[key]).sort().map(function (date) {
          var rows = groups[key][date];
          var values = rows.map(priceValue).filter(function (value) { return value != null; });
          var average = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
          var latest = rows.slice().sort(function (a, b) {
            return Number(b.timestamp_seconds || 0) - Number(a.timestamp_seconds || 0);
          })[0];
          return { date: date, value: average, count: rows.length, row: latest };
        });
        return { key: key, points: points, rowCount: points.reduce(function (sum, point) { return sum + point.count; }, 0) };
      }).filter(function (series) {
        return series.points.length > 0;
      }).sort(function (a, b) {
        if (b.points.length !== a.points.length) return b.points.length - a.points.length;
        return b.rowCount - a.rowCount;
      }).slice(0, 8);
    }

    function drawChart() {
      var svg = el('produceChart');
      var series = buildSeries();
      state.pointRows = [];
      if (!series.length) {
        svg.innerHTML = '';
        el('chartEmpty').classList.add('show');
        return;
      }
      el('chartEmpty').classList.remove('show');
      var dates = [];
      var values = [];
      series.forEach(function (item) {
        item.points.forEach(function (point) {
          dates.push(point.date);
          values.push(point.value);
        });
      });
      dates = Array.from(new Set(dates)).sort();
      var width = 1000;
      var height = 430;
      var left = 70;
      var right = 150;
      var top = 34;
      var bottom = 58;
      var innerW = width - left - right;
      var innerH = height - top - bottom;
      var minY = Math.min.apply(null, values);
      var maxY = Math.max.apply(null, values);
      if (minY === maxY) {
        minY = Math.max(0, minY - 1);
        maxY += 1;
      }
      function x(date) {
        var index = Math.max(0, dates.indexOf(date));
        if (dates.length === 1) return left + innerW / 2;
        return left + (index / (dates.length - 1)) * innerW;
      }
      function y(value) {
        return top + innerH - ((value - minY) / (maxY - minY)) * innerH;
      }
      var html = '';
      for (var i = 0; i < 5; i += 1) {
        var gy = top + (innerH / 4) * i;
        var gv = maxY - ((maxY - minY) / 4) * i;
        html += '<line x1="' + left + '" y1="' + gy.toFixed(1) + '" x2="' + (width - right) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(255,255,255,0.1)" stroke-width="1"></line>';
        html += '<text x="14" y="' + (gy + 4).toFixed(1) + '" fill="#999" font-size="12" font-weight="700">' + escapeHtml(money(gv)) + '</text>';
      }
      dates.forEach(function (date, index) {
        if (index !== 0 && index !== dates.length - 1 && index % Math.ceil(dates.length / 5) !== 0) return;
        var tx = x(date);
        html += '<line x1="' + tx.toFixed(1) + '" y1="' + top + '" x2="' + tx.toFixed(1) + '" y2="' + (height - bottom) + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"></line>';
        html += '<text x="' + tx.toFixed(1) + '" y="' + (height - 22) + '" fill="#999" font-size="12" font-weight="700" text-anchor="middle">' + escapeHtml(date.slice(5)) + '</text>';
      });
      series.forEach(function (item, index) {
        var color = state.colors[index % state.colors.length];
        var path = item.points.map(function (point, pointIndex) {
          return (pointIndex ? 'L' : 'M') + x(point.date).toFixed(1) + ' ' + y(point.value).toFixed(1);
        }).join(' ');
        html += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>';
        item.points.forEach(function (point) {
          var pointIndex = state.pointRows.length;
          state.pointRows.push({ row: point.row, value: point.value, date: point.date, key: item.key });
          html += '<circle data-point="' + pointIndex + '" cx="' + x(point.date).toFixed(1) + '" cy="' + y(point.value).toFixed(1) + '" r="6" fill="' + color + '" stroke="#fff" stroke-width="1.5" style="cursor:pointer;filter:drop-shadow(0 0 7px ' + color + ')"></circle>';
        });
        var last = item.points[item.points.length - 1];
        html += '<text x="' + (x(last.date) + 10).toFixed(1) + '" y="' + (y(last.value) + 4).toFixed(1) + '" fill="#fff" font-size="12" font-weight="850" paint-order="stroke" stroke="#202020" stroke-width="4">' + escapeHtml(money(last.value)) + '</text>';
      });
      svg.innerHTML = html;
      svg.querySelectorAll('[data-point]').forEach(function (circle) {
        circle.addEventListener('click', function (event) {
          showPointPopup(Number(circle.getAttribute('data-point')), event);
        });
      });
      var allPoints = series.flatMap(function (item) { return item.points; });
      var latest = allPoints.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })[0];
    }

    function showPointPopup(index, event) {
      var item = state.pointRows[index];
      if (!item) return;
      var row = item.row || {};
      el('popupTitle').textContent = produceLabel(row) + ' · ' + gradeLabel(row);
      el('popupTime').textContent = (rowDate(row) || 'Unknown date') + ' · ' + (row.timestamp_label || secondsToClock(row.timestamp_seconds));
      el('popupThumb').src = videoThumb(row);
      el('popupVideoTitle').textContent = row.video_title || 'YouTube source';
      el('popupPrice').textContent = rateRange(row);
      el('popupNote').textContent = row.price_notes || row.clean_hindi_line || row.context || row.original_line || '';
      el('popupConfidence').textContent = 'Confidence: ' + confidenceLabel(row) + ' · ' + item.key;
      el('popupLink').href = timestampUrl(row);
      var shellRect = el('chartShell').getBoundingClientRect();
      var popup = el('chartPopup');
      var left = Math.min(Math.max(event.clientX - shellRect.left + 12, 12), shellRect.width - 365);
      var top = Math.min(Math.max(event.clientY - shellRect.top + 12, 12), shellRect.height - 320);
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
      popup.classList.add('show');
    }

    function hidePopup() {
      el('chartPopup').classList.remove('show');
    }

    function renderRateList() {
      var q = el('rateSearch').value.trim().toLowerCase();
      var groups = {};
      filteredBaseRows().forEach(function (row) {
        var key = [produceLabel(row), row.variety || '', gradeLabel(row), sizeLabel(row), areaLabel(row), row.unit || ''].join('|');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      var rows = Object.keys(groups).map(function (key) {
        return groups[key].slice().sort(function (a, b) {
          return String(rowDate(b)).localeCompare(String(rowDate(a))) || Number(b.timestamp_seconds || 0) - Number(a.timestamp_seconds || 0);
        })[0];
      }).filter(function (row) {
        if (!q) return true;
        return [produceLabel(row), row.variety, gradeLabel(row), sizeLabel(row), areaLabel(row), row.video_title, row.price_notes].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) {
        return String(rowDate(b)).localeCompare(String(rowDate(a))) || produceLabel(a).localeCompare(produceLabel(b));
      });
      if (!rows.length) {
        el('rateListBody').innerHTML = '<tr><td colspan="10"><div class="empty-list">No rate rows match the current filters.</div></td></tr>';
        return;
      }
      el('rateListBody').innerHTML = rows.map(function (row) {
        return '<tr><td>' + escapeHtml(produceLabel(row)) + '</td><td>' + escapeHtml(row.variety || '') + '</td><td>' + escapeHtml(gradeLabel(row)) + '</td><td>' + escapeHtml(sizeLabel(row)) + '</td><td>' + escapeHtml(areaLabel(row)) + '</td><td class="rate-price">' + escapeHtml(rateRange(row)) + '</td><td>' + escapeHtml(money(row.min_price_inr)) + '</td><td>' + escapeHtml(money(row.max_price_inr)) + '</td><td><div class="mini-source"><img class="mini-thumb" src="' + escapeHtml(videoThumb(row)) + '" alt=""><div><a class="table-timestamp-link" href="' + escapeHtml(timestampUrl(row)) + '" target="_blank" rel="noreferrer">' + escapeHtml(row.timestamp_label || secondsToClock(row.timestamp_seconds)) + '</a><div class="mini-title">' + escapeHtml(row.video_title || 'YouTube source') + '</div></div></div></td><td><span class="confidence-pill">' + escapeHtml(confidenceLabel(row)) + '</span></td></tr>';
      }).join('');
    }

    function renderAllData() {
      var q = el('dataSearch').value.trim().toLowerCase();
      var rows = filteredBaseRows().filter(function (row) {
        if (!q) return true;
        return [produceLabel(row), row.variety, gradeLabel(row), sizeLabel(row), areaLabel(row), row.party_name, row.price_notes, row.context, row.clean_hindi_line, row.video_title].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) {
        return String(rowDate(b)).localeCompare(String(rowDate(a))) || Number(a.timestamp_seconds || 0) - Number(b.timestamp_seconds || 0);
      }).slice(0, 500);
      if (!rows.length) {
        el('allDataBody').innerHTML = '<tr><td colspan="9"><div class="empty-list">No extracted rows match the current filters.</div></td></tr>';
        return;
      }
      el('allDataBody').innerHTML = rows.map(function (row) {
        return '<tr><td>' + escapeHtml(rowDate(row)) + '</td><td>' + escapeHtml(produceLabel(row)) + '</td><td>' + escapeHtml(gradeLabel(row)) + '</td><td>' + escapeHtml(sizeLabel(row)) + '</td><td>' + escapeHtml(areaLabel(row)) + '</td><td>' + escapeHtml(row.party_name || '') + '</td><td class="rate-price">' + escapeHtml(rateRange(row)) + '</td><td>' + escapeHtml(row.clean_hindi_line || row.context || row.original_line || row.price_notes || '') + '</td><td><a class="table-timestamp-link" href="' + escapeHtml(timestampUrl(row)) + '" target="_blank" rel="noreferrer">' + escapeHtml(row.timestamp_label || secondsToClock(row.timestamp_seconds)) + '</a></td></tr>';
      }).join('');
    }

    function renderEverything() {
      renderFruitPicker();
      renderFilters();
      state.filteredRows = filteredBaseRows();
      drawChart();
      renderRateList();
      renderAllData();
    }

    function setTranscriptStatus(message, kind) {
      var node = el('transcriptStatus');
      node.className = 'status' + (kind ? ' ' + kind : '');
      node.textContent = message;
    }

    function authHeaders() {
      var token = el('syncToken').value.trim();
      if (token) localStorage.setItem('fruitMandiSyncToken', token);
      return token ? { Authorization: 'Bearer ' + token } : {};
    }

    function openTester() {
      el('testModal').classList.add('show');
      el('testModal').setAttribute('aria-hidden', 'false');
      el('videoUrl').focus();
    }

    function closeTester() {
      el('testModal').classList.remove('show');
      el('testModal').setAttribute('aria-hidden', 'true');
    }

    function updatePreview() {
      var videoUrl = el('videoUrl').value.trim();
      var id = extractVideoId(videoUrl);
      if (!id) {
        el('videoPreview').classList.remove('show');
        return;
      }
      el('videoPreview').classList.add('show');
      el('videoThumb').src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
      el('videoIdLabel').textContent = 'Video ID: ' + id;
      el('openVideoLink').href = videoUrl || ('https://www.youtube.com/watch?v=' + id);
      el('videoHint').textContent = 'The Worker will fetch the YouTube transcript from this video URL. Use audio URL/upload only when YouTube has no transcript track.';
    }

    function runTranscript() {
      var videoUrl = el('videoUrl').value.trim();
      var audioUrl = el('audioUrl').value.trim();
      var file = el('audioFile').files[0];
      var language = el('language').value;
      el('runTranscriptBtn').disabled = true;
      setTranscriptStatus(file || audioUrl ? 'Starting transcription...' : 'Extracting YouTube transcript...', '');
      log(file || audioUrl ? 'Starting transcript request.' : 'Extracting transcript from YouTube URL.');
      var request;
      if (file) {
        var form = new FormData();
        form.append('videoUrl', videoUrl);
        form.append('language', language);
        form.append('audio', file);
        request = fetchJson('/api/transcripts/transcribe', { method: 'POST', headers: authHeaders(), body: form });
      } else {
        request = fetchJson('/api/transcripts/transcribe', {
          method: 'POST',
          headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
          body: JSON.stringify({ videoUrl: videoUrl, audioUrl: audioUrl, language: language })
        });
      }
      request.then(function (data) {
        renderTranscript(data);
        setTranscriptStatus('Transcript run finished: ' + data.job.segment_count + ' segment(s).', data.job.segment_count ? 'ok' : '');
        log('Transcript job ' + data.job.id + ' finished with ' + data.job.segment_count + ' segment(s).');
      }).catch(function (error) {
        setTranscriptStatus(error.message, 'bad');
        log('ERROR: ' + error.message);
      }).finally(function () {
        el('runTranscriptBtn').disabled = false;
      });
    }

    function loadStoredTranscript() {
      var id = extractVideoId(el('videoUrl').value.trim());
      if (!id) {
        setTranscriptStatus('Paste a YouTube URL or video ID first.', 'bad');
        return;
      }
      setTranscriptStatus('Loading stored transcript...', '');
      fetchJson('/api/transcripts/' + encodeURIComponent(id)).then(function (data) {
        renderTranscript(data);
        setTranscriptStatus('Loaded stored transcript: ' + data.segments.length + ' segment(s).', data.segments.length ? 'ok' : '');
        log('Loaded stored transcript for ' + id + '.');
      }).catch(function (error) {
        setTranscriptStatus(error.message, 'bad');
        log('ERROR: ' + error.message);
      });
    }

    function renderTranscript(data) {
      var segments = Array.isArray(data.segments) ? data.segments : [];
      var job = data.job || {};
      el('transcriptMeta').textContent = job.id ? ('Job ' + job.id + ' · ' + (job.status || '') + ' · ' + segments.length + ' line(s)') : (segments.length + ' line(s)');
      if (!segments.length) {
        el('transcriptBox').innerHTML = '<div class="status">No transcript lines returned.</div>';
        return;
      }
      el('transcriptBox').innerHTML = segments.map(function (segment) {
        return '<div class="segment"><time>' + escapeHtml(segment.timestamp_label || secondsToClock(segment.start_seconds)) + '</time><div>' + escapeHtml(segment.text) + '</div></div>';
      }).join('');
    }

    function setupEvents() {
      el('openTesterTop').addEventListener('click', openTester);
      el('closeTesterBtn').addEventListener('click', closeTester);
      el('testModal').addEventListener('click', function (event) {
        if (event.target === el('testModal')) closeTester();
      });
      el('refreshBtn').addEventListener('click', loadAllData);
      el('popupClose').addEventListener('click', hidePopup);
      el('videoUrl').addEventListener('input', updatePreview);
      el('runTranscriptBtn').addEventListener('click', runTranscript);
      el('loadStoredBtn').addEventListener('click', loadStoredTranscript);
      el('clearTranscriptBtn').addEventListener('click', function () {
        el('transcriptBox').innerHTML = '<div class="status">Run a transcript or load a stored one.</div>';
        el('transcriptMeta').textContent = 'No transcript loaded.';
        setTranscriptStatus('Ready.', '');
      });
      ['dateFrom', 'dateTo', 'rateSearch', 'dataSearch'].forEach(function (id) {
        el(id).addEventListener('input', renderEverything);
      });
      document.querySelectorAll('.tab-btn').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('.tab-btn').forEach(function (item) { item.classList.remove('active'); });
          document.querySelectorAll('.tab-panel').forEach(function (item) { item.classList.remove('active'); });
          button.classList.add('active');
          el(button.getAttribute('data-tab') + 'Panel').classList.add('active');
        });
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeTester();
          hidePopup();
        }
      });
    }

    setupEvents();
    el('syncToken').value = localStorage.getItem('fruitMandiSyncToken') || '';
    loadAllData();
  </script>
</body>
</html>`;
