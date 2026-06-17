function wakeYouTubePageInPage() {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function ensureMuted(video) {
    if (!video) return;
    video.muted = true;
    video.volume = 0;
    video.defaultMuted = true;
  }

  function scrollToDescription() {
    const targets = [
      'ytd-video-description-transcript-section-renderer',
      'ytd-structured-description-content-renderer',
      'ytd-text-inline-expander',
      '#description',
      'ytd-watch-metadata',
      '#below',
    ];
    for (const selector of targets) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        return el;
      }
    }
    window.scrollTo(0, document.body.scrollHeight * 0.35);
    return null;
  }

  return (async () => {
    const video = document.querySelector('video');
    ensureMuted(video);

    if (video) {
      try {
        const playPromise = video.play();
        if (playPromise?.then) await playPromise;
      } catch {
        try {
          document.querySelector('#movie_player, .html5-video-player, .ytp-large-play-button')?.click();
          const retry = video.play();
          if (retry?.then) await retry;
        } catch { /* ignore */ }
      }
      ensureMuted(video);
    }

    for (const offset of [0, 240, 380, 520]) {
      window.scrollTo({ top: offset, behavior: 'instant' });
      window.dispatchEvent(new Event('scroll', { bubbles: true }));
      await sleep(180);
    }
    scrollToDescription();

    const expandButton = document.querySelector('ytd-text-inline-expander #expand, tp-yt-paper-button#expand, #expand');
    if (expandButton) {
      try { expandButton.click(); } catch { /* ignore */ }
      await sleep(400);
    }
    scrollToDescription();

    for (let attempt = 0; attempt < 8; attempt++) {
      const hasTranscriptUi = document.querySelector(
        'ytd-video-description-transcript-section-renderer, button[aria-label="Show transcript"], ytd-engagement-panel-section-list-renderer[target-id*="transcript"]',
      );
      if (hasTranscriptUi) {
        return { ok: true, woke: true, playing: !video?.paused, hasTranscriptUi: true };
      }
      scrollToDescription();
      await sleep(220);
    }

    return { ok: true, woke: true, playing: !video?.paused, hasTranscriptUi: false };
  })();
}

function fetchTranscriptInPage(languages, backgroundOnly = false, apiOnly = false) {
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
    video.defaultMuted = true;
  }

  function getLivePlayerResponse() {
    const response = window.ytInitialPlayerResponse
      || window.ytplayer?.config?.args?.player_response
      || null;
    if (typeof response === 'string') {
      try { return JSON.parse(response); } catch { return null; }
    }
    return response;
  }

  function getLiveInitialData() {
    return window.ytInitialData || window.yt?.initialData || null;
  }

  async function waitForElement(selector, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(250);
    }
    return null;
  }

  async function waitForPageReady() {
    mutePlayer();
    for (let attempt = 0; attempt < 24; attempt++) {
      const player = getLivePlayerResponse();
      const videoId = player?.videoDetails?.videoId || '';
      const hasDescription = document.querySelector('ytd-watch-metadata, #description, ytd-text-inline-expander, video');
      if (videoId && hasDescription) return { player, videoId };
      await sleep(200);
    }
    return { player: getLivePlayerResponse(), videoId: getLivePlayerResponse()?.videoDetails?.videoId || '' };
  }

  function scrollToDescription() {
    const targets = [
      'ytd-video-description-transcript-section-renderer',
      'ytd-structured-description-content-renderer',
      'ytd-text-inline-expander',
      '#description',
      'ytd-watch-metadata',
      '#below',
    ];
    for (const selector of targets) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        return el;
      }
    }
    window.scrollTo(0, document.body.scrollHeight * 0.35);
    return null;
  }

  function clickElement(el) {
    if (!el) return false;
    try {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    } catch { /* ignore */ }
    try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
    try { el.click(); } catch { /* ignore */ }
    const rect = el.getBoundingClientRect();
    const x = rect.left + Math.min(rect.width / 2, 40);
    const y = rect.top + Math.min(rect.height / 2, 20);
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      try {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
      } catch { /* ignore */ }
    }
    return true;
  }

  function findExpandButton() {
    return document.querySelector('ytd-text-inline-expander #expand')
      || document.querySelector('tp-yt-paper-button#expand')
      || document.querySelector('#expand')
      || [...document.querySelectorAll('button, tp-yt-paper-button')].find((btn) => {
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`.toLowerCase();
        return /\bmore\b/.test(label) && !/show transcript|transcript/.test(label);
      });
  }

  function findShowTranscriptButton() {
    const section = document.querySelector('ytd-video-description-transcript-section-renderer');
    if (section) {
      const button = section.querySelector('button[aria-label="Show transcript"]')
        || section.querySelector('#primary-button button')
        || section.querySelector('yt-button-shape button')
        || section.querySelector('ytd-button-renderer button')
        || section.querySelector('button');
      if (button) return button;
    }
    return document.querySelector('button[aria-label="Show transcript"]')
      || document.querySelector('ytd-button-renderer button[aria-label="Show transcript"]')
      || [...document.querySelectorAll('button, yt-button-shape button, ytd-button-renderer button')].find((btn) => {
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`.trim();
        return /\b(show\s+)?transcript\b/i.test(label) && !/close transcript/i.test(label);
      });
  }

  function transcriptPanelRoot() {
    return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]')
      || document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]')
      || document.querySelector('ytd-transcript-renderer');
  }

  function extractSegmentsFromPanel() {
    const panel = transcriptPanelRoot();
    const scope = panel || document;
    const segments = [];

    const firstDescendantByClass = (node, needle) => {
      const wanted = String(needle).toLowerCase();
      return [...node.querySelectorAll('*')].find((child) => String(child.className || '').toLowerCase().includes(wanted)) || null;
    };

    const pushSegment = (segmentNode) => {
      const timestampEl = segmentNode.querySelector(
        '.ytwTranscriptSegmentViewModelTimestamp, .segment-timestamp, .segment-start-offset, [class*="TranscriptSegmentViewModelTimestamp"]',
      ) || firstDescendantByClass(segmentNode, 'timestamp');
      const textEl = segmentNode.querySelector(
        'span.ytAttributedStringHost, .segment-text, yt-formatted-string.segment-text, yt-formatted-string, span.yt-core-attributed-string',
      ) || firstDescendantByClass(segmentNode, 'segmenttext')
        || [...segmentNode.querySelectorAll('span, yt-formatted-string, div')]
          .find((child) => child !== timestampEl && stripHtml(child.textContent || '') && !/^\s*(?:(\d{1,2}:)?\d{1,2}:\d{2})\s*$/.test(child.textContent || ''));
      const rawText = stripHtml(textEl?.textContent || segmentNode.textContent || '');
      const timeMatch = rawText.match(/\b(?:(\d{1,2}:)?\d{1,2}:\d{2})\b/);
      const timestampText = stripHtml(timestampEl?.textContent || timeMatch?.[0] || '');
      const text = stripHtml(rawText.replace(timestampText, '').replace(timeMatch?.[0] || '', ''));
      const start = parseClockLabel(timestampText);
      if (!timestampText || !text) return;
      segments.push({
        start: Number(start.toFixed(3)),
        end: Number(start.toFixed(3)),
        duration: 0,
        timestamp_label: secondsToClock(start),
        text,
      });
    };

    const directNodes = scope.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer');
    for (const node of directNodes) pushSegment(node);

    if (!segments.length) {
      const nodes = scope.querySelectorAll([
        'macro-markers-panel-item-view-model',
        '[class*="TranscriptSegment"]',
        '[class*="transcriptSegment"]',
        '[class*="transcript-segment"]',
      ].join(','));
      for (const node of nodes) {
        const segmentNode = node.querySelector('transcript-segment-view-model, ytd-transcript-segment-renderer') || node;
        pushSegment(segmentNode);
      }
    }

    const seen = new Set();
    const uniqueSegments = segments.filter((segment) => {
      const key = `${segment.start}|${segment.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (let i = 0; i < uniqueSegments.length; i++) {
      const nextStart = uniqueSegments[i + 1]?.start;
      if (Number.isFinite(nextStart) && nextStart > uniqueSegments[i].start) {
        uniqueSegments[i].end = Number(nextStart.toFixed(3));
        uniqueSegments[i].duration = Number((uniqueSegments[i].end - uniqueSegments[i].start).toFixed(3));
      }
    }

    return uniqueSegments;
  }

  function decodeHtmlEntities(text) {
    return String(text || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => {
        const value = Number(code);
        return Number.isFinite(value) ? String.fromCodePoint(value) : _;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
        const value = parseInt(code, 16);
        return Number.isFinite(value) ? String.fromCodePoint(value) : _;
      })
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"');
  }

  function extractSegmentsFromTranscriptHtml(html) {
    const source = String(html || '');
    const blocks = source.match(/<transcript-segment-view-model\b[\s\S]*?<\/transcript-segment-view-model>/g) || [];
    const segments = [];
    for (const block of blocks) {
      const timestamp = stripHtml(decodeHtmlEntities(
        block.match(/<div[^>]*class="[^"]*TranscriptSegmentViewModelTimestamp[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
        || block.match(/\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b/)?.[1]
        || ''
      ));
      const text = stripHtml(decodeHtmlEntities(
        block.match(/<span[^>]*class="[^"]*ytAttributedStringHost[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]
        || block.replace(/<div[^>]*class="[^"]*TranscriptSegmentViewModelTimestamp[^"]*"[^>]*>[\s\S]*?<\/div>/ig, '')
      ));
      const start = parseClockLabel(timestamp);
      if (!timestamp || !text) continue;
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

  function chooseCaptionTrack(tracks, wantedLanguages) {
    const wanted = String(wantedLanguages || 'hi.*,hi,en.*').split(',').map(value => value.trim().replace('.*', '').toLowerCase()).filter(Boolean);
    return [...tracks].sort((a, b) => {
      const aScore = wanted.findIndex(lang => String(a.languageCode || '').toLowerCase().startsWith(lang));
      const bScore = wanted.findIndex(lang => String(b.languageCode || '').toLowerCase().startsWith(lang));
      return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
    })[0];
  }

  async function tryCaptionTracks(player) {
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!tracks.length) return null;
    const selected = chooseCaptionTrack(tracks, languages);
    if (!selected?.baseUrl) return null;
    const result = await fetchCaptionTrackInPage(selected.baseUrl);
    if (result?.segments?.length) {
      return {
        ok: true,
        segments: result.segments,
        language: selected.languageCode || 'unknown',
        fileName: selected.name?.simpleText || selected.languageCode || 'caption',
        method: `caption-${result.format || 'vtt'}`,
      };
    }
    return null;
  }

  async function tryInnerTube(player, method = 'innertube') {
    const params = extractTranscriptParams(player, document.documentElement.innerHTML, getLiveInitialData());
    if (!params) return { ok: false, error: 'No transcript params in page HTML.' };
    const result = await fetchInnerTubeTranscriptInPage(params);
    if (result?.segments?.length) {
      return {
        ok: true,
        segments: result.segments,
        language: 'unknown',
        fileName: 'innertube-transcript',
        method,
      };
    }
    return { ok: false, error: result?.error || 'innerTube transcript empty.' };
  }

  async function openTranscriptUi() {
    if (transcriptPanelRoot() && extractSegmentsFromPanel().length) {
      return { ok: true, alreadyOpen: true };
    }

    scrollToDescription();
    await sleep(400);

    const expandButton = findExpandButton();
    if (expandButton) {
      clickElement(expandButton);
      await sleep(500);
    }

    scrollToDescription();
    let transcriptButton = findShowTranscriptButton();
    for (let attempt = 0; attempt < 12 && !transcriptButton; attempt++) {
      scrollToDescription();
      transcriptButton = findShowTranscriptButton();
      if (transcriptButton) break;
      await sleep(250);
    }

    if (!transcriptButton) {
      return { ok: false, error: 'Show transcript button not found on this video.' };
    }

    clickElement(transcriptButton);
    await sleep(700);
    return { ok: true, alreadyOpen: false };
  }

  async function scrapeTranscriptPanel() {
    mutePlayer();
    const existingSegments = extractSegmentsFromPanel();
    if (existingSegments.length) {
      return {
        ok: true,
        segments: existingSegments,
        language: 'unknown',
        fileName: 'youtube-transcript-panel',
        method: 'visible-panel-dom',
      };
    }

    const existingHtmlSegments = extractSegmentsFromTranscriptHtml((transcriptPanelRoot() || document.documentElement).innerHTML);
    if (existingHtmlSegments.length) {
      return {
        ok: true,
        segments: existingHtmlSegments,
        language: 'unknown',
        fileName: 'youtube-transcript-panel-html',
        method: 'visible-panel-html',
      };
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      mutePlayer();
      const segments = extractSegmentsFromPanel();
      if (segments.length) {
        return {
          ok: true,
          segments,
          language: 'unknown',
          fileName: 'youtube-transcript-panel',
          method: 'panel-dom',
        };
      }
      await sleep(250);
    }

    const htmlSegments = extractSegmentsFromTranscriptHtml(document.documentElement.innerHTML);
    if (htmlSegments.length) {
      return {
        ok: true,
        segments: htmlSegments,
        language: 'unknown',
        fileName: 'youtube-transcript-panel-html',
        method: 'panel-html',
      };
    }

    const visibleRows = document.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer, macro-markers-panel-item-view-model').length;
    const panel = transcriptPanelRoot();
    return {
      ok: false,
      error: `Transcript panel opened but parsed 0 lines. Visible transcript row nodes: ${visibleRows}. Panel found: ${Boolean(panel)}.`,
    };
  }

  async function waitForPlayerReady() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const player = getLivePlayerResponse();
      const videoId = player?.videoDetails?.videoId || '';
      if (videoId) return { player, videoId };
      await sleep(80);
    }
    return { player: getLivePlayerResponse(), videoId: getLivePlayerResponse()?.videoDetails?.videoId || '' };
  }

  async function tryApiPaths(player, innerTubeMethod = 'innertube') {
    const [innerTubeResult, captionResult] = await Promise.all([
      tryInnerTube(player, innerTubeMethod),
      tryCaptionTracks(player),
    ]);
    if (innerTubeResult?.segments?.length) return { ...innerTubeResult, ok: true };
    if (captionResult?.segments?.length) return { ...captionResult, ok: true };
    return {
      ok: false,
      errors: [
        innerTubeResult?.error,
        captionResult === null && player?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length
          ? 'Caption track download returned empty.'
          : null,
      ].filter(Boolean),
    };
  }

  return (async () => {
    const errors = [];
    mutePlayer();
    let { player } = await waitForPlayerReady();

    // Fast path: direct HTTP requests from data already in the page (no scroll, no clicks).
    const apiFirst = await tryApiPaths(player);
    if (apiFirst?.ok) return apiFirst;
    if (apiFirst?.errors?.length) errors.push(...apiFirst.errors);

    if (apiOnly) {
      return {
        ok: false,
        error: errors.filter(Boolean).join(' · ') || 'API transcript fetch returned no caption lines.',
      };
    }

    if (!backgroundOnly) {
      const visibleSegments = extractSegmentsFromPanel();
      if (visibleSegments.length) {
        return {
          ok: true,
          segments: visibleSegments,
          language: 'unknown',
          fileName: 'youtube-visible-panel',
          method: 'visible-panel-dom',
        };
      }

      const htmlSegments = extractSegmentsFromTranscriptHtml(document.documentElement.innerHTML);
      if (htmlSegments.length) {
        return {
          ok: true,
          segments: htmlSegments,
          language: 'unknown',
          fileName: 'youtube-visible-panel-html',
          method: 'visible-panel-html',
        };
      }
    }

    // Slow path: lazy-loaded pages may only expose transcript token/UI after interaction.
    await wakeYouTubePageInPage();
    player = getLivePlayerResponse();
    const apiAfterWake = await tryApiPaths(player, 'innertube-after-wake');
    if (apiAfterWake?.ok) return apiAfterWake;
    if (apiAfterWake?.errors?.length) errors.push(...apiAfterWake.errors);

    const openResult = await openTranscriptUi();
    if (!openResult.ok) {
      errors.push(openResult.error);
    } else {
      player = getLivePlayerResponse();
      const apiAfterPanel = await tryApiPaths(player, 'innertube-after-panel');
      if (apiAfterPanel?.ok) return apiAfterPanel;
      if (apiAfterPanel?.errors?.length) errors.push(...apiAfterPanel.errors);
    }

    const panelResult = await scrapeTranscriptPanel();
    if (panelResult?.segments?.length) return { ...panelResult, ok: true };
    if (panelResult?.error) errors.push(panelResult.error);

    return {
      ok: false,
      error: errors.filter(Boolean).join(' · ') || 'No transcript methods returned caption lines.',
    };
  })();
}

function fetchTranscriptFromPanelInPage() {
  return fetchVisibleTranscriptPanelOnlyInPage();
}

function fetchVisibleTranscriptPanelOnlyInPage() {
  return wakeYouTubePageInPage().then(() => {
  const stripText = (text) => String(text || '').replace(/\s+/g, ' ').trim();
  const parseClock = (label) => {
    const parts = String(label || '').trim().split(':').map(Number);
    if (parts.some(part => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };
  const secondsToClock = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };
  const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]')
    || document.querySelector('ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]')
    || document.querySelector('yt-section-list-renderer[data-target-id*="transcript"]')
    || document.querySelector('ytd-transcript-renderer')
    || document;
  let rowNodes = [...panel.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer')];
  if (!rowNodes.length && panel !== document) {
    rowNodes = [...document.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer')];
  }
  const segments = [];

  for (const row of rowNodes) {
    const timestampEl = row.querySelector(
      '.ytwTranscriptSegmentViewModelTimestamp, .segment-timestamp, .segment-start-offset, [class*="TranscriptSegmentViewModelTimestamp"], [class*="timestamp"]',
    );
    const textEl = row.querySelector(
      'span.ytAttributedStringHost, .segment-text, yt-formatted-string.segment-text, yt-formatted-string, span.yt-core-attributed-string',
    );
    const rowText = stripText(row.textContent || '');
    const timeMatch = rowText.match(/\b(?:(\d{1,2}:)?\d{1,2}:\d{2})\b/);
    const timestampText = stripText(timestampEl?.textContent || timeMatch?.[0] || '');
    const text = stripText((textEl?.textContent || rowText).replace(timestampText, '').replace(timeMatch?.[0] || '', ''));
    if (!timestampText || !text) continue;
    const start = parseClock(timestampText);
    segments.push({
      start: Number(start.toFixed(3)),
      end: Number(start.toFixed(3)),
      duration: 0,
      timestamp_label: secondsToClock(start),
      text,
    });
  }

  const seen = new Set();
  const uniqueSegments = segments.filter((segment) => {
    const key = `${segment.start}|${segment.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (let i = 0; i < uniqueSegments.length; i++) {
    const nextStart = uniqueSegments[i + 1]?.start;
    if (Number.isFinite(nextStart) && nextStart > uniqueSegments[i].start) {
      uniqueSegments[i].end = Number(nextStart.toFixed(3));
      uniqueSegments[i].duration = Number((uniqueSegments[i].end - uniqueSegments[i].start).toFixed(3));
    }
  }

  if (uniqueSegments.length) {
    return {
      ok: true,
      segments: uniqueSegments,
      format: 'visible-panel-direct',
      rowNodes: rowNodes.length,
      url: window.location.href,
    };
  }

  return {
    ok: false,
    error: `Visible transcript panel parsed 0 lines. Row nodes: ${rowNodes.length}. URL: ${window.location.href}`,
    rowNodes: rowNodes.length,
    url: window.location.href,
  };
  });
}

function findTranscriptParamsInObject(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);
  if (typeof value.params === 'string' && (
    value.getTranscriptEndpoint
    || value.commandMetadata?.webCommandMetadata?.apiUrl === '/youtubei/v1/get_transcript'
  )) {
    return value.params;
  }
  if (typeof value.getTranscriptEndpoint?.params === 'string') return value.getTranscriptEndpoint.params;
  if (typeof value.transcriptEndpoint?.params === 'string') return value.transcriptEndpoint.params;
  for (const child of Object.values(value)) {
    const found = findTranscriptParamsInObject(child, seen);
    if (found) return found;
  }
  return '';
}

function extractTranscriptParams(player, html, initialData = null) {
  const fromPlayer = player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams;
  if (fromPlayer) return fromPlayer;

  const pageInitialData = typeof window !== 'undefined' ? window.ytInitialData : null;
  const fromInitialData = findTranscriptParamsInObject(initialData || pageInitialData);
  if (fromInitialData) return fromInitialData;

  const htmlText = String(html || '');
  const patterns = [
    /"openTranscriptParams":"([^"]+)"/,
    /"getTranscriptEndpoint":\{"params":"([^"]+)"/,
    /"apiUrl":"\/youtubei\/v1\/get_transcript"[\s\S]{0,500}?"params":"([^"]+)"/,
    /"params":"([^"]+)"[\s\S]{0,500}?"apiUrl":"\/youtubei\/v1\/get_transcript"/,
  ];
  for (const pattern of patterns) {
    const match = htmlText.match(pattern);
    if (match?.[1]) return match[1].replace(/\\u0026/g, '&');
  }
  return '';
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

  function findKeyDeep(value, key, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
    for (const child of Object.values(value)) {
      const found = findKeyDeep(child, key, seen);
      if (found !== null && found !== undefined) return found;
    }
    return null;
  }

  function segmentTextFromRenderer(renderer) {
    const snippet = renderer?.snippet;
    if (!snippet) return '';
    if (Array.isArray(snippet.runs)) {
      return stripHtml(snippet.runs.map(run => run?.text || '').join(''));
    }
    return stripHtml(snippet.simpleText || snippet.text || '');
  }

  function parseInitialSegments(data) {
    const listRenderer = findKeyDeep(data, 'transcriptSegmentListRenderer');
    const initialSegments = Array.isArray(listRenderer?.initialSegments) ? listRenderer.initialSegments : [];
    const segments = [];

    for (const item of initialSegments) {
      const renderer = item?.transcriptSegmentRenderer || item;
      const text = segmentTextFromRenderer(renderer);
      const startMs = Number(renderer?.startMs || renderer?.startOffsetMs || 0);
      const endMs = Number(renderer?.endMs || 0);
      if (!text) continue;
      const start = startMs / 1000;
      const end = endMs > startMs ? endMs / 1000 : start;
      segments.push({
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        duration: Number(Math.max(0, end - start).toFixed(3)),
        timestamp_label: stripHtml(renderer?.startTimeText?.simpleText || secondsToClock(start)),
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

  function parseInnerTubeResponse(data) {
    const initialSegments = parseInitialSegments(data);
    if (initialSegments.length) return initialSegments;

    const cuePaths = [
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.transcriptSectionHeaderRenderer?.transcript?.body?.transcriptBodyRenderer?.cueGroups,
    ];
    for (const cues of cuePaths) {
      const segments = cuesToSegments(cues);
      if (segments.length) return segments;
    }

    const cueGroups = findKeyDeep(data, 'cueGroups');
    if (Array.isArray(cueGroups)) {
      const segments = cuesToSegments(cueGroups);
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

function fetchTextInYouTubePage(fetchUrl) {
  return (async () => {
    try {
      const response = await fetch(fetchUrl, { credentials: 'include' });
      const text = await response.text();
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}`, preview: text.slice(0, 180) };
      return { ok: true, text };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  })();
}

function waitForYouTubeVideoReadyInPage(expectedVideoId) {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  return (async () => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const player = window.ytInitialPlayerResponse;
      const id = player?.videoDetails?.videoId || '';
      const onWatch = /\/watch/.test(window.location.pathname);
      if (onWatch && (!expectedVideoId || id === expectedVideoId)) {
        return { ok: true, videoId: id };
      }
      await sleep(80);
    }
    return { ok: false, error: 'YouTube watch page did not finish loading.' };
  })();
}

function fetchBrowseContinuationInPage(continuation) {
  return (async () => {
    if (!continuation) return { ok: false, error: 'No browse continuation token.' };

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

    const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
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
        },
        continuation,
      }),
    });

    const raw = await response.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: `Browse continuation parse failed (HTTP ${response.status}).` };
    }

    if (!response.ok) {
      const apiError = data?.error?.message || data?.errors?.[0]?.message || '';
      return { ok: false, error: apiError || `Browse continuation failed (HTTP ${response.status}).` };
    }

    return { ok: true, data };
  })();
}

const FRUIT_MINER_PAGE_HANDLERS = {
  wakeYouTubePageInPage,
  fetchTranscriptInPage,
  fetchTranscriptFromPanelInPage,
  fetchVisibleTranscriptPanelOnlyInPage,
  fetchCaptionTrackInPage,
  fetchInnerTubeTranscriptInPage,
  fetchTextInYouTubePage,
  waitForYouTubeVideoReadyInPage,
  fetchBrowseContinuationInPage,
};
for (const [name, handler] of Object.entries(FRUIT_MINER_PAGE_HANDLERS)) {
  globalThis[name] = handler;
}
