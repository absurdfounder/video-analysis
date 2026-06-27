export const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#008a6c" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="Krishi Kal" />
  <title>Krishi Kal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #f5f5f5;
      --side: #ffffff;
      --panel: #ffffff;
      --panel-2: #fafafa;
      --panel-3: #f7f7f7;
      --border: #dddddd;
      --border-strong: #b0b0b0;
      --muted: #717171;
      --text: #222222;
      --soft: #484848;
      --white: #ffffff;
      --accent: #008a6c;
      --accent-soft: #f0faf6;
      --accent-text: #006b54;
      --accent-mid: #00a07d;
      --danger: #c13515;
      --warn: #b86e08;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
      --shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 12px 36px rgba(0, 0, 0, 0.12);
      --hover: #f7f7f7;
      --input-bg: #ffffff;
      --chart-bg: #ffffff;
      --topbar-bg: rgba(255, 255, 255, 0.96);
      --radius-xl: 16px;
      --radius-lg: 12px;
      --radius-md: 8px;
      --radius-pill: 40px;
    }

    html {
      color-scheme: light;
      overflow-x: hidden;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      overflow: hidden;
    }

    html.scroll-locked,
    body.scroll-locked {
      overflow: hidden !important;
      overscroll-behavior: none;
      touch-action: none;
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
      border-right: 1px solid var(--border);
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
      color: var(--text);
      text-align: left;
      font-size: 14px;
      margin-bottom: 18px;
    }

    .new-chat:hover, .chat-item:hover, .chat-item.active, .profile:hover { background: var(--hover); }

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
      color: var(--soft);
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border);
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
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 24px;
      border-bottom: 1px solid var(--border);
      background: var(--topbar-bg);
      backdrop-filter: blur(12px);
      box-shadow: var(--shadow-sm);
      z-index: 4;
    }

    .site-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .site-brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), #34c759);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 18px;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 138, 108, 0.28);
    }

    .site-brand-copy {
      display: grid;
      gap: 1px;
      min-width: 0;
    }

    .site-brand-copy strong {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
      line-height: 1.2;
    }

    .site-brand-copy span {
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      min-width: 0;
    }

    .top-actions-group {
      display: flex;
      gap: 2px;
      align-items: center;
      padding: 4px;
      border-radius: var(--radius-pill);
      background: var(--panel-3);
      border: 1px solid var(--border);
    }

    .top-actions .secondary-btn,
    .top-actions .share-btn,
    .top-actions .text-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      flex-shrink: 0;
      min-height: 38px;
      line-height: 1.25;
      box-sizing: border-box;
    }

    .text-btn {
      background: transparent;
      color: var(--text);
      border: none;
      padding: 8px 14px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 14px;
      transition: background 0.15s ease;
    }

    .text-btn:hover {
      background: var(--hover);
    }

    .model-pill {
      display: none;
    }

    .share-btn, .primary-btn {
      background: var(--text);
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 14px;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
      box-shadow: var(--shadow-sm);
    }

    .share-btn:hover, .primary-btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow);
    }

    .secondary-btn {
      background: var(--white);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 10px 16px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 14px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .secondary-btn:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-sm);
    }

    .ghost-btn {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border-strong);
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
      padding: 24px 24px 40px;
      background: var(--bg);
    }

    .chat-inner {
      max-width: 1280px;
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
      color: var(--muted);
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
      background: var(--panel-3);
      border-radius: 16px;
      padding: 14px;
    }

    .suggestion-card strong {
      display: block;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .suggestion-card span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .dashboard {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: var(--radius-xl);
      padding: 24px;
      box-shadow: var(--shadow-sm);
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
      color: var(--muted);
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
      color: var(--muted);
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
      border: 1px solid var(--border);
      background: var(--panel-2);
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
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: 0.15s ease;
      user-select: none;
    }

    .fruit-pill {
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
    }

    .badge, .tab-btn {
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
    }

    .fruit-pill:hover, .badge:hover, .tab-btn:hover {
      border-color: var(--border-strong);
      background: var(--hover);
    }
    .fruit-pill.active, .badge.active, .tab-btn.active {
      background: var(--text);
      color: #ffffff;
      border-color: var(--text);
      box-shadow: var(--shadow-sm);
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
    }

    .chart-filters-panel {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--panel-2);
    }

    .chart-filter-select {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      font-size: 14px;
      font-weight: 500;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23717171' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .chart-filter-select:focus {
      border-color: var(--text);
      box-shadow: 0 0 0 1px var(--text);
    }

    .filter-row {
      display: none;
    }

    .filter-group label, .modal-grid label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }

    .filter-group {
      min-width: 0;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      padding: 0;
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
      border: 1px solid var(--border);
      background: var(--input-bg);
      color: var(--text);
      border-radius: var(--radius-pill);
      padding: 11px 16px;
      outline: none;
      font-size: 14px;
      width: 100%;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .dark-input:focus, .search-box:focus, select.dark-input:focus {
      border-color: var(--text);
      box-shadow: 0 0 0 1px var(--text);
    }

    .dark-input::placeholder, .search-box::placeholder { color: var(--muted); }

    .chart-shell {
      position: relative;
      width: 100%;
      min-height: 420px;
      border: 1px solid var(--border);
      background: var(--chart-bg);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px 20px;
      justify-content: center;
      padding: 14px 18px 10px;
      border-bottom: 1px solid var(--border);
      background: var(--white);
      min-height: 44px;
    }

    .chart-legend:empty {
      display: none;
    }

    .chart-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--soft);
      max-width: 220px;
    }

    .chart-legend-swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .chart-legend-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #produceChart {
      width: 100%;
      flex: 1;
      min-height: 380px;
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
      color: var(--muted);
      font-size: 13px;
      margin-top: 12px;
      text-align: left;
      line-height: 1.5;
    }

    .popup {
      position: fixed;
      left: 0;
      top: 0;
      min-width: 280px;
      max-width: min(350px, calc(100vw - 24px));
      max-height: min(420px, calc(100dvh - 24px));
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      background: var(--white, #fff);
      color: var(--text, #111);
      border: 1px solid var(--border, #ddd);
      border-radius: var(--radius-lg, 18px);
      padding: var(--space-4, 14px);
      box-shadow: var(--shadow-lg, 0 18px 48px rgba(15, 23, 42, 0.12));
      z-index: 120;
      display: none;
      pointer-events: auto;
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

    .popup-close {
      border: none;
      background: #e6e6e6;
      color: #111;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-weight: 850;
    }

    .popup-thumb {
      display: none;
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

    .popup-context-grid {
      display: grid;
      gap: 8px;
      margin-top: 4px;
    }

    .popup-context-row {
      border: 1px solid #ddd;
      background: #fafafa;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
    }

    .popup-context-row strong {
      display: block;
      color: #666;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 3px;
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
      border: none;
      border-radius: 999px;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 850;
      text-decoration: none;
      cursor: pointer;
    }

    button.app-jump {
      cursor: pointer;
      font: inherit;
    }

    button.rate-proof-link,
    button.table-timestamp-link,
    button.market-rate-proof,
    button.rich-rate-link {
      background: none;
      border: none;
      padding: 0;
    }

    button.market-intel-jump {
      background: none;
      border: none;
      padding: 0;
      color: #9a6200;
      font-weight: 800;
      margin-right: 6px;
    }

    .dashboard-tabs {
      display: flex;
      gap: 4px;
      margin-top: 28px;
      padding: 4px;
      background: var(--panel-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      width: fit-content;
    }

    .dashboard-tabs .tab-btn {
      border: none;
      background: transparent;
      padding: 10px 20px;
    }

    .dashboard-tabs .tab-btn.active {
      background: var(--white);
      color: var(--text);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }

    .analysis-cards {
      display: grid;
      gap: 10px;
      margin-bottom: 14px;
    }

    .all-data-panel .analysis-cards {
      display: grid;
      margin-top: 0;
      margin-bottom: 12px;
    }

    .analysis-card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 18px;
      padding: 14px;
      display: block;
    }

    .market-day-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .market-day-date {
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .market-day-title {
      color: var(--text);
      font-size: 16px;
      font-weight: 900;
      line-height: 1.3;
      margin-top: 4px;
    }

    .market-day-sub {
      color: var(--muted);
      font-size: 12px;
      margin-top: 4px;
    }

    .analysis-card-compact {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
    }

    .analysis-video-thumb {
      width: 80px;
      height: 45px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--panel-3);
      flex-shrink: 0;
      display: block;
    }

    .analysis-card-copy {
      flex: 1;
      min-width: 0;
    }

    .analysis-card-compact .market-day-title {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .analysis-card-compact .secondary-btn {
      flex-shrink: 0;
    }

    .video-thumb-cell {
      width: 76px;
      padding-right: 8px !important;
      vertical-align: middle;
    }

    .table-video-thumb-btn {
      display: block;
      border: none;
      background: transparent;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      line-height: 0;
    }

    .table-video-thumb-btn:hover {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .youtube-table-thumb {
      width: 64px;
      height: 36px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--panel-3);
      display: block;
    }

    .market-rate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .market-fruit-section {
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--panel-2);
      padding: 10px 12px;
    }

    .market-fruit-section:first-of-type {
      margin-top: 10px;
    }

    .market-fruit-name {
      color: var(--text);
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .produce-heading-text {
      flex: 1;
      min-width: 0;
      font-weight: 600;
      font-size: 15px;
      line-height: 1.3;
    }

    .produce-thumb {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--panel-3);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }

    .produce-thumb-sm {
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }

    .produce-thumb-lg {
      width: 52px;
      height: 52px;
      border-radius: 12px;
    }

    .produce-thumb-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 700;
      color: var(--soft);
      background: var(--panel-2);
    }

    .produce-cell {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .produce-cell span {
      min-width: 0;
    }

    .market-fruit-meta {
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .market-fruit-meta-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
      text-align: right;
    }

    .market-fruit-meta-update {
      font-size: 12px;
      font-weight: 600;
      color: var(--soft);
    }

    .market-grade-list {
      display: grid;
      gap: 6px;
    }

    .market-grade-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.4fr) auto auto;
      gap: 12px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--accent-soft);
      padding: 8px 10px;
    }

    .market-grade-rate {
      color: var(--text);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
      text-align: right;
    }

    .market-grade-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .market-grade-label {
      color: var(--text);
      font-size: 12px;
      font-weight: 800;
    }

    .market-grade-meta {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
    }

    .reanalyze-status.bad { border-color: #e8b4b4; color: var(--danger); }

    .ongoing-tasks-panel {
      margin-bottom: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(16, 163, 127, 0.28);
      background: var(--accent-soft);
    }
    .ongoing-tasks-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .ongoing-tasks-head strong {
      font-size: 14px;
      letter-spacing: 0.01em;
    }
    .ongoing-tasks-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      border-radius: 999px;
      background: rgba(16, 163, 127, 0.22);
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 700;
    }
    .ongoing-tasks-list {
      display: grid;
      gap: 8px;
    }
    .ongoing-task-card {
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--panel-2);
      border: 1px solid var(--border);
    }
    .ongoing-task-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .ongoing-task-title {
      font-size: 13px;
      font-weight: 650;
      line-height: 1.35;
      color: var(--text);
    }
    .ongoing-task-stage {
      font-size: 12px;
      color: var(--accent-text);
      white-space: nowrap;
    }
    .ongoing-task-bar {
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.06);
      overflow: hidden;
      margin-bottom: 6px;
    }
    .ongoing-task-bar > span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #1f7a4f, #3cb371);
      transition: width 0.35s ease;
    }
    .ongoing-task-msg {
      font-size: 12px;
      color: var(--soft);
      line-height: 1.4;
    }
    .ongoing-task-meta {
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
    }
    .ongoing-queue-card {
      border-style: dashed;
      border-color: var(--accent-mid);
      background: var(--accent-soft);
    }
    .ongoing-queue-card .ongoing-task-title {
      color: var(--accent-text);
    }

    .activity-top-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      margin-left: 6px;
      padding: 0 5px;
      border-radius: 999px;
      background: rgba(16, 163, 127, 0.35);
      color: var(--accent-text);
      font-size: 11px;
      font-weight: 800;
    }
    .activity-top-badge[hidden] { display: none !important; }

    .activity-banner {
      margin-bottom: 20px;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(0, 138, 108, 0.2);
      background: var(--accent-soft);
      display: grid;
      gap: 12px;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.15s ease;
    }

    .activity-banner:hover {
      box-shadow: var(--shadow);
    }
    .activity-banner[hidden] { display: none !important; }
    .activity-banner-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .activity-banner-title {
      display: grid;
      gap: 2px;
    }
    .activity-banner-title strong {
      font-size: 14px;
      color: var(--accent-text);
    }
    .activity-banner-title span {
      font-size: 12px;
      color: var(--accent-mid);
    }
    .activity-banner-count {
      font-size: 18px;
      font-weight: 900;
      color: var(--text);
      white-space: nowrap;
    }
    .activity-banner-bar {
      height: 6px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .activity-banner-bar > span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #10a37f, #5dffc8);
      transition: width 0.35s ease;
    }
    .activity-banner-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      color: var(--muted);
    }

    #activityModal .modal-panel {
      width: min(520px, 96vw);
      max-height: min(82vh, 720px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #activityModal .modal-head {
      flex-shrink: 0;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    .activity-head-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .activity-live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--accent-soft);
      border: 1px solid rgba(16, 163, 127, 0.25);
      color: var(--accent-text);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .activity-live-pill::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10a37f;
      box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.18);
      animation: activityPulse 1.6s ease-in-out infinite;
    }

    .activity-live-pill[hidden] { display: none !important; }

    @keyframes activityPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.92); }
    }

    .activity-status-card {
      margin: 16px 24px 0;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--panel-2);
      box-shadow: var(--shadow-sm);
    }

    .activity-status-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .activity-status-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .activity-status-copy strong {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      line-height: 1.35;
    }

    .activity-status-copy span {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.45;
    }

    .activity-status-count {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .activity-refresh-note {
      margin-top: 10px;
      font-size: 11px;
      color: var(--muted);
    }

    .activity-refresh-note[hidden] { display: none !important; }
    .activity-summary {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
    }
    .activity-summary-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .activity-summary-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .activity-summary-percent {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .activity-summary-bar {
      height: 6px;
      border-radius: 999px;
      background: var(--panel-3);
      overflow: hidden;
      margin-top: 12px;
    }
    .activity-summary-bar > span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--text);
      transition: width 0.35s ease;
    }
    .activity-summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 16px;
    }
    .activity-stat {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 12px 10px;
      background: var(--white);
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .activity-stat:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-sm);
    }

    .activity-stat.selected {
      border-color: var(--text);
      box-shadow: var(--shadow-sm);
    }
    .activity-stat strong {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
    }
    .activity-stat span {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    .activity-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .activity-tab-btn {
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--soft);
      border-radius: var(--radius-pill);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .activity-tab-btn.active {
      border-color: var(--text);
      background: var(--white);
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }
    .activity-list-wrap {
      overflow: auto;
      padding: 12px 20px 20px;
      min-height: 0;
      flex: 1;
    }
    .activity-list {
      display: grid;
      gap: 8px;
    }
    .activity-row {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 10px;
      background: var(--panel-2);
    }
    .activity-row.active-row {
      border-color: rgba(16, 163, 127, 0.45);
      background: var(--accent-soft);
    }
    .activity-row.completed-row {
      border-color: rgba(16, 163, 127, 0.22);
    }
    .activity-row.failed-row {
      border-color: rgba(235, 77, 75, 0.35);
      background: rgba(235, 77, 75, 0.06);
    }
    .activity-thumb {
      width: 72px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--panel-3);
      display: block;
    }
    .activity-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }
    .activity-copy strong {
      font-size: 12px;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-copy span {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-copy time {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
      font-style: normal;
    }
    .activity-copy em {
      font-style: normal;
      font-size: 11px;
      color: var(--soft);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .activity-side {
      display: grid;
      gap: 4px;
      justify-items: end;
      text-align: right;
    }
    .activity-pill {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--soft);
      white-space: nowrap;
    }
    .activity-pill.active { border-color: rgba(16, 163, 127, 0.5); color: var(--accent-text); }
    .activity-pill.waiting { border-color: #444; color: #aaa; }
    .activity-pill.done { border-color: rgba(16, 163, 127, 0.35); color: var(--accent-text); }
    .activity-pill.failed { border-color: rgba(235, 77, 75, 0.45); color: var(--danger); }
    .activity-mini-bar {
      width: 72px;
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .activity-mini-bar > span {
      display: block;
      height: 100%;
      background: #10a37f;
    }
    .activity-empty {
      padding: 32px 20px 40px;
      text-align: center;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .activity-position {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .chart-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .chart-filter-summary {
      font-size: 14px;
      color: var(--soft);
      line-height: 1.4;
      flex: 1;
      font-weight: 500;
    }
    .chart-filters-panel {
      margin-bottom: 16px;
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--panel-2);
    }
    .chart-filters-panel[hidden] { display: none !important; }
    .chart-filters-panel .filter-group label {
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
      display: block;
    }

    .reanalyze-status {
      margin: 0 0 12px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel-3);
      color: var(--soft);
      font-size: 13px;
      line-height: 1.45;
    }

    .reanalyze-status.ok { border-color: #10a37f; color: var(--accent-text); }
    .reanalyze-status.bad { border-color: #e8b4b4; color: var(--danger); }

    .market-rate-tile {
      border: 1px solid var(--border);
      background: var(--accent-soft);
      border-radius: 14px;
      padding: 10px 11px;
      min-width: 0;
    }

    .market-rate-label {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .market-rate-value {
      display: block;
      color: var(--text);
      font-size: 18px;
      font-weight: 900;
      line-height: 1.2;
    }

    .market-rate-proof {
      display: inline-block;
      margin-top: 6px;
      color: var(--accent-text);
      font-size: 11px;
      font-weight: 850;
      text-decoration: none;
      border-bottom: 1px dotted rgba(13, 143, 111, 0.45);
    }

    .market-brief-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .market-brief-box {
      border: 1px solid var(--border);
      background: var(--panel-2);
      border-radius: 12px;
      padding: 10px 11px;
      min-width: 0;
    }

    .market-brief-box span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .market-brief-box strong {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--text);
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
      word-break: break-word;
    }

    .market-day-summary {
      color: var(--soft);
      font-size: 13px;
      line-height: 1.5;
      margin-top: 12px;
    }

    .market-intel-lines {
      display: grid;
      gap: 6px;
      margin-top: 10px;
    }

    .market-intel-line {
      color: var(--soft);
      font-size: 12px;
      line-height: 1.4;
      padding: 8px 10px;
      border-radius: 10px;
      background: var(--panel-2);
      border: 1px solid var(--border);
    }

    .market-intel-line .market-intel-jump {
      color: #9a6200;
      font-weight: 800;
      text-decoration: none;
      margin-right: 6px;
    }

    .market-card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .analysis-title-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .analysis-title {
      color: var(--text);
      font-size: 14px;
      font-weight: 850;
      line-height: 1.3;
    }

    .analysis-summary {
      color: var(--soft);
      font-size: 12px;
      line-height: 1.45;
      margin-top: 5px;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .small-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      max-width: 100%;
      border: 1px solid var(--border-strong);
      background: var(--panel-3);
      color: var(--text);
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 800;
      text-decoration: none;
    }

    .small-chip.good { background: var(--accent-soft); border-color: rgba(16, 163, 127, 0.35); color: var(--accent-text); }
    .small-chip.warn { background: rgba(247, 183, 49, 0.13); border-color: rgba(247, 183, 49, 0.35); color: #9a6200; }

    .analysis-section-title {
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 10px;
    }

    .mention-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
      margin-top: 7px;
    }

    .mention-card {
      border: 1px solid var(--border);
      border-radius: 13px;
      padding: 8px;
      background: var(--panel-2);
      min-width: 0;
    }

    .mention-card strong {
      display: block;
      color: var(--text);
      font-size: 12px;
      line-height: 1.25;
    }

    .mention-card span {
      color: var(--soft);
      font-size: 11px;
      line-height: 1.35;
      display: block;
      margin-top: 4px;
    }

    .rate-list-wrap {
      overflow: auto;
      max-height: min(72vh, 760px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--panel);
      padding: 0;
      box-shadow: var(--shadow-sm);
    }

    .rate-list-groups {
      display: grid;
      gap: 14px;
      padding: 4px 2px 8px;
    }

    .rate-list-groups .market-fruit-section {
      margin-top: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--white);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      padding: 0;
    }

    .rate-list-groups .market-fruit-name {
      position: sticky;
      top: 0;
      z-index: 2;
      margin-bottom: 0;
      padding: 14px 16px;
      background: linear-gradient(180deg, var(--accent-soft) 0%, rgba(240, 250, 246, 0.55) 100%);
      border-bottom: 1px solid rgba(0, 138, 108, 0.12);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .rate-list-groups .produce-heading-text {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .rate-list-groups .market-grade-list {
      padding: 8px 16px 12px;
    }

    .tab-panel {
      display: none;
      margin-top: 14px;
    }

    .tab-panel.active { display: block; }

    .panel-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 16px;
      margin-top: 20px;
    }

    .panel-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .panel-note {
      color: var(--muted);
      font-size: 14px;
      margin-top: 4px;
      line-height: 1.45;
      max-width: 520px;
    }

    .search-box { min-width: 280px; max-width: 360px; }

    .table-wrap {
      overflow: auto;
      max-height: 520px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--panel);
      box-shadow: var(--shadow-sm);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1040px;
    }

    th, td {
      padding: 12px 13px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-weight: 700;
      background: var(--panel-3);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td { color: var(--text); }
    tr:last-child td { border-bottom: none; }

    .rate-price {
      font-weight: 850;
      color: var(--text);
      white-space: nowrap;
    }

    .rate-cell {
      min-width: 150px;
    }

    .rate-freshness {
      display: inline-block;
      margin-bottom: 5px;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .rate-freshness.today {
      background: var(--accent-soft);
      color: var(--accent-text);
      border: 1px solid rgba(13, 143, 111, 0.3);
    }

    .rate-freshness.latest {
      background: rgba(77, 171, 247, 0.14);
      color: #2b6cb0;
      border: 1px solid rgba(77, 171, 247, 0.35);
    }

    .rate-proof-link {
      display: inline-block;
      color: var(--text);
      font-weight: 900;
      font-size: 14px;
      text-decoration: none;
      border-bottom: 1px dotted rgba(23, 24, 28, 0.25);
    }

    .rate-proof-link:hover {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .tally-date {
      font-weight: 800;
      white-space: nowrap;
    }

    .tally-sub {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }

    .proof-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--border-strong);
      background: var(--panel-3);
      color: var(--text);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 850;
      text-decoration: none;
      white-space: nowrap;
    }

    .proof-btn:hover {
      background: var(--accent-soft);
      border-color: var(--accent);
    }

    .proof-quote {
      margin-top: 6px;
      color: var(--soft);
      font-size: 11px;
      line-height: 1.4;
      max-width: 280px;
    }

    .table-timestamp-link {
      color: var(--text);
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
      background: var(--panel-3);
      flex-shrink: 0;
    }

    .mini-title {
      max-width: 260px;
      color: var(--text);
      font-size: 12px;
      line-height: 1.3;
    }

    .confidence-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border);
      background: var(--panel-2);
      color: var(--text);
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
      border: 1px solid var(--border);
      background: var(--panel);
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
      background: var(--panel-3);
      min-height: 112px;
    }

    .youtube-thumb {
      width: 100%;
      height: 112px;
      object-fit: cover;
      display: block;
    }

    .youtube-title {
      color: var(--text);
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      line-height: 1.35;
    }

    .youtube-title:hover { text-decoration: underline; }

    .youtube-meta {
      color: var(--muted);
      font-size: 12px;
      margin-top: 5px;
    }

    .youtube-summary {
      color: var(--soft);
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
      background: var(--panel-3);
      border: 1px solid var(--border-strong);
      color: var(--text);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
    }

    .youtube-note {
      color: var(--text);
      font-size: 13px;
      line-height: 1.45;
    }

    .youtube-rate-box {
      text-align: right;
    }

    .youtube-rate-box strong {
      display: block;
      color: var(--text);
      font-size: 15px;
    }

    .youtube-rate-box small {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-top: 4px;
    }

    .empty-list {
      border: 1px dashed var(--border-strong);
      color: var(--muted);
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      background: var(--panel-2);
      font-size: 13px;
    }

    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      place-items: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      overflow: hidden;
      overscroll-behavior: contain;
      pointer-events: none;
    }

    .modal.show {
      display: grid;
      pointer-events: auto;
    }

    .modal-panel {
      width: min(560px, 100%);
      max-height: min(88vh, 820px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-xl);
      border: none;
      background: var(--white);
      color: var(--text);
      box-shadow: var(--shadow-lg);
    }

    .modal-panel.wide {
      width: min(1180px, 100%);
    }

    .modal-head {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--white);
    }

    .modal-head h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .modal-head p {
      color: var(--muted) !important;
      font-size: 14px !important;
      margin-top: 4px !important;
      font-weight: 500;
    }

    .modal-close {
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-weight: 600;
      font-size: 18px;
      line-height: 1;
      transition: box-shadow 0.15s ease;
    }

    .modal-close:hover {
      box-shadow: var(--shadow-sm);
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

    .modal input:not([type="checkbox"]):not([type="radio"]), .modal select {
      width: 100%;
      border: 1px solid #d7d7d7;
      border-radius: 13px;
      padding: 11px 12px;
      color: #111;
      background: #fff;
      outline: none;
    }

    .modal input[type="checkbox"],
    .modal input[type="radio"] {
      width: 16px;
      height: 16px;
      margin: 0;
      padding: 0;
      flex-shrink: 0;
      accent-color: #111;
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      align-items: center;
    }

    .modal-actions .primary-btn {
      background: var(--text);
      color: #ffffff;
    }

    .modal-actions .secondary-btn {
      background: var(--white);
      color: var(--text);
      border-color: var(--border);
    }

    .settings-footer .primary-btn {
      background: var(--text);
      color: #ffffff;
      border: none;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      border-radius: var(--radius-md);
      box-shadow: none;
    }

    .settings-footer .primary-btn:hover {
      transform: none;
      filter: brightness(1.06);
    }

    .settings-shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding: 0;
      gap: 0;
    }

    .settings-panel-scroll {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 14px 16px;
      scrollbar-gutter: stable;
    }

    .settings-footer {
      flex-shrink: 0;
      display: grid;
      gap: 8px;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--border);
      background: var(--white);
    }

    .settings-footer .primary-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .settings-hub,
    .settings-page {
      display: none;
      gap: 14px;
    }

    .settings-hub.active,
    .settings-page.active {
      display: grid;
    }

    .settings-back-btn {
      border: none;
      background: none;
      color: #666;
      font-size: 13px;
      font-weight: 800;
      padding: 0 0 6px;
      cursor: pointer;
    }

    .settings-back-btn:hover { color: #111; }

    .settings-nav {
      border: 1px solid #e4e4e4;
      border-radius: 16px;
      background: #fff;
      overflow: hidden;
    }

    .settings-nav-item {
      display: grid;
      grid-template-columns: 1fr 24px;
      grid-template-rows: auto auto;
      align-items: center;
      gap: 2px 12px;
      width: 100%;
      text-align: left;
      padding: 16px 20px;
      border: none;
      border-bottom: 1px solid var(--border);
      background: var(--white);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .settings-nav-item:last-child { border-bottom: none; }

    .settings-nav-item:hover,
    .settings-nav-item:focus-visible {
      background: var(--hover);
      outline: none;
    }

    .settings-nav-item strong {
      grid-column: 1;
      grid-row: 1;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .settings-nav-item > span:not(.settings-nav-chevron) {
      grid-column: 1;
      grid-row: 2;
      font-size: 13px;
      line-height: 1.4;
      color: var(--muted);
    }

    .settings-nav-chevron {
      grid-column: 2;
      grid-row: 1 / span 2;
      color: var(--muted);
      font-size: 20px;
      line-height: 1;
      justify-self: end;
      align-self: center;
    }

    .settings-page-head {
      margin-bottom: 4px;
    }

    .settings-page-head h3 {
      display: none;
    }

    .settings-page-head .settings-hint {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.55;
      color: var(--muted);
    }

    .settings-page-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .settings-page-actions .secondary-btn {
      flex: 1 1 180px;
      justify-content: center;
      text-align: center;
    }

    .settings-section {
      border: 1px solid #e8e8e8;
      border-radius: 14px;
      padding: 14px 16px;
      background: #fafafa;
    }

    .settings-section h3 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 800;
      color: #111;
    }

    .settings-hint {
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.5;
      color: #666;
    }

    .settings-options {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
    }

    .settings-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 11px 12px;
      border: 1px solid #e4e4e4;
      border-radius: 12px;
      background: #fff;
      cursor: pointer;
      font-size: 13px;
      color: #333;
      line-height: 1.45;
    }

    .settings-option input {
      margin-top: 2px;
    }

    .settings-option-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .settings-option-copy strong {
      color: #111;
      font-size: 13px;
    }

    .settings-option-copy span {
      color: #666;
      font-size: 12px;
      line-height: 1.45;
    }

    .settings-fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .settings-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #555;
      line-height: 1.35;
      min-width: 0;
    }

    .settings-field select,
    .settings-field input {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 13px;
    }

    .settings-prompt-box {
      width: 100%;
      min-height: 220px;
      max-height: 420px;
      resize: vertical;
      padding: 11px 12px;
      border: 1px solid #ddd;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #111;
      background: #fff;
    }

    .settings-prompt-meta {
      margin-top: 6px;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
    }

    .settings-status-card {
      display: grid;
      gap: 12px;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      background: var(--panel-2);
      border: 1px solid var(--border);
      font-size: 14px;
      color: var(--soft);
      line-height: 1.45;
      margin-bottom: 16px;
    }

    .settings-status-card strong {
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .settings-status-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .settings-status-item {
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--white);
      border: 1px solid var(--border);
    }

    .settings-status-item strong {
      display: block;
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
      text-transform: none;
      letter-spacing: -0.02em;
      margin-bottom: 2px;
    }

    .settings-status-item span {
      font-size: 12px;
      color: var(--muted);
    }

    .settings-status-times {
      display: grid;
      gap: 4px;
      font-size: 13px;
      color: var(--muted);
      padding-top: 4px;
      border-top: 1px solid var(--border);
    }

    .settings-status-link {
      border: none;
      background: none;
      padding: 0;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
      text-align: left;
      width: fit-content;
    }

    .settings-status-link:hover {
      color: var(--soft);
    }

    #settingsModal .settings-fields {
      grid-template-columns: 1fr;
    }

    .settings-channel-list {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }

    .settings-channel-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      background: var(--white);
      border: 1px solid var(--border);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .settings-channel-row:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-sm);
    }

    .settings-channel-row .settings-channel-check {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .settings-channel-row .settings-channel-check input {
      width: 18px;
      height: 18px;
      accent-color: var(--text);
    }

    .settings-channel-row .settings-channel-meta {
      flex: 1;
      min-width: 0;
    }

    .settings-channel-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      align-items: center;
    }

    .settings-channel-row.disabled {
      opacity: 0.65;
      background: var(--panel-2);
    }

    .settings-channel-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--text);
      margin-bottom: 2px;
    }

    .settings-channel-url {
      font-size: 13px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .settings-add-card {
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 1px dashed var(--border-strong);
      background: var(--panel-2);
      display: grid;
      gap: 12px;
    }

    .settings-add-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .settings-add-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .settings-add-row-actions {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: end;
    }

    .settings-add-row input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 14px;
      background: var(--white);
      color: var(--text);
    }

    .settings-add-row input:focus {
      outline: 2px solid var(--text);
      outline-offset: 0;
      border-color: var(--text);
    }

    #settingsModal .modal-panel {
      width: min(480px, 100%);
      max-height: min(90vh, 880px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #settingsModal .modal-head {
      flex-shrink: 0;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    #settingsModal .modal-head > div:first-child {
      min-width: 0;
      flex: 1;
    }

    #settingsModal .settings-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: none;
      background: none;
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      padding: 0;
      margin-bottom: 8px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    #settingsModal .settings-back-btn:hover {
      color: var(--soft);
    }

    #settingsModal .settings-back-btn[hidden] {
      display: none !important;
    }

    #settingsModal .modal-body.settings-shell {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    #settingsModal .settings-panel-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px 24px;
    }

    #settingsModal .settings-footer {
      flex-shrink: 0;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border);
      background: var(--white);
      gap: 10px;
    }

    #settingsModal .settings-footer .primary-btn {
      width: 100%;
      padding: 14px 20px;
      border-radius: var(--radius-md);
      font-size: 15px;
      font-weight: 600;
      background: var(--text);
      color: #fff;
    }

    #settingsModal .icon-btn {
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      padding: 4px 0;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    #settingsModal .icon-btn.danger {
      color: var(--danger);
    }

    #settingsModal .icon-btn:hover {
      opacity: 0.75;
    }

    #settingsModal .settings-empty {
      padding: 24px 16px;
      text-align: center;
      color: var(--muted);
      font-size: 14px;
      border: 1px dashed var(--border);
      border-radius: var(--radius-lg);
      background: var(--panel-2);
    }

    #settingsModal .settings-page-actions {
      display: grid;
      gap: 10px;
    }

    #settingsModal .settings-page-actions .secondary-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
      padding: 12px 16px;
      border-radius: var(--radius-md);
    }

    #settingsModal .settings-option {
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      border-color: var(--border);
    }

    #settingsModal .settings-fields {
      display: grid;
      gap: 12px;
    }

    #settingsModal .settings-field select,
    #settingsModal .settings-field input {
      border-radius: var(--radius-md);
      border-color: var(--border);
    }

    .settings-toggle-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 0;
      font-size: 13px;
      color: #333;
      line-height: 1.45;
    }

    .settings-toggle-row input { margin-top: 2px; flex-shrink: 0; }

    .settings-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .settings-grid-2 label {
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: #555;
    }

    .settings-grid-2 select,
    .settings-grid-2 input {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 13px;
    }

    .settings-run-bar {
      margin-bottom: 8px;
    }

    .settings-run-bar .primary-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .settings-run-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .settings-run-actions .secondary-btn {
      flex: 1 1 180px;
      justify-content: center;
      text-align: center;
    }

    .settings-advanced summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      color: #444;
      margin-bottom: 10px;
    }

    .settings-advanced[open] summary { margin-bottom: 12px; }

    .settings-empty {
      padding: 14px;
      border: 1px dashed #d8d8d8;
      border-radius: 12px;
      color: var(--muted);
      font-size: 13px;
      text-align: center;
      background: #fff;
    }

    .icon-btn {
      border: 1px solid #ddd;
      background: #fff;
      color: #666;
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .icon-btn.danger { color: #b63b3b; border-color: #efc2c2; }

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
      max-height: 120px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .test-preview {
      display: none;
      grid-template-columns: minmax(220px, 280px) 1fr;
      gap: 14px;
      padding: 12px;
      border: 1px solid #e8e8e8;
      border-radius: 18px;
      background: #fff;
      align-items: start;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
    }

    .test-preview.show { display: grid; }

    .test-preview-media {
      display: grid;
      gap: 8px;
    }

    .test-preview iframe {
      width: 100%;
      aspect-ratio: 16 / 9;
      border: 0;
      border-radius: 14px;
      background: #111;
    }

    .test-preview img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 14px;
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
      max-height: 180px;
      overflow: auto;
      padding: 10px;
      border-radius: 12px;
      background: #f4f8f6;
      color: #234;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    #testModal .modal-panel {
      width: min(640px, calc(100vw - 32px));
      max-height: min(86dvh, 720px);
      border-radius: 24px;
      overflow: hidden;
    }

    #testModal .modal-head {
      padding: 24px 28px 16px;
      border-bottom: none;
    }

    #testModal .modal-head h2 {
      font-size: 24px;
      letter-spacing: 0;
    }

    #testModal .modal-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0 28px 28px;
      gap: 14px;
    }

    .source-field {
      display: grid;
      gap: 8px;
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
    }

    .source-field input {
      min-height: 54px;
      border-radius: 14px !important;
      padding: 0 16px !important;
      font-size: 15px;
      box-shadow: inset 0 0 0 1px transparent;
    }

    .source-field input:focus {
      border-color: var(--text) !important;
      box-shadow: 0 0 0 3px rgba(34, 34, 34, 0.08);
    }

    .source-modal-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 10px;
      align-items: center;
    }

    .source-modal-actions .primary-btn,
    .source-modal-actions .secondary-btn {
      min-height: 44px;
      border-radius: 12px;
      padding: 0 16px;
    }

    .source-log-accordion {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--white);
      overflow: hidden;
    }

    .source-log-accordion summary {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 14px;
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
      list-style: none;
    }

    .source-log-accordion summary::-webkit-details-marker {
      display: none;
    }

    .source-log-accordion summary::after {
      content: "⌄";
      color: var(--muted);
      font-size: 16px;
      line-height: 1;
      transition: transform 0.16s ease;
    }

    .source-log-accordion[open] summary::after {
      transform: rotate(180deg);
    }

    .source-log-accordion .log {
      border-radius: 0;
      border-top: 1px solid var(--border);
      background: #fafafa;
    }

    .source-log-body {
      display: grid;
      gap: 12px;
      padding: 0 12px 12px;
    }

    .source-log-body .transcript-progress {
      margin: 0;
    }

    .source-result {
      border-top: 1px solid var(--border);
      padding-top: 12px;
    }

    .source-result-title {
      font-size: 13px;
      font-weight: 850;
      margin-bottom: 8px;
    }

    .transcript-progress {
      display: none;
      margin-top: 0;
      margin-bottom: 10px;
      padding: 12px;
      border: 1px solid #d8e8de;
      border-radius: 12px;
      background: #f6fbf8;
    }

    .transcript-progress.show {
      display: block;
    }

    .transcript-progress.failed .transcript-progress-fill {
      background: linear-gradient(90deg, #d64545, #f08a8a);
    }

    .transcript-progress.failed {
      border-color: #f0c6c6;
      background: #fff8f8;
    }

    .transcript-progress-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      color: #4a5d52;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .transcript-progress-track {
      height: 10px;
      border-radius: 999px;
      background: #d9ebe2;
      overflow: hidden;
    }

    .transcript-progress-fill {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, #1f7a4f, #3cb371);
      transition: width 0.45s ease;
    }

    .transcript-progress-detail {
      margin-top: 8px;
      font-size: 13px;
      color: #234;
      line-height: 1.4;
    }

    /* ── Rich video modal (Airbnb-style) ── */
    .modal-panel.rich-modal {
      display: flex;
      flex-direction: column;
      width: min(1120px, calc(100vw - 32px));
      max-height: min(92vh, 920px);
      overflow: hidden;
      background: var(--white);
      color: var(--text);
      border: none;
      --rich-modal-chrome: 180px;
    }

    .modal-panel.rich-modal .modal-head.rich-modal-head {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
      padding: 24px 28px 18px;
      margin: 0;
      border-bottom: 1px solid var(--border);
      background: var(--white);
    }

    .rich-modal-head-inner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      min-width: 0;
    }

    .rich-modal-head-copy {
      min-width: 0;
      flex: 1;
    }

    .modal-panel.rich-modal .modal-head h2 {
      color: var(--text);
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .rich-modal-subline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .rich-modal-date {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }

    .rich-modal-location-chip {
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--soft);
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 4px 12px;
      white-space: nowrap;
    }

    .rich-modal-location-chip:empty {
      display: none;
    }

    .rich-stat-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    .rich-stat-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border);
      background: var(--panel-2);
      color: var(--soft);
      border-radius: var(--radius-pill);
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    .modal-panel.rich-modal .modal-close {
      flex-shrink: 0;
      color: var(--text);
    }

    .rich-modal-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 24px 28px 28px;
    }

    .rich-split-layout {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 32px;
      align-items: start;
      min-height: 0;
      height: 100%;
    }

    .rich-video-side {
      position: sticky;
      top: 0;
      height: fit-content;
      max-height: calc(92vh - var(--rich-modal-chrome));
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      align-self: start;
    }

    .rich-video-frame-wrap {
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--panel-3);
      box-shadow: var(--shadow-sm);
    }

    .rich-video-side .video-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 0;
      max-height: none;
      display: block;
    }

    .rich-video-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
      min-height: 32px;
    }

    .rich-jump-status {
      margin: 0;
      min-height: 18px;
      color: var(--accent-text);
      font-size: 13px;
      font-weight: 600;
      flex: 1;
      min-width: 0;
    }

    .rich-jump-status:empty {
      display: none;
    }

    .rich-open-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      color: var(--accent-text);
      font-size: 13px;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .rich-data-scroll {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      max-height: calc(92vh - var(--rich-modal-chrome));
      -webkit-overflow-scrolling: touch;
    }

    .rich-tabs {
      display: flex;
      gap: 0;
      margin: 0 0 20px;
      padding: 0;
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
      border-bottom: 1px solid var(--border);
    }

    .rich-tab-btn {
      border: none;
      background: transparent;
      color: var(--muted);
      border-radius: 0;
      padding: 12px 18px;
      margin-bottom: -1px;
      border-bottom: 2px solid transparent;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .rich-tab-btn.active {
      color: var(--text);
      border-bottom-color: var(--text);
      font-weight: 600;
    }

    .rich-tab-btn:hover:not(.active) {
      color: var(--text);
    }

    .rich-tab-panel {
      display: none;
      min-width: 0;
    }

    .rich-tab-panel.active {
      display: block;
    }

    .rich-proof-btn {
      border: 1px solid var(--border);
      background: var(--panel-3);
      color: var(--accent-text);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 850;
      cursor: pointer;
      white-space: nowrap;
    }

    .rich-proof-btn:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .rich-overview-stack {
      display: grid;
      gap: 16px;
    }

    .rich-panel {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--white);
      padding: 18px 20px;
    }

    .rich-panel-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .rich-summary-wrap {
      overflow: hidden;
      transition: max-height 0.25s ease;
    }

    .rich-summary-wrap.collapsed {
      max-height: 6.6em;
      mask-image: linear-gradient(180deg, #000 68%, transparent);
      -webkit-mask-image: linear-gradient(180deg, #000 68%, transparent);
    }

    .rich-summary-text {
      color: var(--soft);
      font-size: 15px;
      line-height: 1.65;
      word-break: break-word;
    }

    .rich-read-more {
      margin-top: 12px;
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .rich-meta-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .rich-meta-tags .small-chip {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
    }

    .rich-snapshot-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .rich-snapshot-card {
      border: 1px solid var(--border);
      background: var(--panel-2);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      min-height: 88px;
      min-width: 0;
    }

    .rich-snapshot-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .rich-snapshot-body {
      display: block;
      font-size: 14px;
      line-height: 1.55;
      color: var(--text);
      font-weight: 500;
      word-break: break-word;
    }

    .rich-tab-panel[data-rich-panel="intel"] {
      padding: 4px 0;
    }

    .rich-intel-section {
      display: grid;
      gap: 12px;
    }

    .rich-intel-section + .rich-intel-section {
      margin-top: 28px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
    }

    .rich-section-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .rich-intel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }

    .rich-intel-card {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      text-align: left;
      border-radius: var(--radius-md);
      padding: 14px 16px;
      cursor: pointer;
      line-height: 1.45;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .rich-intel-card:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .rich-intel-card strong {
      display: block;
      color: var(--text);
      font-size: 14px;
      margin-bottom: 0;
      line-height: 1.4;
      word-break: break-word;
      font-weight: 600;
    }

    .rich-intel-card span {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
      white-space: normal;
    }

    .rich-intel-card.mention-card strong {
      color: var(--accent-text);
    }

    .rich-intel-card.mention-card span {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rich-intel-empty {
      color: var(--muted);
      font-size: 14px;
      padding: 4px 0;
    }

    .rich-rate-list {
      display: grid;
      gap: 8px;
    }

    .rich-rate-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel-2);
      padding: 10px 12px;
    }

    .rich-rate-thumb {
      flex-shrink: 0;
      line-height: 0;
    }

    .rich-rate-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .rich-rate-fruit {
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rich-rate-detail {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rich-rate-price {
      color: var(--text);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .rich-transcript-list {
      display: grid;
      gap: 8px;
      max-height: min(56vh, 540px);
      overflow: auto;
      padding-right: 4px;
    }

    .rich-transcript-row {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      text-align: left;
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 12px;
      line-height: 1.5;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .rich-transcript-row:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .rich-transcript-row time {
      color: var(--accent-text);
      font-weight: 600;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }

    .rich-transcript-row span {
      color: var(--soft);
      font-size: 14px;
    }

    .modal-panel.rich-modal .small-chip {
      background: var(--panel-2);
      border-color: var(--border);
      color: var(--text);
    }

    @media (max-width: 900px) {
      .rich-modal-body {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .rich-split-layout {
        grid-template-columns: 1fr;
        gap: 24px;
        height: auto;
      }

      .rich-video-side {
        position: static;
        max-height: none;
      }

      .rich-data-scroll {
        overflow-y: visible;
        max-height: none;
      }

      .rich-snapshot-grid {
        grid-template-columns: 1fr;
      }

      .rich-rate-row {
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas:
          "thumb copy price"
          "thumb copy proof";
        row-gap: 6px;
      }

      .rich-rate-thumb { grid-area: thumb; }
      .rich-rate-copy { grid-area: copy; }
      .rich-rate-price { grid-area: price; justify-self: end; }
      .rich-rate-row .rich-proof-chips { grid-area: proof; justify-self: end; }
    }

    @media (max-width: 640px) {
      .modal {
        padding: 0;
        place-items: stretch;
      }

      .modal-panel.rich-modal {
        width: 100vw;
        max-height: 100vh;
        max-height: 100dvh;
        border-radius: 0;
      }

      .modal-panel.rich-modal .modal-head.rich-modal-head {
        padding: 16px 16px 14px;
      }

      .modal-panel.rich-modal .modal-head h2 {
        font-size: 18px;
      }

      .rich-modal-body {
        padding: 16px;
      }

      .rich-stat-pills {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        padding-bottom: 2px;
      }

      .rich-tab-btn {
        padding: 10px 14px;
        font-size: 13px;
      }

      .rich-video-foot {
        flex-direction: row;
        align-items: center;
      }

      .rich-intel-grid {
        grid-template-columns: 1fr;
      }
    }

    .video-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      border: none;
      border-radius: 16px;
      background: var(--panel-3);
    }

    @media (max-width: 1120px) {
      .dashboard-head { flex-direction: column; }
      .dashboard-actions { width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters-grid { grid-template-columns: 1fr 1fr; }
      .suggestions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 900px) {
      body { overflow: auto; overflow-x: hidden; height: auto; }
      .app { display: block; height: auto; width: 100%; max-width: 100%; overflow-x: hidden; }
      .main { min-height: 100vh; width: 100%; max-width: 100%; overflow-x: hidden; }
      .topbar { position: sticky; top: 0; }
      .chat { overflow-x: hidden; overflow-y: visible; padding: 18px 14px 28px; }
      .chat-inner { max-width: 100%; width: 100%; min-width: 0; }
      .page-stack { min-width: 0; max-width: 100%; }
      .youtube-video-head, .youtube-data-row, .modal-grid { grid-template-columns: 1fr; }
      .analysis-card, .rich-video-grid { grid-template-columns: 1fr; }
      .analysis-thumb { width: 100%; }
      .youtube-rate-box { text-align: left; }
      .panel-toolbar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
    }

    @media (max-width: 640px) {
      .chart-shell { height: 300px; }
      .popup { min-width: 260px; max-width: calc(100vw - 42px); }
      .test-preview { grid-template-columns: 1fr; }
    }

    /* ── Krishi Kal design system ── */
    :root {
      --space-1: 4px;
      --space-2: 8px;
      --space-3: 12px;
      --space-4: 16px;
      --space-5: 24px;
      --space-6: 32px;
      --space-7: 40px;
      --font-display: 26px;
      --font-title: 22px;
      --font-body: 16px;
      --font-small: 14px;
      --font-caption: 12px;
      --ease: cubic-bezier(0.2, 0, 0, 1);
    }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    .settings-nav-item:focus-visible,
    .activity-banner:focus-visible {
      outline: 2px solid var(--text);
      outline-offset: 2px;
    }

    .page-stack {
      display: grid;
      gap: var(--space-5);
    }

    .surface {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: var(--space-5);
      box-shadow: var(--shadow-sm);
    }

    .surface-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .surface-header-tabs {
      align-items: flex-start;
      justify-content: flex-start;
      margin-bottom: 0;
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .surface-heading {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .surface-heading h2 {
      font-size: var(--font-title);
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.2;
      color: var(--text);
    }

    .eyebrow {
      font-size: var(--font-caption);
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0;
    }

    .surface-sub {
      font-size: var(--font-small);
      color: var(--muted);
      line-height: 1.45;
      margin: 0;
      max-width: 56ch;
    }

    .btn-outline {
      background: var(--white);
      color: var(--text);
      border: 1px solid var(--text);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: var(--font-small);
      font-weight: 600;
      transition: background 0.15s var(--ease), box-shadow 0.15s var(--ease);
      flex-shrink: 0;
    }

    .btn-outline:hover {
      background: var(--hover);
      box-shadow: var(--shadow-sm);
    }

    .dashboard,
    .surface-chart .chart-filters-panel {
      border: none;
      background: transparent;
      box-shadow: none;
      padding: 0;
      border-radius: 0;
    }

    .surface-chart-header {
      align-items: flex-start;
      margin-bottom: 0;
    }

    .surface-chart-collapsed .surface-chart-header {
      margin-bottom: 0;
    }

    .surface-chart:not(.surface-chart-collapsed) .surface-chart-header {
      margin-bottom: var(--space-4);
    }

    .chart-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .chart-toggle-chevron {
      width: 10px;
      height: 10px;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg);
      transition: transform 0.25s ease;
      margin-top: -3px;
      flex-shrink: 0;
    }

    .chart-toggle-btn[aria-expanded="true"] .chart-toggle-chevron {
      transform: rotate(-135deg);
      margin-top: 3px;
    }

    .chart-accordion-body {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows 0.3s ease, opacity 0.25s ease;
    }

    .surface-chart-collapsed .chart-accordion-body {
      grid-template-rows: 0fr;
      opacity: 0;
    }

    .chart-accordion-inner {
      overflow: hidden;
      min-height: 0;
    }

    .surface-chart-collapsed .chart-accordion-inner {
      visibility: hidden;
    }

    .surface-chart:not(.surface-chart-collapsed) .chart-accordion-inner {
      visibility: visible;
    }

    .filter-group-produce {
      margin-bottom: var(--space-3);
    }

    .chart-filters-panel {
      margin-bottom: var(--space-4);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--panel-2);
    }

    .filters-grid {
      padding: 0;
      border: none;
      background: transparent;
      margin-bottom: 0;
    }

    @media (max-width: 900px) {
      .filters-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }

    .chart-shell {
      min-height: 400px;
      border-color: var(--border);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);
    }

    .chart-empty.show {
      color: var(--muted);
      font-size: var(--font-small);
    }

    .chart-help {
      text-align: left;
      margin-top: var(--space-3);
      font-size: var(--font-caption);
    }

    .dashboard-tabs {
      margin-top: 0;
      padding: 0;
      background: transparent;
      border: none;
      gap: var(--space-4);
      width: auto;
      justify-content: flex-start;
    }

    .dashboard-tabs .tab-btn {
      border: none;
      background: transparent;
      padding: var(--space-2) 0;
      border-radius: 0;
      font-size: var(--font-body);
      font-weight: 600;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      box-shadow: none;
    }

    .dashboard-tabs .tab-btn:hover {
      color: var(--text);
      background: transparent;
    }

    .dashboard-tabs .tab-btn.active {
      color: var(--text);
      background: transparent;
      border: none;
      border-bottom: 2px solid var(--text);
      box-shadow: none;
    }

    .surface-data .tab-panel {
      margin-top: var(--space-5);
    }

    .panel-toolbar {
      margin-top: 0;
      align-items: flex-end;
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .panel-note {
      font-size: var(--font-small);
      max-width: 48ch;
      line-height: 1.45;
    }

    .all-data-panel .panel-toolbar > div:first-child {
      min-width: 0;
    }

    .all-data-panel .panel-note {
      max-width: none;
    }

    .dark-input,
    .search-box,
    select.dark-input {
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: var(--font-small);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .search-box {
      min-width: 260px;
    }

    .fruit-pill,
    .badge {
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: var(--font-caption);
      padding: 7px 12px;
    }

    .fruit-pill.active,
    .badge.active {
      font-weight: 600;
    }

    .rate-list-wrap {
      border: none;
      box-shadow: none;
      border-radius: 0;
      max-height: none;
      overflow: visible;
      padding: 0;
    }

    .rate-list-groups {
      gap: var(--space-4);
      padding: 0;
    }

    .rate-list-groups .market-fruit-section {
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
    }

    .rate-list-groups .market-fruit-name {
      padding: var(--space-4) var(--space-5);
      font-size: var(--font-body);
      font-weight: 600;
    }

    .rate-list-groups .produce-heading-text {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    .rate-list-groups .market-fruit-meta-update {
      font-size: var(--font-caption);
      font-weight: 500;
    }

    .rate-list-groups .market-grade-list {
      padding: 0 var(--space-5) var(--space-4);
    }

    .market-fruit-name {
      font-size: var(--font-body);
      font-weight: 600;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border);
    }

    .market-grade-list {
      gap: 0;
    }

    .market-grade-row {
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: var(--space-4);
      border: none;
      border-radius: 0;
      border-bottom: 1px solid var(--border);
      background: transparent;
      padding: var(--space-3) 0;
      align-items: center;
    }

    .market-grade-row:last-child {
      border-bottom: none;
    }

    .market-grade-label {
      font-size: var(--font-small);
      font-weight: 600;
    }

    .market-grade-rate {
      font-size: var(--font-body);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .proof-chip,
    button.market-rate-proof {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      font-size: var(--font-caption);
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
      white-space: nowrap;
    }

    .proof-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
      align-items: center;
    }

    .proof-more-chip {
      border-style: dashed;
      color: var(--muted);
    }

    .proof-more-chip:hover {
      color: var(--text);
    }

    .rich-proof-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
      align-items: center;
    }

    .proof-chip:hover,
    button.market-rate-proof:hover {
      border-color: var(--text);
      box-shadow: var(--shadow-sm);
    }

    .analysis-card {
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s var(--ease);
    }

    .analysis-card:hover {
      box-shadow: var(--shadow);
    }

    .market-day-date {
      font-weight: 600;
      font-size: var(--font-caption);
    }

    .market-day-title {
      font-weight: 600;
      font-size: 18px;
    }

    .table-wrap th {
      font-size: var(--font-caption);
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0;
      padding: 14px 16px;
    }

    .table-wrap td {
      font-size: var(--font-small);
      padding: 14px 16px;
    }

    .activity-banner {
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--white);
      padding: var(--space-4) var(--space-5);
    }

    .activity-banner-title strong {
      font-size: var(--font-body);
      font-weight: 600;
      color: var(--text);
    }

    .activity-banner-title span {
      color: var(--muted);
      font-size: var(--font-small);
    }

    .activity-banner-count {
      font-size: 20px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .activity-banner-bar > span {
      background: var(--text);
    }

    .activity-top-badge {
      background: var(--text);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }

    .topbar {
      height: 80px;
      padding: 0 var(--space-5);
      box-shadow: none;
    }

    .site-brand-mark {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.04em;
      box-shadow: none;
      background: var(--text);
    }

    .site-brand-copy strong {
      font-size: 18px;
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .top-actions-group {
      background: transparent;
      border: none;
      padding: 0;
      gap: 0;
    }

    .text-btn {
      font-weight: 500;
      font-size: var(--font-small);
      color: var(--soft);
      padding: 10px 14px;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .text-btn:hover {
      color: var(--text);
      background: transparent;
    }

    .secondary-btn {
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: var(--font-small);
      padding: 10px 16px;
    }

    .share-btn {
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: var(--font-small);
      padding: 10px 16px;
      transform: none;
    }

    .share-btn:hover,
    .primary-btn:hover {
      transform: none;
      filter: brightness(1.08);
    }

    .modal {
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(6px);
      padding: var(--space-5);
    }

    .modal-panel {
      border-radius: var(--radius-xl);
      border: none;
      background: var(--white);
      box-shadow: var(--shadow-lg);
    }

    .modal-head {
      padding: var(--space-5) var(--space-5) var(--space-4);
    }

    .modal-head h2 {
      font-size: var(--font-title);
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    .modal-body {
      padding: 0 var(--space-5) var(--space-5);
    }

    .modal-panel.rich-modal .rich-modal-body {
      padding: 24px 28px 28px;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .modal-panel.rich-modal .modal-head.rich-modal-head {
      padding: 24px 28px 18px;
      border-bottom: 1px solid var(--border);
    }

    .settings-panel-scroll {
      padding: var(--space-4) var(--space-5);
    }

    .settings-status-card {
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      font-size: var(--font-small);
      line-height: 1.55;
    }

    .settings-nav {
      border-radius: var(--radius-lg);
      border-color: var(--border);
      box-shadow: var(--shadow-sm);
    }

    .settings-nav-item {
      padding: var(--space-4) var(--space-5);
      transition: background 0.15s var(--ease);
    }

    .settings-nav-item strong {
      font-weight: 600;
      font-size: 15px;
    }

    .settings-nav-item > span:not(.settings-nav-chevron) {
      font-size: 13px;
      color: var(--muted);
    }

    #settingsModal .settings-footer {
      flex-shrink: 0;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border);
      background: var(--white);
      gap: 10px;
    }

    .activity-list-wrap {
      padding: var(--space-3) var(--space-4) var(--space-5);
    }

    .activity-row {
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      transition: box-shadow 0.15s var(--ease);
    }

    .activity-row:hover {
      box-shadow: var(--shadow-sm);
    }

    .activity-row.active-row {
      border-color: var(--border-strong);
      background: var(--accent-soft);
    }

    .activity-tab-btn.active {
      background: var(--white);
      color: var(--text);
      border-color: var(--text);
      box-shadow: var(--shadow-sm);
    }


    .popup h3 {
      font-size: var(--font-body);
      font-weight: 600;
    }

    .popup-price {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    .popup-link {
      background: var(--text);
      color: #fff;
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-weight: 600;
      font-size: var(--font-small);
    }

    .reanalyze-status {
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-small);
    }

    .chat {
      padding: var(--space-5) var(--space-5) var(--space-7);
    }

    .chat-inner {
      max-width: 1120px;
      width: 100%;
      min-width: 0;
    }

    /* Mobile layout — overrides design-system defaults at 900px / 640px */
    @media (max-width: 900px) {
      .chat {
        padding: var(--space-4);
        overflow-x: hidden;
      }

      .chat-inner {
        max-width: 100%;
        width: 100%;
      }

      .page-stack {
        min-width: 0;
        max-width: 100%;
      }

      .topbar {
        height: auto;
        min-height: 72px;
        flex-wrap: wrap;
        align-items: center;
        padding: 12px 16px;
        gap: var(--space-3);
        width: 100%;
        max-width: 100%;
      }

      .top-actions {
        flex: 1 1 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .top-actions-group {
        flex-wrap: wrap;
      }

      .surface {
        padding: var(--space-4);
      }

      .surface-chart-header,
      .surface-header-tabs {
        align-items: flex-start;
        justify-content: flex-start;
      }

      .chart-toggle-btn {
        align-self: flex-start;
      }

      .dashboard-tabs {
        width: 100%;
        justify-content: flex-start;
      }

      .chart-help {
        text-align: left;
      }

      .chart-filters-panel {
        padding: var(--space-3);
      }

      .panel-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-3);
      }

      .panel-toolbar > div:first-child {
        min-width: 0;
      }

      .search-box {
        min-width: 0;
        width: 100%;
        max-width: none;
      }

      .market-fruit-name,
      .rate-list-groups .market-fruit-name {
        flex-wrap: wrap;
        align-items: flex-start;
        row-gap: var(--space-2);
      }

      .produce-heading-text {
        flex: 1 1 0;
        min-width: 0;
      }

      .market-fruit-meta-wrap {
        align-items: flex-start;
        text-align: left;
      }
    }

    @media (max-width: 640px) {
      .chat {
        padding: var(--space-4);
        overflow-x: hidden;
      }

      .chat-inner {
        max-width: 100%;
        width: 100%;
        margin: 0;
      }

      .page-stack {
        gap: var(--space-4);
        min-width: 0;
      }

      .topbar {
        height: auto;
        min-height: 0;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-start;
        padding: 12px 16px;
        gap: 10px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .site-brand {
        flex: 1 1 100%;
        width: 100%;
        min-width: 0;
        align-self: stretch;
      }

      .site-brand-copy {
        flex: 1;
        min-width: 0;
        overflow: hidden;
      }

      .site-brand-copy span {
        display: none;
      }

      .site-brand-mark {
        width: 32px;
        height: 32px;
        font-size: 11px;
        flex-shrink: 0;
      }

      .site-brand-copy strong {
        font-size: 16px;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .top-actions {
        flex: 1 1 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: 6px 8px;
        row-gap: 8px;
        min-width: 0;
      }

      .top-actions-group {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        gap: 0;
      }

      .top-actions .text-btn,
      .top-actions .share-btn,
      .top-actions .secondary-btn {
        min-height: 34px;
        padding: 6px 12px;
        font-size: var(--font-caption);
        border-radius: var(--radius-md);
        transform: none;
        box-shadow: none;
      }

      .top-actions .text-btn {
        text-decoration: none;
        font-weight: 600;
        color: var(--text);
        border: 1px solid var(--border);
        background: var(--white);
      }

      .top-actions .text-btn:hover {
        background: var(--hover);
        color: var(--text);
      }

      .top-actions .secondary-btn {
        display: inline-flex;
      }

      .top-actions .share-btn {
        font-weight: 600;
      }

      .surface {
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        max-width: 100%;
        overflow: hidden;
        box-sizing: border-box;
      }

      .surface.surface-chart {
        padding-top: var(--space-4);
      }

      .surface-chart .surface-chart-header {
        padding-top: var(--space-1);
      }

      .surface-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
      }

      .surface-chart-header {
        align-items: flex-start;
      }

      .chart-toggle-btn {
        align-self: flex-start;
        width: auto;
      }

      .dashboard-tabs {
        width: 100%;
        justify-content: flex-start;
        gap: var(--space-3);
      }

      .dashboard-tabs .tab-btn {
        padding: var(--space-2) 0;
        font-size: var(--font-small);
      }

      .chart-help {
        text-align: left;
        margin-top: var(--space-2);
      }

      .chart-filters-panel {
        padding: var(--space-3);
        margin-bottom: var(--space-3);
      }

      .panel-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-3);
        margin-bottom: var(--space-3);
        min-width: 0;
      }

      .panel-toolbar > div:first-child {
        min-width: 0;
        width: 100%;
      }

      .panel-note {
        max-width: none;
        margin-top: var(--space-1);
      }

      .panel-title {
        font-size: 16px;
      }

      .search-box {
        min-width: 0;
        width: 100%;
        max-width: none;
        box-sizing: border-box;
      }

      .all-data-panel .analysis-cards {
        margin-bottom: var(--space-3);
        min-width: 0;
      }

      .analysis-card-compact {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--space-2) var(--space-3);
        padding: var(--space-3);
        max-width: 100%;
      }

      .analysis-video-thumb {
        width: 72px;
        height: 40px;
      }

      .analysis-card-copy {
        flex: 1 1 calc(100% - 84px);
        min-width: 0;
      }

      .analysis-card-compact .market-day-title {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }

      .analysis-card-compact .secondary-btn {
        flex: 1 1 100%;
        width: 100%;
        justify-content: center;
        margin-top: var(--space-1);
      }

      .table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        max-width: 100%;
        width: 100%;
        margin: 0;
        border-radius: var(--radius-md);
      }

      .table-wrap table {
        min-width: 680px;
      }

      .table-wrap th,
      .table-wrap td {
        padding: 8px 10px;
        font-size: var(--font-caption);
      }

      .rate-list-groups .market-fruit-name {
        padding: var(--space-3);
        gap: var(--space-2) var(--space-3);
      }

      .rate-list-groups .market-grade-list {
        padding: 0 var(--space-3) var(--space-3);
      }

      .market-fruit-name {
        flex-wrap: wrap;
        align-items: center;
        row-gap: var(--space-2);
      }

      .produce-heading-text {
        flex: 1 1 calc(100% - 56px);
        min-width: 0;
      }

      .market-fruit-meta-wrap {
        flex: 1 1 100%;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        gap: var(--space-1);
      }

      .market-fruit-meta {
        white-space: normal;
      }

      .market-grade-row {
        grid-template-columns: 1fr auto;
        gap: var(--space-2) var(--space-3);
        padding: var(--space-3) 0;
        align-items: center;
      }

      .market-grade-copy {
        grid-column: 1 / -1;
      }

      .market-grade-rate {
        text-align: left;
        justify-self: start;
      }

      .market-grade-row .proof-chips,
      .market-grade-row .proof-chip,
      .market-grade-row button.market-rate-proof {
        justify-self: end;
      }
    }

    @media (max-width: 480px) {
      .chat {
        padding: 12px;
      }

      .topbar {
        padding: 12px;
        gap: 8px;
      }

      .top-actions {
        gap: 6px;
      }

      .top-actions .secondary-btn {
        display: none;
      }

      .top-actions .text-btn,
      .top-actions .share-btn {
        min-height: 32px;
        padding: 5px 10px;
        font-size: 11px;
      }

      .surface {
        padding: 12px;
      }

      .table-wrap table {
        min-width: 600px;
      }

      .table-wrap th,
      .table-wrap td {
        padding: 6px 8px;
        font-size: 11px;
      }

      .analysis-video-thumb {
        width: 64px;
        height: 36px;
      }
    }

    /* ── Krishi Kal app shell ── */
    .app-nav-desktop {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      padding: 0 24px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--topbar-bg);
      position: sticky;
      top: 72px;
      z-index: 3;
      backdrop-filter: blur(12px);
    }

    .app-nav-btn {
      border: 1px solid transparent;
      background: transparent;
      color: var(--soft);
      padding: 9px 16px;
      border-radius: var(--radius-pill);
      font-size: 14px;
      font-weight: 600;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
    }

    .app-nav-label { line-height: 1.2; }

    .app-nav-btn:hover {
      background: var(--hover);
      color: var(--text);
    }

    .app-nav-btn.active {
      background: var(--accent-soft);
      color: var(--accent-text);
      border-color: rgba(0, 138, 108, 0.25);
      box-shadow: var(--shadow-sm);
    }

    .app-tabbar {
      display: none;
    }

    .app-tabbar-btn {
      appearance: none;
      -webkit-appearance: none;
      border: none;
      background: transparent;
      color: #8a8f98;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: 52px;
      padding: 6px 2px 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.01em;
      line-height: 1;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      user-select: none;
    }

    .app-tabbar-icon {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      position: relative;
    }

    .app-tabbar-icon svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .app-tabbar-label {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .app-tabbar-btn.active {
      color: var(--accent-text);
    }

    .app-tabbar-btn.active .app-tabbar-icon::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -5px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent);
      transform: translateX(-50%);
    }

    .app-view { display: none; }
    .app-view.active { display: block; }

    .mandi-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: var(--space-5);
      padding: var(--space-5);
      border-radius: var(--radius-xl);
      border: 1px solid rgba(0, 138, 108, 0.18);
      background: linear-gradient(135deg, var(--accent-soft) 0%, var(--white) 55%);
      box-shadow: var(--shadow-sm);
    }

    .mandi-hero h1 {
      font-size: clamp(24px, 3vw, 34px);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-top: 4px;
    }

    .mandi-hero-sub {
      color: var(--muted);
      font-size: 14px;
      margin-top: 6px;
    }

    .mandi-hero-stat {
      display: grid;
      gap: 4px;
      text-align: right;
      min-width: 120px;
    }

    .mandi-hero-stat strong {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--accent-text);
    }

    .mandi-hero-stat span {
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .section-hero {
      margin-bottom: var(--space-5);
    }

    .section-hero h1 {
      font-size: clamp(22px, 2.8vw, 30px);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 4px 0 8px;
    }

    .section-hero p {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
      max-width: 62ch;
    }

    .krishi-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .krishi-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--white);
      padding: var(--space-4);
      box-shadow: var(--shadow-sm);
      display: grid;
      gap: 8px;
    }

    .krishi-card-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .krishi-card h3 {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.3;
    }

    .krishi-card-meta {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .krishi-card-body {
      font-size: 14px;
      line-height: 1.45;
      color: var(--soft);
    }

    .krishi-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--panel-3);
      border: 1px solid var(--border);
      font-size: 11px;
      font-weight: 700;
      color: var(--soft);
      white-space: nowrap;
    }

    .krishi-empty {
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-lg);
      padding: 28px;
      text-align: center;
      color: var(--muted);
      background: var(--panel-2);
      font-size: 14px;
      line-height: 1.5;
    }

    .krishi-directory-list {
      display: grid;
      gap: var(--space-3);
    }

    .krishi-directory-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--white);
      box-shadow: var(--shadow-sm);
    }

    .krishi-directory-row strong {
      font-size: 15px;
    }

    .krishi-directory-row span {
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 900px) {
      :root {
        --bottom-nav-height: calc(64px + env(safe-area-inset-bottom, 0px));
      }

      body {
        padding-bottom: var(--bottom-nav-height);
        background: var(--bg);
      }

      .app-nav-desktop {
        display: none !important;
      }

      .app-tabbar {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 60;
        margin: 0;
        padding: 0;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        min-height: var(--bottom-nav-height);
        background: rgba(255, 255, 255, 0.98);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.04), 0 -10px 30px rgba(0, 0, 0, 0.06);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        min-height: 56px;
        height: auto;
        padding: 10px 14px;
        border-bottom: 1px solid var(--border);
        box-shadow: none;
        background: rgba(255, 255, 255, 0.98);
      }

      .site-brand-copy span { display: none; }

      .site-brand-mark {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        font-size: 13px;
      }

      .site-brand-copy strong {
        font-size: 17px;
      }

      .top-actions {
        gap: 4px;
      }

      .top-actions .secondary-btn,
      .top-actions .share-btn,
      #reanalyzeAllBtn {
        display: none !important;
      }

      #openTesterTop {
        display: inline-flex !important;
        min-height: 36px;
        padding: 8px 12px;
        font-size: 13px;
      }

      .top-actions .text-btn {
        min-height: 36px;
        padding: 8px 12px;
        font-size: 13px;
      }

      .main {
        min-height: calc(100dvh - var(--bottom-nav-height));
      }

      .chat {
        padding: 12px 12px calc(16px + var(--bottom-nav-height));
      }

      .mandi-hero-stat { text-align: left; }

      .modal {
        padding-bottom: var(--bottom-nav-height);
      }

      #testModal .modal-panel {
        width: min(100%, calc(100vw - 24px));
        max-height: calc(100dvh - var(--bottom-nav-height) - 28px);
      }

      #testModal .modal-head {
        padding: 20px 20px 12px;
      }

      #testModal .modal-body {
        padding: 0 20px 20px;
      }

      .source-modal-actions {
        grid-template-columns: 1fr;
      }
    }

  </style>
</head>
<body>
  <div class="app">
    <main class="main">
      <header class="topbar">
        <div class="site-brand">
          <span class="site-brand-mark" aria-hidden="true">KK</span>
          <div class="site-brand-copy">
            <strong>Krishi Kal</strong>
            <span>Mandi rates, market news & trade network</span>
          </div>
        </div>
        <div class="top-actions">
          <div class="top-actions-group">
            <button class="text-btn" id="openActivityBtn" type="button">Activity <span class="activity-top-badge" id="activityTopBadge" hidden>0</span></button>
            <button class="text-btn" id="openSettingsBtn" type="button">Settings</button>
          </div>
          <button class="secondary-btn" id="refreshBtn" type="button">Refresh</button>
          <button class="secondary-btn" id="reanalyzeAllBtn" type="button">Re-analyze</button>
          <button class="share-btn" id="openTesterTop" type="button">Add Source</button>
        </div>
      </header>

      <nav class="app-nav app-nav-desktop" id="appNav" aria-label="Krishi Kal sections">
        <button class="app-nav-btn active" type="button" data-app-view="mandi" aria-current="page">
          <span class="app-nav-label">Mandi today</span>
        </button>
        <button class="app-nav-btn" type="button" data-app-view="news">
          <span class="app-nav-label">News</span>
        </button>
        <button class="app-nav-btn" type="button" data-app-view="aadthi">
          <span class="app-nav-label">Aadthi</span>
        </button>
        <button class="app-nav-btn" type="button" data-app-view="exporters">
          <span class="app-nav-label">Exporters</span>
        </button>
        <button class="app-nav-btn" type="button" data-app-view="transport">
          <span class="app-nav-label">Transport</span>
        </button>
      </nav>

      <section class="chat">
        <div class="chat-inner">
          <div class="activity-banner" id="activityBanner" hidden>
            <div class="activity-banner-top">
              <div class="activity-banner-title">
                <strong id="activityBannerTitle">Importing channel videos</strong>
                <span id="activityBannerSubtitle">Fetching transcripts and running AI extraction</span>
              </div>
              <div class="activity-banner-count" id="activityBannerCount">0/0</div>
            </div>
            <div class="activity-banner-bar"><span id="activityBannerBar" style="width:0%"></span></div>
            <div class="activity-banner-foot">
              <span id="activityBannerFoot">Tap to open full activity panel</span>
              <span>Open panel →</span>
            </div>
          </div>
          <div class="reanalyze-status" id="reanalyzeStatus" hidden></div>

          <div class="app-view active" id="viewMandi" data-app-view="mandi">
          <div class="mandi-hero">
            <div>
              <p class="eyebrow">Mandi rates today</p>
              <h1 id="mandiHeroTitle">Today's wholesale rates</h1>
              <p class="mandi-hero-sub" id="mandiHeroDate">Loading latest mandi data…</p>
            </div>
            <div class="mandi-hero-stat" id="mandiHeroStat"><strong id="mandiHeroCount">—</strong><span>produce tracked</span></div>
          </div>
          <div class="page-stack">
            <section class="surface surface-data" id="dashboard">
              <div class="surface-header surface-header-tabs">
                <div class="dashboard-tabs" role="tablist" aria-label="Data views">
                  <button class="tab-btn active" data-tab="rateList" type="button" role="tab">Rate list</button>
                  <button class="tab-btn" data-tab="allData" type="button" role="tab">All data</button>
                </div>
              </div>

              <div class="tab-panel active" id="rateListPanel">
                <div class="panel-toolbar">
                  <div>
                    <h3 class="panel-title">Latest rates</h3>
                    <p class="panel-note">All produce with the latest extracted wholesale rates. The chart below filters one produce at a time.</p>
                  </div>
                  <input id="rateSearch" class="search-box" type="search" placeholder="Search variety, grade, area..." aria-label="Search rates" />
                </div>
                <div class="rate-list-wrap">
                  <div id="rateListContent" class="rate-list-groups"></div>
                </div>
              </div>

              <div class="tab-panel all-data-panel" id="allDataPanel">
                <div class="analysis-cards" id="analysisCards"></div>
                <div class="panel-toolbar">
                  <div>
                    <h3 class="panel-title">All extracted rates</h3>
                    <p class="panel-note">All produce in the selected date range (ignores chart filters). Click a thumbnail or timestamp to open the report.</p>
                  </div>
                  <input id="dataSearch" class="search-box" type="search" placeholder="Search rows, transcript, area..." aria-label="Search all data" />
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Video</th>
                        <th>Date</th>
                        <th>Fruit</th>
                        <th>Grade</th>
                        <th>Size</th>
                        <th>Area</th>
                        <th>Party</th>
                        <th>Rate</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody id="allDataBody"></tbody>
                  </table>
                </div>
              </div>
            </section>

            <section class="surface surface-chart surface-chart-collapsed" id="surfaceChart">
              <div class="surface-header surface-chart-header">
                <div class="surface-heading">
                  <p class="eyebrow">Market intelligence</p>
                  <h2>Price trends</h2>
                  <p class="surface-sub" id="chartFilterSummary">Price trends — tap to expand</p>
                </div>
                <button type="button" class="btn-outline chart-toggle-btn" id="chartToggleBtn" aria-expanded="false" aria-controls="chartAccordionBody">
                  <span id="chartToggleLabel">Show chart</span>
                  <span class="chart-toggle-chevron" aria-hidden="true"></span>
                </button>
              </div>
              <div class="chart-accordion-body" id="chartAccordionBody">
              <div class="chart-accordion-inner">
              <div class="chart-filters-panel" id="chartFiltersPanel">
                <div class="filters-grid">
                  <div class="filter-group">
                    <label for="produceSelect">Produce</label>
                    <select class="chart-filter-select" id="produceSelect" aria-label="Produce"></select>
                  </div>
                  <div class="filter-group">
                    <label for="gradeSelect">Grade / quality</label>
                    <select class="chart-filter-select" id="gradeSelect" aria-label="Grade"></select>
                  </div>
                  <div class="filter-group">
                    <label for="sizeSelect">Size / pack</label>
                    <select class="chart-filter-select" id="sizeSelect" aria-label="Size"></select>
                  </div>
                  <div class="filter-group">
                    <label for="areaSelect">Area / mandi</label>
                    <select class="chart-filter-select" id="areaSelect" aria-label="Area"></select>
                  </div>
                  <div class="filter-group">
                    <label for="dateFrom">Date from</label>
                    <input class="dark-input" id="dateFrom" type="date" />
                  </div>
                  <div class="filter-group">
                    <label for="dateTo">Date to</label>
                    <input class="dark-input" id="dateTo" type="date" />
                  </div>
                </div>
              </div>

              <div class="chart-shell" id="chartShell">
                <div class="chart-legend" id="chartLegend"></div>
                <svg id="produceChart" viewBox="0 0 1000 430" preserveAspectRatio="xMidYMid meet"></svg>
                <div class="chart-empty" id="chartEmpty"></div>
              </div>
              <p class="chart-help">Each line is a variety + grade + size + area series. Click a dot for source video, transcript context, and confidence.</p>
              </div>
              </div>
            </section>
          </div>
          </div>

          <div class="app-view" id="viewNews" data-app-view="news">
            <div class="section-hero">
              <p class="eyebrow">Market news</p>
              <h1>Mandi intelligence & updates</h1>
              <p>Facts, guidance, and learnings pulled from analyzed mandi videos — arrivals, weather, demand, and trade notes.</p>
            </div>
            <div class="krishi-card-grid" id="newsFeed"></div>
          </div>

          <div class="app-view" id="viewAadthi" data-app-view="aadthi">
            <div class="section-hero">
              <p class="eyebrow">Aadthi · Wholesalers</p>
              <h1>Wholesalers & commission agents</h1>
              <p>Parties and traders mentioned in verified mandi rate extractions. Names come from transcript context in source videos.</p>
            </div>
            <div class="krishi-directory-list" id="aadthiDirectory"></div>
          </div>

          <div class="app-view" id="viewExporters" data-app-view="exporters">
            <div class="section-hero">
              <p class="eyebrow">Exporters</p>
              <h1>Export buyers & shipping desks</h1>
              <p>Directory for export-facing buyers, packhouses, and shipping contacts. Listings will expand as Krishi Kal adds verified exporter profiles.</p>
            </div>
            <div class="krishi-card-grid" id="exportersDirectory"></div>
          </div>

          <div class="app-view" id="viewTransport" data-app-view="transport">
            <div class="section-hero">
              <p class="eyebrow">Transport</p>
              <h1>Cold chain, trucking & logistics</h1>
              <p>Transport partners for mandi pickup, line-haul, and cold storage. Verified transporter listings coming soon.</p>
            </div>
            <div class="krishi-card-grid" id="transportDirectory"></div>
          </div>

        </div>
      </section>
    </main>
  </div>

  <nav class="app-tabbar" id="appTabbar" aria-label="Krishi Kal tabs">
    <button class="app-tabbar-btn active" type="button" data-app-view="mandi" aria-current="page" aria-label="Mandi today">
      <span class="app-tabbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 17v-6"/><path d="M12 17V7"/><path d="M16 17v-3"/></svg></span>
      <span class="app-tabbar-label">Mandi</span>
    </button>
    <button class="app-tabbar-btn" type="button" data-app-view="news" aria-label="News">
      <span class="app-tabbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4h12a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z"/><path d="M8 8h8"/><path d="M8 12h5"/></svg></span>
      <span class="app-tabbar-label">News</span>
    </button>
    <button class="app-tabbar-btn" type="button" data-app-view="aadthi" aria-label="Aadthi">
      <span class="app-tabbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 11a4 4 0 1 0-8 0"/><path d="M3 20a9 9 0 0 1 18 0"/></svg></span>
      <span class="app-tabbar-label">Aadthi</span>
    </button>
    <button class="app-tabbar-btn" type="button" data-app-view="exporters" aria-label="Exporters">
      <span class="app-tabbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg></span>
      <span class="app-tabbar-label">Export</span>
    </button>
    <button class="app-tabbar-btn" type="button" data-app-view="transport" aria-label="Transport">
      <span class="app-tabbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v8H3z"/><path d="M14 10h3l3 4v1h-6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></span>
      <span class="app-tabbar-label">Transit</span>
    </button>
  </nav>

  <div id="chartPopupHost" aria-live="polite"><div class="popup" id="chartPopup">
                  <div class="popup-top">
                    <div>
                      <h3 id="popupTitle">Produce rate</h3>
                      <div class="popup-time" id="popupTime"></div>
                    </div>
                    <button class="popup-close" id="popupClose" aria-label="Close">×</button>
                  </div>
                  <div class="popup-price" id="popupPrice"></div>
                  <div class="popup-context-grid">
                    <div class="popup-context-row"><strong>Transcript context</strong><span id="popupNote"></span></div>
                    <div class="popup-context-row"><strong>Source</strong><span id="popupVideoTitle"></span></div>
                  </div>
                  <div class="popup-confidence" id="popupConfidence"></div>
                  <button type="button" id="popupLink" class="popup-link app-jump">▶ Play from timestamp</button>
                </div>
  </div>

  <div class="modal" id="testModal" aria-hidden="true">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-head">
        <div>
          <h2 id="modalTitle">Add source</h2>
          <p>Import a mandi video from YouTube.</p>
        </div>
        <button class="modal-close" id="closeTesterBtn" type="button" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p id="transcriptSetupStatus" class="status"></p>
        <label class="source-field">Video link<input id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." inputmode="url" autocomplete="off" /></label>
        <input id="audioUrl" type="hidden" value="" />
        <input id="audioFile" type="file" accept="audio/*,video/*" hidden />
        <input id="language" type="hidden" value="hi" />
        <input id="syncToken" type="hidden" value="" />
        <div class="test-preview" id="videoPreview">
          <div class="test-preview-media">
            <iframe id="videoEmbed" title="YouTube preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
            <img id="videoThumb" alt="" hidden />
          </div>
          <div>
            <strong id="videoIdLabel"></strong>
            <a id="openVideoLink" href="#" target="_blank" rel="noreferrer" style="color:#105834;font-weight:800;font-size:13px;">Open video</a>
            <p id="videoHint" style="margin-top:6px;color:#666;font-size:12px;line-height:1.4;"></p>
          </div>
        </div>
        <div class="modal-actions source-modal-actions">
          <button class="primary-btn" id="runTranscriptBtn">Add source</button>
          <button class="secondary-btn" id="loadStoredBtn">Load</button>
          <button class="secondary-btn" id="clearTranscriptBtn">Clear</button>
        </div>
        <div id="transcriptProgress" class="transcript-progress" aria-live="polite">
          <div class="transcript-progress-head">
            <span id="transcriptProgressLabel">Starting...</span>
            <span id="transcriptProgressMeta">0:00 · check 0/0</span>
          </div>
          <div class="transcript-progress-track">
            <div id="transcriptProgressFill" class="transcript-progress-fill"></div>
          </div>
          <div id="transcriptProgressDetail" class="transcript-progress-detail"></div>
        </div>
        <div id="transcriptStatus" class="status">Ready.</div>
        <details class="source-log-accordion" id="sourceLogAccordion">
          <summary>Logs</summary>
          <div class="source-log-body">
            <div class="log" id="log"></div>
            <div class="source-result">
              <div class="source-result-title">Transcript result</div>
              <div id="transcriptMeta" style="font-size:13px;color:#666;margin-bottom:8px;">No transcript loaded.</div>
              <div id="transcriptBox" class="transcript-box"><div class="status">Add a source or load a saved transcript.</div></div>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>

  <div class="modal" id="videoModal" aria-hidden="true">
    <div class="modal-panel rich-modal" role="dialog" aria-modal="true" aria-labelledby="videoModalTitle">
      <div class="modal-head rich-modal-head">
        <div class="rich-modal-head-inner">
          <div class="rich-modal-head-copy">
            <h2 id="videoModalTitle">Rich video</h2>
            <div class="rich-modal-subline">
              <span id="videoModalDate" class="rich-modal-date"></span>
              <span id="videoModalLocation" class="rich-modal-location-chip"></span>
            </div>
          </div>
          <button class="modal-close" id="closeVideoModalBtn" type="button" aria-label="Close">×</button>
        </div>
        <div class="rich-stat-pills" id="richStats"></div>
      </div>
      <div class="modal-body rich-modal-body">
        <div class="rich-split-layout">
          <aside class="rich-video-side">
            <div class="rich-video-frame-wrap">
              <iframe id="richVideoFrame" class="video-frame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Video player"></iframe>
            </div>
            <div class="rich-video-foot">
              <div id="richJumpStatus" class="rich-jump-status"></div>
              <a id="richOpenYoutube" class="rich-open-link" href="#" target="_blank" rel="noreferrer">Open on YouTube ↗</a>
            </div>
          </aside>
          <div class="rich-data-scroll">
            <div class="rich-tabs" id="richTabs">
              <button type="button" class="rich-tab-btn active" data-rich-tab="overview">Overview</button>
              <button type="button" class="rich-tab-btn" data-rich-tab="rates">Rates</button>
              <button type="button" class="rich-tab-btn" data-rich-tab="intel">Intel</button>
              <button type="button" class="rich-tab-btn" data-rich-tab="transcript">Transcript</button>
            </div>
            <div class="rich-tab-panel active" data-rich-panel="overview">
              <div class="rich-overview-stack">
                <div class="rich-panel rich-summary-panel">
                  <div class="rich-panel-title">Summary</div>
                  <div id="richSummaryWrap" class="rich-summary-wrap collapsed">
                    <div id="richSummary" class="rich-summary-text"></div>
                  </div>
                  <button type="button" id="richSummaryToggle" class="rich-read-more" hidden>Read more</button>
                </div>
                <div class="rich-panel rich-meta-panel">
                  <div class="rich-panel-title">Metadata</div>
                  <div id="richMetaChips" class="rich-meta-tags"></div>
                </div>
                <div class="rich-panel rich-snapshot-panel">
                  <div class="rich-panel-title">Market snapshot</div>
                  <div id="richBriefGrid" class="rich-snapshot-grid"></div>
                </div>
              </div>
            </div>
            <div class="rich-tab-panel" data-rich-panel="rates">
              <div class="rich-panel">
                <div class="rich-panel-title">All saved rate rows</div>
                <div id="richRatesBody" class="rich-rate-list"></div>
              </div>
            </div>
            <div class="rich-tab-panel" data-rich-panel="intel">
              <div class="rich-intel-section">
                <h3 class="rich-section-label">Price mentions</h3>
                <div id="richMentions" class="rich-intel-grid"></div>
              </div>
              <div class="rich-intel-section">
                <h3 class="rich-section-label">Facts</h3>
                <div id="richFacts" class="rich-intel-grid"></div>
              </div>
              <div class="rich-intel-section">
                <h3 class="rich-section-label">Guidance</h3>
                <div id="richGuidance" class="rich-intel-grid"></div>
              </div>
              <div class="rich-intel-section">
                <h3 class="rich-section-label">Learnings</h3>
                <div id="richLearnings" class="rich-intel-grid"></div>
              </div>
              <div class="rich-intel-section">
                <h3 class="rich-section-label">Chapters</h3>
                <div id="richChapters" class="rich-intel-grid"></div>
              </div>
            </div>
            <div class="rich-tab-panel" data-rich-panel="transcript">
              <div class="rich-panel">
                <div class="rich-panel-title">Timestamped transcript</div>
                <div id="richTranscript" class="rich-transcript-list"><div class="status">Loading transcript...</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal" id="activityModal" aria-hidden="true">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="activityTitle">
      <div class="modal-head">
        <div>
          <div class="activity-head-row">
            <h2 id="activityTitle">Activity</h2>
            <span class="activity-live-pill" id="activityLivePill" hidden>Live</span>
          </div>
          <p id="activitySubtitle">Import queue, transcript, and AI analysis progress.</p>
        </div>
        <button class="modal-close" id="closeActivityBtn" type="button">×</button>
      </div>
      <div class="activity-status-card" id="activityStatusCard">
        <div class="activity-status-top">
          <div class="activity-status-copy">
            <strong id="activitySummaryLabel">Pipeline idle</strong>
            <span id="activityStatusDetail">Run an import from Settings → Run now to queue videos.</span>
          </div>
          <div class="activity-status-count" id="activitySummaryPercent">0%</div>
        </div>
        <div class="activity-summary-bar"><span id="activitySummaryBar" style="width:0%"></span></div>
        <div class="activity-refresh-note" id="activityRefreshNote" hidden>Auto-refreshing every 4 seconds while work is running.</div>
      </div>
      <div class="activity-summary">
        <div class="activity-summary-stats" id="activityStatCards">
          <button type="button" class="activity-stat" data-activity-tab="active" aria-label="Show active videos">
            <strong id="activityStatActive">0</strong><span>Processing</span>
          </button>
          <button type="button" class="activity-stat" data-activity-tab="waiting" aria-label="Show queued videos">
            <strong id="activityStatWaiting">0</strong><span>Queued</span>
          </button>
          <button type="button" class="activity-stat" data-activity-tab="completed" aria-label="Show completed videos">
            <strong id="activityStatDone">0</strong><span>Done</span>
          </button>
          <button type="button" class="activity-stat" data-activity-tab="failed" aria-label="Show failed videos">
            <strong id="activityStatFailed">0</strong><span>Failed</span>
          </button>
        </div>
      </div>
      <div class="activity-tabs" id="activityTabs">
        <button type="button" class="activity-tab-btn active" data-activity-tab="all">All</button>
        <button type="button" class="activity-tab-btn" data-activity-tab="active">Processing</button>
        <button type="button" class="activity-tab-btn" data-activity-tab="waiting">Queue</button>
        <button type="button" class="activity-tab-btn" data-activity-tab="completed">Done</button>
        <button type="button" class="activity-tab-btn" data-activity-tab="failed">Failed</button>
      </div>
      <div class="activity-list-wrap">
        <div class="activity-list" id="activityList"></div>
      </div>
    </div>
  </div>

  <div class="modal" id="settingsModal" aria-hidden="true">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
      <div class="modal-head">
        <div>
          <button type="button" class="settings-back-btn" id="settingsBackBtn" hidden>← Back to settings</button>
          <h2 id="settingsTitle">Settings</h2>
          <p id="settingsSubtitle">Channels, sync, extraction rules, and manual actions.</p>
        </div>
        <button class="modal-close" id="closeSettingsBtn">×</button>
      </div>
      <div class="modal-body settings-shell">
        <div class="settings-panel-scroll">
          <div id="settingsHubView" class="settings-hub active">
            <div class="settings-status-card" id="settingsStatusCard">
              <div><strong>Status</strong></div>
              <div id="settingsAutomationStatus">Loading...</div>
            </div>
            <nav class="settings-nav" aria-label="Settings sections">
              <button type="button" class="settings-nav-item" data-open-settings-page="channels">
                <strong>YouTube channels</strong>
                <span id="settingsNavChannelsMeta">Add mandi channels to track</span>
                <span class="settings-nav-chevron">›</span>
              </button>
              <button type="button" class="settings-nav-item" data-open-settings-page="sync">
                <strong>Automatic sync</strong>
                <span>Import schedule and background checks</span>
                <span class="settings-nav-chevron">›</span>
              </button>
              <button type="button" class="settings-nav-item" id="settingsNavActivityBtn">
                <strong>Activity</strong>
                <span id="settingsNavActivityMeta">Import queue and pipeline progress</span>
                <span class="settings-nav-chevron">›</span>
              </button>
              <button type="button" class="settings-nav-item" data-open-settings-page="extraction">
                <strong>Extraction rules</strong>
                <span>Custom AI prompt instructions</span>
                <span class="settings-nav-chevron">›</span>
              </button>
              <button type="button" class="settings-nav-item" data-open-settings-page="actions">
                <strong>Run now</strong>
                <span>Import past videos, poll, and process queue</span>
                <span class="settings-nav-chevron">›</span>
              </button>
              <button type="button" class="settings-nav-item" data-open-settings-page="advanced">
                <strong>Advanced</strong>
                <span>Sync token and webhook trigger</span>
                <span class="settings-nav-chevron">›</span>
              </button>
            </nav>
          </div>

          <div class="settings-page" data-settings-page="channels">
            <div class="settings-page-head">
              <h3>YouTube channels</h3>
              <p class="settings-hint">Add each mandi channel you want tracked. Enabled channels are checked for new uploads.</p>
            </div>
            <div class="settings-channel-list" id="settingsChannelsList"></div>
            <div class="settings-add-card">
              <div class="settings-add-card-title">Add a channel</div>
              <div class="settings-add-row">
                <input id="settingsNewChannelUrl" type="url" placeholder="https://www.youtube.com/@channel/videos" aria-label="YouTube channel URL" />
                <div class="settings-add-row-actions">
                  <input id="settingsNewChannelName" type="text" placeholder="Label (optional)" aria-label="Channel label" />
                  <button class="secondary-btn" id="settingsAddChannelBtn" type="button">Add</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-page" data-settings-page="sync">
            <div class="settings-page-head">
              <h3>Automatic sync</h3>
              <p class="settings-hint">When enabled, the Worker checks your channels and imports new videos automatically.</p>
            </div>
            <div class="settings-options">
              <label class="settings-option">
                <input id="settingsAutoPipeline" type="checkbox" />
                <div class="settings-option-copy">
                  <strong>Auto-import new videos</strong>
                  <span>Fetch transcript and run price analysis automatically.</span>
                </div>
              </label>
              <label class="settings-option">
                <input id="settingsCronEnabled" type="checkbox" />
                <div class="settings-option-copy">
                  <strong>Background checks</strong>
                  <span>Worker cron runs every 15 minutes and processes the queue slowly.</span>
                </div>
              </label>
            </div>
            <div class="settings-fields">
              <label class="settings-field">Import how many past videos per channel?
                <select id="settingsBackfillCount">
                  <option value="30">Last 30</option>
                  <option value="50">Last 50</option>
                  <option value="100">Last 100</option>
                  <option value="0">All (up to 500)</option>
                </select>
              </label>
              <label class="settings-field">Check for new uploads every
                <select id="settingsPollInterval">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="180">3 hours</option>
                  <option value="360">6 hours</option>
                  <option value="720">12 hours</option>
                </select>
              </label>
              <label class="settings-field">Latest videos to scan per channel
                <select id="settingsPollCheckCount">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>
            </div>
          </div>

          <div class="settings-page" data-settings-page="extraction">
            <div class="settings-page-head">
              <h3>Extraction rules</h3>
              <p class="settings-hint">Extra instructions appended to the AI system prompt on every analysis. Re-analyze videos after changing.</p>
            </div>
            <label class="settings-field">
              Custom prompt rules
              <textarea id="settingsExtractionRules" class="settings-prompt-box" placeholder="Example:&#10;- Black Amber is always Cherry variety&#10;- Never show / box unless peti is spoken&#10;- Capture choosa as variety Chausa on mango threads"></textarea>
            </label>
            <div class="settings-prompt-meta" id="settingsExtractionRulesMeta">0 / 8000 characters</div>
          </div>

          <div class="settings-page" data-settings-page="actions">
            <div class="settings-page-head">
              <h3>Run now</h3>
              <p class="settings-hint">Save settings first, then run these manual actions when needed.</p>
            </div>
            <div class="settings-page-actions">
              <button class="secondary-btn" id="runBackfillBtn" type="button">Import past videos</button>
              <button class="secondary-btn" id="runPollBtn" type="button">Check for new videos</button>
              <button class="secondary-btn" id="runQueueBtn" type="button">Process waiting queue</button>
            </div>
          </div>

          <div class="settings-page" data-settings-page="advanced">
            <div class="settings-page-head">
              <h3>Advanced</h3>
              <p class="settings-hint">Optional security and integration settings for your Worker deployment.</p>
            </div>
            <label class="settings-field">
              Sync token (only if your Worker requires it)
              <input id="settingsSyncToken" type="password" placeholder="optional" autocomplete="off" />
            </label>
            <label class="settings-option" style="margin-top:10px;">
              <input id="settingsWebhookEnabled" type="checkbox" />
              <div class="settings-option-copy">
                <strong>Allow webhook trigger</strong>
                <span>POST to <code>/api/automation/webhook</code> when you want an immediate sync.</span>
              </div>
            </label>
          </div>
        </div>
        <div class="settings-footer">
          <div id="settingsActionStatus" class="status" hidden></div>
          <button class="primary-btn" id="saveSettingsBtn" type="button">Save settings</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    var state = {
      priceRows: [],
      analysisItems: [],
      filteredRows: [],
      selectedFruit: '',
      selectedGrade: '',
      selectedSize: '',
      selectedArea: '',
      pointRows: [],
      transcriptCache: {},
      lastPollStage: '',
      richVideoId: '',
      richVideoUrl: '',
      richVideoOembedTitle: {},
      richVideoParsedDate: {},
      serverOngoing: [],
      pipeline: null,
      activityTab: 'all',
      activityModalOpen: false,
      queueCount: 0,
      autoPipelineEnabled: true,
      localOngoing: null,
      ongoingPollTimer: null,
      lastOngoingCount: 0,
      settingsChannels: [],
      settingsPage: 'hub',
      appView: 'mandi',
      chartExpanded: false,
      extensionBridgeReady: false,
      extensionTranscriptRetried: false,
      colors: ['#10a37f', '#f7b731', '#4dabf7', '#eb4d4b', '#be2edd', '#badc58', '#ff9f43', '#00d2d3']
    };

    var FRUIT_EXTENSION_PAGE = 'fruit-miner-page';
    var FRUIT_EXTENSION_BRIDGE = 'fruit-miner-extension';

    var TRANSCRIPT_STAGE_LABELS = {
      queued: 'Queued',
      fetch_captions: 'Hetzner transcript',
      fetch_subtitles: 'Hetzner transcript',
      download_audio: 'Downloading audio',
      openai_transcription: 'Transcribing audio',
      saving: 'Saving transcript',
      railway_transcript: 'Fetching transcript',
      hetzner_transcript: 'Hetzner transcript',
      extension_fetch: 'Chrome extension (YouTube tab)',
      wake: 'Waking YouTube page',
      railway_analysis: 'AI market analysis',
      railway_save: 'Saving rates',
      analyzing: 'AI price analysis',
      analysis_complete: 'Analysis complete',
      analysis_failed: 'Analysis failed',
      reanalyze: 'Re-analyzing',
      complete: 'Complete',
      empty: 'No lines returned',
      failed: 'Failed'
    };

    var produceNames = {
      mango: 'Mango / Aam',
      aam: 'Mango / Aam',
      apple: 'Apple / Seb',
      seb: 'Apple / Seb',
      banana: 'Banana / Kela',
      kela: 'Banana / Kela',
      watermelon: 'Watermelon / Tarbooj',
      tarbooj: 'Watermelon / Tarbooj',
      pomegranate: 'Pomegranate / Anar',
      anar: 'Pomegranate / Anar',
      orange: 'Orange / Santra',
      santra: 'Orange / Santra',
      mausambi: 'Sweet lime / Mausambi',
      litchi: 'Litchi',
      lychee: 'Lychee',
      grapes: 'Grapes / Angoor',
      angoor: 'Grapes / Angoor',
      papaya: 'Papaya / Papita',
      papita: 'Papaya / Papita',
      melon: 'Melon / Kharbooja',
      kharbooja: 'Melon / Kharbooja',
      onion: 'Onion / Pyaaz',
      potato: 'Potato / Aloo',
      tomato: 'Tomato / Tamatar',
      guava: 'Guava / Amrood',
      amrud: 'Guava / Amrood',
      amrood: 'Guava / Amrood',
      peach: 'Peach / Aadoo',
      aadoo: 'Peach / Aadoo',
      chikoo: 'Chikoo / Sapota',
      chiku: 'Chikoo / Sapota',
      sapota: 'Chikoo / Sapota',
      coriander: 'Coriander / Dhaniya',
      dhaniya: 'Coriander / Dhaniya',
      dhania: 'Coriander / Dhaniya',
      bhindi: 'Okra / Bhindi',
      okra: 'Okra / Bhindi',
      parwal: 'Parwal / Pointed gourd',
      parmal: 'Parwal / Pointed gourd',
      kundru: 'Kundru / Ivy gourd',
      sugarcane: 'Sugarcane / Ganna',
      shakkar: 'Sugarcane / Ganna',
      almond: 'Almond / Badam',
      badam: 'Almond / Badam',
      apricot: 'Apricot / Khubani',
      'coconut water': 'Coconut water / Nariyal Pani',
      nariyal: 'Coconut / Nariyal',
      sweetcorn: 'Sweet corn / Makka',
      makka: 'Sweet corn / Makka',
      corn: 'Sweet corn / Makka',
      garlic: 'Garlic / Lahsun'
    };

    // TheMealDB hosts free ingredient photos: /images/ingredients/{Name}.png
    // Wikimedia (Special:FilePath) used when TheMealDB has no match for regional produce.
    // Longer / multi-word needles are listed first; resolveProduceVisual prefers longest match.
    function wikimediaThumb(filename) {
      return 'https://commons.wikimedia.org/wiki/Special:FilePath/'
        + String(filename || '').replace(/ /g, '_')
        + '?width=120';
    }

    var PRODUCE_VISUALS = [
      { needles: ['coconut water', 'nariyal pani', 'नारियल पानी'], mealdb: 'Coconut Milk', emoji: '🥥' },
      { needles: ['sweet corn', 'sweetcorn', 'corn on the cob', 'makka', 'maize', 'bhutta', 'मक्का', 'भुट्टा', 'मकई', 'मीठा भुट्टा', 'मीठी भुट्टा'], mealdb: 'Sweetcorn', emoji: '🌽' },
      { needles: ['sweet lime', 'mausambi', 'mosambi', 'मौसंबी'], mealdb: 'Lime', emoji: '🍋' },
      { needles: ['black apricot', 'black apricots', 'khubani', 'खुबानी'], mealdb: 'Apricot', emoji: '🟠' },
      { needles: ['coriander', 'dhaniya', 'dhania', 'hara dhania', 'cilantro', 'धनिया'], mealdb: 'Cilantro', emoji: '🌿' },
      { needles: ['yellow cherry', 'येल्लो चेरी'], mealdb: 'Cherry', emoji: '🍒' },
      { needles: ['green chilli', 'hari mirch', 'हरी मिर्च'], mealdb: 'Green Chilli', emoji: '🌶️' },
      { needles: ['shimla mirch', 'bell pepper', 'green pepper', 'capsicum', 'शिमला मिर्च', 'शिमला'], mealdb: 'Green Pepper', emoji: '🫑' },
      { needles: ['pineapple', 'ananas', 'अनानास'], mealdb: 'Pineapple', emoji: '🍍' },
      { needles: ['pointed gourd', 'parwal', 'parmal', 'potol', 'parval', 'परवल'], wikimedia: 'Parwal.jpg', emoji: '🥒' },
      { needles: ['ivy gourd', 'kundru', 'kundhru', 'kunduru', 'tindora', 'tindori', 'tinda', 'कुंद्रू', 'कुंदरू', 'टिंडोरा'], wikimedia: 'Coccinia_grandis_fruit.jpg', emoji: '🥒' },
      { needles: ['bitter gourd', 'karela', 'करेला'], wikimedia: 'Bitter_melon_(Momordica_charantia).jpg', emoji: '🥒' },
      { needles: ['lady finger', 'lady fingers', 'bhindi', 'okra', 'vendakkai', 'vendakai', 'भिंडी', 'वेंडक्काई'], wikimedia: 'Lady_finger_close_up.jpg', emoji: '🥬' },
      { needles: ['sapodilla', 'chikoo', 'chiku', 'sapota', 'sitaphal', 'chikku', 'चीकू', 'सपोटा', 'सीताफल'], wikimedia: 'Manilkara_zapota_fruits.jpg', emoji: '🟤' },
      { needles: ['sugarcane', 'ganna', 'gana', 'ganne', 'shakkar', 'shakkarpara', 'शक्कर', 'गन्ना', 'ईख'], wikimedia: 'Sugarcane.jpg', emoji: '🎋' },
      { needles: ['watermelon', 'tarbooj', 'tarbuj', 'तरबूज'], wikimedia: 'Watermelon_cross_BNC.jpg', emoji: '🍉' },
      { needles: ['muskmelon', 'kharbooja', 'खरबूजा'], wikimedia: 'Muskmelon.jpg', emoji: '🍈' },
      { needles: ['lychee', 'litchi', 'lichi', 'leechi', 'लीची', 'लिची'], wikimedia: 'Lychee_juice_JPN.jpg', emoji: '🍒' },
      { needles: ['peach', 'aadoo', 'aadu', 'aadhu', 'adu', 'आड़ू', 'आडू'], mealdb: 'Peaches', emoji: '🍑' },
      { needles: ['almond', 'badam', 'बादाम'], mealdb: 'Almonds', emoji: '🌰' },
      { needles: ['pomegranate', 'anar', 'अनार'], mealdb: 'Pomegranate', emoji: '🔴' },
      { needles: ['coconut', 'nariyal', 'नारियल'], wikimedia: 'Coconut_fruit.jpg', emoji: '🥥' },
      { needles: ['guava', 'amrud', 'amrood', 'amroot', 'peru', 'अमरूद', 'अमरुद'], wikimedia: 'Psidium_guajava_Blanco1.48.jpg', emoji: '🟢' },
      { needles: ['grapes', 'angoor', 'angur', 'अंगूर'], wikimedia: 'Grapes_(PSF).png', emoji: '🍇' },
      { needles: ['cherry', 'चेरी'], mealdb: 'Cherry', emoji: '🍒' },
      { needles: ['aloo bukhara', 'plum', 'plums', 'आलूबुखारा'], mealdb: 'Apricot', emoji: '🫐' },
      { needles: ['bottle gourd', 'lauki', 'लौकी'], mealdb: 'Zucchini', emoji: '🥒' },
      { needles: ['patta gobi', 'cabbage', 'पत्ता गोभी'], mealdb: 'Cabbage', emoji: '🥬' },
      { needles: ['gobi', 'cauliflower', 'phool gobi', 'फूलगोभी'], wikimedia: 'Cauliflower_(PSF).png', emoji: '🥦' },
      { needles: ['groundnut', 'mungfali', 'peanut', 'मूंगफली'], mealdb: 'Peanuts', emoji: '🥜' },
      { needles: ['mango', 'aam', 'आम'], mealdb: 'Mango', emoji: '🥭' },
      { needles: ['banana', 'kela', 'केला'], mealdb: 'Banana', emoji: '🍌' },
      { needles: ['orange', 'santra', 'संतरा', 'kinnow'], mealdb: 'Orange', emoji: '🍊' },
      { needles: ['papaya', 'papita', 'पपीता'], mealdb: 'Papaya', emoji: '🟠' },
      { needles: ['onion', 'pyaz', 'pyaaz', 'प्याज'], mealdb: 'Onions', emoji: '🧅' },
      { needles: ['potato', 'aloo', 'आलू'], mealdb: 'Potatoes', emoji: '🥔' },
      { needles: ['tomato', 'tamatar', 'टमाटर'], mealdb: 'Tomatoes', emoji: '🍅' },
      { needles: ['garlic', 'lahsun', 'lehsun', 'लहसुन'], mealdb: 'Garlic', emoji: '🧄' },
      { needles: ['peas', 'matar', 'मटर'], mealdb: 'Peas', emoji: '🫛' },
      { needles: ['kaddu', 'pumpkin', 'कद्दू'], mealdb: 'Pumpkin', emoji: '🎃' },
      { needles: ['brinjal', 'baingan', 'बैंगन', 'eggplant'], mealdb: 'Aubergine', emoji: '🍆' },
      { needles: ['carrot', 'gajar', 'गाजर'], mealdb: 'Carrots', emoji: '🥕' },
      { needles: ['cucumber', 'kheera', 'खीरा'], mealdb: 'Cucumber', emoji: '🥒' },
      { needles: ['ginger', 'adrak', 'अदरक'], mealdb: 'Ginger', emoji: '🫚' },
      { needles: ['lemon', 'nimbu', 'नींबू'], mealdb: 'Lemon', emoji: '🍋' },
      { needles: ['pear', 'nashpati', 'नाशपाती'], wikimedia: 'Pear_fruit.jpg', emoji: '🍐' },
      { needles: ['strawberry', 'स्ट्रॉबेरी'], wikimedia: 'Strawberry_fruit.jpg', emoji: '🍓' },
      { needles: ['blueberry', 'blueberries'], mealdb: 'Blueberries', emoji: '🫐' },
      { needles: ['corn', 'makka', 'मक्का'], mealdb: 'Sweetcorn', emoji: '🌽' },
      { needles: ['spinach', 'palak', 'पालक'], mealdb: 'Spinach', emoji: '🥬' },
      { needles: ['beetroot', 'chukandar', 'चुकंदर'], mealdb: 'Beetroot', emoji: '🟣' },
      { needles: ['radish', 'mooli', 'मूली'], mealdb: 'Radish', emoji: '🥕' },
      { needles: ['mushroom', 'kukurmutta', 'मशरूम'], mealdb: 'Mushrooms', emoji: '🍄' },
      { needles: ['avocado'], mealdb: 'Avocado', emoji: '🥑' },
      { needles: ['broccoli'], mealdb: 'Broccoli', emoji: '🥦' },
      { needles: ['lettuce', 'salad'], mealdb: 'Lettuce', emoji: '🥬' },
      { needles: ['apple', 'seb', 'सेब'], mealdb: 'Apple', emoji: '🍎' },
      { needles: ['mirch', 'मिर्च', 'chilli', 'chili'], mealdb: 'Green Chilli', emoji: '🌶️' },
      { needles: ['apricot'], mealdb: 'Apricot', emoji: '🟠' },
      { needles: ['fig', 'anjeer', 'अंजीर'], mealdb: 'Figs', emoji: '🟤' },
      { needles: ['kiwi'], mealdb: 'Kiwi', emoji: '🥝' },
      { needles: ['melon'], wikimedia: 'Muskmelon.jpg', emoji: '🍈' },
    ];

    var PRODUCE_IMAGE_CDN = 'https://www.themealdb.com/images/ingredients/';

    function stripProduceEmoji(text) {
      return String(text || '').replace(/^[\s\p{Extended_Pictographic}\u2600-\u27BF]+/u, '').trim();
    }

    function normalizeProduceLabel(text) {
      return stripProduceEmoji(text)
        .toLowerCase()
        .replace(/[/|,()[\]{}]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function produceLabelTokens(label) {
      var normalized = normalizeProduceLabel(label);
      if (!normalized) return [];
      return normalized.split(' ').filter(Boolean);
    }

    function produceVisualText(rowOrLabel) {
      if (rowOrLabel && typeof rowOrLabel === 'object') {
        return [rowOrLabel.fruit, rowOrLabel.fruit_label, rowOrLabel.fruit_hindi].filter(Boolean).join(' ');
      }
      return String(rowOrLabel || '');
    }

    function produceNeedleMatches(label, needle) {
      needle = String(needle || '').toLowerCase().trim();
      if (!needle) return false;
      var normalized = normalizeProduceLabel(label);
      if (!normalized) return false;

      if (/[\u0900-\u097F]/.test(needle)) {
        var raw = stripProduceEmoji(String(label || ''));
        return raw.indexOf(needle) >= 0 || normalized.indexOf(needle) >= 0;
      }

      if (needle === 'apple' || needle === 'seb' || needle === 'सेब') {
        if (/\bpineapple\b/.test(normalized) || /\bananas\b/.test(normalized) || normalized.indexOf('अनानास') >= 0) {
          return false;
        }
      }

      if (needle.indexOf(' ') >= 0) {
        var escaped = needle.replace(/[.*+?^$\{}()|[\]\\]/g, '\\$&');
        return new RegExp('(?:^|\\s)' + escaped.replace(/\s+/g, '\\s+') + '(?:\\s|$)').test(normalized);
      }

      var tokens = produceLabelTokens(label);
      for (var i = 0; i < tokens.length; i += 1) {
        if (tokens[i] === needle) return true;
      }
      return normalized.indexOf(needle) >= 0;
    }

    function resolveProduceVisual(text) {
      var best = null;
      var bestNeedleLen = 0;
      for (var i = 0; i < PRODUCE_VISUALS.length; i += 1) {
        var item = PRODUCE_VISUALS[i];
        for (var j = 0; j < item.needles.length; j += 1) {
          var needle = item.needles[j];
          if (produceNeedleMatches(text, needle) && needle.length > bestNeedleLen) {
            best = item;
            bestNeedleLen = needle.length;
          }
        }
      }
      return best;
    }

    function resolveProduceVisualFor(rowOrLabel) {
      return resolveProduceVisual(produceVisualText(rowOrLabel));
    }

    function produceImageUrl(visual) {
      if (!visual) return '';
      if (visual.wikimedia) return wikimediaThumb(visual.wikimedia);
      if (visual.image) return visual.image;
      if (visual.mealdb) return PRODUCE_IMAGE_CDN + encodeURIComponent(visual.mealdb) + '.png';
      return '';
    }

    function produceHasImage(rowOrLabel) {
      var visual = resolveProduceVisualFor(rowOrLabel);
      return !!(visual && produceImageUrl(visual));
    }

    function produceDisplayLabel(rowOrLabel) {
      var label = (rowOrLabel && typeof rowOrLabel === 'object')
        ? produceLabel(rowOrLabel)
        : String(rowOrLabel || '').trim();
      if (produceHasImage(rowOrLabel)) return stripProduceEmoji(label) || label;
      return label;
    }

    function produceThumbFallback(visual, plainName) {
      if (visual && visual.emoji) return visual.emoji;
      return plainName ? plainName.charAt(0).toUpperCase() : '🧺';
    }

    function produceThumbHtml(rowOrLabel, sizeClass) {
      var visual = resolveProduceVisualFor(rowOrLabel);
      var displayName = produceDisplayLabel(rowOrLabel);
      var imageUrl = visual ? produceImageUrl(visual) : '';
      var plainName = stripProduceEmoji(displayName) || displayName;
      var fallback = produceThumbFallback(visual, plainName);
      var cls = 'produce-thumb' + (sizeClass ? ' ' + sizeClass : '');
      if (imageUrl) {
        return '<img class="' + cls + '" src="' + escapeHtml(imageUrl) + '" alt="" loading="lazy" data-fallback="' + escapeHtml(fallback) + '" onerror="window.__produceImgFail&&window.__produceImgFail(this)" />';
      }
      return '<span class="' + cls + ' produce-thumb-fallback" aria-hidden="true">' + escapeHtml(fallback) + '</span>';
    }

    function produceHeadingHtml(label, meta, lastUpdate) {
      var displayName = produceDisplayLabel(label);
      var metaHtml = '';
      if (meta || lastUpdate) {
        metaHtml = '<div class="market-fruit-meta-wrap">';
        if (meta) metaHtml += '<span class="market-fruit-meta">' + escapeHtml(meta) + '</span>';
        if (lastUpdate) metaHtml += '<span class="market-fruit-meta market-fruit-meta-update">Last update: ' + escapeHtml(lastUpdate) + '</span>';
        metaHtml += '</div>';
      }
      var thumbClass = lastUpdate ? 'produce-thumb-lg' : '';
      return '<div class="market-fruit-name">'
        + produceThumbHtml(label, thumbClass)
        + '<span class="produce-heading-text">' + escapeHtml(displayName) + '</span>'
        + metaHtml
        + '</div>';
    }

    function produceCellHtml(rowOrLabel) {
      var displayName = produceDisplayLabel(rowOrLabel);
      return '<div class="produce-cell">' + produceThumbHtml(rowOrLabel, 'produce-thumb-sm') + '<span>' + escapeHtml(displayName) + '</span></div>';
    }

    window.__produceImgFail = function (img) {
      if (!img || !img.parentNode) return;
      img.onerror = null;
      var fb = img.getAttribute('data-fallback') || '?';
      var span = document.createElement('span');
      span.className = img.className + ' produce-thumb-fallback';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = fb;
      img.parentNode.replaceChild(span, img);
    };

    function el(id) { return document.getElementById(id); }

    var pageScrollLocked = false;
    var pageScrollLockY = 0;

    function anyOverlayOpen() {
      return !!document.querySelector('.modal.show') || el('chartPopup').classList.contains('show');
    }

    function syncPageScrollLock() {
      var shouldLock = anyOverlayOpen();
      if (shouldLock && !pageScrollLocked) {
        pageScrollLocked = true;
        pageScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
        document.documentElement.classList.add('scroll-locked');
        document.body.classList.add('scroll-locked');
        document.body.style.top = '-' + pageScrollLockY + 'px';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        return;
      }
      if (!shouldLock && pageScrollLocked) {
        pageScrollLocked = false;
        document.documentElement.classList.remove('scroll-locked');
        document.body.classList.remove('scroll-locked');
        document.body.style.top = '';
        document.body.style.position = '';
        document.body.style.width = '';
        window.scrollTo(0, pageScrollLockY);
      }
    }

    function escapeHtml(value) {
      return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function log(message) {
      var now = new Date().toLocaleTimeString();
      el('log').textContent += '[' + now + '] ' + message + '\n';
      el('log').scrollTop = el('log').scrollHeight;
    }

    function openSourceLogs() {
      var logs = el('sourceLogAccordion');
      if (logs) logs.open = true;
    }

    var DIRECT_API_BASE = String(window.KRISHI_API_BASE || '').replace(/\/+$/, '');
    var WORKER_API_BASE = String(window.KRISHI_WORKER_API_BASE || '').replace(/\/+$/, '');
    var TRANSCRIPT_CACHE_PREFIX = 'krishiRailwayTranscript:';

    function isWorkerTranscriptPath(path) {
      if (path === '/api/transcripts/transcribe' || path === '/api/tasks/ongoing') return true;
      if (path.indexOf('/api/analysis') === 0 || path.indexOf('/api/prices') === 0 || path.indexOf('/api/videos') === 0) return true;
      return /^\/api\/transcripts\/[^/?]+$/.test(path) && path !== '/api/transcripts/setup';
    }

    function shouldFallbackToExtensionTranscript(message) {
      return /fetch_subtitles|download_audio|format is not available|external youtube extractor|hetzner|youtube-transcript|yt-dlp|blocked|bot-like|429|extractor failed|caption tracks failed/i.test(String(message || ''));
    }

    function completeExtensionTranscriptFlow(videoUrl, data) {
      var id = extractVideoId(videoUrl);
      resetTranscriptProgress();
      renderTranscript(data);
      setTranscriptProgress({
        percent: 35,
        stage: 'saving',
        message: 'Transcript fetched. Saving source and preparing AI extraction.',
        elapsed: '',
        attempt: ''
      });
      setTranscriptStatus('Transcript fetched: ' + data.job.segment_count + ' line(s). Running AI extraction...', data.job.segment_count ? 'ok' : '');
      log('Transcript worked via ' + (data.job.methodLabel || data.job.method || 'Chrome extension') + ': ' + data.job.segment_count + ' line(s).');
      if (data.job.segment_count) {
        return runAnalysisForVideo(videoUrl, data.job.video_id, data).then(function () {
          if (id) focusDashboardOnVideo(id);
          return data;
        });
      }
      return loadAllData();
    }

    function retryTranscriptViaExtension(videoUrl, language) {
      if (!state.extensionBridgeReady) {
        return Promise.reject(new Error('Chrome extension is not connected.'));
      }
      log('Worker cloud download blocked. Retrying via Chrome extension (your browser IP)...');
      setTranscriptStatus('Cloud download blocked. Retrying via Chrome extension...', '');
      setTranscriptProgress({
        percent: 14,
        stage: 'extension_fetch',
        message: 'Opening YouTube tab to fetch captions, then returning here...',
        elapsed: '',
        attempt: ''
      });
      return fetchTranscriptViaExtension({ videoUrl: videoUrl, language: language || 'hi' }, videoUrl)
        .then(function (data) { return completeExtensionTranscriptFlow(videoUrl, data); });
    }

    function workerFetchJson(path, options) {
      if (!WORKER_API_BASE || !window.KRISHI_NETLIFY_STATIC || !isWorkerTranscriptPath(path)) return null;
      if (path === '/api/transcripts/setup' && DIRECT_API_BASE) return null;
      var apiOptions = options || {};
      var headers = Object.assign({}, apiOptions.headers || {});
      if (!headers.Authorization && !headers.authorization) {
        var storedToken = localStorage.getItem('fruitMandiSyncToken') || '';
        if (storedToken) headers.Authorization = 'Bearer ' + storedToken;
      }
      return fetch(WORKER_API_BASE + path, Object.assign({}, apiOptions, { headers: headers })).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          var accepted = response.status === 202 && data.ok !== false;
          if ((!response.ok && !accepted) || data.ok === false) throw new Error(data.error || ('Worker request failed: ' + response.status));
          return data;
        });
      });
    }

    function formatTranscriptFailureHelp(message) {
      return summarizeTranscriptError(message);
    }

    function summarizeTranscriptError(message) {
      var text = String(message || '');
      if (/Missing in-page handler|inject transcript helpers|did not finish loading/i.test(text)) {
        return 'YouTube tab did not load in time. Reload the extension at chrome://extensions, sign in at youtube.com, then retry Add source.';
      }
      if (/blocked|403|cloud provider|fetch_subtitles|hetzner/i.test(text)) {
        return 'YouTube blocked server-side fetch. The extension will open the video in a new tab — stay signed in at youtube.com and retry Add source.';
      }
      if (/timed out/i.test(text)) return 'Transcript fetch timed out. Open the video on youtube.com once, then retry Add source.';
      if (/extension is not connected/i.test(text)) return 'Chrome extension not connected. Reload the extension and refresh this page.';
      var short = text.split(' Tip:')[0].split(' · ')[0].trim();
      if (short.length > 240) short = short.slice(0, 240) + '…';
      return short || 'Transcript fetch failed.';
    }

    function extensionProgressFromStage(stage, detail) {
      var map = {
        fetch_captions: { percent: 14, label: 'Checking YouTube tabs' },
        load: { percent: 28, label: 'Opening YouTube video tab' },
        wake: { percent: 46, label: 'Loading video & captions' },
        fetch: { percent: 62, label: 'Reading transcript lines' },
        done: { percent: 78, label: 'Closing YouTube tab' },
      };
      var item = map[stage] || { percent: 18, label: 'Extension working' };
      return {
        percent: item.percent,
        stage: 'extension_fetch',
        message: detail || item.label,
        elapsed: '',
        attempt: '',
      };
    }

    function extensionApi(path, body, timeoutMs) {
      return new Promise(function (resolve, reject) {
        if (!state.extensionBridgeReady) {
          reject(new Error('Chrome extension is not connected.'));
          return;
        }
        var requestId = 'ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        var timer = setTimeout(function () {
          window.removeEventListener('message', onMessage);
          reject(new Error('Chrome extension timed out.'));
        }, Number(timeoutMs) || 300000);
        function onMessage(event) {
          if (event.source !== window || !event.data || event.data.source !== FRUIT_EXTENSION_BRIDGE) return;
          if (event.data.requestId !== requestId) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          var data = event.data.data || {};
          if (data.ok === false) reject(new Error(data.error || 'Extension request failed.'));
          else resolve(data);
        }
        window.addEventListener('message', onMessage);
        window.postMessage({
          source: FRUIT_EXTENSION_PAGE,
          requestId: requestId,
          path: path,
          body: body || {},
        }, '*');
      });
    }

    function initExtensionBridge() {
      window.addEventListener('message', function (event) {
        if (event.source !== window || !event.data || event.data.source !== FRUIT_EXTENSION_BRIDGE) return;
        if (event.data.type === 'ready') {
          state.extensionBridgeReady = true;
          refreshTranscriptSetupStatus();
          return;
        }
        if (event.data.type === 'progress') {
          setTranscriptProgress(extensionProgressFromStage(event.data.stage, event.data.detail));
        }
      });
      window.postMessage({ source: FRUIT_EXTENSION_PAGE, type: 'ping' }, '*');
      setTimeout(function () {
        window.postMessage({ source: FRUIT_EXTENSION_PAGE, type: 'ping' }, '*');
      }, 1200);
    }

    function importExtensionTranscriptToRailway(extData, requestBody, videoUrl) {
      var id = String(extData.id || requestBody.videoId || requestBody.video_id || extractVideoId(videoUrl) || '').replace(/[^a-zA-Z0-9_-]/g, '');
      return fetch(DIRECT_API_BASE + '/api/transcript', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: id,
          videoUrl: videoUrl,
          language: extData.language || requestBody.language || 'hi',
          segments: extData.segments || [],
          transcriptText: extData.transcriptText || '',
          fromExtension: true,
          method: extData.method || 'chrome-extension',
          methodLabel: extData.methodLabel || extData.method || 'Chrome extension (your browser)',
        }),
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || data.ok === false) throw new Error(data.error || ('Railway import failed: ' + response.status));
          return normalizeDirectTranscript(data, requestBody);
        });
      });
    }

    function importExtensionTranscriptToWorker(extData, requestBody, videoUrl) {
      var id = String(extData.id || requestBody.videoId || requestBody.video_id || extractVideoId(videoUrl) || '').replace(/[^a-zA-Z0-9_-]/g, '');
      var segments = normalizeDirectSegments(extData.segments || []);
      return fetchJson('/api/transcripts/transcribe', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
        body: JSON.stringify({
          videoUrl: videoUrl,
          videoId: id,
          id: id,
          language: extData.language || requestBody.language || 'hi',
          fromExtension: true,
          skipFetch: true,
          segments: segments,
          transcriptText: extData.transcriptText || segments.map(function (s) { return s.text; }).join(' '),
          method: extData.method || 'chrome-extension',
          methodLabel: extData.methodLabel || extData.method || 'Chrome extension (your browser)',
        }),
      }).then(function (data) {
        return {
          ok: true,
          job: {
            id: (data.job && data.job.id) || ('worker_' + id),
            video_id: id,
            video_url: videoUrl,
            status: (data.job && data.job.status) || 'complete',
            language: extData.language || requestBody.language || 'hi',
            model: 'chrome-extension',
            source: 'chrome-extension',
            method: extData.method || 'chrome-extension',
            methodLabel: extData.methodLabel || 'Chrome extension (your browser)',
            segment_count: (data.job && data.job.segment_count) || segments.length,
          },
          transcriptText: data.transcriptText || extData.transcriptText || '',
          segments: data.segments || segments,
        };
      });
    }

    function fetchTranscriptViaExtension(requestBody, videoUrl) {
      setTranscriptProgress({
        percent: 14,
        stage: 'fetch_captions',
        message: 'Opening YouTube in a new tab — you will return to this dashboard when captions are ready.',
        elapsed: '',
        attempt: ''
      });
      return extensionApi('/api/transcript', {
        videoUrl: videoUrl,
        id: requestBody.videoId || requestBody.video_id || extractVideoId(videoUrl),
        language: requestBody.language || 'hi',
        languages: requestBody.languages || 'hi.*,hi,en.*,en',
      }).then(function (extData) {
        setTranscriptProgress({
          percent: 28,
          stage: 'saving',
          message: DIRECT_API_BASE
            ? 'Captions fetched. Saving on Railway and running AI analysis...'
            : 'Captions fetched. Saving on Worker and running AI analysis...',
          elapsed: '',
          attempt: ''
        });
        if (DIRECT_API_BASE) {
          return importExtensionTranscriptToRailway(extData, requestBody, videoUrl);
        }
        return importExtensionTranscriptToWorker(extData, requestBody, videoUrl);
      });
    }

    function fetchTranscriptViaRailway(requestBody, videoUrl) {
      return fetch(DIRECT_API_BASE + '/api/transcript', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: requestBody.videoId || requestBody.video_id || extractVideoId(videoUrl),
          videoUrl: videoUrl,
          language: requestBody.language || 'hi',
          languages: requestBody.languages || 'hi.*,hi,en.*,en',
          audioUrl: requestBody.audioUrl || requestBody.audio_url || '',
          preferAudio: false,
        }),
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || data.ok === false) throw new Error(data.error || ('Railway request failed: ' + response.status));
          return normalizeDirectTranscript(data, requestBody);
        });
      });
    }

    function readJsonStore(key, fallback) {
      try {
        var value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (e) {
        return fallback;
      }
    }

    function writeJsonStore(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }

    function parseRequestBody(options) {
      var body = options && options.body;
      if (!body) return {};
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        var formBody = {};
        body.forEach(function (value, key) {
          formBody[key] = value;
        });
        return formBody;
      }
      if (typeof body === 'string') {
        try { return JSON.parse(body); } catch (e) { return {}; }
      }
      return body || {};
    }

    function normalizeDirectSegments(segments) {
      return (Array.isArray(segments) ? segments : []).map(function (segment, index) {
        var start = Number(segment.start_seconds != null ? segment.start_seconds : (segment.start != null ? segment.start : 0));
        var endValue = segment.end_seconds != null ? segment.end_seconds : segment.end;
        var end = endValue == null ? null : Number(endValue);
        return {
          segment_index: Number.isFinite(Number(segment.segment_index)) ? Number(segment.segment_index) : index,
          start_seconds: Number.isFinite(start) ? start : 0,
          end_seconds: Number.isFinite(end) ? end : null,
          timestamp_label: segment.timestamp_label || secondsToClock(start),
          text: String(segment.text || segment.caption || segment.line || ''),
          language: segment.language || '',
          source: segment.source || 'railway-direct',
        };
      }).filter(function (segment) {
        return segment.text;
      });
    }

    function normalizeDirectTranscript(data, requestBody) {
      var videoUrl = String(requestBody.videoUrl || requestBody.url || data.videoUrl || '');
      var id = String(data.id || requestBody.videoId || requestBody.video_id || requestBody.id || extractVideoId(videoUrl) || '').replace(/[^a-zA-Z0-9_-]/g, '');
      var segments = normalizeDirectSegments(data.segments);
      var transcript = {
        ok: true,
        job: {
          id: 'railway_' + (id || Date.now()),
          video_id: id,
          video_url: videoUrl,
          status: segments.length ? 'complete' : 'empty',
          language: data.language || requestBody.language || 'hi',
          model: data.model || 'railway-yt-dlp',
          source: data.source || 'railway-direct',
          method: data.method || data.source || 'railway-direct',
          methodLabel: data.methodLabel || data.method || 'Railway direct',
          segment_count: segments.length,
          message: segments.length
            ? ('Fetched ' + segments.length + ' transcript line(s) via ' + (data.methodLabel || data.method || 'Railway') + '.')
            : 'Railway returned no transcript lines.',
        },
        transcriptText: data.transcriptText || segments.map(function (segment) { return segment.text; }).join(' '),
        segments: segments,
      };
      if (id) writeJsonStore(TRANSCRIPT_CACHE_PREFIX + id, transcript);
      return transcript;
    }

    function directRailwayFetchJson(path, options) {
      if (!DIRECT_API_BASE || typeof path !== 'string' || path.indexOf('/api/') !== 0) return null;

      function directFetch(apiPath, apiOptions) {
        return fetch(DIRECT_API_BASE + apiPath, apiOptions || {}).then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok || data.ok === false) throw new Error(data.error || ('Railway request failed: ' + response.status));
            return data;
          });
        });
      }

      if (path === '/api/transcripts/setup') {
        return directFetch('/api/status').then(function (status) {
          return {
            ok: true,
            primaryMethod: 'railway-yt-dlp-subtitles',
            methods: ['Railway yt-dlp subtitles', 'Railway yt-dlp audio fallback', 'Railway OpenAI market extraction'],
            cookiesConfigured: false,
            extractorConfigured: true,
            openaiConfigured: Boolean(status.openaiConfigured),
            youtubeCookiesConfigured: Boolean(status.youtubeCookiesConfigured),
            databaseConfigured: Boolean(status.databaseConfigured),
            storage: status.storage || '',
          };
        }).catch(function () {
          return {
            ok: true,
            primaryMethod: 'railway-yt-dlp-subtitles',
            methods: ['Railway yt-dlp subtitles', 'Railway yt-dlp audio fallback', 'Railway OpenAI market extraction'],
            cookiesConfigured: false,
            extractorConfigured: true,
            openaiConfigured: false,
            youtubeCookiesConfigured: false,
            databaseConfigured: false,
            storage: '',
          };
        });
      }

      if (path === '/api/tasks/ongoing') {
        return Promise.resolve({
          ok: true,
          tasks: [],
          pipeline: { summary: { processing: 0, waiting: 0, done: 0, failed: 0, total: 0 }, items: [] },
          queueCount: 0,
          autoPipelineEnabled: false,
        });
      }

      if (path.indexOf('/api/settings') === 0) {
        return Promise.resolve({ ok: true, settings: {}, updated: false });
      }

      if (path.indexOf('/api/prices') === 0) {
        return directFetch(path).catch(function () {
          return { ok: true, items: readJsonStore('krishiRailwayPriceRows', []) };
        });
      }

      if (path.indexOf('/api/analysis?') === 0) {
        return directFetch(path).catch(function () {
          return { ok: true, items: readJsonStore('krishiRailwayAnalysisItems', []) };
        });
      }

      if (path === '/api/analysis/run') {
        var analysisBody = parseRequestBody(options);
        var analysisVideoId = analysisBody.videoId || analysisBody.video_id || extractVideoId(analysisBody.videoUrl || analysisBody.video_url || '');
        var cachedTranscript = analysisVideoId ? readJsonStore(TRANSCRIPT_CACHE_PREFIX + analysisVideoId, null) : null;
        if (cachedTranscript && !analysisBody.segments) {
          analysisBody.segments = cachedTranscript.segments || [];
          analysisBody.transcriptText = cachedTranscript.transcriptText || '';
        }
        return directFetch('/api/analysis/run', {
          method: 'POST',
          headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
          body: JSON.stringify(analysisBody),
        }).then(function (data) {
          if (Array.isArray(data.priceRows)) writeJsonStore('krishiRailwayPriceRows', data.priceRows);
          if (data.videoId && data.meta) {
            var analysisItems = readJsonStore('krishiRailwayAnalysisItems', []);
            analysisItems = analysisItems.filter(function (item) { return item.video_id !== data.videoId; });
            analysisItems.unshift({
              video_id: data.videoId,
              market_date: data.meta.market_date || '',
              mention_count: data.meta.mention_count || 0,
              source: data.meta.source || 'railway-openai',
              updated_at: new Date().toISOString(),
              meta: data.meta,
            });
            writeJsonStore('krishiRailwayAnalysisItems', analysisItems);
          }
          return data;
        });
      }

      if (path === '/api/analysis/reanalyze-targets') {
        return directFetch(path);
      }

      var analysisMatch = path.match(/^\/api\/analysis\/([^/?]+)/);
      if (analysisMatch) {
        return directFetch(path);
      }

      if (path === '/api/transcripts/transcribe') {
        var requestBody = parseRequestBody(options);
        if (requestBody.audio && typeof File !== 'undefined' && requestBody.audio instanceof File) {
          return Promise.reject(new Error('Railway direct mode supports YouTube URL transcripts. For uploaded audio, use the Railway API from a server request.'));
        }
        var videoUrl = String(requestBody.videoUrl || requestBody.url || '').trim();
        if (!videoUrl) return Promise.reject(new Error('Paste a YouTube URL first.'));
        if (WORKER_API_BASE && window.KRISHI_NETLIFY_STATIC) {
          return null;
        }
        return fetchTranscriptViaRailway(requestBody, videoUrl);
      }

      var transcriptMatch = path.match(/^\/api\/transcripts\/([^/?]+)/);
      if (transcriptMatch) {
        var cached = readJsonStore(TRANSCRIPT_CACHE_PREFIX + decodeURIComponent(transcriptMatch[1]), null);
        if (cached) return Promise.resolve(cached);
        return directFetch(path);
      }

      return Promise.resolve({ ok: true });
    }

    function fetchJson(path, options) {
      var worker = workerFetchJson(path, options || {});
      if (worker) return worker;
      var direct = directRailwayFetchJson(path, options || {});
      if (direct) return direct;
      return fetch(path, options || {}).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          var accepted = response.status === 202 && data.ok !== false;
          if ((!response.ok && !accepted) || data.ok === false) throw new Error(data.error || ('Request failed: ' + response.status));
          return data;
        });
      });
    }

    function formatElapsed(ms) {
      var total = Math.max(0, Math.floor(Number(ms) / 1000));
      var minutes = Math.floor(total / 60);
      var seconds = total % 60;
      return minutes + ':' + String(seconds).padStart(2, '0');
    }

    function resetTranscriptProgress() {
      state.lastPollStage = '';
      var progress = el('transcriptProgress');
      progress.classList.remove('show', 'failed');
      el('transcriptProgressFill').style.width = '0%';
      el('transcriptProgressLabel').textContent = 'Starting...';
      el('transcriptProgressMeta').textContent = '0:00';
      el('transcriptProgressDetail').textContent = '';
    }

    function setTranscriptProgress(options) {
      var percent = Math.max(0, Math.min(100, Number(options.percent) || 0));
      var stage = options.stage || '';
      var message = options.message || '';
      var elapsed = options.elapsed || '';
      var attempt = options.attempt || '';
      var progress = el('transcriptProgress');
      progress.classList.add('show');
      progress.classList.toggle('failed', stage === 'failed');
      el('transcriptProgressFill').style.width = percent + '%';
      el('transcriptProgressLabel').textContent = (TRANSCRIPT_STAGE_LABELS[stage] || stage || 'Working') + ' · ' + percent + '%';
      el('transcriptProgressMeta').textContent = [elapsed, attempt].filter(Boolean).join(' · ');
      el('transcriptProgressDetail').textContent = message;
    }

    function effectiveTranscriptProgress(job, elapsedMs) {
      var server = Number(job && job.progress) || 0;
      var stage = job && job.stage;
      if (stage === 'queued') return Math.max(server, 8);
      if (stage === 'fetch_captions' || stage === 'fetch_subtitles' || stage === 'hetzner_transcript') return Math.max(server, 15);
      if (stage === 'download_audio' || stage === 'openai_transcription' || job.status === 'running') {
        var bump = Math.min(28, Math.floor(elapsedMs / 3500));
        return Math.max(server, Math.min(88, server + bump));
      }
      if (stage === 'saving') return Math.max(server, 90);
      if (stage === 'analyzing') return Math.max(server, 95);
      if (stage === 'analysis_complete') return 100;
      if (job && job.status === 'complete') return 100;
      return server;
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

    function videoThumbById(id) {
      return id ? 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg' : '';
    }

    function tableVideoThumbCell(videoId) {
      var thumbUrl = videoThumbById(videoId);
      if (!thumbUrl) return '<td class="video-thumb-cell">—</td>';
      return '<td class="video-thumb-cell"><button type="button" class="table-video-thumb-btn rich-video-btn" data-video-id="' + escapeHtml(videoId) + '" title="Open market day report">'
        + '<img class="youtube-table-thumb" src="' + escapeHtml(thumbUrl) + '" alt="" loading="lazy" />'
        + '</button></td>';
    }

    function rowVideoId(row) {
      return String(row.video_id || extractVideoId(row.video_url) || '').trim();
    }

    function filterRowsForVideo(videoId) {
      if (!videoId) return [];
      return state.priceRows.filter(function (row) {
        return rowVideoId(row) === videoId;
      });
    }

    function timestampVideoUrl(videoUrl, seconds) {
      var url = videoUrl || '';
      var start = Math.max(0, Math.floor(Number(seconds) || 0));
      if (!url) return '#';
      try {
        var parsed = new URL(url);
        parsed.searchParams.set('t', start + 's');
        return parsed.toString();
      } catch (error) {
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + start + 's';
      }
    }

    function embedUrl(videoId, seconds, autoplay) {
      var start = Math.max(0, Math.floor(Number(seconds) || 0));
      var shouldAutoplay = autoplay === true || (autoplay !== false && start > 0);
      var origin = '';
      try { origin = encodeURIComponent(window.location.origin); } catch (error) {}
      return 'https://www.youtube.com/embed/' + encodeURIComponent(videoId)
        + '?start=' + start
        + '&autoplay=' + (shouldAutoplay ? '1' : '0')
        + (shouldAutoplay ? '&mute=1' : '')
        + '&rel=0'
        + '&modestbranding=1'
        + '&playsinline=1'
        + (origin ? '&origin=' + origin : '');
    }

    function playTimestampInApp(videoId, seconds) {
      if (!videoId) return;
      var start = Math.max(0, Math.floor(Number(seconds) || 0));
      if (state.richVideoId === videoId && el('videoModal').classList.contains('show')) {
        seekRichVideo(start);
        return;
      }
      openRichVideo(videoId, start);
    }

    function seekRichVideo(seconds) {
      var videoId = state.richVideoId;
      if (!videoId) return;
      var iframe = el('richVideoFrame');
      var start = Math.max(0, Math.floor(Number(seconds) || 0));
      var next = embedUrl(videoId, start, true);
      el('richJumpStatus').textContent = 'Jumping to ' + secondsToClock(start) + '...';
      iframe.src = 'about:blank';
      window.setTimeout(function () {
        iframe.src = next;
        el('richJumpStatus').textContent = 'Playing from ' + secondsToClock(start) + '. Click a mention again to replay that moment.';
      }, 40);
      if (state.richVideoUrl) {
        el('richOpenYoutube').href = timestampVideoUrl(state.richVideoUrl, start);
      }
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

    function todayIso() {
      var now = new Date();
      return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }

    function formatTallyDate(row) {
      var date = rowDate(row);
      if (!date) return 'Unknown';
      try {
        return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (error) {
        return date;
      }
    }

    function rateFreshnessLabel(row) {
      var date = rowDate(row);
      if (date && date === todayIso()) return "Today's rate";
      return 'Latest rate';
    }

    function rateFreshnessClass(row) {
      return rowDate(row) === todayIso() ? 'today' : 'latest';
    }

    function proofSnippet(row) {
      var text = String(row.clean_english_line || row.clean_hindi_line || row.original_line || row.context || row.price_notes || '').trim();
      if (!text) return '';
      return text.length > 120 ? text.slice(0, 117) + '...' : text;
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
      var raw = String(row.fruit || row.fruit_label || row.fruit_hindi || '').trim();
      var key = raw.toLowerCase();
      var mapped = produceNames[key] || raw || 'Unknown produce';
      if (row.fruit_emoji && raw && raw.indexOf(row.fruit_emoji) !== 0 && !produceHasImage(row)) {
        return row.fruit_emoji + ' ' + raw;
      }
      return mapped;
    }

    function gradeLabel(row) {
      return String(row.quality_grade || row.quality_label || '').trim() || 'Unspecified';
    }

    function sizeLabel(row) {
      var raw = [row.size, row.size_label, row.price_notes, row.context].join(' ');
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

    function displayRateUnit(unit) {
      var value = String(unit || '').trim().toLowerCase();
      return value === 'kg' ? 'kg' : '';
    }

    function detectDisplayVariety(text) {
      var hay = String(text || '').toLowerCase();
      if (!hay) return '';
      var needles = [
        ['black amber', 'Black Amber'], ['ब्लैक एम्बर', 'Black Amber'],
        ['red diamond', 'Red Diamond'], ['रेड डायमंड', 'Red Diamond'],
        ['dietman', 'Dietman'], ['pepsi', 'Pepsi'],
        ['कश्मीरी', 'Kashmiri'], ['kashmiri', 'Kashmiri'],
        ['shimla', 'Shimla'], ['शिमला', 'Shimla'],
        ['royal gala', 'Royal Gala'], ['गाला', 'Gala'], ['gala', 'Gala'],
        ['golden delicious', 'Golden Delicious'], ['delicious', 'Delicious'],
        ['kinnaur', 'Kinnaur'], ['किन्नौर', 'Kinnaur'],
        ['fuji', 'Fuji'], ['फूजी', 'Fuji'],
        ['शक्करपारा', 'Shakkarpara'], ['शक्करपारे', 'Shakkarpara'], ['शक्करपारों', 'Shakkarpara'],
        ['shakkarpara', 'Shakkarpara'], ['shakkar para', 'Shakkarpara'],
        ['आड़ू', 'Peach'], ['आड़ू', 'Peach'], ['aadu', 'Peach'], ['peach', 'Peach'],
        ['chipsona', 'Chipsona'], ['चिपसोना', 'Chipsona'],
        ['jalandhar', 'Jalandhar'], ['जालंधर', 'Jalandhar'],
        ['pahadi', 'Pahadi'], ['पहाड़ी', 'Pahadi'],
        ['चौसा', 'Chausa'], ['chausa', 'Chausa'], ['chosa', 'Chausa'], ['choosa', 'Chausa'], ['chusa', 'Chausa'],
        ['दिश्यारी', 'Dussehri'], ['dussehri', 'Dussehri'], ['dusheri', 'Dussehri'], ['dishyari', 'Dussehri'],
        ['लंगड़ा', 'Langda'], ['langda', 'Langda'], ['langra', 'Langda'],
        ['गोल्डन', 'Golden'], ['golden', 'Golden'],
        ['केसर', 'Kesar'], ['kesar', 'Kesar'],
        ['सफेद', 'Safeda'], ['safeda', 'Safeda'], ['safed', 'Safeda'],
        ['टोटापुरी', 'Totapuri'], ['totapuri', 'Totapuri'], ['tota', 'Totapuri'],
      ];
      for (var i = 0; i < needles.length; i += 1) {
        if (hay.indexOf(needles[i][0].toLowerCase()) >= 0) return needles[i][1];
      }
      return '';
    }

    function detectDisplayGrade(text) {
      var hay = String(text || '');
      if (!hay) return '';
      var match = hay.match(/(?:grade|ग्रेड|नंबर|नम्बर|no\.?)\s*([0-9]+)/i);
      if (match) return 'Grade ' + match[1];
      match = hay.match(/([0-9]+)\s*(?:नंबर|नम्बर|number|no\.?)/i);
      if (match) return 'Grade ' + match[1];
      return '';
    }

    function isQualityGradeText(text) {
      var value = String(text || '').trim();
      if (!value) return false;
      return /^(premium|normal|good|average|super|first|second|third|best|medium|madhyam|special|unspecified)$/i.test(value)
        || /^grade\s*\d+$/i.test(value)
        || /^\d+\s*(number|no\.?)$/i.test(value);
    }

    function normalizeDisplayRow(row) {
      row = row || {};
      var copy = Object.assign({}, row);
      var contextHay = [
        copy.variety,
        copy.quality_grade,
        copy.quality_label,
        copy.size_label,
        copy.context,
        copy.original_line,
        copy.clean_hindi_line,
        copy.clean_english_line,
      ].join(' ');

      if (!String(copy.variety || '').trim()) {
        var detected = detectDisplayVariety(contextHay);
        if (detected) copy.variety = detected;
      }

      if (!String(copy.variety || '').trim()) {
        if (copy.quality_grade && !isQualityGradeText(copy.quality_grade)) {
          var fromGrade = detectDisplayVariety(copy.quality_grade);
          if (fromGrade) {
            copy.variety = fromGrade;
            if (isQualityGradeText(copy.quality_label)) copy.quality_grade = copy.quality_label;
          }
        } else if (copy.quality_label && !isQualityGradeText(copy.quality_label)) {
          var fromLabel = detectDisplayVariety(copy.quality_label);
          if (fromLabel) copy.variety = fromLabel;
        }
      }

      if (!String(copy.quality_grade || '').trim() && !String(copy.quality_label || '').trim()) {
        var detectedGrade = detectDisplayGrade(contextHay);
        if (detectedGrade) copy.quality_grade = detectedGrade;
      }

      var unit = String(copy.unit || '').trim().toLowerCase();
      if (unit !== 'kg') copy.unit = 'unknown';
      return copy;
    }

    function rowDisplayLabel(row) {
      row = normalizeDisplayRow(row);
      var variety = String(row.variety || '').trim();
      var grade = gradeLabel(row);
      if (grade === 'Unspecified') {
        var inferredGrade = detectDisplayGrade([row.original_line, row.context, row.price_notes].join(' '));
        if (inferredGrade) grade = inferredGrade;
      }
      var size = sizeLabel(row);
      var parts = [];
      if (variety) parts.push(variety);
      if (grade && grade !== 'Unspecified' && grade.toLowerCase() !== variety.toLowerCase()) parts.push(grade);
      if (size && size !== 'Any size') parts.push(size);
      if (!parts.length) {
        var area = areaLabel(row);
        if (area && area !== 'Unknown area') parts.push(area);
      }
      if (!parts.length) {
        var party = String(row.party_name || '').trim();
        if (party) parts.push(party);
      }
      if (!parts.length) {
        var ts = String(row.timestamp_label || '').trim();
        if (ts) return 'Lot · ' + ts;
      }
      return parts.length ? parts.join(' · ') : 'Unspecified';
    }

    function rateRange(row, includeUnit) {
      var min = Number(row.min_price_inr);
      var max = Number(row.max_price_inr);
      var withUnit = includeUnit !== false;
      var unitSuffix = withUnit && displayRateUnit(row.unit) ? ' / ' + displayRateUnit(row.unit) : '';
      if (Number.isFinite(min) && Number.isFinite(max) && min !== max) return money(min) + ' - ' + money(max) + unitSuffix;
      if (Number.isFinite(min)) return money(min) + unitSuffix;
      if (Number.isFinite(max)) return money(max) + unitSuffix;
      return 'Rate not stated';
    }

    function rateDedupeKey(row) {
      row = normalizeDisplayRow(row);
      return [
        produceLabel(row),
        row.variety || '',
        gradeLabel(row),
        sizeLabel(row),
        rateRange(row),
      ].join('|').toLowerCase();
    }

    function dedupeRateRows(rows) {
      var groups = {};
      var order = [];
      (rows || []).forEach(function (row) {
        var key = rateDedupeKey(row);
        if (!groups[key]) {
          groups[key] = { row: normalizeDisplayRow(row), proofs: [] };
          order.push(key);
        }
        var seconds = Math.max(0, Math.floor(Number(row.timestamp_seconds) || 0));
        var videoId = rowVideoId(row);
        var label = row.timestamp_label || secondsToClock(seconds);
        var duplicate = groups[key].proofs.some(function (proof) {
          return proof.seconds === seconds && proof.videoId === videoId;
        });
        if (!duplicate) {
          groups[key].proofs.push({ seconds: seconds, label: label, videoId: videoId });
        }
      });
      return order.map(function (key) {
        var group = groups[key];
        group.proofs.sort(function (a, b) { return a.seconds - b.seconds; });
        return group;
      });
    }

    function renderProofChips(proofs, options) {
      options = options || {};
      var chipClass = options.chipClass || 'proof-chip app-jump';
      var maxVisible = options.maxVisible || 3;
      var wrapClass = options.wrapClass || 'proof-chips';
      var sorted = (proofs || []).slice().sort(function (a, b) { return a.seconds - b.seconds; });
      if (!sorted.length) return '';
      var visible = sorted.slice(0, maxVisible);
      var hidden = sorted.slice(maxVisible);
      var html = visible.map(function (proof) {
        return '<button type="button" class="' + chipClass + '" data-video-id="' + escapeHtml(proof.videoId) + '" data-seconds="' + proof.seconds + '">▶ ' + escapeHtml(proof.label) + '</button>';
      }).join('');
      if (hidden.length) {
        var hiddenLabels = hidden.map(function (proof) { return proof.label; }).join(', ');
        html += '<button type="button" class="' + chipClass + ' proof-more-chip" data-video-id="' + escapeHtml(hidden[0].videoId) + '" data-seconds="' + hidden[0].seconds + '" title="Also at ' + escapeHtml(hiddenLabels) + '">+' + hidden.length + '</button>';
      }
      return '<div class="' + wrapClass + '">' + html + '</div>';
    }

    function renderOrganizedGradeRows(rows) {
      return dedupeRateRows(rows).map(function (group) {
        var row = group.row;
        var label = rowDisplayLabel(row);
        var area = areaLabel(row);
        var metaBits = [
          area && area !== 'Unknown area' ? area : '',
          row.party_name || '',
        ].filter(Boolean);
        return '<div class="market-grade-row">'
          + '<div class="market-grade-copy">'
          + '<span class="market-grade-label">' + escapeHtml(label) + '</span>'
          + (metaBits.length ? '<span class="market-grade-meta">' + escapeHtml(metaBits.join(' · ')) + '</span>' : '')
          + '</div>'
          + '<strong class="market-grade-rate">' + escapeHtml(rateRange(row)) + '</strong>'
          + renderProofChips(group.proofs, { chipClass: 'proof-chip app-jump', wrapClass: 'proof-chips' })
          + '</div>';
      }).join('');
    }

    function uniqueValues(rows, getter) {
      var map = {};
      rows.forEach(function (row) {
        var value = String(getter(row) || '').trim();
        if (value) map[value] = true;
      });
      return Object.keys(map).sort(function (a, b) { return a.localeCompare(b); });
    }

    function filteredByDate(rows) {
      var from = el('dateFrom').value;
      var to = el('dateTo').value;
      return rows.filter(function (row) {
        if (priceValue(row) == null) return false;
        var date = rowDate(row);
        if (from && date && date < from) return false;
        if (to && date && date > to) return false;
        return true;
      });
    }

    function filteredChartRows() {
      return filteredByDate(state.priceRows).filter(function (row) {
        if (state.selectedFruit && produceLabel(row) !== state.selectedFruit) return false;
        if (state.selectedGrade && gradeLabel(row) !== state.selectedGrade) return false;
        if (state.selectedSize && sizeLabel(row) !== state.selectedSize) return false;
        if (state.selectedArea && areaLabel(row) !== state.selectedArea) return false;
        return true;
      });
    }

    function filteredRateListRows() {
      return filteredByDate(state.priceRows);
    }

    function filteredAllDataRows() {
      return filteredByDate(state.priceRows);
    }

    function chartDateRangeLabel() {
      var fromEl = el('dateFrom');
      var toEl = el('dateTo');
      var from = fromEl && fromEl.value;
      var to = toEl && toEl.value;
      if (!from && !to) return '';
      if (from && to) return formatChartDateLabel(from) + ' – ' + formatChartDateLabel(to);
      if (from) return 'From ' + formatChartDateLabel(from);
      return 'Until ' + formatChartDateLabel(to);
    }

    function updateChartFilterSummary() {
      var parts = [
        state.selectedFruit ? produceDisplayLabel(state.selectedFruit) : 'Select produce',
        state.selectedGrade || 'all grades',
        state.selectedSize || 'all sizes',
        state.selectedArea || 'all areas',
      ];
      var range = chartDateRangeLabel();
      if (range) parts.push(range);
      var summary = parts.join(' · ');
      var node = el('chartFilterSummary');
      if (!node) return;
      if (!state.chartExpanded && !state.selectedFruit && !range) {
        node.textContent = 'Price trends — tap to expand';
      } else {
        node.textContent = summary;
      }
    }

    function setChartExpanded(expanded) {
      state.chartExpanded = !!expanded;
      var section = el('surfaceChart');
      var btn = el('chartToggleBtn');
      var label = el('chartToggleLabel');
      if (section) section.classList.toggle('surface-chart-collapsed', !state.chartExpanded);
      if (btn) btn.setAttribute('aria-expanded', state.chartExpanded ? 'true' : 'false');
      if (label) label.textContent = state.chartExpanded ? 'Hide chart' : 'Show chart';
      updateChartFilterSummary();
      if (state.chartExpanded) {
        window.requestAnimationFrame(function () { drawChart(); });
      }
    }

    function toggleChartExpanded() {
      setChartExpanded(!state.chartExpanded);
    }

    function applyDefaultProduceSelection() {
      var fruits = uniqueValues(state.priceRows, produceLabel);
      if (!fruits.length) {
        state.selectedFruit = '';
        return;
      }
      if (!state.selectedFruit || fruits.indexOf(state.selectedFruit) === -1) {
        state.selectedFruit = fruits[0];
      }
    }

    function renderFilterSelect(selectId, values, selectedValue, placeholder) {
      var select = el(selectId);
      if (!select) return;
      if (!values.length) {
        select.innerHTML = '<option value="">' + escapeHtml(placeholder) + '</option>';
        select.value = '';
        select.disabled = true;
        return;
      }
      select.disabled = false;
      var html = '<option value="">' + escapeHtml(placeholder) + '</option>';
      values.forEach(function (value) {
        var display = selectId === 'produceSelect' ? produceDisplayLabel(value) : value;
        html += '<option value="' + escapeHtml(value) + '">' + escapeHtml(display) + '</option>';
      });
      select.innerHTML = html;
      select.value = selectedValue || '';
    }

    function renderChartFilters() {
      var dateRows = filteredByDate(state.priceRows);
      var produceValues = uniqueValues(state.priceRows, produceLabel);
      if (!produceValues.length) {
        renderFilterSelect('produceSelect', [], '', 'No produce yet');
        renderFilterSelect('gradeSelect', [], '', 'All grades');
        renderFilterSelect('sizeSelect', [], '', 'All sizes');
        renderFilterSelect('areaSelect', [], '', 'All areas');
        return;
      }
      if (!state.selectedFruit || produceValues.indexOf(state.selectedFruit) === -1) {
        state.selectedFruit = produceValues[0];
      }
      renderFilterSelect('produceSelect', produceValues, state.selectedFruit, 'Select produce');

      var scopedRows = state.selectedFruit
        ? dateRows.filter(function (row) { return produceLabel(row) === state.selectedFruit; })
        : dateRows;
      renderFilterSelect('gradeSelect', uniqueValues(scopedRows, gradeLabel), state.selectedGrade, 'All grades');
      renderFilterSelect('sizeSelect', uniqueValues(scopedRows, sizeLabel), state.selectedSize, 'All sizes');
      renderFilterSelect('areaSelect', uniqueValues(scopedRows, areaLabel), state.selectedArea, 'All areas');
    }

    function smoothLinePath(points) {
      if (!points.length) return '';
      if (points.length === 1) {
        return 'M' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1);
      }
      var path = 'M' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1);
      for (var i = 0; i < points.length - 1; i += 1) {
        var p0 = points[i - 1] || points[i];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[i + 2] || p2;
        var cp1x = p1.x + (p2.x - p0.x) / 6;
        var cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6;
        var cp2y = p2.y - (p3.y - p1.y) / 6;
        path += ' C' + cp1x.toFixed(1) + ' ' + cp1y.toFixed(1)
          + ' ' + cp2x.toFixed(1) + ' ' + cp2y.toFixed(1)
          + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      return path;
    }

    function smoothAreaPath(points, baselineY) {
      if (!points.length) return '';
      var line = smoothLinePath(points);
      var first = points[0];
      var last = points[points.length - 1];
      return line
        + ' L' + last.x.toFixed(1) + ' ' + baselineY.toFixed(1)
        + ' L' + first.x.toFixed(1) + ' ' + baselineY.toFixed(1)
        + ' Z';
    }

    function renderChartLegend(series) {
      var legend = el('chartLegend');
      if (!legend) return;
      if (!series.length) {
        legend.innerHTML = '';
        return;
      }
      legend.innerHTML = series.map(function (item, index) {
        var color = state.colors[index % state.colors.length];
        var produceKey = state.selectedFruit || item.key;
        return '<div class="chart-legend-item" title="' + escapeHtml(item.key) + '">'
          + produceThumbHtml(produceKey, 'produce-thumb-sm')
          + '<span class="chart-legend-swatch" style="background:' + color + '"></span>'
          + '<span class="chart-legend-label">' + escapeHtml(produceDisplayLabel(produceKey)) + '</span>'
          + '</div>';
      }).join('');
    }

    function seriesKey(row) {
      return [row.variety || 'Any variety', gradeLabel(row), sizeLabel(row), areaLabel(row), row.unit || 'unit'].join(' · ');
    }

    function applyDefaultDateRange() {
      var dates = state.priceRows.map(rowDate).filter(Boolean).sort();
      el('dateFrom').value = dates.length ? dates[0] : '';
      el('dateTo').value = todayIso();
    }

    function setReanalyzeStatus(message, kind) {
      var node = el('reanalyzeStatus');
      if (!message) {
        node.hidden = true;
        node.textContent = '';
        node.className = 'reanalyze-status';
        return;
      }
      node.hidden = false;
      node.className = 'reanalyze-status' + (kind ? ' ' + kind : '');
      node.textContent = message;
    }

    function formatTaskUpdatedAt(value) {
      if (!value) return '';
      var raw = String(value).trim();
      var then = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
      if (!Number.isFinite(then)) return '';
      var seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
      if (seconds < 60) return seconds + 's ago';
      var minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      return Math.floor(minutes / 60) + 'h ago';
    }

    function pipelineSummary() {
      return (state.pipeline && state.pipeline.summary) ? state.pipeline.summary : {
        total: 0,
        completed: 0,
        failed: 0,
        active: 0,
        waiting: 0,
        done: 0,
        progressPercent: 0,
        label: '',
        statusLabel: 'Idle',
        pipelineBusy: false,
      };
    }

    function pickDefaultActivityTab(summary) {
      summary = summary || pipelineSummary();
      if ((summary.active || 0) > 0) return 'active';
      if ((summary.waiting || 0) > 0) return 'waiting';
      if ((summary.completed || 0) + (summary.failed || 0) > 0) return 'all';
      return 'all';
    }

    function pipelineHasWork() {
      var summary = pipelineSummary();
      if (summary.total > 0) return true;
      if ((state.serverOngoing || []).length) return true;
      if (state.localOngoing) return true;
      return Number(state.queueCount) > 0;
    }

    function activityBadgeCount() {
      var summary = pipelineSummary();
      if (summary.total > 0) return summary.active + summary.waiting;
      return ongoingTaskCount() + (Number(state.queueCount) || 0);
    }

    function activityStageLabel(item) {
      var stage = item.stage || item.status || 'running';
      return TRANSCRIPT_STAGE_LABELS[stage] || stage;
    }

    function renderActivityRow(item, options) {
      options = options || {};
      var bucket = item.bucket || 'waiting';
      var progress = Math.max(0, Math.min(100, Number(item.progress) || 0));
      var title = item.title || item.videoId || 'YouTube video';
      var sub = item.videoId ? ('ID ' + item.videoId) : '';
      if (item.uploadDate) sub = item.uploadDate + (sub ? ' · ' + sub : '');
      if (item.queuePosition) sub = '#' + item.queuePosition + ' in queue' + (sub ? ' · ' + sub : sub);
      var message = item.message || '';
      if (bucket === 'completed' && item.priceRowCount) {
        message = 'Saved ' + item.priceRowCount + ' rate row(s)';
      }
      if (bucket === 'failed' && item.error) message = item.error;
      var pillClass = bucket === 'active' ? 'active' : bucket;
      var pillText = bucket === 'active'
        ? activityStageLabel(item)
        : bucket === 'waiting'
          ? 'Queued'
          : bucket === 'completed'
            ? 'Done'
            : 'Failed';
      var rowClass = 'activity-row ' + (bucket === 'active' ? 'active-row' : bucket + '-row');
      var position = options.position ? '<span class="activity-position">' + options.position + '</span>' : '';
      var stamp = formatTaskUpdatedAt(item.updated_at || item.queuedAt);
      return ''
        + '<div class="' + rowClass + '" data-video-id="' + escapeHtml(item.videoId || '') + '">'
        + '<img class="activity-thumb" src="' + escapeHtml(item.thumbUrl || '') + '" alt="" loading="lazy" />'
        + '<div class="activity-copy">'
        + '<strong>' + escapeHtml(title) + '</strong>'
        + '<span>' + escapeHtml(sub) + '</span>'
        + (message ? '<em>' + escapeHtml(message) + '</em>' : '')
        + (stamp ? '<time>' + escapeHtml(stamp) + '</time>' : '')
        + '</div>'
        + '<div class="activity-side">'
        + position
        + '<span class="activity-pill ' + pillClass + '">' + escapeHtml(pillText) + '</span>'
        + (bucket === 'active'
          ? '<div class="activity-mini-bar"><span style="width:' + progress + '%"></span></div>'
          : '')
        + '</div>'
        + '</div>';
    }

    function updateActivityNavMeta() {
      var meta = el('settingsNavActivityMeta');
      if (!meta) return;
      var summary = pipelineSummary();
      var waiting = summary.waiting || Number(state.queueCount) || 0;
      var active = summary.active || 0;
      if (waiting || active) {
        meta.textContent = active + ' processing · ' + waiting + ' queued';
      } else {
        meta.textContent = 'Import queue and pipeline progress';
      }
    }

    function renderActivityList() {
      var pipeline = state.pipeline || {};
      var summary = pipelineSummary();
      var tab = state.activityTab || 'all';
      var items = [];
      if (tab === 'all') {
        items = (pipeline.active || []).slice()
          .concat((pipeline.waiting || []).slice())
          .concat((pipeline.completed || []).slice(0, 30))
          .concat((pipeline.failed || []).slice(0, 20));
        if (state.localOngoing && state.localOngoing.kind === 'reanalyze') {
          items.unshift({
            bucket: 'active',
            title: 'Batch re-analysis (' + state.localOngoing.current + '/' + state.localOngoing.total + ')',
            videoId: state.localOngoing.video_id || '',
            message: state.localOngoing.title || 'Re-running AI extraction',
            stage: 'reanalyze',
            progress: state.localOngoing.total
              ? Math.round((state.localOngoing.current / state.localOngoing.total) * 100)
              : 0,
            thumbUrl: state.localOngoing.video_id
              ? ('https://i.ytimg.com/vi/' + encodeURIComponent(state.localOngoing.video_id) + '/hqdefault.jpg')
              : '',
          });
        }
      } else if (tab === 'active') {
        items = (pipeline.active || []).slice();
        if (state.localOngoing && state.localOngoing.kind === 'reanalyze') {
          items.unshift({
            bucket: 'active',
            title: 'Batch re-analysis (' + state.localOngoing.current + '/' + state.localOngoing.total + ')',
            videoId: state.localOngoing.video_id || '',
            message: state.localOngoing.title || 'Re-running AI extraction',
            stage: 'reanalyze',
            progress: state.localOngoing.total
              ? Math.round((state.localOngoing.current / state.localOngoing.total) * 100)
              : 0,
            thumbUrl: state.localOngoing.video_id
              ? ('https://i.ytimg.com/vi/' + encodeURIComponent(state.localOngoing.video_id) + '/hqdefault.jpg')
              : '',
          });
        }
      } else if (tab === 'waiting') {
        items = (pipeline.waiting || []).slice();
      } else if (tab === 'completed') {
        items = (pipeline.completed || []).slice();
      } else if (tab === 'failed') {
        items = (pipeline.failed || []).slice();
      }

      var list = el('activityList');
      if (!list) return;
      if (!items.length) {
        var emptyLabel = tab === 'all' ? 'No pipeline activity yet.'
          : tab === 'active' ? 'No videos processing right now.'
          : tab === 'waiting' ? 'Queue is empty.'
          : tab === 'completed' ? 'No completed imports yet.'
          : 'No failed imports.';
        list.innerHTML = '<div class="activity-empty">' + escapeHtml(emptyLabel) + '</div>';
      } else {
        var doneOffset = summary.completed + summary.failed;
        list.innerHTML = items.map(function (item, index) {
          var position = '';
          if ((tab === 'active' || tab === 'all') && item.bucket === 'active' && summary.total) {
            position = (doneOffset + index + 1) + '/' + summary.total;
          } else if ((tab === 'waiting' || tab === 'all') && item.bucket === 'waiting' && item.queuePosition && summary.total) {
            position = (doneOffset + summary.active + (item.queuePosition - 1) + 1) + '/' + summary.total;
          }
          return renderActivityRow(item, { position: position });
        }).join('');
      }

      var tabs = el('activityTabs');
      if (tabs) {
        var counts = {
          active: (pipeline.active || []).length + (state.localOngoing ? 1 : 0),
          waiting: (pipeline.waiting || []).length,
          completed: (pipeline.completed || []).length,
          failed: (pipeline.failed || []).length,
        };
        counts.all = counts.active + counts.waiting + counts.completed + counts.failed;
        tabs.querySelectorAll('.activity-tab-btn').forEach(function (btn) {
          var key = btn.getAttribute('data-activity-tab');
          var labels = { all: 'All', active: 'Processing', waiting: 'Queue', completed: 'Done', failed: 'Failed' };
          var base = labels[key] || btn.textContent.split(' (')[0];
          btn.textContent = base + ' (' + (counts[key] || 0) + ')';
          btn.classList.toggle('active', key === tab);
        });
      }

      var statCards = el('activityStatCards');
      if (statCards) {
        statCards.querySelectorAll('.activity-stat').forEach(function (card) {
          card.classList.toggle('selected', card.getAttribute('data-activity-tab') === tab);
        });
      }
    }

    function renderActivityChrome() {
      var summary = pipelineSummary();
      var hasWork = pipelineHasWork();
      var badge = el('activityTopBadge');
      var badgeCount = activityBadgeCount();
      if (badge) {
        badge.hidden = !badgeCount;
        badge.textContent = String(badgeCount);
      }

      updateActivityNavMeta();

      var banner = el('activityBanner');
      if (banner) {
        if (!hasWork || !summary.total) {
          banner.hidden = true;
        } else {
          banner.hidden = false;
          el('activityBannerCount').textContent = summary.label || (summary.done + '/' + summary.total);
          el('activityBannerBar').style.width = (summary.progressPercent || 0) + '%';
          var activeTitle = (state.pipeline && state.pipeline.active && state.pipeline.active[0])
            ? state.pipeline.active[0].title
            : '';
          el('activityBannerTitle').textContent = summary.active
            ? ('Processing: ' + (activeTitle || 'YouTube video'))
            : (summary.waiting ? 'Import queued — waiting to start next video' : 'Import batch finishing');
          el('activityBannerFoot').textContent = summary.active + ' processing · '
            + summary.waiting + ' queued · '
            + summary.completed + ' done'
            + (summary.failed ? (' · ' + summary.failed + ' failed') : '');
        }
      }

      if (state.activityModalOpen) {
        var livePill = el('activityLivePill');
        if (livePill) livePill.hidden = !(summary.active || summary.waiting);

        el('activitySummaryLabel').textContent = summary.statusLabel
          || (summary.total ? 'Import in progress' : 'Pipeline idle');
        el('activitySummaryPercent').textContent = summary.total
          ? ((summary.progressPercent || 0) + '%')
          : '—';

        var statusDetail = el('activityStatusDetail');
        if (statusDetail) {
          if (summary.total) {
            var parts = [];
            if (summary.active) parts.push(summary.active + ' processing');
            if (summary.waiting) parts.push(summary.waiting + ' queued');
            if (summary.completed) parts.push(summary.completed + ' done');
            if (summary.failed) parts.push(summary.failed + ' failed');
            var detail = parts.join(' · ');
            if (summary.pipelineBusy && summary.waiting) {
              detail += '. Pipeline busy — next video starts when the current job finishes.';
            } else if (summary.waiting && !summary.active) {
              detail += '. Waiting to start the next video.';
            }
            statusDetail.textContent = detail;
          } else if (Number(state.queueCount) > 0) {
            statusDetail.textContent = state.queueCount + ' video(s) queued.';
          } else {
            statusDetail.textContent = 'Run an import from Settings → Run now to queue videos.';
          }
        }

        el('activitySummaryBar').style.width = (summary.progressPercent || 0) + '%';
        el('activityStatActive').textContent = String(summary.active || 0);
        el('activityStatWaiting').textContent = String(summary.waiting || Number(state.queueCount) || 0);
        el('activityStatDone').textContent = String(summary.completed || 0);
        el('activityStatFailed').textContent = String(summary.failed || 0);

        var refreshNote = el('activityRefreshNote');
        if (refreshNote) refreshNote.hidden = !(summary.active || summary.waiting);

        renderActivityList();
      }
    }

    function openActivityPanel(options) {
      options = options || {};
      hidePopup();
      state.activityModalOpen = true;
      el('activityModal').classList.add('show');
      el('activityModal').setAttribute('aria-hidden', 'false');
      syncPageScrollLock();
      if (options.tab) state.activityTab = options.tab;
      renderActivityChrome();
      pollOngoingTasks().then(function () {
        if (!options.tab) state.activityTab = pickDefaultActivityTab(pipelineSummary());
        renderActivityChrome();
      });
    }

    function closeActivityPanel() {
      state.activityModalOpen = false;
      el('activityModal').classList.remove('show');
      el('activityModal').setAttribute('aria-hidden', 'true');
      syncPageScrollLock();
    }

    function switchActivityTab(tab) {
      state.activityTab = tab || 'all';
      renderActivityList();
    }

    function renderOngoingTasks() {
      renderActivityChrome();
    }

    function syncOngoingPollTimer() {
      var summary = pipelineSummary();
      var count = ongoingTaskCount();
      var queueWaiting = summary.waiting || Number(state.queueCount) || 0;
      var hasBatch = summary.total > 0;
      if ((count > 0 || queueWaiting > 0 || hasBatch) && !state.ongoingPollTimer) {
        state.ongoingPollTimer = setInterval(function () {
          pollOngoingTasks();
        }, 4000);
      } else if (count === 0 && queueWaiting === 0 && !hasBatch && state.ongoingPollTimer) {
        clearInterval(state.ongoingPollTimer);
        state.ongoingPollTimer = null;
      }
    }

    function ongoingTaskCount() {
      return (state.serverOngoing || []).length + (state.localOngoing ? 1 : 0);
    }

    function pollOngoingTasks() {
      return fetchJson('/api/tasks/ongoing').then(function (data) {
        state.serverOngoing = Array.isArray(data.tasks) ? data.tasks : [];
        state.pipeline = data.pipeline || null;
        state.queueCount = Number((data.pipeline && data.pipeline.summary && data.pipeline.summary.waiting) || data.queueCount) || 0;
        state.autoPipelineEnabled = data.autoPipelineEnabled !== false;
        renderOngoingTasks();
        var summary = pipelineSummary();
        var count = ongoingTaskCount();
        var queueWaiting = summary.waiting || Number(state.queueCount) || 0;
        if (count === 0 && queueWaiting === 0 && summary.total === 0 && state.lastOngoingCount > 0) loadAllData();
        state.lastOngoingCount = Math.max(count + queueWaiting, summary.total || 0);
        syncOngoingPollTimer();
      }).catch(function () {
        renderOngoingTasks();
        syncOngoingPollTimer();
      });
    }

    function reanalyzeAll() {
      if (!window.confirm('Re-run AI analysis on every video with a saved transcript? This can take several minutes and uses OpenAI credits.')) return;
      el('reanalyzeAllBtn').disabled = true;
      setReanalyzeStatus('Loading videos with saved transcripts...', '');
      fetchJson('/api/analysis/reanalyze-targets').then(function (data) {
        var targets = Array.isArray(data.items) ? data.items : [];
        if (!targets.length) {
          setReanalyzeStatus('No completed transcripts found to re-analyze.', 'bad');
          el('reanalyzeAllBtn').disabled = false;
          return;
        }
        state.localOngoing = {
          kind: 'reanalyze',
          current: 0,
          total: targets.length,
          title: 'Preparing batch...',
          video_id: '',
        };
        renderOngoingTasks();
        syncOngoingPollTimer();
        var done = 0;
        var failed = 0;
        var lastError = '';
        function runNext(index) {
          if (index >= targets.length) {
            state.localOngoing = null;
            renderOngoingTasks();
            syncOngoingPollTimer();
            var summary = 'Finished: ' + done + ' analyzed, ' + failed + ' failed out of ' + targets.length + '.';
            if (failed && lastError) summary += ' Last error: ' + lastError;
            if (!failed) summary += ' Refreshing dashboard...';
            setReanalyzeStatus(summary, failed ? 'bad' : 'ok');
            el('reanalyzeAllBtn').disabled = false;
            return loadAllData();
          }
          var target = targets[index];
          state.localOngoing = {
            kind: 'reanalyze',
            current: index + 1,
            total: targets.length,
            title: target.title || target.video_id,
            video_id: target.video_id,
          };
          renderOngoingTasks();
          setReanalyzeStatus('Re-analyzing ' + (index + 1) + '/' + targets.length + ': ' + (target.title || target.video_id) + '...', '');
          return fetchJson('/api/analysis/run', {
            method: 'POST',
            headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
            body: JSON.stringify({ videoId: target.video_id, videoUrl: target.video_url, title: target.title }),
          }).then(function () {
            done += 1;
          }).catch(function (error) {
            failed += 1;
            lastError = error.message || String(error);
            console.error('Re-analyze failed for', target.video_id, error);
          }).then(function () {
            return runNext(index + 1);
          });
        }
        return runNext(0);
      }).catch(function (error) {
        state.localOngoing = null;
        renderOngoingTasks();
        syncOngoingPollTimer();
        setReanalyzeStatus('Could not start re-analysis: ' + error.message, 'bad');
        el('reanalyzeAllBtn').disabled = false;
      });
    }

    function focusDashboardOnVideo(videoId) {
      if (!videoId) return;
      var rows = filterRowsForVideo(videoId);
      if (!rows.length) return;
      state.selectedFruit = produceLabel(rows[0]) || state.selectedFruit;
      state.selectedGrade = '';
      state.selectedSize = '';
      state.selectedArea = '';
      var dates = rows.map(rowDate).filter(Boolean).sort();
      if (dates.length) {
        el('dateFrom').value = dates[0];
        el('dateTo').value = dates[dates.length - 1] || dates[0];
      }
      renderEverything();
    }

    function loadAllData() {
      el('refreshBtn').disabled = true;
      return Promise.all([
        fetchJson('/api/prices?limit=5000'),
        fetchJson('/api/analysis?limit=100').catch(function () { return { items: [] }; })
      ]).then(function (results) {
        state.priceRows = (Array.isArray(results[0].items) ? results[0].items : []).map(normalizeDisplayRow);
        state.analysisItems = Array.isArray(results[1].items) ? results[1].items : [];
        applyDefaultProduceSelection();
        applyDefaultDateRange();
        renderEverything();
      }).catch(function (error) {
        el('chartEmpty').classList.add('show');
        el('chartEmpty').textContent = 'Could not load data: ' + error.message;
      }).finally(function () {
        el('refreshBtn').disabled = false;
      });
    }

    function fetchYouTubeTitle(videoId) {
      return fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + videoId) + '&format=json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return (d && d.title) ? d.title : ''; })
        .catch(function () { return ''; });
    }

    function runAnalysisForVideo(videoUrl, title, transcriptData) {
      var id = extractVideoId(videoUrl);
      if (!id) return Promise.resolve(null);

      var needsTitle = !title || title === id || /^[\w-]{11}$/.test(title);
      var titlePromise = needsTitle ? fetchYouTubeTitle(id) : Promise.resolve(title);

      return titlePromise.then(function (resolvedTitle) {
        var finalTitle = resolvedTitle || title || id;
        var today = new Date().toISOString().slice(0, 10);
        setTranscriptStatus(DIRECT_API_BASE ? 'Transcript saved. Running AI market analysis on Railway...' : 'Transcript saved. Running AI price analysis...', '');
        setTranscriptProgress({
          percent: DIRECT_API_BASE ? 45 : 80,
          stage: DIRECT_API_BASE ? 'railway_analysis' : 'analyzing',
          message: DIRECT_API_BASE
            ? 'OpenAI is extracting price rows, summary, facts, guidance, learnings, and chapters.'
            : 'Worker is extracting price rows and market intelligence.',
          elapsed: '',
          attempt: ''
        });
        log((DIRECT_API_BASE ? 'Railway AI analysis' : 'AI analysis') + ' started for ' + id + ' — title: ' + finalTitle);
        var payload = { videoId: id, videoUrl: videoUrl, title: finalTitle, uploadDate: today };
        if (transcriptData && Array.isArray(transcriptData.segments)) {
          payload.segments = transcriptData.segments;
          payload.transcriptText = transcriptData.transcriptText || '';
        }
        return fetchJson('/api/analysis/run', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
        body: JSON.stringify(payload)
      }).then(function (data) {
        setTranscriptProgress({
          percent: 92,
          stage: DIRECT_API_BASE ? 'railway_save' : 'saving',
          message: 'Saving extracted rates and market intelligence for the dashboard.',
          elapsed: '',
          attempt: ''
        });
        log('AI analysis saved ' + data.priceRowCount + ' price row(s), '
          + ((data.meta && data.meta.learnings && data.meta.learnings.length) || 0) + ' learning(s), '
          + ((data.meta && data.meta.facts && data.meta.facts.length) || 0) + ' fact(s).');
        setTranscriptStatus('Done: transcript + ' + data.priceRowCount + ' price row(s) + market intelligence saved.', data.priceRowCount ? 'ok' : '');
        return loadAllData().then(function () {
          focusDashboardOnVideo(id);
          setTranscriptProgress({
            percent: 100,
            stage: 'analysis_complete',
            message: 'Rate List, All Data, summary, and learnings are refreshed.',
            elapsed: '',
            attempt: ''
          });
          return data;
        });
        }).catch(function (error) {
          log('ERROR: AI analysis failed — ' + (error.message || error));
          setTranscriptStatus(error.message || 'AI analysis failed.', 'bad');
          throw error;
        });
      });
    }

    function pollStoredTranscript(videoUrl, attemptsLeft, startedAt) {
      var id = extractVideoId(videoUrl);
      if (!id) return Promise.reject(new Error('Could not determine the YouTube video ID.'));
      var remaining = Number(attemptsLeft) || 90;
      var totalAttempts = 90;
      var pollStart = Number(startedAt) || Date.now();
      var attemptNumber = totalAttempts - remaining + 1;
      var delayMs = attemptNumber <= 12 ? 2000 : 5000;
      setTranscriptStatus('Background transcript in progress. Hetzner usually returns captions in under a minute.', '');
      return fetchJson('/api/transcripts/' + encodeURIComponent(id)).then(function (data) {
        var job = data.job || {};
        var status = job.status;
        var stage = job.stage || status || 'running';
        var count = Array.isArray(data.segments) ? data.segments.length : 0;
        var elapsed = formatElapsed(Date.now() - pollStart);
        var progress = effectiveTranscriptProgress(job, Date.now() - pollStart);
        var detail = job.message || 'Waiting for Hetzner to return the YouTube transcript.';
        setTranscriptProgress({
          percent: progress,
          stage: stage,
          message: detail,
          elapsed: elapsed + ' elapsed',
          attempt: 'check ' + attemptNumber + '/' + totalAttempts
        });
        if (stage !== state.lastPollStage) {
          state.lastPollStage = stage;
          log((TRANSCRIPT_STAGE_LABELS[stage] || stage) + ': ' + detail);
        }
        if (status === 'complete' && count) {
          if (stage === 'analyzing') {
            setTranscriptStatus('Transcript saved. Running AI price analysis on Worker...', 'ok');
            if (remaining <= 1) throw new Error('AI analysis is still running after ~7 minutes. Click Refresh data in a minute.');
            return new Promise(function (resolve) { setTimeout(resolve, delayMs); })
              .then(function () { return pollStoredTranscript(videoUrl, remaining - 1, pollStart); });
          }
          resetTranscriptProgress();
          renderTranscript(data);
          if (stage === 'analysis_complete') {
            log('Pipeline complete: ' + count + ' transcript line(s), ' + (job.priceRowCount || 'saved') + ' price row(s) in ' + elapsed + '.');
            setTranscriptStatus('Done: transcript + analysis saved. Rate List / All Data updated.', 'ok');
            return loadAllData().then(function () {
              focusDashboardOnVideo(id);
              return data;
            });
          }
          if (stage === 'analysis_failed') {
            log('ERROR: ' + (job.message || job.analysisError || 'AI analysis failed after transcript saved.'));
            setTranscriptStatus(job.message || 'AI analysis failed. Use Re-analyze all or run transcript again.', 'bad');
            return loadAllData().then(function () { return data; });
          }
          log('Background transcript completed with ' + count + ' segment(s) in ' + elapsed + '. Running AI analysis...');
          setTranscriptStatus('Transcript ready: ' + count + ' segment(s). Running AI analysis...', 'ok');
          return runAnalysisForVideo(videoUrl, id).then(function () {
            focusDashboardOnVideo(id);
            return data;
          });
        }
        if (status === 'empty') {
          resetTranscriptProgress();
          renderTranscript(data);
          throw new Error(job.message || 'Transcript finished but returned no lines.');
        }
        if (status === 'failed') {
          var failMsg = job.error || job.message || 'Background transcript failed.';
          throw new Error(failMsg);
        }
        if (remaining <= 1) throw new Error('Transcript is still processing after ~7 minutes. Try Load stored transcript in a minute.');
        return new Promise(function (resolve) { setTimeout(resolve, delayMs); })
          .then(function () { return pollStoredTranscript(videoUrl, remaining - 1, pollStart); });
      }).catch(function (error) {
        if (/Transcript not found/i.test(error.message) && remaining > 1) {
          var elapsed = formatElapsed(Date.now() - pollStart);
          setTranscriptProgress({
            percent: Math.min(40, 10 + attemptNumber),
            stage: 'queued',
            message: 'Job warming up. Retrying...',
            elapsed: elapsed + ' elapsed',
            attempt: 'check ' + attemptNumber + '/' + totalAttempts
          });
          return new Promise(function (resolve) { setTimeout(resolve, delayMs); })
            .then(function () { return pollStoredTranscript(videoUrl, remaining - 1, pollStart); });
        }
        resetTranscriptProgress();
        throw error;
      });
    }

    function buildSeries() {
      var groups = {};
      filteredChartRows().forEach(function (row) {
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
        renderChartLegend([]);
        el('chartEmpty').textContent = state.selectedFruit
          ? 'No price points for this produce in the selected date range.'
          : 'Choose a produce in Filters to see price trends.';
        el('chartEmpty').classList.add('show');
        return;
      }
      el('chartEmpty').classList.remove('show');
      renderChartLegend(series);
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
      var left = 72;
      var right = 28;
      var top = 28;
      var bottom = 52;
      var innerW = width - left - right;
      var innerH = height - top - bottom;
      var minY = Math.min.apply(null, values);
      var maxY = Math.max.apply(null, values);
      var range = maxY - minY;
      var pad = range ? range * 0.12 : Math.max(maxY * 0.1, 1);
      if (minY === maxY) {
        minY = Math.max(0, minY - 1);
        maxY += 1;
      } else {
        minY = Math.max(0, minY - pad);
        maxY += pad;
      }
      var baselineY = top + innerH;
      function x(date) {
        var index = Math.max(0, dates.indexOf(date));
        if (dates.length === 1) return left + innerW / 2;
        return left + (index / (dates.length - 1)) * innerW;
      }
      function y(value) {
        return top + innerH - ((value - minY) / (maxY - minY)) * innerH;
      }
      var html = '';
      for (var gi = 0; gi <= 5; gi += 1) {
        var gy = top + (innerH / 5) * gi;
        var gv = maxY - ((maxY - minY) / 5) * gi;
        html += '<line x1="' + left + '" y1="' + gy.toFixed(1) + '" x2="' + (width - right) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(0,0,0,0.08)" stroke-width="1"></line>';
        html += '<text x="12" y="' + (gy + 4).toFixed(1) + '" fill="#717171" font-size="12" font-weight="500">' + escapeHtml(money(gv)) + '</text>';
      }
      dates.forEach(function (date, index) {
        if (dates.length > 8 && index !== 0 && index !== dates.length - 1 && index % Math.ceil(dates.length / 6) !== 0) return;
        var tx = x(date);
        html += '<line x1="' + tx.toFixed(1) + '" y1="' + top + '" x2="' + tx.toFixed(1) + '" y2="' + baselineY.toFixed(1) + '" stroke="rgba(0,0,0,0.05)" stroke-width="1"></line>';
        html += '<text x="' + tx.toFixed(1) + '" y="' + (height - 18) + '" fill="#717171" font-size="12" font-weight="500" text-anchor="middle">' + escapeHtml(formatChartDateLabel(date)) + '</text>';
      });
      series.forEach(function (item, index) {
        var color = state.colors[index % state.colors.length];
        var coords = item.points.map(function (point) {
          return { x: x(point.date), y: y(point.value) };
        });
        html += '<path d="' + smoothAreaPath(coords, baselineY) + '" fill="' + color + '" fill-opacity="0.18" stroke="none"></path>';
        html += '<path d="' + smoothLinePath(coords) + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>';
        item.points.forEach(function (point) {
          var pointIndex = state.pointRows.length;
          state.pointRows.push({ row: point.row, value: point.value, date: point.date, key: item.key });
          var cx = x(point.date).toFixed(1);
          var cy = y(point.value).toFixed(1);
          html += '<circle data-point="' + pointIndex + '" cx="' + cx + '" cy="' + cy + '" r="5.5" fill="#ffffff" stroke="' + color + '" stroke-width="2.5" style="cursor:pointer"></circle>';
        });
      });
      svg.innerHTML = html;
      svg.querySelectorAll('[data-point]').forEach(function (circle) {
        circle.addEventListener('click', function (event) {
          showPointPopup(Number(circle.getAttribute('data-point')), event);
        });
      });
    }

    function formatChartDateLabel(date) {
      if (!date) return '';
      var parts = String(date).split('-');
      if (parts.length !== 3) return date.slice(5);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var month = months[Number(parts[1]) - 1] || parts[1];
      return month + ' ' + Number(parts[2]);
    }

    function positionChartPopup(event) {
      var popup = el('chartPopup');
      var margin = 12;
      popup.classList.add('show');
      var rect = popup.getBoundingClientRect();
      var width = rect.width || Math.min(350, window.innerWidth - margin * 2);
      var height = rect.height || 320;
      var left = Math.min(Math.max((event.clientX || 0) + margin, margin), window.innerWidth - width - margin);
      var top = Math.min(Math.max((event.clientY || 0) + margin, margin), window.innerHeight - height - margin);
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    }

    function showPointPopup(index, event) {
      var item = state.pointRows[index];
      if (!item) return;
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      var row = item.row || {};
      el('popupTitle').textContent = produceDisplayLabel(row) + ' · ' + rowDisplayLabel(normalizeDisplayRow(row));
      el('popupTime').textContent = (rowDate(row) || 'Unknown date') + ' · ' + (row.timestamp_label || secondsToClock(row.timestamp_seconds)) + ' · ' + areaLabel(row);
      el('popupVideoTitle').textContent = row.video_title || 'YouTube source';
      el('popupPrice').textContent = rateRange(row);
      el('popupNote').textContent = row.clean_english_line || row.clean_hindi_line || row.context || row.price_notes || row.original_line || 'No transcript context saved for this point.';
      el('popupConfidence').textContent = 'Confidence: ' + confidenceLabel(row) + ' · ' + item.key;
      el('popupLink').textContent = '▶ Play from ' + (row.timestamp_label || secondsToClock(row.timestamp_seconds));
      el('popupLink').setAttribute('data-video-id', rowVideoId(row));
      el('popupLink').setAttribute('data-seconds', String(Number(row.timestamp_seconds) || 0));
      positionChartPopup(event || { clientX: window.innerWidth / 2, clientY: window.innerHeight / 3 });
      syncPageScrollLock();
    }

    function hidePopup() {
      var popup = el('chartPopup');
      if (!popup.classList.contains('show')) return;
      popup.classList.remove('show');
      popup.style.left = '';
      popup.style.top = '';
      syncPageScrollLock();
    }

    function rateComboKey(row) {
      return [produceLabel(row), row.variety || '', gradeLabel(row), sizeLabel(row), areaLabel(row), row.unit || ''].join('|');
    }

    function pickLatestRow(rows) {
      return rows.slice().sort(function (a, b) {
        return String(rowDate(b)).localeCompare(String(rowDate(a)))
          || Number(b.timestamp_seconds || 0) - Number(a.timestamp_seconds || 0);
      })[0];
    }

    function buildLatestRateRows(rows) {
      var groups = {};
      rows.forEach(function (row) {
        var key = rateComboKey(row);
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      return Object.keys(groups).map(function (key) {
        return pickLatestRow(groups[key]);
      });
    }

    function groupRateListByFruit(rows) {
      var byFruit = {};
      rows.forEach(function (row) {
        var fruit = produceLabel(row);
        if (!byFruit[fruit]) byFruit[fruit] = [];
        byFruit[fruit].push(row);
      });
      return Object.keys(byFruit).map(function (fruit) {
        var fruitRows = byFruit[fruit];
        var latestDate = fruitRows.reduce(function (best, row) {
          var d = rowDate(row) || '';
          return d > best ? d : best;
        }, '');
        var sortedRows = fruitRows.slice().sort(function (a, b) {
          return gradeSortKey(gradeLabel(a)) - gradeSortKey(gradeLabel(b))
            || String(a.variety || '').localeCompare(String(b.variety || ''))
            || sizeLabel(a).localeCompare(sizeLabel(b));
        });
        return {
          fruit: fruit,
          rows: sortedRows,
          latestDate: latestDate,
          lastUpdate: latestDate ? formatTallyDate({ market_date_sort: latestDate }) : 'Unknown',
          rateCount: dedupeRateRows(sortedRows).length,
        };
      }).sort(function (a, b) {
        return String(b.latestDate).localeCompare(String(a.latestDate)) || a.fruit.localeCompare(b.fruit);
      });
    }

    function renderRateList() {
      var q = el('rateSearch').value.trim().toLowerCase();
      var sourceRows = filteredRateListRows().filter(function (row) {
        if (!q) return true;
        return [produceLabel(row), row.variety, gradeLabel(row), sizeLabel(row), areaLabel(row), row.party_name, row.video_title, row.price_notes, row.context].join(' ').toLowerCase().indexOf(q) >= 0;
      });
      if (!sourceRows.length) {
        el('rateListContent').innerHTML = '<div class="empty-list">No rate rows match the current date range.</div>';
        return;
      }
      var groups = groupRateListByFruit(sourceRows);
      el('rateListContent').innerHTML = groups.map(function (fruitGroup) {
        return '<div class="market-fruit-section">'
          + produceHeadingHtml(
            fruitGroup.fruit,
            fruitGroup.rateCount + ' rate' + (fruitGroup.rateCount === 1 ? '' : 's'),
            fruitGroup.lastUpdate
          )
          + '<div class="market-grade-list">' + renderOrganizedGradeRows(fruitGroup.rows) + '</div>'
          + '</div>';
      }).join('');
    }

    function renderAllData() {
      var q = el('dataSearch').value.trim().toLowerCase();
      var rows = filteredAllDataRows().filter(function (row) {
        if (!q) return true;
        return [produceLabel(row), row.variety, gradeLabel(row), sizeLabel(row), areaLabel(row), row.party_name, row.price_notes, row.context, row.clean_hindi_line, row.video_title].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) {
        return String(rowDate(b)).localeCompare(String(rowDate(a))) || Number(a.timestamp_seconds || 0) - Number(b.timestamp_seconds || 0);
      }).slice(0, 500);
      if (!rows.length) {
        el('allDataBody').innerHTML = '<tr><td colspan="9"><div class="empty-list">No extracted rows match the current date range.</div></td></tr>';
        return;
      }
      el('allDataBody').innerHTML = rows.map(function (row) {
        var videoId = rowVideoId(row);
        var proofSeconds = Number(row.timestamp_seconds) || 0;
        return '<tr>'
          + tableVideoThumbCell(videoId)
          + '<td>' + escapeHtml(formatTallyDate(row)) + '</td>'
          + '<td>' + produceCellHtml(row) + '</td>'
          + '<td>' + escapeHtml(gradeLabel(row)) + '</td>'
          + '<td>' + escapeHtml(sizeLabel(row)) + '</td>'
          + '<td>' + escapeHtml(areaLabel(row)) + '</td>'
          + '<td>' + escapeHtml(row.party_name || '') + '</td>'
          + '<td class="rate-price">' + escapeHtml(rateRange(row)) + '</td>'
          + '<td><button type="button" class="table-timestamp-link app-jump" data-video-id="' + escapeHtml(videoId) + '" data-seconds="' + proofSeconds + '">' + escapeHtml(row.timestamp_label || secondsToClock(row.timestamp_seconds)) + '</button></td>'
          + '</tr>';
      }).join('');
    }


    var KRISHI_PLACEHOLDER_EXPORTERS = [
      { name: 'Export desk listings', note: 'Verified exporter profiles with produce focus, ports, and contact routes.', tag: 'Coming soon' },
      { name: 'Packhouse network', note: 'Sorting, grading, and export-ready packing for fruits and vegetables.', tag: 'Coming soon' },
    ];

    var KRISHI_PLACEHOLDER_TRANSPORT = [
      { name: 'Mandi pickup & line-haul', note: 'Refrigerated and dry trucks from Azadpur-style mandis to city hubs.', tag: 'Coming soon' },
      { name: 'Cold storage partners', note: 'Short-stay cold rooms and hub storage for perishable loads.', tag: 'Coming soon' },
    ];

    function switchAppView(view) {
      view = view || 'mandi';
      state.appView = view;
      document.querySelectorAll('.app-nav-btn, .app-tabbar-btn').forEach(function (btn) {
        var active = btn.getAttribute('data-app-view') === view;
        btn.classList.toggle('active', active);
        if (active) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      });
      document.querySelectorAll('.app-view').forEach(function (panel) {
        panel.classList.toggle('active', panel.getAttribute('data-app-view') === view);
      });
      if (location.hash.replace('#', '') !== view) {
        try { history.replaceState(null, '', '#' + view); } catch (e) {}
      }
      hidePopup();
    }

    function renderMandiHero() {
      var listRows = filteredRateListRows().filter(function (row) { return priceValue(row) != null; });
      var produceCount = uniqueValues(listRows, produceLabel).length;
      var titleNode = el('mandiHeroTitle');
      var dateNode = el('mandiHeroDate');
      var countNode = el('mandiHeroCount');
      if (!titleNode) return;
      titleNode.textContent = "Today's wholesale rates";
      if (listRows.length) {
        var range = chartDateRangeLabel();
        dateNode.textContent = (range ? range + ' · ' : '') + 'Latest mandi rates for every tracked produce';
        if (countNode) countNode.textContent = String(produceCount);
      } else {
        dateNode.textContent = 'No rates loaded yet. Tap Refresh to pull the latest mandi data.';
        if (countNode) countNode.textContent = '0';
      }
    }

    function renderNewsFeed() {
      var node = el('newsFeed');
      if (!node) return;
      var items = [];
      (state.analysisItems || []).forEach(function (item) {
        var meta = item.meta || {};
        var title = meta.video_title || item.video_id || 'Mandi video';
        var date = meta.market_date || meta.market_date_sort || '';
        ['facts', 'guidance', 'learnings', 'key_takeaways'].forEach(function (bucket) {
          (Array.isArray(meta[bucket]) ? meta[bucket] : []).forEach(function (entry) {
            var text = entry.text_english || entry.text_hinglish || entry.title || entry.summary || '';
            if (!text) return;
            items.push({
              title: entry.title || (bucket === 'guidance' ? 'Trade guidance' : bucket === 'facts' ? 'Market fact' : 'Market learning'),
              body: text,
              date: date,
              videoTitle: title,
              videoId: item.video_id || meta.video_id,
              bucket: bucket,
            });
          });
        });
      });
      items.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      if (!items.length) {
        node.innerHTML = '<div class="krishi-empty">No market news yet. Run analysis on mandi videos — facts, guidance, and learnings will appear here.</div>';
        return;
      }
      node.innerHTML = items.slice(0, 48).map(function (item) {
        return '<article class="krishi-card">'
          + '<div class="krishi-card-top"><h3>' + escapeHtml(item.title) + '</h3><span class="krishi-pill">' + escapeHtml(item.bucket) + '</span></div>'
          + '<div class="krishi-card-body">' + escapeHtml(item.body.slice(0, 260)) + (item.body.length > 260 ? '…' : '') + '</div>'
          + '<div class="krishi-card-meta">' + escapeHtml([item.date, item.videoTitle].filter(Boolean).join(' · ')) + '</div>'
          + (item.videoId ? '<button type="button" class="text-btn rich-video-btn" data-video-id="' + escapeHtml(item.videoId) + '">Open video report →</button>' : '')
          + '</article>';
      }).join('');
    }

    function renderAadthiDirectory() {
      var node = el('aadthiDirectory');
      if (!node) return;
      var parties = {};
      filteredByDate(state.priceRows).forEach(function (row) {
        var name = String(row.party_name || '').trim()
          .replace(/\bRana\s*Ji\b/ig, '')
          .replace(/\bRana\b/ig, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (!name) return;
        if (!parties[name]) parties[name] = { areas: {}, produce: {}, count: 0 };
        parties[name].count += 1;
        if (areaLabel(row)) parties[name].areas[areaLabel(row)] = true;
        if (produceLabel(row)) parties[name].produce[produceLabel(row)] = true;
      });
      var list = Object.keys(parties).sort(function (a, b) { return parties[b].count - parties[a].count || a.localeCompare(b); });
      if (!list.length) {
        node.innerHTML = '<div class="krishi-empty">No wholesaler names extracted yet. Party names appear when transcripts mention traders during rate calls.</div>';
        return;
      }
      node.innerHTML = list.slice(0, 80).map(function (name) {
        var entry = parties[name];
        var meta = Object.keys(entry.produce).slice(0, 4).map(produceDisplayLabel).join(', ');
        var areas = Object.keys(entry.areas).slice(0, 3).join(', ');
        return '<div class="krishi-directory-row"><div><strong>' + escapeHtml(name) + '</strong><br><span>' + escapeHtml([meta, areas].filter(Boolean).join(' · ')) + '</span></div><span class="krishi-pill">' + entry.count + ' mention' + (entry.count === 1 ? '' : 's') + '</span></div>';
      }).join('');
    }

    function renderPlaceholderCards(nodeId, items) {
      var node = el(nodeId);
      if (!node) return;
      node.innerHTML = items.map(function (item) {
        return '<article class="krishi-card"><div class="krishi-card-top"><h3>' + escapeHtml(item.name) + '</h3><span class="krishi-pill">' + escapeHtml(item.tag) + '</span></div><div class="krishi-card-body">' + escapeHtml(item.note) + '</div></article>';
      }).join('') + '<div class="krishi-empty" style="grid-column:1/-1;">Want your business listed? Contact the Krishi Kal team to add verified exporter and transport profiles.</div>';
    }

    function renderKrishiSections() {
      renderMandiHero();
      renderNewsFeed();
      renderAadthiDirectory();
      renderPlaceholderCards('exportersDirectory', KRISHI_PLACEHOLDER_EXPORTERS);
      renderPlaceholderCards('transportDirectory', KRISHI_PLACEHOLDER_TRANSPORT);
    }

    function initAppViewFromHash() {
      var hash = (location.hash || '').replace('#', '').trim();
      var allowed = ['mandi', 'news', 'aadthi', 'exporters', 'transport'];
      switchAppView(allowed.indexOf(hash) >= 0 ? hash : 'mandi');
    }

    function renderEverything() {
      renderChartFilters();
      updateChartFilterSummary();
      state.filteredRows = filteredChartRows();
      drawChart();
      renderRateList();
      renderAllData();
      renderAnalysisCards();
      renderKrishiSections();
    }

    function metaList(items, limit) {
      return (Array.isArray(items) ? items : []).filter(Boolean).slice(0, limit || 8);
    }

    function itemText(item) {
      if (!item) return '';
      if (typeof item === 'string') return item;
      return item.text_english || item.text_hinglish || item.title || item.summary || '';
    }

    function truncateText(text, max) {
      text = String(text || '').trim();
      if (!text || text.length <= max) return text;
      return text.slice(0, max).trim() + '…';
    }

    function dedupeSummaryText(text) {
      text = String(text || '').trim();
      if (!text) return '';
      var parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      var seen = {};
      var out = [];
      parts.forEach(function (part) {
        var sentence = part.trim();
        if (!sentence) return;
        var key = sentence.toLowerCase().replace(/\s+/g, ' ');
        if (seen[key]) return;
        seen[key] = true;
        out.push(sentence);
      });
      return out.join(' ');
    }

    function looksLikeYoutubeId(value) {
      return /^[a-zA-Z0-9_-]{11}$/.test(String(value || '').trim());
    }

    function isPlaceholderRichTitle(value) {
      var lower = String(value || '').trim().toLowerCase();
      return !lower
        || lower === 'test'
        || lower === 'rich video'
        || lower === 'loading…'
        || lower === 'loading...'
        || lower === 'market video report';
    }

    function pickHumanTitle(value) {
      var text = String(value || '').trim();
      if (!text || looksLikeYoutubeId(text) || isPlaceholderRichTitle(text)) return '';
      return text;
    }

    function titleFromPriceRows(videoId) {
      if (!videoId || !state.priceRows || !state.priceRows.length) return '';
      for (var i = 0; i < state.priceRows.length; i++) {
        var row = state.priceRows[i];
        var rowId = row.video_id || extractVideoId(row.video_url);
        if (rowId === videoId) {
          var picked = pickHumanTitle(row.video_title);
          if (picked) return picked;
        }
      }
      return '';
    }

    function titleFromAnalysisItems(videoId) {
      if (!videoId || !state.analysisItems || !state.analysisItems.length) return '';
      for (var i = 0; i < state.analysisItems.length; i++) {
        var entry = state.analysisItems[i];
        var entryId = entry.video_id || (entry.meta && entry.meta.video_id);
        if (entryId !== videoId) continue;
        var fromMeta = pickHumanTitle(entry.meta && entry.meta.video_title)
          || pickHumanTitle(entry.meta && entry.meta.title);
        if (fromMeta) return fromMeta;
        var fromItem = pickHumanTitle(entry.video_title) || pickHumanTitle(entry.title);
        if (fromItem) return fromItem;
      }
      return '';
    }

    function resolveRichVideoTitle(meta, item, rows, videoId) {
      meta = meta || {};
      item = item || {};
      rows = rows || [];
      videoId = String(videoId || '').trim();

      var candidates = [
        meta.video_title,
        meta.title,
        item.video_title,
        item.title,
        item.meta && item.meta.video_title,
        item.meta && item.meta.title,
        titleFromAnalysisItems(videoId),
        titleFromPriceRows(videoId)
      ];

      for (var i = 0; i < rows.length; i++) {
        candidates.push(rows[i].video_title);
      }

      for (var c = 0; c < candidates.length; c++) {
        var picked = pickHumanTitle(candidates[c]);
        if (picked) return picked;
      }

      var fallback = primaryProduceLabel(meta, rows);
      if (fallback && !looksLikeYoutubeId(fallback)) return fallback;

      return 'Market video report';
    }

    var HINDI_MONTH_TO_NUM = {
      'जनवरी': '01', 'जन': '01',
      'फरवरी': '02', 'फ़रवरी': '02', 'फर': '02',
      'मार्च': '03', 'मार': '03',
      'अप्रैल': '04', 'अप': '04',
      'मई': '05',
      'जून': '06',
      'जुलाई': '07', 'जुल': '07',
      'अगस्त': '08', 'अग': '08',
      'सितंबर': '09', 'सितम्बर': '09', 'सित': '09',
      'अक्टूबर': '10', 'अक्टबर': '10', 'अक्ट': '10',
      'नवंबर': '11', 'नवम्बर': '11', 'नव': '11',
      'दिसंबर': '12', 'दिसम्बर': '12', 'दिस': '12'
    };

    var ENGLISH_MONTH_TO_NUM = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12'
    };

    function isoDateParts(year, month, day) {
      if (!year || !month || !day) return '';
      return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }

    function parseMarketDateFromTitle(title) {
      title = String(title || '').trim();
      if (!title) return '';

      var iso = title.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
      if (iso) return iso[0];

      var dmy = title.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
      if (dmy) return isoDateParts(dmy[3], dmy[2], dmy[1]);

      var hindi = title.match(/(\d{1,2})\s*([^\d\s]{2,12})\s*(20\d{2})/);
      if (hindi) {
        var hindiMonth = HINDI_MONTH_TO_NUM[hindi[2].replace(/\s+/g, '')] || HINDI_MONTH_TO_NUM[hindi[2]];
        if (hindiMonth) return isoDateParts(hindi[3], hindiMonth, hindi[1]);
      }

      var enDayFirst = title.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/);
      if (enDayFirst) {
        var monthNum = ENGLISH_MONTH_TO_NUM[enDayFirst[2].toLowerCase()];
        if (monthNum) return isoDateParts(enDayFirst[3], monthNum, enDayFirst[1]);
      }

      var enMonthFirst = title.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
      if (enMonthFirst) {
        var monthNumAlt = ENGLISH_MONTH_TO_NUM[enMonthFirst[1].toLowerCase()];
        if (monthNumAlt) return isoDateParts(enMonthFirst[3], monthNumAlt, enMonthFirst[2]);
      }

      return '';
    }

    function latestUploadDate(rows, meta, item) {
      var dates = [];
      (rows || []).forEach(function (row) {
        var upload = String(row.upload_date || '').slice(0, 10);
        if (upload) dates.push(upload);
      });
      dates.sort().reverse();
      if (dates[0]) return dates[0];
      return String((meta && meta.upload_date) || (item && item.upload_date) || '').slice(0, 10);
    }

    function collectVideoTitleCandidatesForDate(meta, item, rows, videoId) {
      meta = meta || {};
      item = item || {};
      rows = rows || [];
      videoId = String(videoId || '').trim();

      var candidates = [
        state.richVideoOembedTitle[videoId],
        meta.video_title,
        meta.title,
        item.video_title,
        item.title,
        item.meta && item.meta.video_title,
        item.meta && item.meta.title,
        titleFromAnalysisItems(videoId),
        titleFromPriceRows(videoId)
      ];

      for (var i = 0; i < rows.length; i++) candidates.push(rows[i].video_title);

      var out = [];
      var seen = {};
      for (var c = 0; c < candidates.length; c++) {
        var text = String(candidates[c] || '').trim();
        if (!text || seen[text]) continue;
        if (looksLikeYoutubeId(text)) continue;
        seen[text] = true;
        out.push(text);
      }
      return out;
    }

    function resolveRichVideoDate(meta, item, rows, videoId) {
      meta = meta || {};
      item = item || {};
      rows = rows || [];
      videoId = String(videoId || '').trim();

      if (state.richVideoParsedDate[videoId]) {
        return state.richVideoParsedDate[videoId];
      }

      var titleCandidates = collectVideoTitleCandidatesForDate(meta, item, rows, videoId);
      for (var t = 0; t < titleCandidates.length; t++) {
        var parsed = parseMarketDateFromTitle(titleCandidates[t]);
        if (parsed) return parsed;
      }

      var uploadDate = latestUploadDate(rows, meta, item);
      if (uploadDate) return uploadDate;

      if (shouldEnrichRichVideoTitle(videoId, meta, item, rows)) {
        return '';
      }

      var stored = String(meta.market_date || item.market_date || meta.market_date_sort || item.market_date_sort || '').slice(0, 10);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;

      var latestRow = rows.length ? pickLatestRow(rows) : null;
      var latestRowDate = latestRow ? rowDate(latestRow) : '';
      if (latestRowDate) return latestRowDate;

      return '';
    }

    function setRichModalDate(meta, item, rows, videoId) {
      var marketDate = resolveRichVideoDate(meta, item, rows, videoId);
      el('videoModalDate').textContent = marketDate
        ? formatTallyDate({ market_date_sort: marketDate, market_date: marketDate, upload_date: marketDate })
        : 'Date unavailable';
      return marketDate;
    }

    function shouldEnrichRichVideoTitle(videoId, meta, item, rows) {
      if (!videoId) return false;
      if (state.richVideoOembedTitle[videoId]) return false;
      var candidates = collectVideoTitleCandidatesForDate(meta, item, rows, videoId);
      for (var i = 0; i < candidates.length; i++) {
        if (parseMarketDateFromTitle(candidates[i])) return false;
      }
      return true;
    }

    function applyRichVideoDateFromTitle(title, videoId) {
      videoId = String(videoId || state.richVideoId || '').trim();
      if (!videoId) return false;
      var parsedDate = parseMarketDateFromTitle(title);
      if (!parsedDate) return false;
      state.richVideoOembedTitle[videoId] = String(title || '').trim();
      state.richVideoParsedDate[videoId] = parsedDate;
      if (videoId === state.richVideoId) {
        el('videoModalDate').textContent = formatTallyDate({
          market_date_sort: parsedDate,
          market_date: parsedDate,
          upload_date: parsedDate
        });
      }
      return true;
    }

    function enrichRichVideoTitle(videoId, meta, item, rows) {
      if (!videoId || !shouldEnrichRichVideoTitle(videoId, meta, item, rows)) return;
      fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + videoId) + '&format=json')
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
          if (!data || state.richVideoId !== videoId) return;
          applyRichVideoDateFromTitle(data.title || '', videoId);
        })
        .catch(function () {});
    }

    function updateRichSummaryToggle() {
      var wrap = el('richSummaryWrap');
      var toggle = el('richSummaryToggle');
      var summary = el('richSummary');
      if (!wrap || !toggle || !summary) return;
      wrap.classList.add('collapsed');
      var text = summary.textContent.trim();
      toggle.hidden = text.length < 220;
      toggle.textContent = 'Read more';
    }

    function renderRichStatPills(rows, intel) {
      var pills = [];
      if (rows.length) pills.push('<span class="rich-stat-pill">' + rows.length + ' rate' + (rows.length === 1 ? '' : 's') + '</span>');
      if (intel.mentions.length) pills.push('<span class="rich-stat-pill">' + intel.mentions.length + ' mention' + (intel.mentions.length === 1 ? '' : 's') + '</span>');
      var intelCount = intel.facts.length + intel.guidance.length + intel.learnings.length;
      if (intelCount) pills.push('<span class="rich-stat-pill">' + intelCount + ' intel note' + (intelCount === 1 ? '' : 's') + '</span>');
      el('richStats').innerHTML = pills.join('');
    }

    function mentionCardTitle(item) {
      var parts = [produceDisplayLabel(item.fruit_label || ''), item.variety || item.quality_grade].filter(Boolean);
      var rate = '';
      if (item.min_price_inr || item.max_price_inr) {
        rate = money(item.min_price_inr || item.max_price_inr)
          + (item.max_price_inr && item.max_price_inr !== item.min_price_inr ? ' - ' + money(item.max_price_inr) : '')
          + (displayRateUnit(item.unit) ? ' / ' + displayRateUnit(item.unit) : '');
      }
      if (rate) parts.push(rate);
      return parts.join(' · ') || item.title || 'Price mention';
    }

    function switchRichTab(name) {
      document.querySelectorAll('.rich-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-rich-tab') === name);
      });
      document.querySelectorAll('.rich-tab-panel').forEach(function (panel) {
        panel.classList.toggle('active', panel.getAttribute('data-rich-panel') === name);
      });
    }

    function renderMetaCards(items, videoId, limit) {
      return items.slice(0, limit || items.length).map(function (item) {
        var seconds = Number(item.timestamp_seconds) || 0;
        return '<button type="button" class="small-chip warn app-jump" data-video-id="' + escapeHtml(videoId) + '" data-seconds="' + seconds + '">▶ ' + escapeHtml(secondsToClock(seconds) + ' · ' + itemText(item).slice(0, 110)) + '</button>';
      }).join('');
    }

    function metaListAll(items) {
      return (Array.isArray(items) ? items : []).filter(Boolean);
    }

    function dedupeIntel(items) {
      var seen = {};
      return items.filter(function (item) {
        var text = itemText(item).toLowerCase();
        if (!text) return false;
        var key = String(item.timestamp_seconds || 0) + '|' + text.slice(0, 96);
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      }).sort(function (a, b) {
        return (Number(a.timestamp_seconds) || 0) - (Number(b.timestamp_seconds) || 0);
      });
    }

    function buildVideoIntel(meta, rows) {
      meta = meta || {};
      rows = rows || [];
      var facts = metaListAll(meta.facts);
      var guidance = metaListAll(meta.guidance);
      var learnings = metaListAll(meta.learnings || meta.key_takeaways);
      var mentions = metaListAll(meta.price_mentions);
      var chapters = metaListAll(meta.chapters);

      metaListAll(meta.transcript_highlights).forEach(function (item) {
        if (item.importance && item.importance !== 'transcript' && itemText(item)) learnings.push(item);
      });

      mentions.forEach(function (mention) {
        if (!mention.min_price_inr && !mention.max_price_inr && itemText(mention)) {
          facts.push(Object.assign({}, mention, { title: mention.title || 'Market mention' }));
        }
      });

      rows.forEach(function (row) {
        mentions.push({
          fruit_label: produceLabel(row),
          variety: row.variety || '',
          quality_grade: row.quality_grade || gradeLabel(row),
          min_price_inr: row.min_price_inr,
          max_price_inr: row.max_price_inr,
          unit: row.unit,
          timestamp_seconds: row.timestamp_seconds,
          text_english: row.clean_english_line || row.context || row.price_notes,
          text_hinglish: row.clean_hindi_line || row.original_line,
          confidence: row.confidence,
        });
      });

      metaListAll(meta.grouped_produce).forEach(function (group) {
        var ts = Array.isArray(group.timestamps) && group.timestamps.length ? group.timestamps[0] : 0;
        var range = group.min_price_inr || group.max_price_inr
          ? money(group.min_price_inr || group.max_price_inr) + (group.max_price_inr && group.max_price_inr !== group.min_price_inr ? ' - ' + money(group.max_price_inr) : '')
          : '';
        learnings.push({
          timestamp_seconds: ts,
          title: (group.fruit_label || 'Produce') + ' summary',
          text_english: (group.mention_count || 0) + ' mentions' + (range ? (' · ' + range) : ''),
          text_hinglish: '',
          importance: 'medium',
        });
      });

      return {
        facts: dedupeIntel(facts),
        guidance: dedupeIntel(guidance),
        learnings: dedupeIntel(learnings),
        mentions: dedupeIntel(mentions),
        chapters: dedupeIntel(chapters),
      };
    }

    function renderRichIntelCards(container, items, emptyText, kind) {
      if (!items.length) {
        container.innerHTML = '<div class="rich-intel-empty">' + escapeHtml(emptyText) + '</div>';
        return;
      }
      container.innerHTML = items.map(function (item) {
        var seconds = Number(item.timestamp_seconds) || 0;
        var title = kind === 'mention' ? mentionCardTitle(item) : (item.title || item.fruit_label || 'Note');
        var body = '';
        if (kind === 'mention') {
          body = item.text_english || '';
        } else {
          body = itemText(item);
        }
        if (body && body.toLowerCase() === String(title).toLowerCase()) body = '';
        var cardClass = 'rich-intel-card rich-jump' + (kind === 'mention' ? ' mention-card' : '');
        var bodyHtml = body ? '<span>' + escapeHtml(truncateText(body, kind === 'mention' ? 120 : 180)) + '</span>' : '';
        return '<button type="button" class="' + cardClass + '" data-seconds="' + seconds + '"><strong>▶ ' + escapeHtml(secondsToClock(seconds) + ' · ' + title) + '</strong>' + bodyHtml + '</button>';
      }).join('');
    }

    function renderRichRatesTable(rows, url, expectedVideoId) {
      var container = el('richRatesBody');
      if (!container) return;
      var videoId = expectedVideoId || state.richVideoId || '';
      rows = (rows || []).filter(function (row) {
        return rowVideoId(row) === videoId;
      });
      if (!rows.length) {
        container.innerHTML = '<div class="rich-intel-empty">No saved rate rows for this video yet.</div>';
        return;
      }
      container.innerHTML = dedupeRateRows(rows).slice().sort(function (a, b) {
        return produceLabel(a.row).localeCompare(produceLabel(b.row))
          || gradeSortKey(gradeLabel(a.row)) - gradeSortKey(gradeLabel(b.row))
          || sizeLabel(a.row).localeCompare(sizeLabel(b.row))
          || (a.proofs[0] ? a.proofs[0].seconds : 0) - (b.proofs[0] ? b.proofs[0].seconds : 0);
      }).map(function (group) {
        var row = group.row;
        var fruit = produceDisplayLabel(produceLabel(row));
        var detail = rowDisplayLabel(row);
        var proofs = group.proofs.map(function (proof) {
          return { seconds: proof.seconds, label: proof.label, videoId: videoId || proof.videoId };
        });
        return '<div class="rich-rate-row">'
          + '<div class="rich-rate-thumb">' + produceThumbHtml(row, 'produce-thumb-sm') + '</div>'
          + '<div class="rich-rate-copy">'
          + '<span class="rich-rate-fruit">' + escapeHtml(fruit) + '</span>'
          + '<span class="rich-rate-detail">' + escapeHtml(detail) + '</span>'
          + '</div>'
          + '<strong class="rich-rate-price">' + escapeHtml(rateRange(row)) + '</strong>'
          + renderProofChips(proofs, { chipClass: 'rich-proof-btn rich-jump', wrapClass: 'rich-proof-chips' })
          + '</div>';
      }).join('');
    }

    function primaryProduceLabel(meta, rows) {
      if (Array.isArray(meta.produce) && meta.produce[0]) return meta.produce[0];
      if (rows[0]) return produceLabel(rows[0]);
      return 'Market report';
    }

    function marketLocationLabel(meta, rows) {
      var areas = metaListAll(meta.areas).concat(metaListAll(meta.mandi_names));
      if (areas.length) return areas.slice(0, 2).join(' · ');
      if (rows[0]) return areaLabel(rows[0]);
      return 'Delhi mandi';
    }

    function extractArrivalNote(intel) {
      var pool = metaListAll(intel.facts).concat(metaListAll(intel.learnings)).concat(metaListAll(intel.guidance));
      for (var i = 0; i < pool.length; i++) {
        var text = itemText(pool[i]);
        if (/(गाड़ी|gadi|truck|लोड|load|arrival|पचास|पच्पन|record)/i.test(text)) {
          return text.slice(0, 160);
        }
      }
      return '';
    }

    function extractMarketStatusNote(intel, meta) {
      var pool = metaListAll(intel.learnings).concat(metaListAll(intel.guidance)).concat(metaListAll(intel.facts));
      for (var i = 0; i < pool.length; i++) {
        var text = itemText(pool[i]);
        if (/(बाजार|market|रेट|rate|भाव|weather|बारिश|rain|season|सीजन|supply|demand|माँग|quality|क्वालिटी|सुधार|डाउन|up|down|खत्म|closing)/i.test(text)) {
          return text.slice(0, 180);
        }
      }
      return meta.summary_english ? meta.summary_english.slice(0, 180) : '';
    }

    function gradeSortKey(grade) {
      var match = String(grade || '').match(/(\d+)/);
      if (match) return Number(match[1]);
      var lower = String(grade || '').toLowerCase();
      if (lower.indexOf('super') >= 0 || lower.indexOf('premium') >= 0) return 1;
      if (lower.indexOf('medium') >= 0 || lower.indexOf('madhyam') >= 0) return 50;
      return 999;
    }

    function buildOrganizedRateSections(rows, videoId, options) {
      options = options || {};
      var byFruit = {};
      rows.slice().sort(function (a, b) {
        return produceLabel(a).localeCompare(produceLabel(b))
          || gradeSortKey(gradeLabel(a)) - gradeSortKey(gradeLabel(b))
          || sizeLabel(a).localeCompare(sizeLabel(b));
      }).forEach(function (row) {
        var fruit = produceLabel(row);
        if (!byFruit[fruit]) byFruit[fruit] = [];
        byFruit[fruit].push(row);
      });

      var fruitKeys = Object.keys(byFruit).sort();
      var hideSingleHeader = options.hideSingleFruitHeader && fruitKeys.length === 1;
      return fruitKeys.map(function (fruit) {
        var header = hideSingleHeader ? '' : produceHeadingHtml(fruit);
        return '<div class="market-fruit-section">' + header + '<div class="market-grade-list">' + renderOrganizedGradeRows(byFruit[fruit]) + '</div></div>';
      }).join('');
    }

    function buildRateTiles(rows, url) {
      var seen = {};
      var tiles = [];
      rows.slice().sort(function (a, b) {
        return Number(a.timestamp_seconds || 0) - Number(b.timestamp_seconds || 0);
      }).forEach(function (row) {
        var key = [produceLabel(row), row.variety || '', gradeLabel(row), rateRange(row)].join('|');
        if (seen[key]) return;
        seen[key] = true;
        var label = [produceDisplayLabel(row), row.variety || gradeLabel(row)].filter(Boolean).join(' · ');
        var videoId = rowVideoId(row);
        var proofSeconds = Number(row.timestamp_seconds) || 0;
        var proofTime = row.timestamp_label || secondsToClock(row.timestamp_seconds);
        tiles.push('<div class="market-rate-tile"><span class="market-rate-label">' + escapeHtml(label) + '</span><strong class="market-rate-value">' + escapeHtml(rateRange(row)) + '</strong><button type="button" class="market-rate-proof app-jump" data-video-id="' + escapeHtml(videoId) + '" data-seconds="' + proofSeconds + '">▶ Verify ' + escapeHtml(proofTime) + '</button></div>');
      });
      return tiles.slice(0, 8).join('');
    }

    function buildIntelLines(intel, videoId, limit) {
      var lines = metaListAll(intel.facts).concat(metaListAll(intel.guidance)).concat(metaListAll(intel.learnings));
      return lines.slice(0, limit || 4).map(function (item) {
        var seconds = Number(item.timestamp_seconds) || 0;
        return '<div class="market-intel-line"><button type="button" class="market-intel-jump app-jump" data-video-id="' + escapeHtml(videoId) + '" data-seconds="' + seconds + '">▶ ' + escapeHtml(secondsToClock(seconds)) + '</button>' + escapeHtml(itemText(item)) + '</div>';
      }).join('');
    }

    function renderMarketDayCard(item, rowsByVideo) {
      var meta = item.meta || {};
      var id = item.video_id || meta.video_id;
      var rows = rowsByVideo[id] || [];
      var marketDate = resolveRichVideoDate(meta, item, rows, id) || 'Market day';
      var location = marketLocationLabel(meta, rows);
      var title = resolveRichVideoTitle(meta, item, rows, id);
      var thumbUrl = videoThumbById(id);

      return '<article class="analysis-card analysis-card-compact">'
        + '<img class="analysis-video-thumb" src="' + escapeHtml(thumbUrl) + '" alt="" loading="lazy" />'
        + '<div class="analysis-card-copy">'
        + '<div class="market-day-date">' + escapeHtml(formatTallyDate({ market_date_sort: marketDate, market_date: marketDate, upload_date: marketDate })) + ' · ' + escapeHtml(location) + '</div>'
        + '<div class="market-day-title" title="' + escapeHtml(title) + '">' + escapeHtml(truncateText(title, 72)) + '</div>'
        + '<div class="market-day-sub">' + escapeHtml(rows.length + ' saved rate' + (rows.length === 1 ? '' : 's')) + '</div>'
        + '</div>'
        + '<button class="secondary-btn rich-video-btn" data-video-id="' + escapeHtml(id) + '">Open report</button>'
        + '</article>';
    }

    function renderAnalysisCards() {
      var container = el('analysisCards');
      if (!state.analysisItems.length) {
        container.innerHTML = '';
        return;
      }
      var rowsByVideo = {};
      state.priceRows.forEach(function (row) {
        var id = row.video_id || extractVideoId(row.video_url);
        if (!id) return;
        if (!rowsByVideo[id]) rowsByVideo[id] = [];
        rowsByVideo[id].push(row);
      });
      container.innerHTML = state.analysisItems.map(function (item) {
        return renderMarketDayCard(item, rowsByVideo);
      }).join('');
    }

    function setTranscriptStatus(message, kind) {
      var node = el('transcriptStatus');
      node.className = 'status' + (kind ? ' ' + kind : '');
      node.textContent = message;
    }

    function authHeaders() {
      var token = (el('settingsSyncToken') && el('settingsSyncToken').value.trim())
        || (el('syncToken') ? el('syncToken').value.trim() : '');
      if (token) localStorage.setItem('fruitMandiSyncToken', token);
      return token ? { Authorization: 'Bearer ' + token } : {};
    }

    function formatSettingsTime(value) {
      if (!value) return 'never';
      try {
        var date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleString();
      } catch (e) {
        return value;
      }
    }

    function channelLabelFromUrl(url, name) {
      if (name) return name;
      var match = String(url || '').match(/\/@([^/?#]+)/);
      return match ? match[1] : 'Channel';
    }

    function renderSettingsChannelsList() {
      var list = el('settingsChannelsList');
      if (!state.settingsChannels.length) {
        list.innerHTML = '<div class="settings-empty">No channels yet. Add your first YouTube channel below.</div>';
        return;
      }
      list.innerHTML = state.settingsChannels.map(function (channel) {
        var disabledClass = channel.enabled ? '' : ' disabled';
        return '<div class="settings-channel-row' + disabledClass + '" data-channel-id="' + escapeHtml(channel.id) + '">'
          + '<label class="settings-channel-check"><input type="checkbox" data-channel-enabled="' + escapeHtml(channel.id) + '"' + (channel.enabled ? ' checked' : '') + ' /></label>'
          + '<div class="settings-channel-meta"><div class="settings-channel-name">' + escapeHtml(channel.name || channelLabelFromUrl(channel.url)) + '</div>'
          + '<div class="settings-channel-url">' + escapeHtml(channel.url) + '</div></div>'
          + '<div class="settings-channel-actions">'
          + '<button type="button" class="icon-btn" data-channel-edit="' + escapeHtml(channel.id) + '">Rename</button>'
          + '<button type="button" class="icon-btn danger" data-channel-remove="' + escapeHtml(channel.id) + '">Remove</button>'
          + '</div>'
          + '</div>';
      }).join('');

      list.querySelectorAll('[data-channel-enabled]').forEach(function (input) {
        input.addEventListener('change', function () {
          var id = input.getAttribute('data-channel-enabled');
          state.settingsChannels = state.settingsChannels.map(function (channel) {
            if (channel.id !== id) return channel;
            return Object.assign({}, channel, { enabled: input.checked });
          });
          renderSettingsChannelsList();
          updateSettingsNavMeta();
        });
      });
      list.querySelectorAll('[data-channel-remove]').forEach(function (button) {
        button.addEventListener('click', function () {
          var id = button.getAttribute('data-channel-remove');
          state.settingsChannels = state.settingsChannels.filter(function (channel) { return channel.id !== id; });
          renderSettingsChannelsList();
          updateSettingsNavMeta();
        });
      });
      list.querySelectorAll('[data-channel-edit]').forEach(function (button) {
        button.addEventListener('click', function () {
          var id = button.getAttribute('data-channel-edit');
          var channel = state.settingsChannels.find(function (item) { return item.id === id; });
          if (!channel) return;
          var next = window.prompt('Channel label', channel.name || channelLabelFromUrl(channel.url));
          if (next == null) return;
          state.settingsChannels = state.settingsChannels.map(function (item) {
            if (item.id !== id) return item;
            return Object.assign({}, item, { name: next.trim() || item.name });
          });
          renderSettingsChannelsList();
          updateSettingsNavMeta();
        });
      });
    }

    function addSettingsChannel() {
      var url = el('settingsNewChannelUrl').value.trim();
      var name = el('settingsNewChannelName').value.trim();
      if (!url) {
        setSettingsActionStatus('Paste a YouTube channel URL first.', 'bad');
        return;
      }
      var id = 'ch_' + Math.random().toString(36).slice(2, 10);
      state.settingsChannels.push({
        id: id,
        name: name || channelLabelFromUrl(url),
        url: url,
        enabled: true,
      });
      el('settingsNewChannelUrl').value = '';
      el('settingsNewChannelName').value = '';
      renderSettingsChannelsList();
      updateSettingsNavMeta();
      setSettingsActionStatus('Channel added. Click Save settings to keep it.', '');
    }

    function setSettingsActionStatus(message, kind) {
      var node = el('settingsActionStatus');
      if (!message) {
        node.hidden = true;
        node.textContent = '';
        return;
      }
      node.hidden = false;
      node.className = 'status' + (kind ? ' ' + kind : '');
      node.textContent = message;
    }

    var SETTINGS_PAGE_META = {
      hub: { title: 'Settings', subtitle: 'Channels, sync, extraction rules, and manual actions.' },
      channels: { title: 'YouTube channels', subtitle: 'Track mandi channels for automatic import.' },
      sync: { title: 'Automatic sync', subtitle: 'Import schedule and background checks.' },
      extraction: { title: 'Extraction rules', subtitle: 'Custom AI prompt instructions for analysis.' },
      actions: { title: 'Run now', subtitle: 'Manual import, poll, and queue actions.' },
      advanced: { title: 'Advanced', subtitle: 'Sync token and webhook trigger.' },
    };

    function showSettingsPage(page) {
      page = SETTINGS_PAGE_META[page] ? page : 'hub';
      state.settingsPage = page;
      var hub = el('settingsHubView');
      if (hub) hub.classList.toggle('active', page === 'hub');
      document.querySelectorAll('.settings-page').forEach(function (node) {
        node.classList.toggle('active', node.getAttribute('data-settings-page') === page);
      });
      var backBtn = el('settingsBackBtn');
      if (backBtn) backBtn.hidden = page === 'hub';
      var meta = SETTINGS_PAGE_META[page] || SETTINGS_PAGE_META.hub;
      el('settingsTitle').textContent = meta.title;
      el('settingsSubtitle').textContent = meta.subtitle;
      var scroll = document.querySelector('#settingsModal .settings-panel-scroll');
      if (scroll) scroll.scrollTop = 0;
    }

    function updateSettingsNavMeta() {
      var node = el('settingsNavChannelsMeta');
      if (!node) return;
      var total = state.settingsChannels.length;
      var enabled = state.settingsChannels.filter(function (channel) { return channel.enabled !== false; }).length;
      if (!total) {
        node.textContent = 'No channels added yet';
        return;
      }
      node.textContent = enabled + ' enabled · ' + total + ' total';
    }

    function updateExtractionRulesMeta() {
      var node = el('settingsExtractionRules');
      var meta = el('settingsExtractionRulesMeta');
      if (!node || !meta) return;
      var len = String(node.value || '').length;
      meta.textContent = len + ' / 8000 characters' + (len > 8000 ? ' — will be trimmed on save' : '');
    }

    function fillSettingsForm(settings) {
      state.settingsChannels = Array.isArray(settings.channels) ? settings.channels.map(function (channel) {
        return {
          id: channel.id,
          name: channel.name || channelLabelFromUrl(channel.url),
          url: channel.url,
          enabled: channel.enabled !== false,
        };
      }) : [];
      renderSettingsChannelsList();
      updateSettingsNavMeta();
      el('settingsBackfillCount').value = String(settings.backfillVideoCount == null ? 50 : settings.backfillVideoCount);
      el('settingsPollCheckCount').value = String(settings.pollCheckCount || 25);
      el('settingsPollInterval').value = String(settings.pollIntervalMinutes || 60);
      el('settingsAutoPipeline').checked = settings.autoPipelineEnabled !== false;
      el('settingsCronEnabled').checked = settings.cronEnabled !== false;
      el('settingsWebhookEnabled').checked = settings.webhookEnabled !== false;
      el('settingsExtractionRules').value = settings.extractionPromptRules || '';
      updateExtractionRulesMeta();
      var token = localStorage.getItem('fruitMandiSyncToken') || '';
      el('settingsSyncToken').value = token;
      el('syncToken').value = token;
      el('settingsAutomationStatus').innerHTML = ''
        + '<div class="settings-status-grid">'
        + '<div class="settings-status-item"><strong>' + (settings.enabledChannelCount || 0) + '</strong><span>Enabled channels</span></div>'
        + '<div class="settings-status-item"><strong>' + (settings.queueCount || 0) + '</strong><span>Videos in queue</span></div>'
        + '</div>'
        + '<div class="settings-status-times">'
        + '<span>Last check: ' + escapeHtml(formatSettingsTime(settings.lastPollAt)) + '</span>'
        + '<span>Last import: ' + escapeHtml(formatSettingsTime(settings.lastBackfillAt)) + '</span>'
        + '</div>'
        + ((settings.queueCount || 0) > 0
          ? '<button type="button" class="settings-status-link" id="settingsOpenActivityBtn">View queued videos in Activity →</button>'
          : '');
      var activityLink = el('settingsOpenActivityBtn');
      if (activityLink) {
        activityLink.addEventListener('click', function () {
          closeSettings();
          openActivityPanel({ tab: 'waiting' });
        });
      }
    }

    function openSettings() {
      hidePopup();
      showSettingsPage('hub');
      el('settingsModal').classList.add('show');
      el('settingsModal').setAttribute('aria-hidden', 'false');
      syncPageScrollLock();
      setSettingsActionStatus('', '');
      fetchJson('/api/settings').then(function (data) {
        fillSettingsForm(data.settings || {});
      }).catch(function (error) {
        el('settingsAutomationStatus').textContent = 'Could not load settings: ' + error.message;
      });
    }

    function closeSettings() {
      el('settingsModal').classList.remove('show');
      el('settingsModal').setAttribute('aria-hidden', 'true');
      showSettingsPage('hub');
      syncPageScrollLock();
    }

    function saveSettings() {
      var token = el('settingsSyncToken').value.trim();
      if (token) {
        localStorage.setItem('fruitMandiSyncToken', token);
        el('syncToken').value = token;
      }
      if (!state.settingsChannels.length) {
        setSettingsActionStatus('Saving extraction rules and options. Add a YouTube channel when you are ready for auto-import.', '');
      }
      var body = {
        channels: state.settingsChannels,
        automation: {
          backfillVideoCount: Number(el('settingsBackfillCount').value),
          pollCheckCount: Number(el('settingsPollCheckCount').value),
          pollIntervalMinutes: Number(el('settingsPollInterval').value),
          pipelineBatchSize: 1,
          autoPipelineEnabled: el('settingsAutoPipeline').checked,
          cronEnabled: el('settingsCronEnabled').checked,
          webhookEnabled: el('settingsWebhookEnabled').checked,
          extractionPromptRules: String(el('settingsExtractionRules').value || '').trim().slice(0, 8000),
        },
      };
      setSettingsActionStatus('Saving...', '');
      return fetchJson('/api/settings', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
        body: JSON.stringify(body),
      }).then(function (data) {
        fillSettingsForm(data.settings || {});
        setSettingsActionStatus('Settings saved.', 'ok');
      }).catch(function (error) {
        setSettingsActionStatus(error.message, 'bad');
      });
    }

    function summarizeActionResult(data, label) {
      if (data.channelCount != null) {
        var msg = label + ': ' + (data.channelCount || 0) + ' channel(s), '
          + (data.newVideos != null ? data.newVideos : data.discovered || 0) + ' video(s) found, '
          + (data.queued || 0) + ' queued, queue now ' + (data.queueCount || 0) + '.';
        if (data.started) {
          msg += ' Started ' + data.started + ' fetch' + (data.started === 1 ? '' : 'es');
          if (data.queueRemaining) msg += '; ' + data.queueRemaining + ' still waiting (auto-continues).';
        } else if (data.skipped === 'busy') {
          msg += ' Pipeline busy — next video starts when the current job finishes.';
        }
        return msg;
      }
      if (data.started != null) {
        return label + ': started ' + data.started + ', ' + (data.queueRemaining || 0) + ' still waiting.';
      }
      return label + ' complete.';
    }

    function runSettingsAction(path, label) {
      setSettingsActionStatus(label + '...', '');
      return fetchJson(path, {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, authHeaders()),
        body: '{}',
      }).then(function (data) {
        setSettingsActionStatus(summarizeActionResult(data, label), 'ok');
        return fetchJson('/api/settings');
      }).then(function (data) {
        fillSettingsForm(data.settings || {});
        pollOngoingTasks();
      }).catch(function (error) {
        setSettingsActionStatus(label + ' failed: ' + error.message, 'bad');
      });
    }

    function openTester() {
      hidePopup();
      el('testModal').classList.add('show');
      el('testModal').setAttribute('aria-hidden', 'false');
      syncPageScrollLock();
      el('videoUrl').focus();
      refreshTranscriptSetupStatus();
    }

    function refreshTranscriptSetupStatus() {
      fetchJson('/api/transcripts/setup').then(function (data) {
        var node = el('transcriptSetupStatus');
        if (DIRECT_API_BASE) {
          var missing = [];
          if (!data.openaiConfigured) missing.push('OPENAI_API_KEY');
          if (!data.databaseConfigured) missing.push('DATABASE_URL');
          if (WORKER_API_BASE) {
            node.className = missing.length ? 'status bad' : 'status ok';
            node.textContent = missing.length
              ? ('Hetzner VPS fetches YouTube transcripts. Worker needs ' + missing.join(', ') + ' for AI analysis.')
              : 'Hetzner VPS fetches YouTube transcripts directly, then Worker runs AI price analysis.';
            return;
          }
          node.className = missing.length ? 'status bad' : 'status ok';
          node.textContent = missing.length
            ? ('Hetzner VPS fetches YouTube transcripts. Railway needs ' + missing.join(', ') + '.')
            : 'Hetzner VPS fetches transcripts. Railway saves + runs AI analysis.';
          return;
        }
        if (data.extractorConfigured || data.cookiesConfigured) {
          node.className = 'status ok';
          node.textContent = 'Hetzner VPS fetches YouTube transcripts directly, then Worker runs AI price analysis.';
        } else {
          node.className = 'status bad';
          node.textContent = 'Set YOUTUBE_EXTRACTOR_URL to your Hetzner extractor (http://167.233.111.96:3000/api/transcript).';
        }
      }).catch(function () {
        el('transcriptSetupStatus').className = 'status';
        el('transcriptSetupStatus').textContent = '';
      });
    }

    function closeTester() {
      el('testModal').classList.remove('show');
      el('testModal').setAttribute('aria-hidden', 'true');
      syncPageScrollLock();
    }

    function updatePreview() {
      var videoUrl = el('videoUrl').value.trim();
      var audioUrl = el('audioUrl').value.trim();
      var file = el('audioFile').files[0];
      var id = extractVideoId(videoUrl);
      if (!id) {
        el('videoPreview').classList.remove('show');
        var embedClear = el('videoEmbed');
        if (embedClear) embedClear.removeAttribute('src');
        return;
      }
      el('videoPreview').classList.add('show');
      var embed = el('videoEmbed');
      if (embed) {
        embed.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1';
      }
      el('videoThumb').src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
      el('videoIdLabel').textContent = 'Video ID: ' + id;
      el('openVideoLink').href = videoUrl || ('https://www.youtube.com/watch?v=' + id);
      el('videoHint').textContent = DIRECT_API_BASE
        ? (WORKER_API_BASE
            ? 'Transcript runs on Cloudflare Worker in the background (same flow as local dev).'
            : 'Railway will try server-side transcript fetch.')
        : (file
          ? 'Audio upload will transcribe on the Worker and skip YouTube download.'
          : (audioUrl
            ? 'Direct audio URL will be fetched and transcribed on the Worker.'
            : 'YouTube: Hetzner VPS fetches transcript, then Worker runs AI analysis.'));
    }

    function runTranscript() {
      var videoUrl = el('videoUrl').value.trim();
      var audioUrl = el('audioUrl').value.trim();
      var file = el('audioFile').files[0];
      var language = el('language').value;
      var useWorkerTranscript = WORKER_API_BASE && window.KRISHI_NETLIFY_STATIC && !file;
      state.extensionTranscriptRetried = false;
      openSourceLogs();
      el('runTranscriptBtn').disabled = true;
      resetTranscriptProgress();

      setTranscriptStatus(useWorkerTranscript
        ? 'Starting Hetzner transcript job...'
        : (DIRECT_API_BASE ? 'Adding source...' : (file || audioUrl ? 'Starting transcription...' : 'Starting Hetzner transcript job...')), '');
      log(useWorkerTranscript
        ? 'Submitting YouTube URL — Hetzner fetches transcript, Worker runs AI analysis.'
        : (DIRECT_API_BASE
          ? (state.extensionBridgeReady
            ? 'Fetching YouTube transcript via Chrome extension, then saving on Railway.'
            : 'Adding YouTube source through Railway (install extension for better reliability).')
          : (file || audioUrl ? 'Starting transcript request.' : 'Submitting YouTube URL for background transcription.')));
      if (DIRECT_API_BASE && !useWorkerTranscript) {
        setTranscriptProgress({
          percent: 12,
          stage: state.extensionBridgeReady ? 'extension_fetch' : 'railway_transcript',
          message: state.extensionBridgeReady
            ? 'Extension is fetching captions from YouTube using your browser session...'
            : 'Railway is checking YouTube subtitle tracks before audio fallback.',
          elapsed: '',
          attempt: ''
        });
      }
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
      var pollStart = Date.now();
      request.then(function (data) {
        if (data.accepted && data.job) {
          log('Job ' + data.job.id + ' accepted. Polling every 2–5s for stage updates...');
          pollOngoingTasks();
          setTranscriptProgress({
            percent: 10,
            stage: data.job.stage || 'queued',
            message: data.job.message || 'Job accepted. Starting download...',
            elapsed: '0:00 elapsed',
            attempt: 'check 1/90'
          });
          return pollStoredTranscript(videoUrl, 90, pollStart);
        }
        resetTranscriptProgress();
        renderTranscript(data);
        if (DIRECT_API_BASE) {
          setTranscriptProgress({
            percent: 35,
            stage: 'saving',
            message: 'Transcript fetched. Saving source and preparing AI extraction.',
            elapsed: '',
            attempt: ''
          });
          return completeExtensionTranscriptFlow(videoUrl, data);
        }
        setTranscriptStatus('Transcript run finished: ' + data.job.segment_count + ' segment(s).', data.job.segment_count ? 'ok' : '');
        log('Transcript job ' + data.job.id + ' finished with ' + data.job.segment_count + ' segment(s).');
        if (data.job.segment_count) return runAnalysisForVideo(videoUrl, data.job.video_id);
        return null;
      }).catch(function (error) {
        var msg = error.message || '';
        var shouldPoll = !file && !audioUrl && extractVideoId(videoUrl)
          && !/failed|Unauthorized|no lines|cookies|not configured|Could not fetch|503/i.test(msg);
        if (shouldPoll) {
          log('Request ended early (older worker or timeout). Falling back to polling saved transcript...');
          return pollStoredTranscript(videoUrl, 90, pollStart);
        }
        var failMsg = error.message || '';
        log('ERROR: ' + failMsg);
        openSourceLogs();
        setTranscriptProgress({
          percent: 100,
          stage: 'failed',
          message: summarizeTranscriptError(failMsg),
          elapsed: '',
          attempt: ''
        });
        setTranscriptStatus(summarizeTranscriptError(failMsg), 'bad');
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
      openSourceLogs();
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
      if (job.video_id) state.transcriptCache[job.video_id] = data;
      el('transcriptMeta').textContent = job.id ? ('Job ' + job.id + ' · ' + (job.status || '') + ' · ' + segments.length + ' line(s)') : (segments.length + ' line(s)');
      if (!segments.length) {
        el('transcriptBox').innerHTML = '<div class="status">No transcript lines returned.</div>';
        return;
      }
      el('transcriptBox').innerHTML = segments.map(function (segment) {
        return '<div class="segment"><time>' + escapeHtml(segment.timestamp_label || secondsToClock(segment.start_seconds)) + '</time><div>' + escapeHtml(segment.text) + '</div></div>';
      }).join('');
    }

    function closeRichVideo() {
      var closingId = state.richVideoId;
      el('videoModal').classList.remove('show');
      el('videoModal').setAttribute('aria-hidden', 'true');
      syncPageScrollLock();
      el('richVideoFrame').src = 'about:blank';
      if (closingId) {
        delete state.richVideoOembedTitle[closingId];
        delete state.richVideoParsedDate[closingId];
      }
      state.richVideoId = '';
      state.richVideoUrl = '';
    }

    function openRichVideo(videoId, startSeconds) {
      var cachedItem = state.analysisItems.find(function (entry) {
        return entry.video_id === videoId || (entry.meta && entry.meta.video_id === videoId);
      }) || {};
      var url = (cachedItem.meta && cachedItem.meta.video_url) || ('https://www.youtube.com/watch?v=' + videoId);
      var title = resolveRichVideoTitle(cachedItem.meta || {}, cachedItem, filterRowsForVideo(videoId), videoId);
      var start = Math.max(0, Math.floor(Number(startSeconds) || 0));

      state.richVideoId = videoId;
      state.richVideoUrl = url;
      switchRichTab('overview');
      el('videoModalTitle').textContent = title;
      el('videoModalTitle').title = title;
      el('videoModalDate').textContent = 'Loading…';
      el('videoModalLocation').textContent = '';
      el('richStats').innerHTML = '';
      enrichRichVideoTitle(videoId, cachedItem.meta || {}, cachedItem, filterRowsForVideo(videoId));
      el('richJumpStatus').textContent = start > 0 ? ('Playing from ' + secondsToClock(start)) : '';
      el('richOpenYoutube').href = url;
      el('richVideoFrame').src = embedUrl(videoId, start, start > 0);
      hidePopup();
      el('videoModal').classList.add('show');
      el('videoModal').setAttribute('aria-hidden', 'false');
      syncPageScrollLock();

      function renderRichModal(meta, item) {
        if (state.richVideoId !== videoId) return;
        meta = meta || {};
        item = item || cachedItem;
        var rows = filterRowsForVideo(videoId);
        if (rows[0] && rows[0].video_url) url = rows[0].video_url;
        var intel = buildVideoIntel(meta, rows);
        var chipValues = metaListAll(meta.produce)
          .concat(metaListAll(meta.qualities))
          .concat(metaListAll(meta.areas))
          .concat(metaListAll(meta.parties))
          .concat(metaListAll(meta.mandi_names));

        var marketDate = setRichModalDate(meta, item, rows, videoId);
        var location = marketLocationLabel(meta, rows);
        var resolvedTitle = resolveRichVideoTitle(meta, item, rows, videoId);
        el('videoModalTitle').textContent = resolvedTitle;
        el('videoModalTitle').title = resolvedTitle;
        el('videoModalLocation').textContent = location || '';
        renderRichStatPills(rows, intel);
        enrichRichVideoTitle(videoId, meta, item, rows);

        el('richMetaChips').innerHTML = chipValues.length ? chipValues.map(function (value) {
          return '<span class="small-chip">' + escapeHtml(value) + '</span>';
        }).join('') : '<span class="small-chip">No metadata tags yet</span>';

        el('richSummary').textContent = dedupeSummaryText(meta.summary_english) || (rows.length
          ? ('Saved wholesale rates for ' + uniqueValues(rows, produceLabel).map(produceDisplayLabel).join(', ') + '. Open the Rates tab for the full list.')
          : 'No summary saved yet. Re-run analysis to refresh metadata.');
        updateRichSummaryToggle();

        var arrivals = extractArrivalNote(intel);
        var statusNote = extractMarketStatusNote(intel, meta);
        el('richBriefGrid').innerHTML = ''
          + '<div class="rich-snapshot-card"><span class="rich-snapshot-label">Arrivals / gaadi</span><span class="rich-snapshot-body">' + escapeHtml(arrivals || 'Not mentioned in transcript yet.') + '</span></div>'
          + '<div class="rich-snapshot-card"><span class="rich-snapshot-label">Market haal</span><span class="rich-snapshot-body">' + escapeHtml(statusNote || 'No market status note saved yet.') + '</span></div>';

        renderRichRatesTable(rows, url, videoId);
        renderRichIntelCards(el('richMentions'), intel.mentions, 'No price mentions saved.', 'mention');
        renderRichIntelCards(el('richFacts'), intel.facts, 'No facts yet — re-run analysis, or check rate rows for extracted context.');
        renderRichIntelCards(el('richGuidance'), intel.guidance, 'No guidance notes saved for this video.');
        renderRichIntelCards(el('richLearnings'), intel.learnings, 'No learnings yet — grouped produce summaries appear here after analysis.');
        renderRichIntelCards(el('richChapters'), intel.chapters, 'No chapter markers saved.');
      }

      function renderRichTranscript(data) {
        var segments = Array.isArray(data.segments) ? data.segments : [];
        if (!segments.length) {
          el('richTranscript').innerHTML = '<div class="rich-intel-empty">No transcript lines saved.</div>';
          return;
        }
        el('richTranscript').innerHTML = segments.map(function (segment) {
          var seconds = Number(segment.start_seconds) || 0;
          return '<button type="button" class="rich-transcript-row rich-jump" data-seconds="' + seconds + '"><time>' + escapeHtml(segment.timestamp_label || secondsToClock(seconds)) + '</time><span>' + escapeHtml(segment.text) + '</span></button>';
        }).join('');
      }

      renderRichModal(cachedItem.meta || {}, cachedItem);

      fetchJson('/api/analysis/' + encodeURIComponent(videoId)).then(function (data) {
        if (state.richVideoId !== videoId) return;
        renderRichModal((data.item && data.item.meta) || cachedItem.meta || {}, data.item || cachedItem);
      }).catch(function () {
        if (state.richVideoId !== videoId) return;
        renderRichModal(cachedItem.meta || {}, cachedItem);
      });

      if (state.transcriptCache[videoId]) {
        renderRichTranscript(state.transcriptCache[videoId]);
      } else {
        el('richTranscript').innerHTML = '<div class="status">Loading transcript...</div>';
        fetchJson('/api/transcripts/' + encodeURIComponent(videoId)).then(function (data) {
          if (state.richVideoId !== videoId) return;
          state.transcriptCache[videoId] = data;
          renderRichTranscript(data);
        }).catch(function (error) {
          if (state.richVideoId !== videoId) return;
          el('richTranscript').innerHTML = '<div class="rich-intel-empty">' + escapeHtml(error.message) + '</div>';
        });
      }
    }

    function setupEvents() {
      initAppViewFromHash();
      window.addEventListener('hashchange', initAppViewFromHash);
      function handleAppNavClick(event) {
        var btn = event.target.closest('.app-nav-btn, .app-tabbar-btn');
        if (!btn) return;
        switchAppView(btn.getAttribute('data-app-view') || 'mandi');
      }
      el('appNav').addEventListener('click', handleAppNavClick);
      el('appTabbar').addEventListener('click', handleAppNavClick);
      el('openSettingsBtn').addEventListener('click', openSettings);
      el('openActivityBtn').addEventListener('click', function () { openActivityPanel(); });
      el('closeActivityBtn').addEventListener('click', closeActivityPanel);
      el('activityBanner').addEventListener('click', function () { openActivityPanel(); });
      el('activityTabs').addEventListener('click', function (event) {
        var btn = event.target.closest('.activity-tab-btn');
        if (!btn) return;
        switchActivityTab(btn.getAttribute('data-activity-tab') || 'all');
      });
      var activityStatCards = el('activityStatCards');
      if (activityStatCards) {
        activityStatCards.addEventListener('click', function (event) {
          var card = event.target.closest('.activity-stat');
          if (!card) return;
          switchActivityTab(card.getAttribute('data-activity-tab') || 'all');
        });
      }
      var settingsNavActivityBtn = el('settingsNavActivityBtn');
      if (settingsNavActivityBtn) {
        settingsNavActivityBtn.addEventListener('click', function () {
          closeSettings();
          openActivityPanel({ tab: 'waiting' });
        });
      }
      el('activityModal').addEventListener('click', function (event) {
        if (event.target === el('activityModal')) closeActivityPanel();
      });
      el('closeSettingsBtn').addEventListener('click', closeSettings);
      el('settingsBackBtn').addEventListener('click', function () { showSettingsPage('hub'); });
      el('saveSettingsBtn').addEventListener('click', saveSettings);
      el('settingsAddChannelBtn').addEventListener('click', addSettingsChannel);
      el('settingsExtractionRules').addEventListener('input', updateExtractionRulesMeta);
      el('runBackfillBtn').addEventListener('click', function () {
        runSettingsAction('/api/channel/backfill', 'Import past videos').then(function () {
          openActivityPanel({ tab: 'waiting' });
        });
      });
      el('runPollBtn').addEventListener('click', function () { runSettingsAction('/api/channel/poll', 'Check for new videos'); });
      el('runQueueBtn').addEventListener('click', function () { runSettingsAction('/api/channel/process-queue', 'Process waiting queue'); });
      el('settingsModal').addEventListener('click', function (event) {
        var navItem = event.target.closest('[data-open-settings-page]');
        if (navItem) {
          showSettingsPage(navItem.getAttribute('data-open-settings-page') || 'hub');
          return;
        }
        if (event.target === el('settingsModal')) closeSettings();
      });
      el('openTesterTop').addEventListener('click', openTester);
      el('closeTesterBtn').addEventListener('click', closeTester);
      el('closeVideoModalBtn').addEventListener('click', closeRichVideo);
      el('richSummaryToggle').addEventListener('click', function () {
        var wrap = el('richSummaryWrap');
        var toggle = el('richSummaryToggle');
        if (!wrap || !toggle) return;
        var collapsed = wrap.classList.toggle('collapsed');
        toggle.textContent = collapsed ? 'Read more' : 'Show less';
      });
      el('richTabs').addEventListener('click', function (event) {
        var btn = event.target.closest('.rich-tab-btn');
        if (!btn) return;
        switchRichTab(btn.getAttribute('data-rich-tab') || 'overview');
      });
      el('videoModal').addEventListener('click', function (event) {
        if (event.target === el('videoModal')) {
          closeRichVideo();
          return;
        }
        var jump = event.target.closest('.rich-jump');
        if (!jump) return;
        event.preventDefault();
        var jumpVideoId = jump.getAttribute('data-video-id') || state.richVideoId;
        var jumpSeconds = Number(jump.getAttribute('data-seconds')) || 0;
        if (jumpVideoId && jumpVideoId !== state.richVideoId) {
          playTimestampInApp(jumpVideoId, jumpSeconds);
          return;
        }
        seekRichVideo(jumpSeconds);
      });
      el('testModal').addEventListener('click', function (event) {
        if (event.target === el('testModal')) closeTester();
      });
      el('refreshBtn').addEventListener('click', loadAllData);
      el('chartToggleBtn').addEventListener('click', toggleChartExpanded);
      el('chartFiltersPanel').addEventListener('change', function (event) {
        var target = event.target;
        if (!target || !target.classList.contains('chart-filter-select')) return;
        hidePopup();
        if (target.id === 'produceSelect') {
          state.selectedFruit = target.value;
          state.selectedGrade = '';
          state.selectedSize = '';
          state.selectedArea = '';
        } else if (target.id === 'gradeSelect') {
          state.selectedGrade = target.value;
        } else if (target.id === 'sizeSelect') {
          state.selectedSize = target.value;
        } else if (target.id === 'areaSelect') {
          state.selectedArea = target.value;
        }
        renderEverything();
      });
      el('reanalyzeAllBtn').addEventListener('click', reanalyzeAll);
      el('popupClose').addEventListener('click', hidePopup);
      window.addEventListener('scroll', function (event) {
        var popup = el('chartPopup');
        if (!popup.classList.contains('show')) return;
        if (event.target === popup || (event.target && popup.contains(event.target))) return;
        hidePopup();
      }, true);
      window.addEventListener('resize', hidePopup);
      document.addEventListener('click', function (event) {
        var popup = el('chartPopup');
        if (popup.classList.contains('show')
          && !popup.contains(event.target)
          && !event.target.closest('#produceChart [data-point]')
          && !event.target.closest('.modal.show')) {
          hidePopup();
        }
      }, true);
      document.addEventListener('click', function (event) {
        var richBtn = event.target.closest('.rich-video-btn');
        if (richBtn) {
          event.preventDefault();
          openRichVideo(richBtn.getAttribute('data-video-id'));
          return;
        }
        var jump = event.target.closest('.app-jump');
        if (!jump) return;
        event.preventDefault();
        hidePopup();
        playTimestampInApp(jump.getAttribute('data-video-id'), Number(jump.getAttribute('data-seconds')) || 0);
      });
      el('videoUrl').addEventListener('input', updatePreview);
      el('runTranscriptBtn').addEventListener('click', runTranscript);
      el('loadStoredBtn').addEventListener('click', loadStoredTranscript);
      el('clearTranscriptBtn').addEventListener('click', function () {
        el('transcriptBox').innerHTML = '<div class="status">Add a source or load a saved transcript.</div>';
        el('transcriptMeta').textContent = 'No transcript loaded.';
        resetTranscriptProgress();
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
          closeSettings();
          closeTester();
          closeRichVideo();
          hidePopup();
        }
      });
    }

    setupEvents();
    initExtensionBridge();
    el('syncToken').value = localStorage.getItem('fruitMandiSyncToken') || '';
    loadAllData();
    pollOngoingTasks();
  </script>
</body>
</html>`;
