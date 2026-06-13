const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
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
      if (current && current.textParts.length) {
        const text = stripHtml(current.textParts.join(' '));
        if (text) segments.push({
          start: Number(current.start.toFixed(3)),
          end: Number(current.end.toFixed(3)),
          duration: Number(Math.max(0, current.end - current.start).toFixed(3)),
          timestamp_label: secondsToClock(current.start),
          text,
        });
      }
      current = { start: vttTimeToSeconds(match[1]), end: vttTimeToSeconds(match[2]), textParts: [] };
      continue;
    }

    if (current) {
      if (/^\d+$/.test(line)) continue;
      current.textParts.push(line);
    }
  }

  if (current && current.textParts.length) {
    const text = stripHtml(current.textParts.join(' '));
    if (text) segments.push({
      start: Number(current.start.toFixed(3)),
      end: Number(current.end.toFixed(3)),
      duration: Number(Math.max(0, current.end - current.start).toFixed(3)),
      timestamp_label: secondsToClock(current.start),
      text,
    });
  }

  const deduped = [];
  let prev = '';
  for (const seg of segments) {
    if (!seg.text || seg.text === prev) continue;
    deduped.push(seg);
    prev = seg.text;
  }
  return deduped;
}

function languageScore(fileName) {
  const f = fileName.toLowerCase();
  if (f.includes('.hi.')) return 0;
  if (f.includes('.hi-') || f.includes('.hi_')) return 1;
  if (f.includes('.en.')) return 2;
  if (f.includes('.en-') || f.includes('.en_')) return 3;
  return 9;
}

function guessLanguage(fileName) {
  const f = fileName.toLowerCase();
  if (f.includes('.hi.')) return 'hi';
  if (f.includes('.hi-') || f.includes('.hi_')) return 'hi-auto/translated';
  if (f.includes('.en.')) return 'en';
  if (f.includes('.en-') || f.includes('.en_')) return 'en-auto/translated';
  return 'unknown';
}

function flagToArg(name) {
  return `--${String(name).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
}

function flagsToArgs(flags = {}) {
  const args = [];
  for (const [name, value] of Object.entries(flags)) {
    if (value === false || value === null || value === undefined) continue;
    const arg = flagToArg(name);
    if (value === true) {
      args.push(arg);
    } else if (Array.isArray(value)) {
      for (const item of value) args.push(arg, String(item));
    } else {
      args.push(arg, String(value));
    }
  }
  return args;
}

function getYtdlpPath() {
  const candidates = [
    process.env.YTDLP_PATH,
    path.resolve(__dirname, '../../bin/yt-dlp'),
    path.resolve(process.cwd(), 'app/bin/yt-dlp'),
  ].filter(Boolean);
  const ytdlpPath = candidates.find(candidate => fs.existsSync(candidate));
  if (!ytdlpPath) {
    throw new Error('yt-dlp binary not found. Netlify build should run npm --prefix app run install-ytdlp.');
  }
  try { fs.chmodSync(ytdlpPath, 0o755); } catch {}
  return ytdlpPath;
}

function getYoutubeCookiesText() {
  if (process.env.YOUTUBE_COOKIES_BASE64) {
    return Buffer.from(process.env.YOUTUBE_COOKIES_BASE64, 'base64').toString('utf-8');
  }
  if (process.env.YOUTUBE_COOKIES) {
    return process.env.YOUTUBE_COOKIES.replace(/\\n/g, '\n');
  }
  return '';
}

function youtubeCookiesConfigured() {
  return Boolean(getYoutubeCookiesText().trim());
}

function writeYoutubeCookiesFile(options = {}) {
  const cookies = getYoutubeCookiesText().trim();
  if (!cookies) return '';
  const dir = options.cwd || os.tmpdir();
  const cookiePath = path.join(dir, 'youtube-cookies.txt');
  fs.writeFileSync(cookiePath, `${cookies}\n`, { mode: 0o600 });
  return cookiePath;
}

function cleanYtdlpError(errorText) {
  const text = safeText(errorText);
  if (/sign in to confirm.*not a bot/i.test(text)) {
    return [
      'YouTube blocked this Netlify server as bot-like traffic.',
      'Add YouTube cookies in Netlify as YOUTUBE_COOKIES or YOUTUBE_COOKIES_BASE64, redeploy, then retry Pull transcripts.',
      'Use a dedicated/throwaway YouTube account for cookies.',
    ].join(' ');
  }
  if (/cookies.*authentication|cookies-from-browser|exporting-youtube-cookies/i.test(text)) {
    return [
      'YouTube needs login cookies for this video.',
      'Add YouTube cookies in Netlify as YOUTUBE_COOKIES or YOUTUBE_COOKIES_BASE64, redeploy, then retry.',
    ].join(' ');
  }
  return text || 'yt-dlp failed';
}

function runYtdlp(url, flags = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const effectiveFlags = { ...flags };
    const cookiePath = writeYoutubeCookiesFile(options);
    if (cookiePath && !effectiveFlags.cookies) effectiveFlags.cookies = cookiePath;
    const args = [...flagsToArgs(effectiveFlags), url].filter(Boolean);
    execFile(getYtdlpPath(), args, {
      timeout: options.timeout || 25000,
      killSignal: 'SIGKILL',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      maxBuffer: options.maxBuffer || 1024 * 1024 * 80,
    }, (error, stdout, stderr) => {
      if (error) {
        const e = new Error(cleanYtdlpError(stderr || error.message));
        e.stdout = stdout;
        e.stderr = e.message;
        e.rawStderr = stderr;
        return reject(e);
      }
      resolve({ stdout, stderr });
    });
  });
}

const FRUITS = [
  { name: 'mango', terms: ['आम', 'mango', 'kesar', 'केसर', 'alphonso', 'अल्फांसो', 'hapus', 'हापुस', 'दशहरी', 'dasheri', 'लंगड़ा', 'langra', 'चौसा', 'chausa', 'safeda', 'सफेदा', 'तोतापुरी', 'totapuri', 'बंगनपल्ली', 'banganapalli'] },
  { name: 'apple', terms: ['सेब', 'apple', 'shimla apple', 'शिमला सेब', 'washington', 'वाशिंगटन'] },
  { name: 'banana', terms: ['केला', 'banana'] },
  { name: 'orange', terms: ['संतरा', 'orange', 'kinnow', 'किन्नू', 'माल्टा', 'malta'] },
  { name: 'mosambi', terms: ['मौसमी', 'mosambi', 'sweet lime'] },
  { name: 'pomegranate', terms: ['अनार', 'pomegranate'] },
  { name: 'grapes', terms: ['अंगूर', 'grapes'] },
  { name: 'papaya', terms: ['पपीता', 'papaya'] },
  { name: 'chikoo', terms: ['चीकू', 'sapota', 'chikoo'] },
  { name: 'watermelon', terms: ['तरबूज', 'watermelon'] },
  { name: 'muskmelon', terms: ['खरबूजा', 'muskmelon', 'melon'] },
  { name: 'pear', terms: ['नाशपाती', 'pear'] },
  { name: 'kiwi', terms: ['कीवी', 'kiwi'] },
  { name: 'dragon fruit', terms: ['ड्रैगन', 'dragon fruit'] },
  { name: 'lychee', terms: ['लीची', 'litchi', 'lychee'] },
  { name: 'guava', terms: ['अमरूद', 'guava'] },
  { name: 'plum', terms: ['आलूबुखारा', 'plum'] },
  { name: 'peach', terms: ['आड़ू', 'peach'] },
  { name: 'strawberry', terms: ['स्ट्रॉबेरी', 'strawberry'] },
  { name: 'pineapple', terms: ['अनानास', 'pineapple'] },
  { name: 'coconut', terms: ['नारियल', 'coconut'] },
];

const VARIETIES = [
  'kesar', 'केसर', 'alphonso', 'अल्फांसो', 'hapus', 'हापुस', 'dasheri', 'दशहरी', 'langra', 'लंगड़ा',
  'chausa', 'चौसा', 'safeda', 'सफेदा', 'totapuri', 'तोतापुरी', 'banganapalli', 'बंगनपल्ली',
  'shimla', 'शिमला', 'washington', 'वाशिंगटन', 'kinnow', 'किन्नू', 'malta', 'माल्टा'
];

function detectFruits(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const fruit of FRUITS) {
    if (fruit.terms.some(term => lower.includes(term.toLowerCase()))) found.push(fruit.name);
  }
  return found;
}

function detectVariety(text) {
  const lower = text.toLowerCase();
  const found = VARIETIES.find(v => lower.includes(v.toLowerCase()));
  return found || '';
}

function detectUnit(text) {
  const lower = text.toLowerCase();
  if (/(किलो|kg|kilo|kilogram|प्रति किलो)/i.test(lower)) return 'kg';
  if (/(पेटी|peti|box|carton)/i.test(lower)) return 'box/peti';
  if (/(क्रेट|crate|caret)/i.test(lower)) return 'crate';
  if (/(क्विंटल|quintal|qtl)/i.test(lower)) return 'quintal';
  if (/(दर्जन|dozen)/i.test(lower)) return 'dozen';
  if (/(पीस|piece|pcs|नग)/i.test(lower)) return 'piece';
  if (/(किलो का कट्टा|कट्टा|bag)/i.test(lower)) return 'bag';
  return 'unknown';
}

function normalizeNumeric(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : '';
}

function withLinks(row, item, timestamp) {
  const rounded = Math.max(0, Math.floor(Number(timestamp || row.timestamp_seconds || 0)));
  return {
    ...row,
    video_id: item.id || item.video_id || row.video_id || '',
    video_title: item.title || row.video_title || '',
    video_url: item.url || row.video_url || '',
    upload_date: item.upload_date || item.uploadDate || row.upload_date || '',
    timestamp_seconds: rounded,
    timestamp_label: secondsToClock(rounded),
    timestamp_url: timestampUrl(item.url || row.video_url || '', rounded),
  };
}

function extractPricesFromSegments(item) {
  const segments = Array.isArray(item.segments) && item.segments.length
    ? item.segments
    : safeText(item.transcriptText).split(/[।.!?\n]/).map((text, idx) => ({ start: idx, end: idx, duration: 0, text }));
  const rows = [];
  for (let i = 0; i < segments.length; i++) {
    const windowText = safeText([segments[i - 1]?.text || '', segments[i]?.text || '', segments[i + 1]?.text || ''].join(' '));
    const fruits = detectFruits(windowText);
    if (!fruits.length) continue;
    const re = /(?:₹|rs\.?|inr|रुपये|रुपया)?\s*(\d{1,6})(?:\s*(?:से|to|तक|-|–|—)\s*(?:₹|rs\.?|inr|रुपये|रुपया)?\s*(\d{1,6}))?/gi;
    let match;
    while ((match = re.exec(windowText)) !== null) {
      const a = Number(match[1]);
      const b = match[2] ? Number(match[2]) : a;
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (a <= 0 || b <= 0) continue;
      if ((a >= 1900 && a <= 2100) || (b >= 1900 && b <= 2100)) continue;
      if (a > 100000 || b > 100000) continue;
      for (const fruit of fruits) {
        rows.push(withLinks({
          fruit,
          fruit_hindi: '',
          variety: detectVariety(windowText),
          unit: detectUnit(windowText),
          min_price_inr: Math.min(a, b),
          max_price_inr: Math.max(a, b),
          confidence: match[2] ? 'medium' : 'low',
          original_line: segments[i].text,
          clean_hindi_line: '',
          context: windowText,
          source: 'regex',
        }, item, segments[i].start));
      }
    }
  }
  const seen = new Set();
  return rows.filter(row => {
    const key = [row.video_id, row.fruit, row.variety, row.unit, row.min_price_inr, row.max_price_inr, row.timestamp_seconds].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chunkSegments(segments, maxChars = 10000) {
  const chunks = [];
  let current = [];
  let chars = 0;
  for (const seg of segments) {
    const line = `[${Math.floor(Number(seg.start) || 0)}s | ${secondsToClock(seg.start)}] ${safeText(seg.text)}`;
    if (current.length && chars + line.length > maxChars) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(seg);
    chars += line.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function extractJson(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch {}
  }
  throw new Error('AI returned non-JSON output. Try again with a smaller batch.');
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You extract fruit mandi/wholesale market price information from noisy Hindi YouTube auto-captions.',
            'Captions may contain broken Hindi, spelling errors, repeated phrases, and bad segmentation.',
            'Use timestamps exactly from the segment where the price is said, or the nearest relevant segment.',
            'Extract only real fruit prices. Ignore dates, phone numbers, weights without prices, subscriber counts, and random numbers.',
            'Return JSON only with shape: {"rows":[...]}',
            'Each row fields: fruit, fruit_hindi, variety, unit, min_price_inr, max_price_inr, market_name, timestamp_seconds, confidence, original_line, clean_hindi_line, context, notes.',
            'For ranges like 60 से 80, min_price_inr=60 and max_price_inr=80. If one price is clearly said, min=max.',
            'If price is spoken in Hindi words, convert to digits only when clear. If unclear, skip it.',
            'confidence must be high, medium, or low.',
            'Do not invent missing fruits, varieties, units, or prices.',
          ].join('\n'),
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed: ${response.status}`);
  const content = data?.choices?.[0]?.message?.content || '';
  return extractJson(content);
}

async function aiExtractForItem(item, options) {
  const segments = Array.isArray(item.segments) && item.segments.length ? item.segments : [];
  if (!segments.length) return [];
  const chunks = chunkSegments(segments, options.maxCharsPerCall || 10000);
  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const segmentText = chunk.map(seg => `[${Math.floor(Number(seg.start) || 0)}s | ${secondsToClock(seg.start)}] ${safeText(seg.text)}`).join('\n');
    const prompt = [
      `Video title: ${item.title || ''}`,
      `Video URL: ${item.url || ''}`,
      `Upload date if known: ${item.upload_date || ''}`,
      `Chunk ${i + 1} of ${chunks.length}`,
      '',
      'Transcript segments:',
      segmentText,
    ].join('\n');
    const json = await callOpenAI({ apiKey: options.apiKey, model: options.model, prompt });
    const chunkRows = Array.isArray(json.rows) ? json.rows : [];
    for (const raw of chunkRows) {
      const min = normalizeNumeric(raw.min_price_inr);
      const max = normalizeNumeric(raw.max_price_inr);
      const timestamp = normalizeNumeric(raw.timestamp_seconds);
      if (min === '' || max === '' || timestamp === '') continue;
      if (min <= 0 || max <= 0 || min > 100000 || max > 100000) continue;
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
  const seen = new Set();
  return rows.filter(row => {
    const key = [row.video_id, row.fruit, row.variety, row.unit, row.min_price_inr, row.max_price_inr, row.timestamp_seconds, row.original_line].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  fs, os, path, crypto,
  json, parseBody, safeText, parseVtt, languageScore, guessLanguage, runYtdlp, youtubeCookiesConfigured,
  extractPricesFromSegments, aiExtractForItem,
};
