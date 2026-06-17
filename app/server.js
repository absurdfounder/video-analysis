const express = require('express');
const { loadProjectData, saveProjectData, mergeProjectData, authorizeWrite } = require('./netlify/functions/_dataStore');
const { classifyVideosHeuristic } = require('./netlify/functions/_classify');
const { handler: transcriptHandler } = require('./netlify/functions/transcript');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '30mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      timeout: options.timeout || 120000,
      maxBuffer: options.maxBuffer || 1024 * 1024 * 50,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
    }, (error, stdout, stderr) => {
      if (error) {
        const e = new Error(stderr || error.message || 'Command failed');
        e.stdout = stdout;
        e.stderr = stderr;
        e.code = error.code;
        return reject(e);
      }
      resolve({ stdout, stderr });
    });
  });
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
  const parts = ts.replace(',', '.').split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
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
      current = {
        start: vttTimeToSeconds(match[1]),
        end: vttTimeToSeconds(match[2]),
        textParts: [],
      };
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
    const windowText = safeText([
      segments[i - 1]?.text || '',
      segments[i]?.text || '',
      segments[i + 1]?.text || '',
    ].join(' '));

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
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed: ${response.status}`;
    throw new Error(message);
  }

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

app.get('/api/status', async (_req, res) => {
  try {
    const { stdout } = await run('yt-dlp', ['--version'], { timeout: 15000 });
    res.json({ ok: true, ytdlpVersion: stdout.trim(), openaiConfigured: Boolean(process.env.OPENAI_API_KEY) });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'yt-dlp not found. Install it first: python3 -m pip install -U yt-dlp or brew install yt-dlp.' });
  }
});

app.post('/api/list-videos', async (req, res) => {
  try {
    const channelUrl = safeText(req.body.channelUrl);
    const maxVideos = Math.max(1, Math.min(Number(req.body.maxVideos || 50), 1000));
    if (!/^https?:\/\//i.test(channelUrl) || !/youtube\.com|youtu\.be/i.test(channelUrl)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid YouTube channel/video/playlist URL.' });
    }

    const args = [
      '--flat-playlist',
      '--dump-json',
      '--ignore-errors',
      '--no-warnings',
      '--playlist-end', String(maxVideos),
      channelUrl,
    ];

    const { stdout } = await run('yt-dlp', args, { timeout: 180000, maxBuffer: 1024 * 1024 * 100 });
    const videos = stdout.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .map(item => {
        const id = item.id || '';
        return {
          id,
          title: item.title || '',
          url: item.url && /^https?:/.test(item.url) ? item.url : `https://www.youtube.com/watch?v=${id}`,
          upload_date: item.upload_date || item.release_date || '',
          duration: item.duration || '',
          channel: item.channel || item.uploader || '',
          status: 'pending',
          language: '',
          transcriptText: '',
          segments: [],
          error: '',
        };
      })
      .filter(v => v.id);

    res.json({ ok: true, count: videos.length, videos });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.stderr || error.message });
  }
});

app.post('/api/transcript', async (req, res) => {
  try {
    const result = await transcriptHandler({
      httpMethod: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body || {}),
    });
    const payload = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    res.status(Number(result.statusCode) || 200).json(payload);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.stderr || error.message });
  }
});

app.post('/api/extract-prices', (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const rows = items.flatMap(extractPricesFromSegments);
    res.json({ ok: true, count: rows.length, rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/extract-prices-ai', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const apiKey = safeText(req.body.apiKey || process.env.OPENAI_API_KEY);
    const model = safeText(req.body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini');
    const maxVideos = Math.max(1, Math.min(Number(req.body.maxVideos || items.length || 1), 100));
    const maxCharsPerCall = Math.max(2500, Math.min(Number(req.body.maxCharsPerCall || 10000), 20000));

    if (!apiKey) {
      return res.status(400).json({ ok: false, error: 'Missing OpenAI API key. Set OPENAI_API_KEY before npm start, or paste it into the local app field.' });
    }

    const selected = items.slice(0, maxVideos);
    const allRows = [];
    for (const item of selected) {
      const rows = await aiExtractForItem(item, { apiKey, model, maxCharsPerCall });
      allRows.push(...rows);
    }

    res.json({ ok: true, count: allRows.length, rows: allRows, model });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/classify-videos', (req, res) => {
  try {
    const videos = Array.isArray(req.body.videos) ? req.body.videos : [];
    if (!videos.length) return res.status(400).json({ ok: false, error: 'No videos to classify.' });
    const classified = classifyVideosHeuristic(videos);
    const counts = classified.reduce((acc, video) => {
      const key = video.relevance || 'unclassified';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    res.json({ ok: true, videos: classified, aiUsed: false, counts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/data', async (_req, res) => {
  try {
    const data = await loadProjectData();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    if (!authorizeWrite({ headers: { authorization: req.headers.authorization || '' } })) {
      return res.status(401).json({ ok: false, error: 'Unauthorized. Set Authorization: Bearer <DATA_SYNC_TOKEN>.' });
    }
    const existing = await loadProjectData();
    const merged = mergeProjectData(existing, req.body || {});
    const saved = await saveProjectData(merged);
    res.json({
      ok: true,
      counts: {
        videos: saved.videos.length,
        priceRows: saved.priceRows.length,
        knownVideoIds: saved.knownVideoIds.length,
      },
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Fruit transcript app running at http://localhost:${PORT}`);
});
