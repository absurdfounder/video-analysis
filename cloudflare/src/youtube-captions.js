const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch';
const YOUTUBEI_PLAYER_URL = 'https://www.youtube.com/youtubei/v1/player';
const YOUTUBEI_TRANSCRIPT_URL = 'https://www.youtube.com/youtubei/v1/get_transcript';
const DEFAULT_INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

const INNERTUBE_CLIENTS = [
  {
    label: 'WEB',
    clientName: 'WEB',
    clientVersion: '2.20240601.00.00',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
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
];

function safeText(value) {
  return String(value ?? '').trim();
}

function secondsToClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function extractYouTubeVideoId(value) {
  const raw = safeText(value);
  if (!raw) return '';
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtu.be')) return safeText(url.pathname.split('/').filter(Boolean)[0]);
    if (url.searchParams.get('v')) return safeText(url.searchParams.get('v'));
    const parts = url.pathname.split('/').filter(Boolean);
    const markerIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
    if (markerIndex >= 0) return safeText(parts[markerIndex + 1]);
  } catch {}
  const match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return match ? match[1] : '';
}

function decodeHtml(value) {
  return safeText(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function parseJsonObjectAfter(html, marker) {
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
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractInnertubeApiKey(html) {
  const match = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)
    || html.match(/innertubeApiKey"\s*:\s*"([^"]+)"/)
    || html.match(/INNERTUBE_API_KEY['"]?\s*[:=]\s*['"]([^'"]+)/);
  return safeText(match?.[1]) || DEFAULT_INNERTUBE_API_KEY;
}

function extractYtcfgValue(html, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  return safeText(html.match(pattern)?.[1]);
}

function captionTracksFromPlayer(player) {
  return player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
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

function extractTranscriptParams({ player, initialData, html }) {
  const fromPlayer = safeText(player?.captions?.playerCaptionsTracklistRenderer?.openTranscriptParams);
  if (fromPlayer) return fromPlayer;
  const fromInitialData = findTranscriptParamsInObject(initialData);
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

function parseLanguagePrefs(language) {
  const raw = safeText(language) || 'hi.*,hi,en.*,en';
  return raw.split(',').map((item) => safeText(item).toLowerCase()).filter(Boolean);
}

function trackName(track) {
  return safeText(track?.name?.simpleText)
    || safeText((track?.name?.runs || []).map((run) => run.text).join(' '))
    || safeText(track?.languageCode)
    || 'captions';
}

function languageMatches(pref, code) {
  if (!pref || !code) return false;
  if (pref.endsWith('.*')) return code.startsWith(pref.slice(0, -2));
  return code === pref;
}

function scoreCaptionTrack(track, prefs) {
  const code = safeText(track?.languageCode).toLowerCase();
  const prefIndex = prefs.findIndex((pref) => languageMatches(pref, code));
  const languageScore = prefIndex >= 0 ? (1000 - prefIndex * 20) : 0;
  const autoScore = track?.kind === 'asr' ? 8 : 20;
  const translatableScore = track?.isTranslatable ? 4 : 0;
  return languageScore + autoScore + translatableScore;
}

function pickCaptionTrack(tracks, language) {
  const items = (Array.isArray(tracks) ? tracks : []).filter((track) => safeText(track?.baseUrl));
  if (!items.length) return null;
  const prefs = parseLanguagePrefs(language);
  return items
    .map((track) => ({ track, score: scoreCaptionTrack(track, prefs) }))
    .sort((a, b) => b.score - a.score)[0]?.track || items[0];
}

function withCaptionFormat(baseUrl, format) {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', format);
  return url.toString();
}

function normalizeCaptionText(value) {
  return decodeHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function normalizeSegments(segments) {
  return segments
    .map((segment, index) => {
      const start = Number(segment.start_seconds) || 0;
      const end = segment.end_seconds == null ? null : Number(segment.end_seconds);
      return {
        segment_index: index,
        start_seconds: start,
        end_seconds: Number.isFinite(end) ? end : null,
        timestamp_label: safeText(segment.timestamp_label) || secondsToClock(start),
        text: normalizeCaptionText(segment.text),
        raw: segment.raw || {},
      };
    })
    .filter((segment) => segment.text);
}

function parseJson3Captions(data) {
  const events = Array.isArray(data?.events) ? data.events : [];
  return normalizeSegments(events.map((event) => {
    const text = (Array.isArray(event.segs) ? event.segs : [])
      .map((seg) => String(seg?.utf8 ?? ''))
      .join('');
    const start = Number(event.tStartMs) / 1000;
    const duration = Number(event.dDurationMs) / 1000;
    return {
      start_seconds: Number.isFinite(start) ? start : 0,
      end_seconds: Number.isFinite(start + duration) && duration > 0 ? start + duration : null,
      text,
      raw: event,
    };
  }));
}

function parseVttTimestamp(value) {
  const parts = safeText(value).replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function parseVttCaptions(text) {
  const blocks = safeText(text).replace(/\r/g, '').split(/\n\n+/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const [startRaw, endRaw] = lines[timingIndex].split('-->').map((item) => item.trim().split(/\s+/)[0]);
    const body = lines.slice(timingIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, ' ');
    segments.push({
      start_seconds: parseVttTimestamp(startRaw),
      end_seconds: parseVttTimestamp(endRaw),
      text: body,
      raw: { block },
    });
  }
  return normalizeSegments(segments);
}

function parseXmlCaptions(text) {
  const segments = [];
  const source = safeText(text);
  const regex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(source))) {
    const attrs = match[1] || '';
    const start = Number((attrs.match(/\bstart="([^"]+)"/) || [])[1]) || 0;
    const duration = Number((attrs.match(/\bdur="([^"]+)"/) || [])[1]) || 0;
    segments.push({
      start_seconds: start,
      end_seconds: duration > 0 ? start + duration : null,
      text: match[2].replace(/<[^>]+>/g, ' '),
      raw: { attrs },
    });
  }
  return normalizeSegments(segments);
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

function textFromRuns(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((run) => safeText(run?.text)).join('');
  return '';
}

function cueGroupsToSegments(cueGroups) {
  const segments = [];
  for (const group of cueGroups || []) {
    for (const cue of group?.transcriptCueGroupRenderer?.cues || []) {
      const renderer = cue?.transcriptCueRenderer;
      const text = textFromRuns(renderer?.cue);
      const startMs = Number(renderer?.startOffsetMs || renderer?.startMs || 0);
      const durationMs = Number(renderer?.durationMs || 0);
      if (!text) continue;
      segments.push({
        start_seconds: startMs / 1000,
        end_seconds: durationMs > 0 ? (startMs + durationMs) / 1000 : null,
        text,
        raw: renderer,
      });
    }
  }
  return normalizeSegments(segments);
}

function parseTranscriptSegmentList(data) {
  const listRenderer = findKeyDeep(data, 'transcriptSegmentListRenderer');
  const initialSegments = Array.isArray(listRenderer?.initialSegments) ? listRenderer.initialSegments : [];
  const segments = [];
  for (const item of initialSegments) {
    const renderer = item?.transcriptSegmentRenderer || item;
    const text = textFromRuns(renderer?.snippet);
    const startMs = Number(renderer?.startMs || renderer?.startOffsetMs || 0);
    const endMs = Number(renderer?.endMs || 0);
    if (!text) continue;
    segments.push({
      start_seconds: startMs / 1000,
      end_seconds: endMs > startMs ? endMs / 1000 : null,
      timestamp_label: safeText(renderer?.startTimeText?.simpleText),
      text,
      raw: renderer,
    });
  }
  const normalized = normalizeSegments(segments);
  for (let index = 0; index < normalized.length; index += 1) {
    const nextStart = normalized[index + 1]?.start_seconds;
    if (Number.isFinite(nextStart) && nextStart > normalized[index].start_seconds) {
      normalized[index].end_seconds = nextStart;
    }
  }
  return normalized;
}

function parseTranscriptResponse(data) {
  const initialSegments = parseTranscriptSegmentList(data);
  if (initialSegments.length) return initialSegments;

  const cuePaths = [
    data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups,
    data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptBodyRenderer?.cueGroups,
    data?.actions?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.transcriptSectionHeaderRenderer?.transcript?.body?.transcriptBodyRenderer?.cueGroups,
  ];
  for (const cueGroups of cuePaths) {
    const segments = cueGroupsToSegments(cueGroups);
    if (segments.length) return segments;
  }
  const cueGroups = findKeyDeep(data, 'cueGroups');
  if (Array.isArray(cueGroups)) return cueGroupsToSegments(cueGroups);
  return [];
}

async function fetchInnertubeTranscript(params, context, headers) {
  if (!params) throw new Error('No transcript params available.');
  const clientVersion = context.clientVersion || '2.20240601.00.00';
  const transcriptHeaders = {
    ...headers,
    'content-type': 'application/json',
    origin: 'https://www.youtube.com',
    referer: `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(context.videoId)}`,
    'x-origin': 'https://www.youtube.com',
    'x-youtube-client-name': '1',
    'x-youtube-client-version': clientVersion,
  };
  if (context.visitorData) transcriptHeaders['x-goog-visitor-id'] = context.visitorData;
  const response = await fetch(`${YOUTUBEI_TRANSCRIPT_URL}?key=${encodeURIComponent(context.apiKey || DEFAULT_INNERTUBE_API_KEY)}`, {
    method: 'POST',
    headers: transcriptHeaders,
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion,
          hl: context.hl || 'en',
          gl: context.gl || 'US',
          userAgent: headers['user-agent'],
          originalUrl: `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(context.videoId)}`,
        },
        user: {},
        request: { useSsl: true },
      },
      params,
    }),
  });
  const raw = await response.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`get_transcript parse failed (HTTP ${response.status})`);
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `get_transcript failed: HTTP ${response.status}`);
  }
  const segments = parseTranscriptResponse(data);
  if (!segments.length) throw new Error(data?.error?.message || `get_transcript returned no lines (HTTP ${response.status})`);
  return segments;
}

async function fetchCaptionSegments(baseUrl, fetchOptions) {
  const attempts = [
    { format: 'json3', parser: async (text) => parseJson3Captions(JSON.parse(text)) },
    { format: 'vtt', parser: async (text) => parseVttCaptions(text) },
    { format: 'srv3', parser: async (text) => parseXmlCaptions(text) },
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(withCaptionFormat(baseUrl, attempt.format), fetchOptions);
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

async function fetchWatchPlayer(videoId, headers) {
  const url = `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(videoId)}&hl=en`;
  const response = await fetch(url, { headers });
  const html = await response.text();
  if (!response.ok) throw new Error(`watch HTML failed: ${response.status}`);
  return {
    player: parseJsonObjectAfter(html, 'ytInitialPlayerResponse') || parseJsonObjectAfter(html, 'var ytInitialPlayerResponse ='),
    initialData: parseJsonObjectAfter(html, 'ytInitialData') || parseJsonObjectAfter(html, 'var ytInitialData ='),
    apiKey: extractInnertubeApiKey(html),
    visitorData: extractYtcfgValue(html, 'VISITOR_DATA'),
    clientVersion: extractYtcfgValue(html, 'INNERTUBE_CLIENT_VERSION'),
    hl: extractYtcfgValue(html, 'HL'),
    gl: extractYtcfgValue(html, 'GL'),
    html,
  };
}

async function fetchInnertubePlayer(videoId, apiKey, client, headers) {
  const contextClient = {
    clientName: client.clientName,
    clientVersion: client.clientVersion,
  };
  if (client.androidSdkVersion) contextClient.androidSdkVersion = client.androidSdkVersion;
  if (client.deviceModel) contextClient.deviceModel = client.deviceModel;
  const response = await fetch(`${YOUTUBEI_PLAYER_URL}?key=${encodeURIComponent(apiKey || DEFAULT_INNERTUBE_API_KEY)}`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
      'user-agent': client.userAgent,
      'x-youtube-client-name': client.clientName,
      'x-youtube-client-version': client.clientVersion,
    },
    body: JSON.stringify({
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      context: { client: contextClient },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${client.label} player failed: HTTP ${response.status}`);
  return data;
}

function buildYouTubeHeaders(env) {
  const headers = {
    accept: 'text/html,application/json,text/plain,*/*',
    'accept-language': 'en-US,en;q=0.9,hi;q=0.8',
    'user-agent': INNERTUBE_CLIENTS[0].userAgent,
  };
  const cookies = safeText(env?.YOUTUBE_COOKIES);
  if (cookies) headers.cookie = cookies;
  return headers;
}

export async function fetchYouTubeCaptionTranscript(env, options) {
  const videoId = safeText(options?.videoId) || extractYouTubeVideoId(options?.videoUrl);
  if (!videoId) throw new Error('Could not determine YouTube video ID.');
  const language = safeText(options?.language) || 'hi.*,hi,en.*,en';
  const headers = buildYouTubeHeaders(env);
  const attempts = [];
  let apiKey = DEFAULT_INNERTUBE_API_KEY;

  try {
    const watch = await fetchWatchPlayer(videoId, headers);
    apiKey = watch.apiKey || apiKey;
    const params = extractTranscriptParams(watch);
    if (params) {
      try {
        const segments = await fetchInnertubeTranscript(params, { ...watch, videoId }, headers);
        return {
          ok: true,
          videoId,
          language: 'unknown',
          method: 'innertube:get_transcript',
          methodLabel: 'YouTube Innertube transcript',
          source: 'youtube-innertube-transcript',
          model: 'youtube-captions',
          segments,
          attempts,
        };
      } catch (transcriptError) {
        attempts.push({ method: 'get_transcript', ok: false, error: transcriptError?.message || String(transcriptError) });
      }
    }
    const track = pickCaptionTrack(captionTracksFromPlayer(watch.player), language);
    if (track) {
      const caption = await fetchCaptionSegments(track.baseUrl, { headers });
      return {
        ok: true,
        videoId,
        language: safeText(track.languageCode) || 'unknown',
        method: `captionTracks:watch:${caption.format}`,
        methodLabel: `YouTube caption track (${trackName(track)}, ${caption.format})`,
        source: 'youtube-caption-tracks',
        model: 'youtube-captions',
        segments: caption.segments,
        attempts,
      };
    }
    attempts.push({ method: 'watch', ok: false, error: 'No captionTracks in watch metadata.' });
  } catch (error) {
    attempts.push({ method: 'watch', ok: false, error: error?.message || String(error) });
  }

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const player = await fetchInnertubePlayer(videoId, apiKey, client, headers);
      const track = pickCaptionTrack(captionTracksFromPlayer(player), language);
      if (!track) {
        attempts.push({ method: `innertube:${client.label}`, ok: false, error: 'No captionTracks.' });
        continue;
      }
      const caption = await fetchCaptionSegments(track.baseUrl, { headers });
      return {
        ok: true,
        videoId,
        language: safeText(track.languageCode) || 'unknown',
        method: `captionTracks:${client.label}:${caption.format}`,
        methodLabel: `YouTube ${client.label} captions (${trackName(track)}, ${caption.format})`,
        source: 'youtube-caption-tracks',
        model: 'youtube-captions',
        segments: caption.segments,
        attempts,
      };
    } catch (error) {
      attempts.push({ method: `innertube:${client.label}`, ok: false, error: error?.message || String(error) });
    }
  }

  const summary = attempts.map((attempt) => `${attempt.method}: ${attempt.error}`).join(' · ');
  throw new Error(summary || 'No YouTube caption tracks returned transcript lines.');
}
