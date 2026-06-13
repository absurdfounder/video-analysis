chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'api') return false;
  handleApi(message.path, message.body || {})
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
  return true;
});

async function handleApi(path, body) {
  if (path === '/api/status') return status();
  if (path === '/api/list-videos') return listVideos(body);
  if (path === '/api/transcript') return transcript(body);
  if (path === '/api/extract-prices') return extractPrices(body);
  if (path === '/api/extract-prices-ai') return extractPricesAi(body);
  return { ok: false, error: `Unknown extension API route: ${path}` };
}

function status() {
  return {
    ok: true,
    extensionMode: true,
    ytdlpVersion: 'not needed in Chrome extension',
    youtubeCookiesConfigured: true,
    openaiConfigured: false,
    note: 'Chrome extension mode uses your browser YouTube session instead of Netlify/yt-dlp.',
  };
}

async function listVideos(body) {
  const channelUrl = safeText(body.channelUrl);
  const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || 25), 100));
  if (!/^https?:\/\//i.test(channelUrl) || !/(youtube\.com|youtu\.be)/i.test(channelUrl)) {
    return { ok: false, error: 'Please enter a valid YouTube channel/video/playlist URL.' };
  }

  const html = await fetchText(channelUrl);
  const initialData = extractJsonObject(html, 'ytInitialData');
  const videos = [];
  collectVideos(initialData, videos);

  const seen = new Set();
  const unique = videos
    .filter(video => {
      if (!video.id || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    })
    .slice(0, maxVideos)
    .map(video => ({
      id: video.id,
      title: video.title || video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      upload_date: video.upload_date || '',
      duration: video.duration || '',
      channel: video.channel || '',
      status: 'pending',
      language: '',
      transcriptText: '',
      segments: [],
      error: '',
    }));

  return { ok: true, count: unique.length, videos: unique };
}

async function transcript(body) {
  const videoUrl = safeText(body.videoUrl || body.url);
  const id = safeText(body.id || getVideoId(videoUrl));
  const languages = safeText(body.languages || 'hi.*,hi,en.*');
  if (!/^https?:\/\//i.test(videoUrl)) return { ok: false, error: 'Invalid video URL.' };

  const html = await fetchText(videoUrl);
  const player = extractJsonObject(html, 'ytInitialPlayerResponse');
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) {
    return { ok: false, id, error: 'No transcript/caption track found for this video.' };
  }

  const selected = chooseCaptionTrack(tracks, languages);
  const captionUrl = withCaptionFormat(selected.baseUrl);
  const vtt = await fetchText(captionUrl);
  const segments = parseVtt(vtt);
  const transcriptText = segments.map(segment => segment.text).join(' ');

  return {
    ok: true,
    id,
    language: selected.languageCode || 'unknown',
    fileName: selected.name?.simpleText || selected.languageCode || 'caption',
    segmentCount: segments.length,
    transcriptText,
    segments,
  };
}

function extractPrices(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const rows = [];
  for (const item of items) rows.push(...extractPricesFromSegments(item));
  return { ok: true, count: rows.length, rows };
}

async function extractPricesAi(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  const apiKey = safeText(body.apiKey);
  const model = safeText(body.model || 'gpt-4o-mini');
  const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || items.length || 1), 100));
  const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 10000), 20000));
  if (!apiKey) return { ok: false, error: 'OpenAI API key required in extension mode.' };

  const rows = [];
  for (const item of items.slice(0, maxVideos)) {
    const chunks = chunkSegments(item.segments || [], maxCharsPerCall);
    for (let i = 0; i < chunks.length; i++) {
      const segmentText = chunks[i].map(seg => `[${Math.floor(Number(seg.start) || 0)}s | ${secondsToClock(seg.start)}] ${safeText(seg.text)}`).join('\n');
      const prompt = [
        `Video title: ${item.title || ''}`,
        `Video URL: ${item.url || ''}`,
        `Upload date if known: ${item.upload_date || ''}`,
        `Chunk ${i + 1} of ${chunks.length}`,
        '',
        'Transcript segments:',
        segmentText,
      ].join('\n');
      const json = await callOpenAI({ apiKey, model, prompt });
      for (const raw of Array.isArray(json.rows) ? json.rows : []) {
        const min = normalizeNumeric(raw.min_price_inr);
        const max = normalizeNumeric(raw.max_price_inr);
        const timestamp = normalizeNumeric(raw.timestamp_seconds);
        if (min === '' || max === '' || timestamp === '') continue;
        rows.push(withLinks({
          fruit: safeText(raw.fruit),
          fruit_hindi: safeText(raw.fruit_hindi),
          variety: safeText(raw.variety),
          unit: safeText(raw.unit) || 'unknown',
          min_price_inr: Math.min(min, max),
          max_price_inr: Math.max(min, max),
          market_name: safeText(raw.market_name),
          confidence: ['high', 'medium', 'low'].includes(String(raw.confidence).toLowerCase()) ? String(raw.confidence).toLowerCase() : 'low',
          original_line: safeText(raw.original_line),
          clean_hindi_line: safeText(raw.clean_hindi_line),
          context: safeText(raw.context),
          notes: safeText(raw.notes),
          source: 'ai',
        }, item, timestamp));
      }
    }
  }
  return { ok: true, count: rows.length, rows: dedupeRows(rows) };
}

async function fetchText(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.text();
}

function extractJsonObject(html, name) {
  const patterns = [`var ${name} =`, `window["${name}"] =`, `${name} =`];
  for (const pattern of patterns) {
    const start = html.indexOf(pattern);
    if (start === -1) continue;
    const brace = html.indexOf('{', start);
    if (brace === -1) continue;
    const json = readBalancedJson(html, brace);
    if (json) return JSON.parse(json);
  }
  throw new Error(`Could not find ${name} in YouTube page.`);
}

function readBalancedJson(text, start) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function collectVideos(node, out) {
  if (!node || out.length >= 150) return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out);
    return;
  }
  if (typeof node !== 'object') return;
  const renderer = node.videoRenderer || node.gridVideoRenderer || node.compactVideoRenderer;
  if (renderer?.videoId) {
    out.push({
      id: renderer.videoId,
      title: textFromRuns(renderer.title),
      upload_date: textFromRuns(renderer.publishedTimeText),
      duration: textFromRuns(renderer.lengthText),
      channel: textFromRuns(renderer.ownerText || renderer.shortBylineText),
    });
  }
  for (const value of Object.values(node)) collectVideos(value, out);
}

function textFromRuns(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map(run => run.text || '').join('');
  return '';
}

function getVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.replace('/', '');
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function chooseCaptionTrack(tracks, languages) {
  const wanted = languages.split(',').map(value => value.trim().replace('.*', '').toLowerCase()).filter(Boolean);
  return [...tracks].sort((a, b) => {
    const aScore = wanted.findIndex(lang => String(a.languageCode || '').toLowerCase().startsWith(lang));
    const bScore = wanted.findIndex(lang => String(b.languageCode || '').toLowerCase().startsWith(lang));
    return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
  })[0];
}

function withCaptionFormat(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'vtt');
  return url.toString();
}

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

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

function timestampUrl(videoUrl, seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const url = new URL(videoUrl);
  url.searchParams.delete('t');
  url.searchParams.set('t', `${sec}s`);
  return url.toString();
}

function parseVtt(vttText) {
  const lines = String(vttText || '').replace(/\r/g, '').split('\n');
  const segments = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(line)) continue;
    const match = line.match(/(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
    if (match) {
      pushSegment(segments, current);
      current = { start: vttTimeToSeconds(match[1]), end: vttTimeToSeconds(match[2]), textParts: [] };
    } else if (current && !/^\d+$/.test(line)) {
      current.textParts.push(line);
    }
  }
  pushSegment(segments, current);
  return segments.filter((seg, index) => seg.text && (!index || seg.text !== segments[index - 1].text));
}

function pushSegment(segments, current) {
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

const FRUITS = [
  { name: 'mango', terms: ['आम', 'mango', 'kesar', 'alphonso', 'hapus', 'dasheri', 'langra', 'chausa', 'safeda', 'totapuri'] },
  { name: 'apple', terms: ['सेब', 'apple'] },
  { name: 'banana', terms: ['केला', 'banana'] },
  { name: 'orange', terms: ['संतरा', 'orange', 'kinnow'] },
  { name: 'lychee', terms: ['लीची', 'litchi', 'lychee'] },
  { name: 'grapes', terms: ['अंगूर', 'grapes'] },
  { name: 'pomegranate', terms: ['अनार', 'pomegranate'] },
  { name: 'papaya', terms: ['पपीता', 'papaya'] },
  { name: 'guava', terms: ['अमरूद', 'guava'] },
];

function extractPricesFromSegments(item) {
  const rows = [];
  const segments = Array.isArray(item.segments) ? item.segments : [];
  for (const seg of segments) {
    const text = safeText(seg.text);
    const prices = [...text.matchAll(/(?:rs\.?|₹|रुप(?:ए|ये)?|भाव|rate|price)?\s*(\d{1,5})(?:\s*(?:-|से|to)\s*(\d{1,5}))?/gi)];
    if (!prices.length) continue;
    const fruits = detectFruits(text);
    if (!fruits.length) continue;
    for (const match of prices.slice(0, 3)) {
      const min = normalizeNumeric(match[1]);
      const max = normalizeNumeric(match[2] || match[1]);
      if (min === '' || max === '' || min <= 0 || max > 100000) continue;
      for (const fruit of fruits) {
        rows.push(withLinks({
          fruit,
          fruit_hindi: '',
          variety: '',
          unit: detectUnit(text),
          min_price_inr: Math.min(min, max),
          max_price_inr: Math.max(min, max),
          market_name: '',
          confidence: 'medium',
          original_line: text,
          clean_hindi_line: text,
          context: text,
          notes: '',
          source: 'regex',
        }, item, seg.start));
      }
    }
  }
  return dedupeRows(rows);
}

function detectFruits(text) {
  const lower = text.toLowerCase();
  return FRUITS.filter(fruit => fruit.terms.some(term => lower.includes(term.toLowerCase()))).map(fruit => fruit.name);
}

function detectUnit(text) {
  const lower = text.toLowerCase();
  if (/(किलो|kg|kilo|kilogram|प्रति किलो)/i.test(lower)) return 'kg';
  if (/(पेटी|peti|box|carton)/i.test(lower)) return 'box/peti';
  if (/(क्रेट|crate|caret)/i.test(lower)) return 'crate';
  if (/(क्विंटल|quintal|qtl)/i.test(lower)) return 'quintal';
  if (/(दर्जन|dozen)/i.test(lower)) return 'dozen';
  if (/(पीस|piece|pcs|नग)/i.test(lower)) return 'piece';
  return 'unknown';
}

function normalizeNumeric(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : '';
}

function withLinks(row, item, timestamp) {
  return {
    ...row,
    upload_date: item.upload_date || '',
    video_id: item.id || '',
    video_title: item.title || '',
    video_url: item.url || '',
    timestamp_seconds: Math.floor(Number(timestamp) || 0),
    timestamp_label: secondsToClock(timestamp),
    timestamp_url: timestampUrl(item.url, timestamp),
  };
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = [row.video_id, row.fruit, row.unit, row.min_price_inr, row.max_price_inr, row.timestamp_seconds, row.original_line].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chunkSegments(segments, maxChars) {
  const chunks = [];
  let chunk = [];
  let size = 0;
  for (const seg of segments) {
    const line = `[${Math.floor(Number(seg.start) || 0)}s] ${safeText(seg.text)}`;
    if (chunk.length && size + line.length > maxChars) {
      chunks.push(chunk);
      chunk = [];
      size = 0;
    }
    chunk.push(seg);
    size += line.length;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Extract fruit mandi/wholesale price rows from noisy Hindi captions. Return JSON only: {"rows":[{"fruit":"","fruit_hindi":"","variety":"","unit":"","min_price_inr":0,"max_price_inr":0,"market_name":"","timestamp_seconds":0,"confidence":"high|medium|low","original_line":"","clean_hindi_line":"","context":"","notes":""}]}',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed: ${response.status}`);
  return extractJson(data?.choices?.[0]?.message?.content || '');
}

function extractJson(text) {
  const start = String(text).indexOf('{');
  const end = String(text).lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('AI did not return JSON.');
  return JSON.parse(String(text).slice(start, end + 1));
}

function cleanError(error) {
  const text = safeText(error?.message || error);
  if (/sign in to confirm.*not a bot/i.test(text)) {
    return 'YouTube blocked the request. Open youtube.com in this same Chrome profile, confirm you are signed in, then retry from the extension.';
  }
  return text || 'Extension request failed.';
}
