function fetchTranscriptFromPanelInPage() {
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
    try { video.pause(); } catch { /* ignore */ }
  }

  function findShowTranscriptButton() {
    const section = document.querySelector('ytd-video-description-transcript-section-renderer');
    if (section) {
      const button = section.querySelector('button, yt-button-shape button');
      if (button) return button;
    }
    return document.querySelector('button[aria-label="Show transcript"]')
      || [...document.querySelectorAll('button')].find((btn) => /show transcript/i.test(btn.getAttribute('aria-label') || ''));
  }

  function transcriptPanelRoot() {
    return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]')
      || document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]');
  }

  function extractSegmentsFromPanel() {
    const panel = transcriptPanelRoot();
    const scope = panel || document;
    const nodes = scope.querySelectorAll('ytd-transcript-segment-renderer, transcript-segment-view-model');
    if (!nodes.length) return [];

    const segments = [];
    for (const node of nodes) {
      const timestampEl = node.querySelector('.segment-timestamp, .segment-start-offset');
      const textEl = node.querySelector('.segment-text, yt-formatted-string.segment-text');
      const text = stripHtml(textEl?.textContent || '');
      const start = parseClockLabel(timestampEl?.textContent || '');
      if (!text) continue;
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

  return (async () => {
    mutePlayer();

    const moreButton = document.querySelector('#expand, ytd-text-inline-expander #expand, tp-yt-paper-button#expand');
    if (moreButton) {
      moreButton.click();
      await sleep(800);
    }

    const transcriptButton = findShowTranscriptButton();
    if (!transcriptButton) {
      return { ok: false, error: 'Show transcript button not found on this video.' };
    }

    transcriptButton.click();
    await sleep(1200);

    for (let attempt = 0; attempt < 40; attempt++) {
      mutePlayer();
      const segments = extractSegmentsFromPanel();
      if (segments.length) return { ok: true, segments, format: 'dom' };
      await sleep(500);
    }

    return { ok: false, error: 'Transcript panel opened but segments did not load.' };
  })();
}

function extractTranscriptParams(player, html) {
  const fromPlayer = player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams;
  if (fromPlayer) return fromPlayer;

  const htmlText = String(html || '');
  const patterns = [
    /"openTranscriptParams":"([^"]+)"/,
    /"getTranscriptEndpoint":\{"params":"([^"]+)"/,
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

  function parseInnerTubeResponse(data) {
    const cuePaths = [
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptBodyRenderer?.cueGroups,
      data?.actions?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.transcriptSectionHeaderRenderer?.transcript?.body?.transcriptBodyRenderer?.cueGroups,
    ];
    for (const cues of cuePaths) {
      const segments = cuesToSegments(cues);
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
