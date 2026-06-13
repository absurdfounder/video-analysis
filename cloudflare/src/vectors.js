const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const EMBED_BATCH = 16;
const CHAT_MODEL_DEFAULT = 'gpt-4o-mini';

function safeText(value) {
  return String(value ?? '').trim();
}

function chunkId(prefix, key) {
  return `${prefix}:${String(key).slice(0, 120)}`;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedTexts(apiKey, texts) {
  const inputs = texts.map((text) => String(text || '').slice(0, 6000)).filter(Boolean);
  if (!inputs.length) return [];

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Embedding request failed: ${response.status}`);
  }

  const rows = Array.isArray(data.data) ? data.data : [];
  return rows
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map((row) => row.embedding || []);
}

async function embedInBatches(apiKey, texts) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const batchVectors = await embedTexts(apiKey, batch);
    vectors.push(...batchVectors);
  }
  return vectors;
}

function formatPriceRange(min, max) {
  const lo = min == null || min === '' ? null : Number(min);
  const hi = max == null || max === '' ? null : Number(max);
  if (lo == null && hi == null) return '';
  if (lo != null && hi != null && lo !== hi) return `₹${lo}–₹${hi}`;
  const value = lo ?? hi;
  return value == null ? '' : `₹${value}`;
}

export async function buildChunksFromDb(db) {
  const priceResult = await db.prepare(
    `SELECT row_hash, video_id, fruit, fruit_hindi, quality_grade, party_name, area_name, mandi_name,
            min_price_inr, max_price_inr, unit, market_date, market_date_sort, original_line,
            clean_hindi_line, context, video_title, video_url, timestamp_label, timestamp_url
     FROM price_rows
     ORDER BY market_date_sort DESC, timestamp_seconds ASC`,
  ).all();

  const analysisResult = await db.prepare(
    `SELECT video_id, meta_json, market_date, mention_count, source
     FROM video_analysis
     ORDER BY market_date_sort DESC`,
  ).all();

  const chunks = [];

  for (const row of priceResult.results || []) {
    const priceText = formatPriceRange(row.min_price_inr, row.max_price_inr);
    const text = [
      `Market day: ${safeText(row.market_date)}`,
      `Video: ${safeText(row.video_title)}`,
      `Fruit: ${safeText(row.fruit)}${row.fruit_hindi ? ` (${row.fruit_hindi})` : ''}`,
      row.quality_grade ? `Grade: ${row.quality_grade}` : '',
      row.party_name ? `Party: ${row.party_name}` : '',
      row.area_name || row.mandi_name ? `Area: ${safeText(row.area_name || row.mandi_name)}` : '',
      priceText ? `Price: ${priceText}${row.unit ? ` per ${row.unit}` : ''}` : '',
      row.timestamp_label ? `Timestamp: ${row.timestamp_label}` : '',
      safeText(row.clean_hindi_line || row.original_line),
      safeText(row.context),
    ].filter(Boolean).join('\n');

    chunks.push({
      id: chunkId('price', row.row_hash),
      doc_type: 'price_row',
      video_id: safeText(row.video_id),
      market_date: safeText(row.market_date),
      fruit: safeText(row.fruit),
      text,
      metadata: {
        video_id: safeText(row.video_id),
        video_title: safeText(row.video_title),
        video_url: safeText(row.video_url),
        fruit: safeText(row.fruit),
        market_date: safeText(row.market_date),
        party_name: safeText(row.party_name),
        timestamp_url: safeText(row.timestamp_url),
        doc_type: 'price_row',
      },
    });
  }

  for (const row of analysisResult.results || []) {
    let meta = null;
    try { meta = JSON.parse(row.meta_json || '{}'); } catch {}
    if (!meta) continue;

    const fruitLines = (meta.fruits || []).slice(0, 20).map((fruit) => {
      const price = formatPriceRange(fruit.min_price_inr, fruit.max_price_inr);
      return `${fruit.fruit}${fruit.fruit_hindi ? ` (${fruit.fruit_hindi})` : ''}${price ? ` ${price}` : ''}${fruit.quality_grades?.length ? ` grades: ${fruit.quality_grades.join(', ')}` : ''}`;
    });

    const text = [
      `Market day: ${safeText(meta.market_date || row.market_date)}`,
      `Video: ${safeText(meta.video_title)}`,
      meta.parties?.length ? `Parties: ${meta.parties.join(', ')}` : '',
      meta.areas?.length ? `Areas: ${meta.areas.join(', ')}` : '',
      meta.qualities?.length ? `Qualities: ${meta.qualities.join(', ')}` : '',
      fruitLines.length ? `Fruits:\n${fruitLines.join('\n')}` : '',
      `Mentions: ${row.mention_count || meta.mention_count || 0}`,
      `Source: ${safeText(row.source || meta.source)}`,
    ].filter(Boolean).join('\n');

    chunks.push({
      id: chunkId('analysis', row.video_id),
      doc_type: 'video_analysis',
      video_id: safeText(row.video_id),
      market_date: safeText(meta.market_date || row.market_date),
      fruit: '',
      text,
      metadata: {
        video_id: safeText(row.video_id),
        video_title: safeText(meta.video_title),
        video_url: safeText(meta.video_url),
        market_date: safeText(meta.market_date || row.market_date),
        doc_type: 'video_analysis',
      },
    });
  }

  return chunks;
}

async function upsertVectorize(env, chunks, vectors) {
  if (!env.VECTORIZE) return { backend: 'd1', indexed: 0 };
  const records = chunks.map((chunk, index) => ({
    id: chunk.id,
    values: vectors[index],
    metadata: {
      ...chunk.metadata,
      text: chunk.text.slice(0, 800),
      doc_type: chunk.doc_type,
      fruit: chunk.fruit || '',
    },
  }));

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    await env.VECTORIZE.upsert(records.slice(i, i + batchSize));
  }
  return { backend: 'cloudflare-vectorize', indexed: records.length };
}

async function upsertD1Vectors(db, chunks, vectors) {
  await db.prepare('DELETE FROM vector_chunks').run();
  const stmt = db.prepare(
    `INSERT INTO vector_chunks (id, doc_type, video_id, market_date, fruit, text, embedding_json, metadata_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  );

  const batch = [];
  for (let i = 0; i < chunks.length; i++) {
    batch.push(
      stmt.bind(
        chunks[i].id,
        chunks[i].doc_type,
        chunks[i].video_id,
        chunks[i].market_date,
        chunks[i].fruit,
        chunks[i].text,
        JSON.stringify(vectors[i]),
        JSON.stringify(chunks[i].metadata),
      ),
    );
  }
  if (batch.length) await db.batch(batch);
  return { backend: 'd1-vectors', indexed: chunks.length };
}

async function upsertSetting(db, key, value) {
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).bind(key, value).run();
}

export async function getVectorStatus(db, env) {
  const setting = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('vector_indexed_at').first();
  const d1Count = await db.prepare('SELECT COUNT(*) AS count FROM vector_chunks').first();
  let vectorizeCount = null;
  if (env.VECTORIZE?.describe) {
    try {
      const info = await env.VECTORIZE.describe();
      vectorizeCount = info?.vectorsCount ?? info?.vectorCount ?? null;
    } catch {
      vectorizeCount = null;
    }
  }

  return {
    backend: env.VECTORIZE ? 'cloudflare-vectorize' : 'd1-vectors',
    indexed_at: setting?.value || null,
    chunk_count: Number(d1Count?.count || 0) || vectorizeCount || 0,
    vectorize_bound: Boolean(env.VECTORIZE),
    embedding_model: EMBEDDING_MODEL,
  };
}

export async function indexVectorDatabase(db, env, body) {
  const apiKey = safeText(body.apiKey);
  if (!apiKey) throw new Error('OpenAI API key required to build the search index.');

  const chunks = await buildChunksFromDb(db);
  if (!chunks.length) {
    throw new Error('No price rows or analysis metadata in the database. Run Step 4 sync first.');
  }

  const texts = chunks.map((chunk) => chunk.text);
  const vectors = await embedInBatches(apiKey, texts);
  if (vectors.length !== chunks.length) {
    throw new Error('Embedding count mismatch while indexing.');
  }

  let result;
  if (env.VECTORIZE) {
    result = await upsertVectorize(env, chunks, vectors);
    await upsertD1Vectors(db, chunks, vectors);
  } else {
    result = await upsertD1Vectors(db, chunks, vectors);
  }

  const indexedAt = new Date().toISOString();
  await upsertSetting(db, 'vector_indexed_at', indexedAt);
  await upsertSetting(db, 'vector_backend', result.backend);

  return {
    ok: true,
    indexed: result.indexed,
    backend: result.backend,
    indexed_at: indexedAt,
    price_chunks: chunks.filter((chunk) => chunk.doc_type === 'price_row').length,
    analysis_chunks: chunks.filter((chunk) => chunk.doc_type === 'video_analysis').length,
  };
}

async function queryVectorize(env, queryVector, topK) {
  const result = await env.VECTORIZE.query(queryVector, {
    topK,
    returnMetadata: true,
  });
  return (result?.matches || []).map((match) => ({
    id: match.id,
    score: match.score,
    text: safeText(match.metadata?.text),
    metadata: match.metadata || {},
  }));
}

async function queryD1Vectors(db, queryVector, topK) {
  const result = await db.prepare(
    'SELECT id, text, metadata_json, embedding_json FROM vector_chunks',
  ).all();

  const scored = [];
  for (const row of result.results || []) {
    let embedding = [];
    try { embedding = JSON.parse(row.embedding_json || '[]'); } catch {}
    if (!embedding.length) continue;
    let metadata = {};
    try { metadata = JSON.parse(row.metadata_json || '{}'); } catch {}
    scored.push({
      id: row.id,
      score: cosineSimilarity(queryVector, embedding),
      text: safeText(row.text),
      metadata,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function retrieveContext(db, env, apiKey, message, topK = 8) {
  const [queryVector] = await embedTexts(apiKey, [message]);
  if (!queryVector?.length) throw new Error('Failed to embed chat query.');

  if (env.VECTORIZE) {
    const matches = await queryVectorize(env, queryVector, topK);
    if (matches.length) return matches;
  }

  const d1Matches = await queryD1Vectors(db, queryVector, topK);
  if (d1Matches.length) return d1Matches;

  return [];
}

function buildContextBlock(matches) {
  if (!matches.length) return 'No indexed context found. Build the search index first.';
  return matches.map((match, index) => {
    const meta = match.metadata || {};
    const header = [
      `#${index + 1}`,
      meta.market_date ? `day ${meta.market_date}` : '',
      meta.fruit ? `fruit ${meta.fruit}` : '',
      meta.video_title ? `video ${meta.video_title}` : '',
      meta.party_name ? `party ${meta.party_name}` : '',
      typeof match.score === 'number' ? `score ${match.score.toFixed(3)}` : '',
    ].filter(Boolean).join(' · ');
    return `[${header}]\n${match.text}`;
  }).join('\n\n');
}

async function callChatCompletion({ apiKey, model, messages }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || CHAT_MODEL_DEFAULT,
      temperature: 0.2,
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Chat request failed: ${response.status}`);
  }
  return safeText(data?.choices?.[0]?.message?.content);
}

export async function chatWithVectorData(db, env, body) {
  const apiKey = safeText(body.apiKey);
  const message = safeText(body.message);
  const model = safeText(body.model || CHAT_MODEL_DEFAULT);
  const topK = Math.max(3, Math.min(Number(body.topK || 8), 12));
  const history = Array.isArray(body.history) ? body.history : [];

  if (!apiKey) throw new Error('OpenAI API key required for chat.');
  if (!message) throw new Error('Message is required.');

  const status = await getVectorStatus(db, env);
  if (!status.chunk_count && !status.indexed_at) {
    throw new Error('Search index is empty. Click “Build search index” in Step 5 first.');
  }

  const matches = await retrieveContext(db, env, apiKey, message, topK);
  const context = buildContextBlock(matches);

  const system = [
    'You are a Delhi fruit and vegetable mandi data assistant.',
    'Answer questions using ONLY the retrieved database context below.',
    'When citing facts, include market day, fruit, party, area, price range, and video title when available.',
    'If the context is insufficient, say what is missing and suggest syncing or rebuilding the index.',
    'Be concise and practical for wholesale market research.',
    '',
    'Retrieved context:',
    context,
  ].join('\n');

  const messages = [
    { role: 'system', content: system },
    ...history
      .filter((entry) => entry?.role === 'user' || entry?.role === 'assistant')
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: safeText(entry.content) }))
      .filter((entry) => entry.content),
    { role: 'user', content: message },
  ];

  const answer = await callChatCompletion({ apiKey, model, messages });
  return {
    ok: true,
    answer,
    sources: matches.map((match) => ({
      id: match.id,
      score: match.score,
      video_id: match.metadata?.video_id || '',
      video_title: match.metadata?.video_title || '',
      video_url: match.metadata?.video_url || '',
      market_date: match.metadata?.market_date || '',
      fruit: match.metadata?.fruit || '',
      doc_type: match.metadata?.doc_type || '',
      excerpt: match.text.slice(0, 240),
    })),
    backend: status.backend,
  };
}

export { EMBEDDING_DIM, EMBEDDING_MODEL };
