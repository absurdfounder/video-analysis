const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

import {
  chatWithVectorData,
  getVectorStatus,
  indexVectorDatabase,
} from './vectors.js';
import { DASHBOARD_HTML } from './dashboard.js';

const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';
const AUDIO_LIMIT_BYTES = 24 * 1024 * 1024;
const MAX_TRANSCRIPT_CHUNKS = 12;
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-max-age': '86400',
  };
}

function jsonResponse(body, status = 200, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request) },
  });
}

function htmlResponse(body, status = 200, request) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...corsHeaders(request) },
  });
}

function authorize(request, env) {
  const token = String(env.SYNC_TOKEN || '').trim();
  if (!token) return true;
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${token}`;
}

function safeText(value) {
  return String(value ?? '').trim();
}

function httpError(message, status = 500, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.extra = extra;
  return error;
}

function shortId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}

function extractYouTubeId(value) {
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

function secondsToClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function cleanBase64(value) {
  const raw = safeText(value);
  if (!raw) return '';
  const commaIndex = raw.indexOf(',');
  return raw.startsWith('data:') && commaIndex >= 0 ? raw.slice(commaIndex + 1) : raw;
}

function rowHash(row) {
  return [
    row.video_id,
    row.fruit,
    row.quality_grade,
    row.party_name,
    row.unit,
    row.min_price_inr,
    row.max_price_inr,
    row.timestamp_seconds,
    row.original_line,
  ].join('|').toLowerCase();
}

function extractJsonObject(text) {
  const raw = safeText(text);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return {};
}

function normalizeNumber(value) {
  const raw = safeText(value).replace(/[,₹]/g, '');
  if (!raw) return null;
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function marketDateSort(value) {
  const raw = safeText(value);
  if (!raw) return '';
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const match = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
    return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  return raw;
}

const PRODUCE_INFO = [
  ['mango', 'Mango', 'Aam', '🥭'],
  ['aam', 'Mango', 'Aam', '🥭'],
  ['onion', 'Onion', 'Pyaz', '🧅'],
  ['pyaz', 'Onion', 'Pyaz', '🧅'],
  ['pyaaz', 'Onion', 'Pyaz', '🧅'],
  ['potato', 'Potato', 'Aloo', '🥔'],
  ['aloo', 'Potato', 'Aloo', '🥔'],
  ['tomato', 'Tomato', 'Tamatar', '🍅'],
  ['tamatar', 'Tomato', 'Tamatar', '🍅'],
  ['garlic', 'Garlic', 'Lahsun', '🧄'],
  ['lahsun', 'Garlic', 'Lahsun', '🧄'],
  ['lychee', 'Lychee', 'Litchi', '🍒'],
  ['litchi', 'Lychee', 'Litchi', '🍒'],
  ['watermelon', 'Watermelon', 'Tarbooj', '🍉'],
  ['tarbooj', 'Watermelon', 'Tarbooj', '🍉'],
  ['pomegranate', 'Pomegranate', 'Anar', '🍎'],
  ['anar', 'Pomegranate', 'Anar', '🍎'],
  ['sweet lime', 'Sweet lime', 'Mausambi', '🍋'],
  ['mausambi', 'Sweet lime', 'Mausambi', '🍋'],
  ['coconut water', 'Coconut water', 'Nariyal Pani', '🥥'],
  ['nariyal', 'Coconut water', 'Nariyal Pani', '🥥'],
  ['grapes', 'Grapes', 'Angoor', '🍇'],
  ['angoor', 'Grapes', 'Angoor', '🍇'],
  ['banana', 'Banana', 'Kela', '🍌'],
  ['kela', 'Banana', 'Kela', '🍌'],
  ['papaya', 'Papaya', 'Papita', '🟠'],
  ['papita', 'Papaya', 'Papita', '🟠'],
  ['orange', 'Orange', 'Santra', '🍊'],
  ['santra', 'Orange', 'Santra', '🍊'],
  ['melon', 'Melon', 'Kharbooja', '🍈'],
  ['kharbooja', 'Melon', 'Kharbooja', '🍈'],
];

function produceInfo(value) {
  const raw = safeText(value).toLowerCase();
  const found = PRODUCE_INFO.find(([needle]) => raw.includes(needle));
  if (!found) return null;
  return {
    english: found[1],
    hinglish: found[2],
    label: `${found[1]} / ${found[2]}`,
    emoji: found[3],
  };
}

function removeRecorderName(value) {
  return safeText(value)
    .replace(/\bRana\s*Ji\b/ig, '')
    .replace(/\bRana\b/ig, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function slimVideo(video, channelUrl = '') {
  const segments = Array.isArray(video?.segments) ? video.segments : [];
  const analysisMeta = video?.analysisMeta || null;
  return {
    id: safeText(video?.id),
    channel_index: Number(video?.channelIndex) || null,
    title: safeText(video?.title),
    url: safeText(video?.url),
    upload_date: safeText(video?.upload_date),
    market_date: safeText(analysisMeta?.market_date || video?.market_date),
    market_date_sort: safeText(analysisMeta?.market_date_sort || video?.market_date_sort),
    channel_url: safeText(channelUrl),
    relevance: safeText(video?.relevance),
    status: safeText(video?.status),
    price_status: safeText(video?.priceStatus),
    price_row_count: Number(video?.priceRowCount) || 0,
    transcript_line_count: segments.length,
    language: safeText(video?.language),
    price_error: safeText(video?.priceError),
    analysis_meta_json: analysisMeta ? JSON.stringify(analysisMeta) : '',
    payload_json: JSON.stringify({
      channelIndex: video?.channelIndex,
      relevanceReason: video?.relevanceReason,
      relevanceCategory: video?.relevanceCategory,
      analysisSummary: video?.analysisSummary,
    }),
  };
}

function mapPriceRow(row) {
  const hash = rowHash(row);
  return {
    row_hash: hash,
    video_id: safeText(row.video_id),
    fruit: safeText(row.fruit),
    fruit_hindi: safeText(row.fruit_hindi),
    variety: safeText(row.variety),
    quality_grade: safeText(row.quality_grade),
    quality_label: safeText(row.quality_label),
    party_name: safeText(row.party_name),
    mandi_name: safeText(row.mandi_name),
    area_name: safeText(row.area_name),
    origin: safeText(row.origin),
    unit: safeText(row.unit),
    min_price_inr: row.min_price_inr === '' || row.min_price_inr == null ? null : Number(row.min_price_inr),
    max_price_inr: row.max_price_inr === '' || row.max_price_inr == null ? null : Number(row.max_price_inr),
    price_notes: safeText(row.price_notes),
    market_name: safeText(row.market_name),
    market_date: safeText(row.market_date),
    market_date_sort: safeText(row.market_date_sort),
    confidence: safeText(row.confidence),
    original_line: safeText(row.original_line),
    clean_hindi_line: safeText(row.clean_hindi_line),
    context: safeText(row.context),
    notes: safeText(row.notes),
    source: safeText(row.source),
    timestamp_seconds: Number(row.timestamp_seconds) || 0,
    timestamp_label: safeText(row.timestamp_label),
    timestamp_url: safeText(row.timestamp_url),
    video_title: safeText(row.video_title),
    video_url: safeText(row.video_url),
    upload_date: safeText(row.upload_date),
    payload_json: JSON.stringify(row),
  };
}

async function upsertSetting(db, key, value) {
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).bind(key, value).run();
}

async function syncProject(db, body) {
  const channelUrl = safeText(body.channelUrl);
  const videos = Array.isArray(body.videos) ? body.videos : [];
  const priceRows = Array.isArray(body.priceRows) ? body.priceRows : [];
  const videoAnalysis = body.videoAnalysis && typeof body.videoAnalysis === 'object' ? body.videoAnalysis : {};

  if (channelUrl) await upsertSetting(db, 'channelUrl', channelUrl);

  const touchedVideoIds = new Set();

  for (const video of videos) {
    if (!video?.id) continue;
    touchedVideoIds.add(video.id);
    const slim = slimVideo(video, channelUrl);
    await db.prepare(
      `INSERT INTO videos (
        id, channel_index, title, url, upload_date, market_date, market_date_sort, channel_url,
        relevance, status, price_status, price_row_count, transcript_line_count, language,
        price_error, analysis_meta_json, payload_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        channel_index = excluded.channel_index,
        title = excluded.title,
        url = excluded.url,
        upload_date = excluded.upload_date,
        market_date = excluded.market_date,
        market_date_sort = excluded.market_date_sort,
        channel_url = excluded.channel_url,
        relevance = excluded.relevance,
        status = excluded.status,
        price_status = excluded.price_status,
        price_row_count = excluded.price_row_count,
        transcript_line_count = excluded.transcript_line_count,
        language = excluded.language,
        price_error = excluded.price_error,
        analysis_meta_json = excluded.analysis_meta_json,
        payload_json = excluded.payload_json,
        updated_at = datetime('now')`,
    ).bind(
      slim.id,
      slim.channel_index,
      slim.title,
      slim.url,
      slim.upload_date,
      slim.market_date,
      slim.market_date_sort,
      slim.channel_url,
      slim.relevance,
      slim.status,
      slim.price_status,
      slim.price_row_count,
      slim.transcript_line_count,
      slim.language,
      slim.price_error,
      slim.analysis_meta_json,
      slim.payload_json,
    ).run();
  }

  const touchedRowHashes = new Set();
  for (const row of priceRows) {
    if (!row?.video_id) continue;
    const mapped = mapPriceRow(row);
    touchedRowHashes.add(mapped.row_hash);
    await db.prepare(
      `INSERT INTO price_rows (
        row_hash, video_id, fruit, fruit_hindi, variety, quality_grade, quality_label, party_name,
        mandi_name, area_name, origin, unit, min_price_inr, max_price_inr, price_notes, market_name,
        market_date, market_date_sort, confidence, original_line, clean_hindi_line, context, notes,
        source, timestamp_seconds, timestamp_label, timestamp_url, video_title, video_url, upload_date,
        payload_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(row_hash) DO UPDATE SET
        video_id = excluded.video_id,
        fruit = excluded.fruit,
        fruit_hindi = excluded.fruit_hindi,
        variety = excluded.variety,
        quality_grade = excluded.quality_grade,
        quality_label = excluded.quality_label,
        party_name = excluded.party_name,
        mandi_name = excluded.mandi_name,
        area_name = excluded.area_name,
        origin = excluded.origin,
        unit = excluded.unit,
        min_price_inr = excluded.min_price_inr,
        max_price_inr = excluded.max_price_inr,
        price_notes = excluded.price_notes,
        market_name = excluded.market_name,
        market_date = excluded.market_date,
        market_date_sort = excluded.market_date_sort,
        confidence = excluded.confidence,
        original_line = excluded.original_line,
        clean_hindi_line = excluded.clean_hindi_line,
        context = excluded.context,
        notes = excluded.notes,
        source = excluded.source,
        timestamp_seconds = excluded.timestamp_seconds,
        timestamp_label = excluded.timestamp_label,
        timestamp_url = excluded.timestamp_url,
        video_title = excluded.video_title,
        video_url = excluded.video_url,
        upload_date = excluded.upload_date,
        payload_json = excluded.payload_json,
        updated_at = datetime('now')`,
    ).bind(
      mapped.row_hash,
      mapped.video_id,
      mapped.fruit,
      mapped.fruit_hindi,
      mapped.variety,
      mapped.quality_grade,
      mapped.quality_label,
      mapped.party_name,
      mapped.mandi_name,
      mapped.area_name,
      mapped.origin,
      mapped.unit,
      mapped.min_price_inr,
      mapped.max_price_inr,
      mapped.price_notes,
      mapped.market_name,
      mapped.market_date,
      mapped.market_date_sort,
      mapped.confidence,
      mapped.original_line,
      mapped.clean_hindi_line,
      mapped.context,
      mapped.notes,
      mapped.source,
      mapped.timestamp_seconds,
      mapped.timestamp_label,
      mapped.timestamp_url,
      mapped.video_title,
      mapped.video_url,
      mapped.upload_date,
      mapped.payload_json,
    ).run();
  }

  const analysisEntries = Object.entries(videoAnalysis);
  for (const [videoId, meta] of analysisEntries) {
    if (!videoId || !meta || typeof meta !== 'object') continue;
    await db.prepare(
      `INSERT INTO video_analysis (video_id, meta_json, market_date, market_date_sort, mention_count, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(video_id) DO UPDATE SET
         meta_json = excluded.meta_json,
         market_date = excluded.market_date,
         market_date_sort = excluded.market_date_sort,
         mention_count = excluded.mention_count,
         source = excluded.source,
         updated_at = datetime('now')`,
    ).bind(
      safeText(videoId),
      JSON.stringify(meta),
      safeText(meta.market_date),
      safeText(meta.market_date_sort),
      Number(meta.mention_count) || 0,
      safeText(meta.source),
    ).run();
  }

  for (const video of videos) {
    if (!video?.analysisMeta?.video_id) continue;
    const meta = video.analysisMeta;
    await db.prepare(
      `INSERT INTO video_analysis (video_id, meta_json, market_date, market_date_sort, mention_count, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(video_id) DO UPDATE SET
         meta_json = excluded.meta_json,
         market_date = excluded.market_date,
         market_date_sort = excluded.market_date_sort,
         mention_count = excluded.mention_count,
         source = excluded.source,
         updated_at = datetime('now')`,
    ).bind(
      safeText(video.id),
      JSON.stringify(meta),
      safeText(meta.market_date),
      safeText(meta.market_date_sort),
      Number(meta.mention_count) || 0,
      safeText(meta.source),
    ).run();
  }

  await upsertSetting(db, 'updatedAt', new Date().toISOString());

  const counts = await getCounts(db);
  return counts;
}

async function getCounts(db) {
  const videos = await db.prepare('SELECT COUNT(*) AS count FROM videos').first();
  const priceRows = await db.prepare('SELECT COUNT(*) AS count FROM price_rows').first();
  const videoAnalysis = await db.prepare('SELECT COUNT(*) AS count FROM video_analysis').first();
  return {
    videos: Number(videos?.count) || 0,
    priceRows: Number(priceRows?.count) || 0,
    videoAnalysis: Number(videoAnalysis?.count) || 0,
  };
}

async function exportProject(db) {
  const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries((settingsRows.results || []).map((row) => [row.key, row.value]));

  const videoRows = await db.prepare('SELECT * FROM videos ORDER BY channel_index ASC, updated_at DESC').all();
  const videos = (videoRows.results || []).map((row) => {
    let payload = {};
    let analysisMeta = null;
    try { payload = JSON.parse(row.payload_json || '{}'); } catch {}
    try { analysisMeta = row.analysis_meta_json ? JSON.parse(row.analysis_meta_json) : null; } catch {}
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      upload_date: row.upload_date,
      channelIndex: row.channel_index,
      relevance: row.relevance,
      status: row.status,
      priceStatus: row.price_status,
      priceRowCount: row.price_row_count,
      priceError: row.price_error,
      language: row.language,
      analysisMeta,
      ...payload,
      segments: [],
      transcriptText: '',
    };
  });

  const priceRowResults = await db.prepare('SELECT payload_json FROM price_rows ORDER BY market_date_sort DESC, timestamp_seconds ASC').all();
  const priceRows = (priceRowResults.results || []).map((row) => {
    try { return JSON.parse(row.payload_json || '{}'); } catch { return null; }
  }).filter(Boolean);

  const analysisResults = await db.prepare('SELECT video_id, meta_json FROM video_analysis').all();
  const videoAnalysis = {};
  for (const row of analysisResults.results || []) {
    try { videoAnalysis[row.video_id] = JSON.parse(row.meta_json || '{}'); } catch {}
  }

  return {
    version: 2,
    updatedAt: settings.updatedAt || null,
    channelUrl: settings.channelUrl || '',
    videos,
    priceRows,
    videoAnalysis,
    knownVideoIds: videos.map((video) => video.id),
  };
}

async function listVideos(db, url) {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const marketDate = safeText(url.searchParams.get('market_date'));
  const priceStatus = safeText(url.searchParams.get('price_status'));

  let query = 'SELECT * FROM videos WHERE 1=1';
  const binds = [];
  if (marketDate) {
    query += ' AND market_date_sort = ?';
    binds.push(marketDate);
  }
  if (priceStatus) {
    query += ' AND price_status = ?';
    binds.push(priceStatus);
  }
  query += ' ORDER BY channel_index ASC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const result = await db.prepare(query).bind(...binds).all();
  return { items: result.results || [], limit, offset };
}

async function getVideo(db, videoId) {
  return db.prepare('SELECT * FROM videos WHERE id = ?').bind(videoId).first();
}

async function deleteVideo(db, videoId) {
  await db.prepare('DELETE FROM price_rows WHERE video_id = ?').bind(videoId).run();
  await db.prepare('DELETE FROM video_analysis WHERE video_id = ?').bind(videoId).run();
  await db.prepare('DELETE FROM videos WHERE id = ?').bind(videoId).run();
}

async function listPrices(db, url) {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 5000);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const fruit = safeText(url.searchParams.get('fruit'));
  const videoId = safeText(url.searchParams.get('video_id'));
  const marketDate = safeText(url.searchParams.get('market_date'));
  const party = safeText(url.searchParams.get('party'));

  let query = 'SELECT payload_json FROM price_rows WHERE 1=1';
  const binds = [];
  if (fruit) {
    query += ' AND lower(fruit) = lower(?)';
    binds.push(fruit);
  }
  if (videoId) {
    query += ' AND video_id = ?';
    binds.push(videoId);
  }
  if (marketDate) {
    query += ' AND market_date_sort = ?';
    binds.push(marketDate);
  }
  if (party) {
    query += ' AND lower(party_name) LIKE ?';
    binds.push(`%${party.toLowerCase()}%`);
  }
  query += ' ORDER BY market_date_sort DESC, timestamp_seconds ASC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const result = await db.prepare(query).bind(...binds).all();
  const items = (result.results || []).map((row) => {
    try { return JSON.parse(row.payload_json || '{}'); } catch { return null; }
  }).filter(Boolean);
  return { items, limit, offset };
}

async function getAnalysis(db, videoId) {
  const row = await db.prepare('SELECT * FROM video_analysis WHERE video_id = ?').bind(videoId).first();
  if (!row) return null;
  let meta = null;
  try { meta = JSON.parse(row.meta_json || '{}'); } catch {}
  return { video_id: row.video_id, meta, updated_at: row.updated_at };
}

async function listAnalysis(db, url) {
  const marketDate = safeText(url.searchParams.get('market_date'));
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  let query = 'SELECT video_id, meta_json, market_date, mention_count, source, updated_at FROM video_analysis';
  const binds = [];
  if (marketDate) {
    query += ' WHERE market_date_sort = ?';
    binds.push(marketDate);
  }
  query += ' ORDER BY market_date_sort DESC LIMIT ?';
  binds.push(limit);
  const result = await db.prepare(query).bind(...binds).all();
  return {
    items: (result.results || []).map((row) => {
      let meta = null;
      try { meta = JSON.parse(row.meta_json || '{}'); } catch {}
      return {
        video_id: row.video_id,
        market_date: row.market_date,
        mention_count: row.mention_count,
        source: row.source,
        updated_at: row.updated_at,
        meta,
      };
    }),
  };
}

async function parseTranscriptRequest(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const form = await request.formData();
    const audio = form.get('audio');
    const fileBuffer = audio && typeof audio.arrayBuffer === 'function'
      ? await audio.arrayBuffer()
      : null;
    if (fileBuffer && fileBuffer.byteLength > AUDIO_LIMIT_BYTES) {
      throw httpError(`Audio upload is ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} MB. Send chunks under 24 MB each.`, 413);
    }
    return {
      videoId: safeText(form.get('videoId') || form.get('video_id')),
      videoUrl: safeText(form.get('videoUrl') || form.get('video_url')),
      audioUrl: safeText(form.get('audioUrl') || form.get('audio_url')),
      language: safeText(form.get('language')) || 'hi',
      model: safeText(form.get('model')) || WHISPER_MODEL,
      initialPrompt: safeText(form.get('initialPrompt') || form.get('initial_prompt')),
      chunks: fileBuffer ? [{
        audioBase64: arrayBufferToBase64(fileBuffer),
        offsetSeconds: Number(form.get('offsetSeconds') || form.get('offset_seconds')) || 0,
        name: safeText(audio?.name),
      }] : undefined,
    };
  }

  return request.json();
}

async function fetchAudioAsBase64(audioUrl) {
  const url = safeText(audioUrl);
  if (!url) return '';
  const response = await fetch(url, {
    headers: {
      'user-agent': 'fruit-mandi-worker/1.0',
      accept: 'audio/*,*/*;q=0.8',
    },
  });
  if (!response.ok) {
    throw httpError(`Audio URL failed: ${response.status} ${response.statusText}`, 400);
  }
  const size = Number(response.headers.get('content-length')) || 0;
  if (size > AUDIO_LIMIT_BYTES) {
    throw httpError(`Audio URL is ${(size / 1024 / 1024).toFixed(1)} MB. Send chunks under 24 MB each.`, 413);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > AUDIO_LIMIT_BYTES) {
    throw httpError(`Audio download is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB. Send chunks under 24 MB each.`, 413);
  }
  return arrayBufferToBase64(buffer);
}

function hasAudioInput(body) {
  if (safeText(body?.audioUrl || body?.audio_url)) return true;
  if (safeText(body?.audioBase64 || body?.audio_base64)) return true;
  if (!Array.isArray(body?.chunks)) return false;
  return body.chunks.some((chunk) => safeText(chunk?.audioUrl || chunk?.audio_url || chunk?.audioBase64 || chunk?.audio_base64));
}

async function normalizeAudioChunks(body) {
  const rawChunks = Array.isArray(body?.chunks) && body.chunks.length
    ? body.chunks
    : [{
        audioUrl: body?.audioUrl || body?.audio_url,
        audioBase64: body?.audioBase64 || body?.audio_base64,
        offsetSeconds: body?.offsetSeconds || body?.offset_seconds || 0,
        name: body?.name || 'audio',
      }];

  if (rawChunks.length > MAX_TRANSCRIPT_CHUNKS) {
    throw httpError(`Too many chunks. Send ${MAX_TRANSCRIPT_CHUNKS} or fewer chunks per request.`, 413);
  }

  const chunks = [];
  for (let index = 0; index < rawChunks.length; index += 1) {
    const raw = rawChunks[index] || {};
    const audioBase64 = cleanBase64(raw.audioBase64 || raw.audio_base64)
      || await fetchAudioAsBase64(raw.audioUrl || raw.audio_url);
    if (!audioBase64) {
      continue;
    }
    chunks.push({
      audioBase64,
      offsetSeconds: Number(raw.offsetSeconds || raw.offset_seconds) || 0,
      audioUrl: safeText(raw.audioUrl || raw.audio_url),
      name: safeText(raw.name) || `chunk ${index + 1}`,
    });
  }

  if (!chunks.length) {
    const videoUrl = safeText(body?.videoUrl || body?.video_url || body?.youtubeUrl || body?.youtube_url);
    if (videoUrl) {
      throw httpError(
        'No audio payload was provided. Send audioUrl, audioBase64, upload audio/video, or configure YOUTUBE_EXTRACTOR_URL for YouTube audio extraction.',
        422,
        { videoUrl },
      );
    }
    throw httpError('Send audioUrl, audioBase64, multipart audio, or chunks[].', 400);
  }

  return chunks;
}

function getWhisperSegments(result, offsetSeconds = 0) {
  const items = Array.isArray(result?.segments)
    ? result.segments
    : Array.isArray(result?.chunks)
      ? result.chunks
      : [];

  const segments = items.map((item, index) => {
    const timestamp = Array.isArray(item?.timestamp) ? item.timestamp : Array.isArray(item?.timestamps) ? item.timestamps : [];
    const start = Number(item?.start ?? item?.start_seconds ?? timestamp[0] ?? 0) + offsetSeconds;
    const endValue = item?.end ?? item?.end_seconds ?? timestamp[1];
    const end = endValue == null ? null : Number(endValue) + offsetSeconds;
    return {
      segment_index: index,
      start_seconds: Number.isFinite(start) ? start : offsetSeconds,
      end_seconds: Number.isFinite(end) ? end : null,
      timestamp_label: secondsToClock(start),
      text: safeText(item?.text || item?.sentence || item?.caption),
      raw: item,
    };
  }).filter((segment) => segment.text);

  if (!segments.length && safeText(result?.text)) {
    segments.push({
      segment_index: 0,
      start_seconds: offsetSeconds,
      end_seconds: null,
      timestamp_label: secondsToClock(offsetSeconds),
      text: safeText(result.text),
      raw: result,
    });
  }

  return segments;
}

function transcriptTextFromSegments(segments) {
  return segments.map((segment) => `[${segment.timestamp_label}] ${segment.text}`).join('\n');
}

async function insertTranscriptJob(db, job) {
  await db.prepare(
    `INSERT INTO transcript_jobs (
      id, video_id, video_url, audio_url, status, language, model, source, error,
      transcript_text, segment_count, payload_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      video_id = excluded.video_id,
      video_url = excluded.video_url,
      audio_url = excluded.audio_url,
      status = excluded.status,
      language = excluded.language,
      model = excluded.model,
      source = excluded.source,
      error = excluded.error,
      transcript_text = excluded.transcript_text,
      segment_count = excluded.segment_count,
      payload_json = excluded.payload_json,
      updated_at = datetime('now')`,
  ).bind(
    job.id,
    job.video_id,
    job.video_url,
    job.audio_url,
    job.status,
    job.language,
    job.model,
    job.source,
    job.error || '',
    job.transcript_text || '',
    Number(job.segment_count) || 0,
    job.payload_json || '{}',
  ).run();
}

async function updateTranscriptJob(db, jobId, fields) {
  await db.prepare(
    `UPDATE transcript_jobs
     SET status = ?, error = ?, transcript_text = ?, segment_count = ?, payload_json = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(
    fields.status,
    fields.error || '',
    fields.transcript_text || '',
    Number(fields.segment_count) || 0,
    fields.payload_json || '{}',
    jobId,
  ).run();
}

async function updateTranscriptJobProgress(db, jobId, patch) {
  const row = await db.prepare('SELECT payload_json FROM transcript_jobs WHERE id = ?').bind(jobId).first();
  let payload = {};
  try {
    payload = JSON.parse(row?.payload_json || '{}');
  } catch {
    payload = {};
  }
  const next = {
    ...payload,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.prepare(
    `UPDATE transcript_jobs SET payload_json = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(JSON.stringify(next), jobId).run();
  return next;
}

async function finalizeTranscriptJob(db, jobId, options) {
  const videoId = safeText(options.videoId);
  const language = safeText(options.language) || 'hi';
  const source = safeText(options.source) || 'external-youtube-extractor';
  const segments = Array.isArray(options.segments) ? options.segments : [];
  const transcriptText = transcriptTextFromSegments(segments);
  await replaceTranscriptSegments(db, jobId, videoId, segments, language, source);
  await updateTranscriptJob(db, jobId, {
    status: segments.length ? 'complete' : 'empty',
    transcript_text: transcriptText,
    segment_count: segments.length,
    payload_json: JSON.stringify({
      ...(options.payload || {}),
      stage: segments.length ? 'complete' : 'empty',
      message: segments.length ? `Saved ${segments.length} transcript line(s).` : 'No transcript lines returned.',
      progress: 100,
    }),
  });
}

async function runExternalYouTubeTranscriptJob(db, env, options) {
  const jobId = safeText(options.jobId);
  const videoUrl = safeText(options.videoUrl);
  const videoId = safeText(options.videoId) || extractYouTubeId(videoUrl);
  const language = safeText(options.language) || 'hi';
  try {
    await updateTranscriptJobProgress(db, jobId, {
      stage: 'download_audio',
      message: 'Downloading YouTube audio on the extractor service (yt-dlp). This usually takes 30–90 seconds.',
      progress: 20,
    });
    const external = await fetchExternalYouTubeTranscript(env, { videoUrl, videoId, language });
    await updateTranscriptJobProgress(db, jobId, {
      stage: 'openai_transcription',
      message: 'Transcription finished on the extractor. Saving timestamped lines to D1...',
      progress: 82,
    });
    const segments = external.segments || [];
    await finalizeTranscriptJob(db, jobId, {
      videoId: external.videoId || videoId,
      language: external.language || language,
      source: external.source,
      segments,
      payload: {
        ...(external.payload || {}),
        model: external.model,
        extraction: 'external-youtube-extractor',
      },
    });
  } catch (error) {
    const stage = safeText(error?.extra?.extractorStage) || 'failed';
    const message = error?.message || 'Background transcript failed.';
    await updateTranscriptJob(db, jobId, {
      status: 'failed',
      error: message,
      transcript_text: '',
      segment_count: 0,
      payload_json: JSON.stringify({
        stage,
        message,
        progress: 100,
        failedAt: new Date().toISOString(),
      }),
    });
  }
}

function shouldRunYoutubeTranscriptInBackground(body) {
  const videoUrl = safeText(body.videoUrl || body.video_url || body.youtubeUrl || body.youtube_url);
  return Boolean(videoUrl) && !hasAudioInput(body);
}

async function replaceTranscriptSegments(db, jobId, videoId, segments, language, source) {
  await db.prepare('DELETE FROM transcript_segments WHERE job_id = ?').bind(jobId).run();
  for (const segment of segments) {
    await db.prepare(
      `INSERT INTO transcript_segments (
        id, job_id, video_id, segment_index, start_seconds, end_seconds, timestamp_label,
        text, language, source, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      shortId('seg'),
      jobId,
      videoId,
      Number(segment.segment_index) || 0,
      segment.start_seconds,
      segment.end_seconds,
      segment.timestamp_label,
      segment.text,
      language,
      source,
      JSON.stringify(segment.raw || {}),
    ).run();
  }
}

async function saveTranscriptResult(db, options) {
  const jobId = safeText(options.jobId) || shortId('tx');
  const videoId = safeText(options.videoId);
  const videoUrl = safeText(options.videoUrl);
  const language = safeText(options.language) || 'hi';
  const model = safeText(options.model) || 'transcript-extractor';
  const source = safeText(options.source) || 'transcript-extractor';
  const segments = Array.isArray(options.segments) ? options.segments : [];
  const transcriptText = transcriptTextFromSegments(segments);
  await insertTranscriptJob(db, {
    id: jobId,
    video_id: videoId,
    video_url: videoUrl,
    audio_url: '',
    status: 'running',
    language,
    model,
    source,
    payload_json: JSON.stringify(options.payload || {}),
  });

  await replaceTranscriptSegments(db, jobId, videoId, segments, language, source);
  await updateTranscriptJob(db, jobId, {
    status: segments.length ? 'complete' : 'empty',
    transcript_text: transcriptText,
    segment_count: segments.length,
    payload_json: JSON.stringify(options.payload || {}),
  });

  return {
    job: {
      id: jobId,
      video_id: videoId,
      video_url: videoUrl,
      status: segments.length ? 'complete' : 'empty',
      language,
      model,
      source,
      segment_count: segments.length,
    },
    transcriptText,
    segments: segments.map(({ raw, ...segment }) => segment),
  };
}

function normalizeExternalTranscriptSegments(rawSegments) {
  return (Array.isArray(rawSegments) ? rawSegments : []).map((segment, index) => {
    const start = Number(segment?.start_seconds ?? segment?.start ?? segment?.offsetSeconds ?? segment?.offset_seconds ?? 0);
    const endValue = segment?.end_seconds ?? segment?.end;
    const end = endValue == null ? null : Number(endValue);
    return {
      segment_index: index,
      start_seconds: Number.isFinite(start) ? start : 0,
      end_seconds: Number.isFinite(end) ? end : null,
      timestamp_label: safeText(segment?.timestamp_label) || secondsToClock(start),
      text: safeText(segment?.text || segment?.caption || segment?.line),
      raw: segment,
    };
  }).filter((segment) => segment.text);
}

async function fetchExternalYouTubeTranscript(env, options) {
  const endpoint = safeText(env?.YOUTUBE_EXTRACTOR_URL || env?.YOUTUBE_TRANSCRIPT_PROXY_URL);
  if (!endpoint) return null;

  const headers = { 'content-type': 'application/json' };
  const token = safeText(env?.YOUTUBE_EXTRACTOR_TOKEN);
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      videoUrl: options.videoUrl,
      id: options.videoId,
      language: options.language || 'hi',
      languages: 'hi.*,hi',
      preferAudio: true,
      openAiApiKey: safeText(env?.OPENAI_API_KEY),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const message = data.error || response.statusText;
    const stage = inferExternalExtractorStage(data, message);
    throw httpError(
      `External YouTube extractor failed at ${stage}: ${message}`,
      502,
      {
        extractorStage: stage,
        extractorSource: safeText(data.source),
        extractorVersion: safeText(data.version),
        extractorStatus: response.status,
      },
    );
  }

  const segments = normalizeExternalTranscriptSegments(data.segments);
  if (!segments.length) {
    throw httpError('External YouTube extractor returned zero transcript lines.', 502);
  }

  return {
    videoId: safeText(data.id || data.videoId || options.videoId) || extractYouTubeId(options.videoUrl),
    language: safeText(data.language || options.language) || 'hi',
    source: safeText(data.source) || 'external-youtube-extractor',
    model: safeText(data.model) || 'yt-dlp-extractor',
    segments,
    payload: {
      extraction: 'external-youtube-extractor',
      fileName: data.fileName || '',
      segmentCount: segments.length,
    },
  };
}

function inferExternalExtractorStage(data, message) {
  const explicit = safeText(data?.stage);
  if (explicit) return explicit;
  const text = `${safeText(message)} ${safeText(data?.source)} ${safeText(data?.version)}`;
  if (/openai|api key|model|transcription|transcribe/i.test(text)) return 'openai_transcription';
  if (/youtube|yt-dlp|blocked|cookies|bot-like|429|download|audio/i.test(text)) return 'download_audio';
  return 'unknown';
}

async function transcribeWithWorkersAI(db, env, body) {
  if (!env.AI) {
    throw httpError('Workers AI binding is missing. Deploy with [ai] binding = "AI" in wrangler.toml.', 500);
  }
  const videoUrl = safeText(body.videoUrl || body.video_url || body.youtubeUrl || body.youtube_url);
  const videoId = safeText(body.videoId || body.video_id) || extractYouTubeId(videoUrl);
  const language = safeText(body.language) || 'hi';
  const model = safeText(body.model) || WHISPER_MODEL;
  const audioUrl = safeText(body.audioUrl || body.audio_url);
  const source = 'workers-ai-whisper';
  const jobId = safeText(body.jobId || body.job_id) || shortId('tx');
  if (videoUrl && !hasAudioInput(body)) {
    const external = await fetchExternalYouTubeTranscript(env, { videoUrl, videoId, language });
    if (!external) {
      throw httpError('Configure YOUTUBE_EXTRACTOR_URL to extract YouTube audio and transcribe it with OpenAI.', 500);
    }
    return saveTranscriptResult(db, {
      jobId,
      videoId: external.videoId,
      videoUrl,
      language: external.language,
      model: external.model,
      source: external.source,
      segments: external.segments,
      payload: external.payload,
    });
  }
  const chunks = await normalizeAudioChunks(body);
  const initialPrompt = safeText(body.initialPrompt || body.initial_prompt)
    || 'Hindi and Hinglish Delhi fruit mandi market-price conversation. Preserve spoken Hindi words, Hinglish produce names, rupee prices, quantities, quality grades, areas, parties, and timestamps.';

  await insertTranscriptJob(db, {
    id: jobId,
    video_id: videoId,
    video_url: videoUrl,
    audio_url: audioUrl || chunks.map((chunk) => chunk.audioUrl).filter(Boolean).join(', '),
    status: 'running',
    language,
    model,
    source,
    payload_json: JSON.stringify({ chunkCount: chunks.length, createdBy: 'api' }),
  });

  const allSegments = [];
  const rawResults = [];
  try {
    for (const chunk of chunks) {
      const result = await env.AI.run(model, {
        audio: chunk.audioBase64,
        task: 'transcribe',
        language,
        vad_filter: true,
        initial_prompt: initialPrompt,
      });
      rawResults.push({
        name: chunk.name,
        offsetSeconds: chunk.offsetSeconds,
        audioUrl: chunk.audioUrl,
        result,
      });
      const chunkSegments = getWhisperSegments(result, chunk.offsetSeconds);
      allSegments.push(...chunkSegments);
    }

    allSegments.sort((a, b) => (a.start_seconds || 0) - (b.start_seconds || 0));
    allSegments.forEach((segment, index) => { segment.segment_index = index; });
    const transcriptText = transcriptTextFromSegments(allSegments);

    await replaceTranscriptSegments(db, jobId, videoId, allSegments, language, source);
    await updateTranscriptJob(db, jobId, {
      status: allSegments.length ? 'complete' : 'empty',
      transcript_text: transcriptText,
      segment_count: allSegments.length,
      payload_json: JSON.stringify({
        chunkCount: chunks.length,
        model,
        rawResults,
      }),
    });

    return {
      job: {
        id: jobId,
        video_id: videoId,
        video_url: videoUrl,
        status: allSegments.length ? 'complete' : 'empty',
        language,
        model,
        source,
        segment_count: allSegments.length,
      },
      transcriptText,
      segments: allSegments.map(({ raw, ...segment }) => segment),
    };
  } catch (error) {
    await updateTranscriptJob(db, jobId, {
      status: 'failed',
      error: error?.message || 'Transcription failed.',
      payload_json: JSON.stringify({ chunkCount: chunks.length, model, rawResults }),
    });
    throw error;
  }
}

async function getTranscriptByVideo(db, videoId) {
  const job = await db.prepare(
    `SELECT * FROM transcript_jobs
     WHERE video_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  ).bind(videoId).first();
  if (!job) return null;
  const segmentRows = await db.prepare(
    `SELECT segment_index, start_seconds, end_seconds, timestamp_label, text, language, source
     FROM transcript_segments
     WHERE job_id = ?
     ORDER BY segment_index ASC, start_seconds ASC`,
  ).bind(job.id).all();
  return enrichTranscriptPayload({
    job,
    segments: segmentRows.results || [],
  });
}

async function getTranscriptJob(db, jobId) {
  const job = await db.prepare('SELECT * FROM transcript_jobs WHERE id = ?').bind(jobId).first();
  if (!job) return null;
  const segmentRows = await db.prepare(
    `SELECT segment_index, start_seconds, end_seconds, timestamp_label, text, language, source
     FROM transcript_segments
     WHERE job_id = ?
     ORDER BY segment_index ASC, start_seconds ASC`,
  ).bind(job.id).all();
  return enrichTranscriptPayload({
    job,
    segments: segmentRows.results || [],
  });
}

function enrichTranscriptPayload(item) {
  if (!item?.job) return item;
  let payload = {};
  try {
    payload = JSON.parse(item.job.payload_json || '{}');
  } catch {
    payload = {};
  }
  item.job.stage = safeText(payload.stage);
  item.job.message = safeText(payload.message);
  item.job.progress = Number(payload.progress) || 0;
  return item;
}

async function callOpenAIExtractor(env, { videoId, videoUrl, title, segments, model }) {
  const apiKey = safeText(env.OPENAI_API_KEY);
  if (!apiKey) throw httpError('OPENAI_API_KEY is not configured on the Worker.', 500);
  const transcript = segments.map((segment) => {
    const seconds = Math.max(0, Math.floor(Number(segment.start_seconds) || 0));
    return `[${seconds}s | ${segment.timestamp_label || secondsToClock(seconds)}] ${safeText(segment.text)}`;
  }).join('\n').slice(0, 45000);

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: safeText(model) || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You extract wholesale fruit/produce mandi rates from noisy Hindi/Hinglish transcripts.',
            'Return English-first metadata even when the transcript is Hindi. Keep useful Hinglish names beside English names.',
            'Fruit labels must always be English / Hinglish, for example "Watermelon / Tarbooj", "Onion / Pyaz", "Mango / Aam".',
            'Use a produce emoji whenever obvious, for example 🍉 Watermelon / Tarbooj, 🧅 Onion / Pyaz, 🥭 Mango / Aam.',
            'Do not include Rana Ji, Rana, reporter, host, or interviewer as a party/person; Rana Ji is the recorder and must be removed.',
            'Keep timestamps tied to the transcript line where the price is spoken.',
            'Extract every distinct price mention, including different grades, sizes, quality types, lots, areas, origins, parties, and price ranges.',
            'If one spoken line lists multiple grades or qualities with different prices, return multiple rows and mention objects.',
            'Include non-price useful facts and guidance separately when the speaker gives advice, market guidance, supply notes, demand notes, quality guidance, buyer/seller instructions, or factual observations.',
            'Extract only real produce prices. Ignore dates, counts, vehicle counts, phone numbers, subscriber counts, and unrelated gold/silver rates.',
            'Return JSON only with: {"meta": {...}, "rows": [...]}.',
            'meta fields: video_id, video_title, video_url, market_date, market_date_sort, mandi_names, areas, parties, produce, qualities, summary_english, key_takeaways, facts, guidance, transcript_highlights, chapters, price_mentions, grouped_produce, mention_count, source.',
            'facts/guidance/transcript_highlights/chapters items should include timestamp_seconds, title, text_english, text_hinglish, importance when possible.',
            'price_mentions items should preserve all mentions, even if price is unclear: fruit_label, fruit_emoji, variety, quality_grade, quality_label, size_label, party_name, mandi_name, area_name, unit, min_price_inr, max_price_inr, timestamp_seconds, text_english, text_hinglish, confidence.',
            'grouped_produce should group by fruit_label and include fruit_emoji, varieties, qualities, areas, parties, mention_count, min_price_inr, max_price_inr, and representative timestamp_seconds values.',
            'row fields: fruit, fruit_hindi, fruit_label, fruit_emoji, variety, quality_grade, quality_label, size_label, party_name, mandi_name, area_name, origin, unit, min_price_inr, max_price_inr, price_notes, market_name, market_date, market_date_sort, confidence, original_line, clean_english_line, clean_hinglish_line, context, notes, timestamp_seconds.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `Video ID: ${videoId}`,
            `Video URL: ${videoUrl}`,
            `Title: ${title || ''}`,
            '',
            'Transcript:',
            transcript,
          ].join('\n'),
        },
      ],
    }),
  });
  const text = await response.text();
  const data = extractJsonObject(text);
  if (!response.ok) {
    const error = data?.error?.message || `OpenAI extraction failed: ${response.status} ${text.slice(0, 300)}`;
    throw httpError(error, 502, { provider: 'openai' });
  }
  return extractJsonObject(data?.choices?.[0]?.message?.content || text);
}

function uniqueClean(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => removeRecorderName(value))
    .filter(Boolean)));
}

function normalizeMetaList(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    if (typeof item === 'string') {
      return {
        timestamp_seconds: 0,
        timestamp_label: '0:00',
        title: item.slice(0, 80),
        text_english: item,
        text_hinglish: item,
        importance: 'medium',
      };
    }
    const seconds = Math.max(0, Math.floor(normalizeNumber(item?.timestamp_seconds) || 0));
    return {
      ...item,
      timestamp_seconds: seconds,
      timestamp_label: safeText(item?.timestamp_label) || secondsToClock(seconds),
      title: safeText(item?.title || item?.label || item?.text_english || item?.text_hinglish).slice(0, 120),
      text_english: safeText(item?.text_english || item?.english || item?.text || item?.summary),
      text_hinglish: safeText(item?.text_hinglish || item?.hinglish || item?.original || item?.text),
      importance: safeText(item?.importance || item?.confidence || 'medium'),
    };
  }).filter((item) => item.text_english || item.text_hinglish || item.title);
}

function normalizePriceMention(item, fallback = {}) {
  const info = produceInfo(item?.fruit_label || item?.fruit || item?.fruit_hindi || fallback.fruit_label || fallback.fruit);
  const seconds = Math.max(0, Math.floor(normalizeNumber(item?.timestamp_seconds ?? fallback.timestamp_seconds) || 0));
  const min = normalizeNumber(item?.min_price_inr ?? fallback.min_price_inr);
  const max = normalizeNumber(item?.max_price_inr ?? fallback.max_price_inr);
  return {
    fruit: safeText(info?.english || item?.fruit || fallback.fruit),
    fruit_hindi: safeText(info?.hinglish || item?.fruit_hindi || fallback.fruit_hindi),
    fruit_label: safeText(item?.fruit_label || fallback.fruit_label || info?.label || item?.fruit || fallback.fruit),
    fruit_emoji: safeText(item?.fruit_emoji || fallback.fruit_emoji || info?.emoji),
    variety: safeText(item?.variety || fallback.variety),
    quality_grade: safeText(item?.quality_grade || fallback.quality_grade),
    quality_label: safeText(item?.quality_label || fallback.quality_label),
    size_label: safeText(item?.size_label || fallback.size_label),
    party_name: removeRecorderName(item?.party_name || fallback.party_name),
    mandi_name: safeText(item?.mandi_name || fallback.mandi_name),
    area_name: safeText(item?.area_name || fallback.area_name),
    unit: safeText(item?.unit || fallback.unit),
    min_price_inr: Number.isFinite(min) ? min : null,
    max_price_inr: Number.isFinite(max) ? max : null,
    timestamp_seconds: seconds,
    timestamp_label: secondsToClock(seconds),
    text_english: safeText(item?.text_english || item?.clean_english_line || fallback.clean_english_line || fallback.context || fallback.price_notes),
    text_hinglish: safeText(item?.text_hinglish || item?.clean_hinglish_line || fallback.clean_hinglish_line || fallback.clean_hindi_line || fallback.original_line),
    confidence: safeText(item?.confidence || fallback.confidence || 'medium'),
  };
}

function normalizeAnalysisMeta({ videoId, videoUrl, title, uploadDate, meta, rows, segments }) {
  const normalized = meta && typeof meta === 'object' ? { ...meta } : {};
  normalized.video_id = videoId;
  normalized.video_url = videoUrl;
  normalized.video_title = title;
  normalized.source = 'worker-openai';
  normalized.market_date_sort = safeText(normalized.market_date_sort) || marketDateSort(normalized.market_date || uploadDate);
  normalized.mandi_names = uniqueClean(normalized.mandi_names);
  normalized.areas = uniqueClean(normalized.areas);
  normalized.parties = uniqueClean(normalized.parties);
  normalized.qualities = uniqueClean(normalized.qualities);
  normalized.produce = uniqueClean(normalized.produce).map((item) => {
    const info = produceInfo(item);
    return info ? `${info.emoji} ${info.label}` : item;
  });
  normalized.facts = normalizeMetaList(normalized.facts);
  normalized.guidance = normalizeMetaList(normalized.guidance);
  normalized.key_takeaways = normalizeMetaList(normalized.key_takeaways);
  normalized.transcript_highlights = normalizeMetaList(normalized.transcript_highlights);
  normalized.chapters = normalizeMetaList(normalized.chapters);

  const rowMentions = (Array.isArray(rows) ? rows : []).map((row) => normalizePriceMention(row, row));
  const aiMentions = (Array.isArray(normalized.price_mentions) ? normalized.price_mentions : []).map((item) => normalizePriceMention(item));
  const seen = new Set();
  normalized.price_mentions = [...aiMentions, ...rowMentions].filter((mention) => {
    const key = [
      mention.fruit_label,
      mention.quality_grade,
      mention.quality_label,
      mention.size_label,
      mention.party_name,
      mention.min_price_inr,
      mention.max_price_inr,
      mention.timestamp_seconds,
      mention.text_hinglish,
    ].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return mention.fruit_label || mention.text_english || mention.text_hinglish;
  });

  const grouped = new Map();
  normalized.price_mentions.forEach((mention) => {
    const key = mention.fruit_label || mention.fruit || 'Unknown produce';
    if (!grouped.has(key)) {
      grouped.set(key, {
        fruit_label: key,
        fruit_emoji: mention.fruit_emoji,
        varieties: [],
        qualities: [],
        areas: [],
        parties: [],
        timestamps: [],
        mention_count: 0,
        min_price_inr: null,
        max_price_inr: null,
      });
    }
    const group = grouped.get(key);
    group.mention_count += 1;
    if (mention.variety) group.varieties.push(mention.variety);
    if (mention.quality_grade || mention.quality_label || mention.size_label) group.qualities.push([mention.quality_grade, mention.quality_label, mention.size_label].filter(Boolean).join(' · '));
    if (mention.area_name || mention.mandi_name) group.areas.push(mention.area_name || mention.mandi_name);
    if (mention.party_name) group.parties.push(mention.party_name);
    group.timestamps.push(mention.timestamp_seconds);
    if (Number.isFinite(mention.min_price_inr)) {
      group.min_price_inr = group.min_price_inr == null ? mention.min_price_inr : Math.min(group.min_price_inr, mention.min_price_inr);
    }
    if (Number.isFinite(mention.max_price_inr)) {
      group.max_price_inr = group.max_price_inr == null ? mention.max_price_inr : Math.max(group.max_price_inr, mention.max_price_inr);
    }
  });
  normalized.grouped_produce = Array.from(grouped.values()).map((group) => ({
    ...group,
    varieties: uniqueClean(group.varieties).slice(0, 12),
    qualities: uniqueClean(group.qualities).slice(0, 20),
    areas: uniqueClean(group.areas).slice(0, 12),
    parties: uniqueClean(group.parties).slice(0, 12),
    timestamps: Array.from(new Set(group.timestamps)).sort((a, b) => a - b).slice(0, 20),
  }));

  if (!normalized.transcript_highlights.length) {
    normalized.transcript_highlights = (Array.isArray(segments) ? segments : []).slice(0, 60).map((segment) => ({
      timestamp_seconds: Number(segment.start_seconds) || 0,
      timestamp_label: safeText(segment.timestamp_label) || secondsToClock(segment.start_seconds),
      title: safeText(segment.text).slice(0, 90),
      text_english: '',
      text_hinglish: safeText(segment.text),
      importance: 'transcript',
    }));
  }

  normalized.mention_count = Number(normalized.mention_count) || normalized.price_mentions.length || (Array.isArray(rows) ? rows.length : 0);
  return normalized;
}

function normalizeAnalysisRows({ videoId, videoUrl, title, uploadDate, meta, rows }) {
  const marketDate = safeText(meta?.market_date);
  const marketSort = safeText(meta?.market_date_sort) || marketDateSort(marketDate || uploadDate);
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const min = normalizeNumber(row.min_price_inr);
    const max = normalizeNumber(row.max_price_inr);
    const seconds = Math.max(0, Math.floor(normalizeNumber(row.timestamp_seconds) || 0));
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return null;
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    const timestampLabel = secondsToClock(seconds);
    const cleanEnglish = safeText(row.clean_english_line);
    const cleanHinglish = safeText(row.clean_hinglish_line);
    const info = produceInfo(row.fruit_label || row.fruit || row.fruit_hindi);
    const fruitLabel = safeText(row.fruit_label) || safeText(info?.label) || safeText(row.fruit) || safeText(row.fruit_hindi);
    return {
      video_id: videoId,
      fruit: fruitLabel,
      fruit_hindi: safeText(row.fruit_hindi || info?.hinglish),
      fruit_emoji: safeText(row.fruit_emoji || info?.emoji),
      variety: safeText(row.variety),
      quality_grade: safeText(row.quality_grade),
      quality_label: safeText(row.quality_label || row.size_label),
      size_label: safeText(row.size_label),
      party_name: removeRecorderName(row.party_name),
      mandi_name: safeText(row.mandi_name),
      area_name: safeText(row.area_name),
      origin: safeText(row.origin),
      unit: safeText(row.unit) || 'unknown',
      min_price_inr: low,
      max_price_inr: high,
      price_notes: safeText(row.price_notes || row.notes),
      market_name: safeText(row.market_name || row.mandi_name),
      market_date: marketDate,
      market_date_sort: marketSort,
      confidence: ['high', 'medium', 'low'].includes(safeText(row.confidence).toLowerCase()) ? safeText(row.confidence).toLowerCase() : 'medium',
      original_line: safeText(row.original_line),
      clean_hindi_line: cleanHinglish || cleanEnglish,
      context: safeText(row.context),
      notes: safeText(row.notes),
      source: 'worker-openai',
      timestamp_seconds: seconds,
      timestamp_label: timestampLabel,
      timestamp_url: videoUrl ? `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}t=${seconds}s` : '',
      video_title: title,
      video_url: videoUrl,
      upload_date: uploadDate,
      fruit_label: fruitLabel,
      clean_english_line: cleanEnglish,
      clean_hinglish_line: cleanHinglish,
    };
  }).filter(Boolean);
}

async function analyzeStoredTranscript(db, env, body) {
  const videoId = safeText(body.videoId || body.video_id) || extractYouTubeId(body.videoUrl || body.video_url);
  if (!videoId) throw httpError('Send videoId or videoUrl.', 400);
  const stored = await getTranscriptByVideo(db, videoId);
  if (!stored || !stored.segments?.length) throw httpError('No stored transcript found for this video.', 404);

  const existingVideo = await getVideo(db, videoId).catch(() => null);
  const videoUrl = safeText(body.videoUrl || body.video_url || stored.job?.video_url || existingVideo?.url);
  const title = safeText(body.title || existingVideo?.title || videoId);
  const uploadDate = safeText(body.uploadDate || body.upload_date || existingVideo?.upload_date);
  const extraction = await callOpenAIExtractor(env, {
    videoId,
    videoUrl,
    title,
    segments: stored.segments,
    model: body.model,
  });
  const meta = normalizeAnalysisMeta({
    videoId,
    videoUrl,
    title,
    uploadDate,
    meta: extraction.meta,
    rows: extraction.rows,
    segments: stored.segments,
  });

  const priceRows = normalizeAnalysisRows({
    videoId,
    videoUrl,
    title,
    uploadDate,
    meta,
    rows: extraction.rows,
  });
  await db.prepare('DELETE FROM price_rows WHERE video_id = ?').bind(videoId).run();
  await db.prepare('DELETE FROM video_analysis WHERE video_id = ?').bind(videoId).run();
  await syncProject(db, {
    videos: [{
      id: videoId,
      title,
      url: videoUrl,
      upload_date: uploadDate,
      market_date: safeText(meta.market_date),
      market_date_sort: safeText(meta.market_date_sort),
      status: 'analyzed',
      priceStatus: priceRows.length ? 'ok' : 'empty',
      priceRowCount: priceRows.length,
      transcriptLineCount: stored.segments.length,
      language: stored.job?.language || 'hi',
      analysisMeta: meta,
    }],
    priceRows,
    videoAnalysis: { [videoId]: meta },
  });

  return {
    videoId,
    meta,
    priceRows,
    priceRowCount: priceRows.length,
    transcriptLineCount: stored.segments.length,
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if ((path === '/' || path === '/dashboard') && (request.method === 'GET' || request.method === 'HEAD')) {
        return request.method === 'HEAD'
          ? new Response(null, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...corsHeaders(request) } })
          : htmlResponse(DASHBOARD_HTML, 200, request);
      }

      if (path === '/api/health' && request.method === 'GET') {
        const counts = await getCounts(env.DB);
        const vectors = await getVectorStatus(env.DB, env).catch(() => null);
        return jsonResponse({
          ok: true,
          service: 'fruit-mandi-api',
          storage: 'cloudflare-d1',
          features: {
            transcription: Boolean(env.AI),
            whisperModel: WHISPER_MODEL,
          },
          counts,
          vectors,
        }, 200, request);
      }

      if (path === '/api/data' && request.method === 'GET') {
        const data = await exportProject(env.DB);
        return jsonResponse({ ok: true, data }, 200, request);
      }

      if (path === '/api/data' && request.method === 'POST') {
        if (!authorize(request, env)) {
          return jsonResponse({ ok: false, error: 'Unauthorized. Set Authorization: Bearer <SYNC_TOKEN>.' }, 401, request);
        }
        const body = await request.json();
        const counts = await syncProject(env.DB, body);
        const updatedAt = new Date().toISOString();
        return jsonResponse({ ok: true, counts, updatedAt, storage: 'cloudflare-d1' }, 200, request);
      }

      if (path === '/api/videos' && request.method === 'GET') {
        const result = await listVideos(env.DB, url);
        return jsonResponse({ ok: true, ...result }, 200, request);
      }

      const videoMatch = path.match(/^\/api\/videos\/([^/]+)$/);
      if (videoMatch && request.method === 'GET') {
        const video = await getVideo(env.DB, videoMatch[1]);
        if (!video) return jsonResponse({ ok: false, error: 'Video not found.' }, 404, request);
        return jsonResponse({ ok: true, video }, 200, request);
      }
      if (videoMatch && request.method === 'DELETE') {
        if (!authorize(request, env)) {
          return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401, request);
        }
        await deleteVideo(env.DB, videoMatch[1]);
        return jsonResponse({ ok: true, deleted: videoMatch[1] }, 200, request);
      }

      if (path === '/api/prices' && request.method === 'GET') {
        const result = await listPrices(env.DB, url);
        return jsonResponse({ ok: true, ...result }, 200, request);
      }

      if (path === '/api/analysis' && request.method === 'GET') {
        const result = await listAnalysis(env.DB, url);
        return jsonResponse({ ok: true, ...result }, 200, request);
      }

      if (path === '/api/analysis/run' && request.method === 'POST') {
        if (!authorize(request, env)) {
          return jsonResponse({ ok: false, error: 'Unauthorized. Set Authorization: Bearer <SYNC_TOKEN>.' }, 401, request);
        }
        const body = await request.json();
        const result = await analyzeStoredTranscript(env.DB, env, body);
        return jsonResponse({ ok: true, ...result }, 200, request);
      }

      const analysisMatch = path.match(/^\/api\/analysis\/([^/]+)$/);
      if (analysisMatch && request.method === 'GET') {
        const item = await getAnalysis(env.DB, analysisMatch[1]);
        if (!item) return jsonResponse({ ok: false, error: 'Analysis not found.' }, 404, request);
        return jsonResponse({ ok: true, item }, 200, request);
      }

      if (path === '/api/transcripts/transcribe' && request.method === 'POST') {
        if (!authorize(request, env)) {
          return jsonResponse({ ok: false, error: 'Unauthorized. Set Authorization: Bearer <SYNC_TOKEN>.' }, 401, request);
        }
        const body = await parseTranscriptRequest(request);
        if (shouldRunYoutubeTranscriptInBackground(body)) {
          const videoUrl = safeText(body.videoUrl || body.video_url || body.youtubeUrl || body.youtube_url);
          const videoId = safeText(body.videoId || body.video_id) || extractYouTubeId(videoUrl);
          const language = safeText(body.language) || 'hi';
          const jobId = shortId('tx');
          await insertTranscriptJob(env.DB, {
            id: jobId,
            video_id: videoId,
            video_url: videoUrl,
            audio_url: '',
            status: 'running',
            language,
            model: 'external-youtube-extractor',
            source: 'background-youtube-extractor',
            payload_json: JSON.stringify({
              stage: 'queued',
              message: 'Transcript job accepted. Starting YouTube audio download...',
              progress: 8,
            }),
          });
          ctx.waitUntil(runExternalYouTubeTranscriptJob(env.DB, env, {
            jobId,
            videoUrl,
            videoId,
            language,
          }));
          return jsonResponse({
            ok: true,
            accepted: true,
            job: {
              id: jobId,
              video_id: videoId,
              video_url: videoUrl,
              status: 'running',
              stage: 'queued',
              message: 'Transcript job accepted. Poll /api/transcripts/:videoId for progress.',
            },
          }, 202, request);
        }
        const result = await transcribeWithWorkersAI(env.DB, env, body);
        return jsonResponse({ ok: true, ...result }, 200, request);
      }

      const transcriptMatch = path.match(/^\/api\/transcripts\/([^/]+)$/);
      if (transcriptMatch && request.method === 'GET') {
        const item = await getTranscriptByVideo(env.DB, transcriptMatch[1]);
        if (!item) return jsonResponse({ ok: false, error: 'Transcript not found.' }, 404, request);
        return jsonResponse({ ok: true, ...item }, 200, request);
      }

      const transcriptJobMatch = path.match(/^\/api\/transcript-jobs\/([^/]+)$/);
      if (transcriptJobMatch && request.method === 'GET') {
        const item = await getTranscriptJob(env.DB, transcriptJobMatch[1]);
        if (!item) return jsonResponse({ ok: false, error: 'Transcript job not found.' }, 404, request);
        return jsonResponse({ ok: true, ...item }, 200, request);
      }

      if (path === '/api/vectors/status' && request.method === 'GET') {
        const status = await getVectorStatus(env.DB, env);
        return jsonResponse({ ok: true, ...status }, 200, request);
      }

      if (path === '/api/vectors/index' && request.method === 'POST') {
        const body = await request.json();
        const result = await indexVectorDatabase(env.DB, env, body);
        return jsonResponse(result, 200, request);
      }

      if (path === '/api/vectors/chat' && request.method === 'POST') {
        const body = await request.json();
        const result = await chatWithVectorData(env.DB, env, body);
        return jsonResponse(result, 200, request);
      }

      return jsonResponse({ ok: false, error: `Not found: ${path}` }, 404, request);
    } catch (error) {
      return jsonResponse({ ok: false, error: error?.message || 'Worker failed.', ...(error?.extra || {}) }, error?.status || 500, request);
    }
  },
};
