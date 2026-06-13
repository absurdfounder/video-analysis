const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

import {
  chatWithVectorData,
  getVectorStatus,
  indexVectorDatabase,
} from './vectors.js';

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

function authorize(request, env) {
  const token = String(env.SYNC_TOKEN || '').trim();
  if (!token) return true;
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${token}`;
}

function safeText(value) {
  return String(value ?? '').trim();
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
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/api/health' && request.method === 'GET') {
        const counts = await getCounts(env.DB);
        const vectors = await getVectorStatus(env.DB, env).catch(() => null);
        return jsonResponse({
          ok: true,
          service: 'fruit-mandi-api',
          storage: 'cloudflare-d1',
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

      const analysisMatch = path.match(/^\/api\/analysis\/([^/]+)$/);
      if (analysisMatch && request.method === 'GET') {
        const item = await getAnalysis(env.DB, analysisMatch[1]);
        if (!item) return jsonResponse({ ok: false, error: 'Analysis not found.' }, 404, request);
        return jsonResponse({ ok: true, item }, 200, request);
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
      return jsonResponse({ ok: false, error: error?.message || 'Worker failed.' }, 500, request);
    }
  },
};
