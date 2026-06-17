/* global self */
const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch';
const YOUTUBEI_PLAYER_URL = 'https://www.youtube.com/youtubei/v1/player';
const YOUTUBEI_TRANSCRIPT_URL = 'https://www.youtube.com/youtubei/v1/get_transcript';
const DEFAULT_INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

const INNERTUBE_CLIENTS = [
  {
    label: 'ANDROID',
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    androidSdkVersion: 30,
    userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
  },
  {
    label: 'IOS',
    clientName: 'IOS',
    clientVersion: '19.09.3',
    deviceModel: 'iPhone16,2',
    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_4 like Mac OS X;)',
  },
  {
    label: 'TVHTML5',
    clientName: 'TVHTML5',
    clientVersion: '7.20240601.00.00',
    userAgent: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
  },
  {
    label: 'WEB',
    clientName: 'WEB',
    clientVersion: '2.20240601.00.00',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
];

function innertubeSafeText(value) {
  return String(value ?? '').trim();
}

function innertubeSecondsToClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function innertubeDecodeHtml(value) {
  return innertubeSafeText(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function innertubeParseJsonObjectAfter(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const braceStart = html.indexOf('{', start + marker.length);
  if (braceStart < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(braceStart, index + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function innertubeExtractApiKey(html) {
  const match = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)
    || html.match(/innertubeApiKey"\s*:\s*"([^"]+)"/);
  return innertubeSafeText(match?.[1]) || DEFAULT_INNERTUBE_API_KEY;
}

function innertubeExtractYtcfgValue(html, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  return innertubeSafeText(html.match(pattern)?.[1]);
}

function innertubeCaptionTracksFromPlayer(player) {
  return player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

function innertubeFindTranscriptParamsInObject(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);
  if (typeof value.params === 'string' && (
    value.getTranscriptEndpoint
    || value.commandMetadata?.webCommandMetadata?.apiUrl === '/youtubei/v1/get_transcript'
  )) return value.params;
  if (typeof value.getTranscriptEndpoint?.params === 'string') return value.getTranscriptEndpoint.params;
  for (const child of Object.values(value)) {
    const found = innertubeFindTranscriptParamsInObject(child, seen);
    if (found) return found;
  }
  return '';
}

function innertubeExtractTranscriptParams({ player, initialData, html }) {
  const fromPlayer = innertubeSafeText(player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams);
  if (fromPlayer) return fromPlayer;
  const fromInitialData = innertubeFindTranscriptParamsInObject(initialData);
  if (fromInitialData) return fromInitialData;
  const patterns = [
    /"openTranscriptParams":"([^"]+)"/,
    /"getTranscriptEndpoint":\{"params":"([^"]+)"/,
    /"apiUrl":"\/youtubei\/v1\/get_transcript"[\s\S]{0,500}?"params":"([^"]+)"/,
  ];
  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return match[1].replace(/\\u0026/g, '&');
  }
  return '';
}

function innertubeParseLanguagePrefs(language) {
  return String(language || 'hi.*,hi,en.*,en').split(',').map((item) => innertubeSafeText(item).toLowerCase()).filter(Boolean);
}

function innertubeLanguageMatches(pref, code) {
  if (!pref || !code) return false;
  if (pref.endsWith('.*')) return code.startsWith(pref.slice(0, -2));
  return code === pref;
}

function innertubeScoreCaptionTrack(track, prefs) {
  const code = innertubeSafeText(track?.languageCode).toLowerCase();
  const prefIndex = prefs.findIndex((pref) => innertubeLanguageMatches(pref, code));
  const languageScore = prefIndex >= 0 ? (1000 - prefIndex * 20) : 0;
  const autoScore = track?.kind === 'asr' ? 8 : 20;
  return languageScore + autoScore;
}

function innertubePickCaptionTrack(tracks, language) {
  const items = (Array.isArray(tracks) ? tracks : []).filter((track) => innertubeSafeText(track?.baseUrl));
  if (!items.length) return null;
  const prefs = innertubeParseLanguagePrefs(language);
  return items
    .map((track) => ({ track, score: innertubeScoreCaptionTrack(track, prefs) }))
    .sort((a, b) => b.score - a.score)[0]?.track || items[0];
}

function innertubeWithCaptionFormat(baseUrl, format) {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', format);
  return url.toString();
}

function innertubeNormalizeCaptionText(value) {
  return innertubeDecodeHtml(value).replace(/\s+/g, ' ').trim();
}

function innertubeNormalizeSegments(segments) {
  return segments
    .map((segment, index) => {
      const start = Number(segment.start_seconds) || 0;
      const end = segment.end_seconds == null ? null : Number(segment.end_seconds);
      return {
        segment_index: index,
        start_seconds: start,
        end_seconds: Number.isFinite(end) ? end : null,
        timestamp_label: innertubeSafeText(segment.timestamp_label) || innertubeSecondsToClock(start),
        text: innertubeNormalizeCaptionText(segment.text),
      };
    })
    .filter((segment) => segment.text);
}

function innertubeToExtensionSegments(segments) {
  return innertubeNormalizeSegments(segments).map((segment) => {
    const start = segment.start_seconds;
    const end = segment.end_seconds == null ? start : segment.end_seconds;
    return {
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      duration: Number(Math.max(0, end - start).toFixed(3)),
      timestamp_label: segment.timestamp_label,
      text: segment.text,
    };
  });
}

function innertubeParseJson3Captions(data) {
  const events = Array.isArray(data?.events) ? data.events : [];
  return innertubeNormalizeSegments(events.map((event) => {
    const text = (Array.isArray(event.segs) ? event.segs : []).map((seg) => String(seg?.utf8 ?? '')).join('');
    const start = Number(event.tStartMs) / 1000;
    const duration = Number(event.dDurationMs) / 1000;
    return {
      start_seconds: Number.isFinite(start) ? start : 0,
      end_seconds: Number.isFinite(start + duration) && duration > 0 ? start + duration : null,
      text,
    };
  }));
}

function innertubeParseVttTimestamp(value) {
  const parts = innertubeSafeText(value).replace(',', '.').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function innertubeParseVttCaptions(text) {
  const blocks = innertubeSafeText(text).replace(/\r/g, '').split(/\n\n+/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const [startRaw, endRaw] = lines[timingIndex].split('-->').map((item) => item.trim().split(/\s+/)[0]);
    segments.push({
      start_seconds: innertubeParseVttTimestamp(startRaw),
      end_seconds: innertubeParseVttTimestamp(endRaw),
      text: lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, ' '),
    });
  }
  return innertubeNormalizeSegments(segments);
}

function innertubeParseXmlCaptions(text) {
  const segments = [];
  const regex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(String(text || '')))) {
    const attrs = match[1] || '';
    const start = Number((attrs.match(/\bstart="([^"]+)"/) || [])[1]) || 0;
    const duration = Number((attrs.match(/\bdur="([^"]+)"/) || [])[1]) || 0;
    segments.push({
      start_seconds: start,
      end_seconds: duration > 0 ? start + duration : null,
      text: match[2].replace(/<[^>]+>/g, ' '),
    });
  }
  return innertubeNormalizeSegments(segments);
}

function innertubeFindKeyDeep(value, key, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
  for (const child of Object.values(value)) {
    const found = innertubeFindKeyDeep(child, key, seen);
    if (found !== null && found !== undefined) return found;
  }
  return null;
}

function innertubeTextFromRuns(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((run) => innertubeSafeText(run?.text)).join('');
  return '';
}

function innertubeParseTranscriptSegmentList(data) {
  const listRenderer = innertubeFindKeyDeep(data, 'transcriptSegmentListRenderer');
  const initialSegments = Array.isArray(listRenderer?.initialSegments) ? listRenderer.initialSegments : [];
  const segments = [];
  for (const item of initialSegments) {
    const renderer = item?.transcriptSegmentRenderer || item;
    const text = innertubeTextFromRuns(renderer?.snippet);
    const startMs = Number(renderer?.startMs || renderer?.startOffsetMs || 0);
    const endMs = Number(renderer?.endMs || 0);
    if (!text) continue;
    segments.push({
      start_seconds: startMs / 1000,
      end_seconds: endMs > startMs ? endMs / 1000 : null,
      timestamp_label: innertubeSafeText(renderer?.startTimeText?.simpleText),
      text,
    });
  }
  const normalized = innertubeNormalizeSegments(segments);
  for (let index = 0; index < normalized.length; index += 1) {
    const nextStart = normalized[index + 1]?.start_seconds;
    if (Number.isFinite(nextStart) && nextStart > normalized[index].start_seconds) {
      normalized[index].end_seconds = nextStart;
    }
  }
  return normalized;
}

function innertubeParseTranscriptResponse(data) {
  const initialSegments = innertubeParseTranscriptSegmentList(data);
  if (initialSegments.length) return initialSegments;
  const cueGroups = innertubeFindKeyDeep(data, 'cueGroups');
  if (!Array.isArray(cueGroups)) return [];
  const segments = [];
  for (const group of cueGroups) {
    for (const cue of group?.transcriptCueGroupRenderer?.cues || []) {
      const renderer = cue?.transcriptCueRenderer;
      const text = innertubeTextFromRuns(renderer?.cue);
      const startMs = Number(renderer?.startOffsetMs || renderer?.startMs || 0);
      const durationMs = Number(renderer?.durationMs || 0);
      if (!text) continue;
      segments.push({
        start_seconds: startMs / 1000,
        end_seconds: durationMs > 0 ? (startMs + durationMs) / 1000 : null,
        text,
      });
    }
  }
  return innertubeNormalizeSegments(segments);
}

function innertubeBuildHeaders(userAgent) {
  return {
    accept: 'text/html,application/json,text/plain,*/*',
    'accept-language': 'en-US,en;q=0.9,hi;q=0.8',
    'user-agent': userAgent || INNERTUBE_CLIENTS[0].userAgent,
  };
}

async function innertubeFetchCaptionSegments(baseUrl, fetchOptions) {
  const attempts = [
    { format: 'json3', parser: async (text) => innertubeParseJson3Captions(JSON.parse(text)) },
    { format: 'vtt', parser: async (text) => innertubeParseVttCaptions(text) },
    { format: 'srv3', parser: async (text) => innertubeParseXmlCaptions(text) },
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(innertubeWithCaptionFormat(baseUrl, attempt.format), fetchOptions);
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const segments = await attempt.parser(text);
      if (segments.length) return { format: attempt.format, segments };
      errors.push(`${attempt.format}: empty`);
    } catch (error) {
      errors.push(`${attempt.format}: ${error?.message || error}`);
    }
  }
  throw new Error(errors.join(' · ') || 'No caption format returned lines.');
}

async function innertubeFetchWatchPlayer(videoId, headers) {
  const url = `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(videoId)}&hl=en`;
  const response = await fetch(url, { headers, credentials: 'include' });
  const html = await response.text();
  if (!response.ok) throw new Error(`watch HTML failed: ${response.status}`);
  return {
    player: innertubeParseJsonObjectAfter(html, 'ytInitialPlayerResponse') || innertubeParseJsonObjectAfter(html, 'var ytInitialPlayerResponse ='),
    initialData: innertubeParseJsonObjectAfter(html, 'ytInitialData') || innertubeParseJsonObjectAfter(html, 'var ytInitialData ='),
    apiKey: innertubeExtractApiKey(html),
    visitorData: innertubeExtractYtcfgValue(html, 'VISITOR_DATA'),
    clientVersion: innertubeExtractYtcfgValue(html, 'INNERTUBE_CLIENT_VERSION'),
    hl: innertubeExtractYtcfgValue(html, 'HL'),
    gl: innertubeExtractYtcfgValue(html, 'GL'),
    html,
  };
}

async function innertubeFetchPlayer(videoId, apiKey, client, headers) {
  const contextClient = {
    clientName: client.clientName,
    clientVersion: client.clientVersion,
    hl: 'en',
    gl: 'US',
  };
  if (client.androidSdkVersion) contextClient.androidSdkVersion = client.androidSdkVersion;
  if (client.deviceModel) contextClient.deviceModel = client.deviceModel;
  const response = await fetch(`${YOUTUBEI_PLAYER_URL}?key=${encodeURIComponent(apiKey || DEFAULT_INNERTUBE_API_KEY)}`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
      'user-agent': client.userAgent,
    },
    credentials: 'include',
    body: JSON.stringify({
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      context: { client: contextClient },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${client.label} player failed: HTTP ${response.status}`);
  const status = data?.playabilityStatus?.status;
  if (status && status !== 'OK') {
    throw new Error(`${client.label} player unplayable: ${data?.playabilityStatus?.reason || status}`);
  }
  return data;
}

async function innertubeFetchGetTranscript(params, context, headers) {
  const clientVersion = context.clientVersion || '2.20240601.00.00';
  const transcriptHeaders = {
    ...headers,
    'content-type': 'application/json',
    origin: 'https://www.youtube.com',
    referer: `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(context.videoId)}`,
  };
  if (context.visitorData) transcriptHeaders['x-goog-visitor-id'] = context.visitorData;
  const response = await fetch(`${YOUTUBEI_TRANSCRIPT_URL}?key=${encodeURIComponent(context.apiKey || DEFAULT_INNERTUBE_API_KEY)}`, {
    method: 'POST',
    headers: transcriptHeaders,
    credentials: 'include',
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion,
          hl: context.hl || 'en',
          gl: context.gl || 'US',
          originalUrl: `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(context.videoId)}`,
        },
        user: {},
        request: { useSsl: true },
      },
      params,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `get_transcript failed: HTTP ${response.status}`);
  const segments = innertubeParseTranscriptResponse(data);
  if (!segments.length) throw new Error('get_transcript returned no lines.');
  return segments;
}

async function fetchInnertubeCaptionTranscript(videoId, language = 'hi.*,hi,en.*,en') {
  const id = innertubeSafeText(videoId);
  if (!id) throw new Error('Missing YouTube video ID.');
  const headers = innertubeBuildHeaders(INNERTUBE_CLIENTS[0].userAgent);
  const fetchOptions = { headers, credentials: 'include' };
  const attempts = [];
  let apiKey = DEFAULT_INNERTUBE_API_KEY;

  // Browser session + watch HTML is the most reliable path inside the extension.
  try {
    const watch = await innertubeFetchWatchPlayer(id, headers);
    apiKey = watch.apiKey || apiKey;
    const track = innertubePickCaptionTrack(innertubeCaptionTracksFromPlayer(watch.player), language);
    if (track) {
      const caption = await innertubeFetchCaptionSegments(track.baseUrl, fetchOptions);
      return {
        ok: true,
        videoId: id,
        language: innertubeSafeText(track.languageCode) || 'unknown',
        method: `innertube-watch-${caption.format}`,
        fileName: 'innertube-watch',
        segments: innertubeToExtensionSegments(caption.segments),
      };
    }
    const params = innertubeExtractTranscriptParams(watch);
    if (params) {
      try {
        const segments = await innertubeFetchGetTranscript(params, { ...watch, videoId: id }, headers);
        return {
          ok: true,
          videoId: id,
          language: 'unknown',
          method: 'innertube-get_transcript',
          fileName: 'innertube-transcript',
          segments: innertubeToExtensionSegments(segments),
        };
      } catch (transcriptError) {
        attempts.push({ method: 'get_transcript', ok: false, error: transcriptError?.message || String(transcriptError) });
      }
    }
    attempts.push({ method: 'watch', ok: false, error: 'No captionTracks in watch metadata.' });
  } catch (error) {
    attempts.push({ method: 'watch', ok: false, error: error?.message || String(error) });
  }

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const player = await innertubeFetchPlayer(id, apiKey, client, headers);
      const track = innertubePickCaptionTrack(innertubeCaptionTracksFromPlayer(player), language);
      if (!track) {
        attempts.push({ method: `innertube:${client.label}`, ok: false, error: 'No captionTracks.' });
        continue;
      }
      const caption = await innertubeFetchCaptionSegments(track.baseUrl, fetchOptions);
      return {
        ok: true,
        videoId: id,
        language: innertubeSafeText(track.languageCode) || 'unknown',
        method: `innertube-${client.label}-${caption.format}`,
        fileName: `innertube-${client.label}`,
        segments: innertubeToExtensionSegments(caption.segments),
      };
    } catch (error) {
      attempts.push({ method: `innertube:${client.label}`, ok: false, error: error?.message || String(error) });
    }
  }

  const summary = attempts.map((attempt) => `${attempt.method}: ${attempt.error}`).join(' · ');
  throw new Error(summary || 'No YouTube caption tracks returned transcript lines.');
}

self.fetchInnertubeCaptionTranscript = fetchInnertubeCaptionTranscript;
