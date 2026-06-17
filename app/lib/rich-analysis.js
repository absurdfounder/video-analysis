const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

function safeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function secondsToClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  return raw;
}

function timestampUrl(videoUrl, seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  try {
    const url = new URL(videoUrl);
    url.searchParams.delete('t');
    url.searchParams.set('t', `${sec}s`);
    return url.toString();
  } catch {
    return `${videoUrl || ''}${String(videoUrl || '').includes('?') ? '&' : '?'}t=${sec}s`;
  }
}

const PRODUCE_INFO = [
  ['almond', 'Almond', 'Badam', '🌰'],
  ['badam', 'Almond', 'Badam', '🌰'],
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

const MANDI_PRODUCE = [
  { name: 'almond', terms: ['बादाम', 'badam', 'almond', 'kaghzi', 'कागजी', 'giri', 'गिरी'] },
  { name: 'mango', terms: ['आम', 'aam', 'mango', 'kesar', 'alphonso', 'hapus', 'dasheri', 'dusheri', 'dussehri', 'dishyari', 'लंगड़ा', 'langda', 'langra', 'chausa', 'chosa', 'safeda', 'safed', 'totapuri', 'golden', 'girnar', 'gujarat'] },
  { name: 'onion', terms: ['प्याज', 'onion', 'pyaz', 'pyaaz'] },
  { name: 'potato', terms: ['आलू', 'aloo', 'potato'] },
  { name: 'tomato', terms: ['टमाटर', 'tamatar', 'tomato'] },
  { name: 'garlic', terms: ['लहसुन', 'garlic', 'lehsun', 'lahsun'] },
  { name: 'watermelon', terms: ['तरबूज', 'tarbuj', 'watermelon', 'tarbooj'] },
  { name: 'pomegranate', terms: ['अनार', 'pomegranate', 'anar'] },
  { name: 'lychee', terms: ['लीची', 'litchi', 'lychee'] },
  { name: 'grapes', terms: ['अंगूर', 'grapes', 'angoor'] },
  { name: 'banana', terms: ['केला', 'banana', 'kela'] },
  { name: 'orange', terms: ['संतरा', 'orange', 'kinnow', 'santra', 'mausambi'] },
];

const VARIETIES = [
  ['कागजी', 'Kaghzi'], ['kaghzi', 'Kaghzi'], ['गिरी', 'Giri'], ['giri', 'Giri'],
  ['दिश्यारी', 'Dussehri'], ['dussehri', 'Dussehri'], ['dusheri', 'Dussehri'], ['dishyari', 'Dussehri'],
  ['लंगड़ा', 'Langda'], ['langda', 'Langda'], ['langra', 'Langda'],
  ['गोल्डन', 'Golden'], ['golden', 'Golden'],
  ['केसर', 'Kesar'], ['kesar', 'Kesar'], ['gir', 'Gir Kesar'], ['gujarat', 'Gujarat Kesar'],
  ['चौसा', 'Chausa'], ['chausa', 'Chausa'], ['chosa', 'Chausa'],
  ['सफेद', 'Safeda'], ['safeda', 'Safeda'], ['safed', 'Safeda'],
  ['टोटापुरी', 'Totapuri'], ['totapuri', 'Totapuri'], ['tota', 'Totapuri'],
];

function detectCommodities(text, title = '') {
  const hay = `${title} ${text}`.toLowerCase();
  const found = [];
  const seen = new Set();
  for (const item of MANDI_PRODUCE) {
    if (item.terms.some((term) => hay.includes(term.toLowerCase())) && !seen.has(item.name)) {
      seen.add(item.name);
      found.push(item.name);
    }
  }
  return found;
}

function detectVariety(text) {
  const hay = safeText(text).toLowerCase();
  for (const [needle, label] of VARIETIES) {
    if (hay.includes(needle)) return label;
  }
  return '';
}

function detectUnit(text) {
  const lower = safeText(text).toLowerCase();
  if (/(किलो|kg|kilo|kilogram|प्रति किलो|per kg)/i.test(lower)) return 'kg';
  if (/(पेटी|peti|box|carton|8\s*किलो|आठ किलो|8\s*kilo)/i.test(lower)) return 'box';
  if (/(क्रेट|crate)/i.test(lower)) return 'crate';
  if (/(क्विंटल|quintal|qtl)/i.test(lower)) return 'quintal';
  if (/(दर्जन|dozen)/i.test(lower)) return 'dozen';
  return 'unknown';
}

function isPlausibleMandiPrice(low, high, unit) {
  const u = safeText(unit).toLowerCase();
  if (u === 'kg' || u.includes('kilo')) return low >= 5 && high <= 400;
  if (u.includes('box') || u.includes('peti') || u.includes('crate')) return low >= 20 && high <= 10000;
  return low >= 5 && high <= 10000;
}

function normalizeSegments(segments) {
  return (Array.isArray(segments) ? segments : []).map((segment, index) => {
    const start = Number(segment.start_seconds ?? segment.start ?? 0);
    const end = Number(segment.end_seconds ?? segment.end ?? 0);
    return {
      segment_index: Number(segment.segment_index ?? index),
      start_seconds: Number.isFinite(start) ? start : 0,
      end_seconds: Number.isFinite(end) ? end : null,
      timestamp_label: safeText(segment.timestamp_label) || secondsToClock(start),
      text: safeText(segment.text || segment.caption || segment.line),
      language: safeText(segment.language),
      source: safeText(segment.source),
    };
  }).filter((segment) => segment.text);
}

function chunkTranscriptSegments(segments, maxChars = 9000) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const segment of segments) {
    const seconds = Math.max(0, Math.floor(Number(segment.start_seconds) || 0));
    const line = `[${seconds}s | ${segment.timestamp_label || secondsToClock(seconds)}] ${safeText(segment.text)}`;
    if (current.length && size + line.length > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(segment);
    size += line.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function formatSegmentsForPrompt(segments) {
  return segments.map((segment) => {
    const seconds = Math.max(0, Math.floor(Number(segment.start_seconds) || 0));
    return `[${seconds}s | ${segment.timestamp_label || secondsToClock(seconds)}] ${safeText(segment.text)}`;
  }).join('\n');
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

const MANDI_EXTRACTION_SYSTEM = [
  'You are an Indian wholesale mandi intelligence extractor.',
  'Input is noisy Hindi/Hinglish live auction video captions. Extract both prices and market intelligence.',
  'Return JSON only: {"meta": {...}, "rows": [...]}.',
  'meta fields: video_id, video_title, video_url, market_date, market_date_sort, mandi_names, areas, parties, produce, qualities, summary_english, facts, guidance, key_takeaways, learnings, transcript_highlights, chapters, price_mentions, grouped_produce, mention_count, source.',
  'Each fact/guidance/learning/chapter must include timestamp_seconds, title, text_english, text_hinglish, and importance.',
  'Rows fields: fruit, fruit_hindi, fruit_label, fruit_emoji, variety, quality_grade, quality_label, size_label, party_name, mandi_name, area_name, origin, unit, min_price_inr, max_price_inr, price_notes, market_name, market_date, market_date_sort, confidence, original_line, clean_english_line, clean_hinglish_line, context, notes, timestamp_seconds.',
  'Interpret rupee/rupay/rupye/robe/rave/rs/₹/रुपे/रुपय/रुपये as INR wholesale rates.',
  'Do not list the reporter/host as a trader party. Ignore dates, phone numbers, subscriber counts, truck counts, and unrelated random numbers as prices.',
  'Truck/load counts, weather impact, quality, arrivals, demand, supply, and trading advice belong in meta facts/guidance/learnings.',
].join('\n');

async function callOpenAIExtractorChunk({ apiKey, model, videoId, videoUrl, title, segments, chunkIndex, chunkTotal, uploadDate }) {
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MANDI_EXTRACTION_SYSTEM },
        {
          role: 'user',
          content: [
            `Video ID: ${videoId}`,
            `Video URL: ${videoUrl}`,
            `Title: ${title || ''}`,
            `Upload date: ${uploadDate || ''}`,
            `Chunk ${chunkIndex + 1} of ${chunkTotal}`,
            '',
            'Transcript segment lines. timestamp_seconds must match bracket seconds:',
            formatSegmentsForPrompt(segments),
          ].join('\n'),
        },
      ],
    }),
  });
  const text = await response.text();
  const data = extractJsonObject(text);
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI extraction failed: ${response.status} ${text.slice(0, 300)}`;
    throw new Error(message);
  }
  return extractJsonObject(data?.choices?.[0]?.message?.content || text);
}

function mergeExtractionMeta(base, chunk) {
  const next = { ...(base && typeof base === 'object' ? base : {}) };
  for (const key of ['facts', 'guidance', 'key_takeaways', 'learnings', 'transcript_highlights', 'chapters', 'price_mentions']) {
    next[key] = [...(Array.isArray(next[key]) ? next[key] : []), ...(Array.isArray(chunk?.[key]) ? chunk[key] : [])];
  }
  for (const key of ['mandi_names', 'areas', 'parties', 'qualities', 'produce']) {
    next[key] = [...(Array.isArray(next[key]) ? next[key] : []), ...(Array.isArray(chunk?.[key]) ? chunk[key] : [])];
  }
  if (chunk?.summary_english) next.summary_english = next.summary_english ? `${next.summary_english} ${chunk.summary_english}`.trim() : chunk.summary_english;
  if (chunk?.market_date) next.market_date = chunk.market_date;
  if (chunk?.market_date_sort) next.market_date_sort = chunk.market_date_sort;
  return next;
}

function extractPricesFromSegments({ segments, title, videoId, videoUrl, uploadDate, marketDate }) {
  const rows = [];
  const titleCommodities = detectCommodities('', title || '');
  const marketSort = marketDateSort(marketDate || title || uploadDate);
  const priceRe = /(?:₹|rs\.?|inr|रुप(?:ए|ये|या)?|रुपे|रोबे|रवे|रुपय|ups?|upe|भाव|rate|price|रेट)\s*(\d{1,4})(?:\s*(?:से|to|तक|-|–|—|lekar|लेकर)\s*(?:₹|rs\.?|inr|रुप(?:ए|ये|या)?)?\s*(\d{1,4}))?/gi;
  const list = Array.isArray(segments) ? segments : [];
  for (let i = 0; i < list.length; i += 1) {
    const windowText = safeText([list[i - 1]?.text || '', list[i]?.text || '', list[i + 1]?.text || ''].join(' '));
    const numbers = windowText.match(/\b\d{1,4}\b/g) || [];
    if (numbers.length >= 6 && !/(रुप|rs|₹|किलो|kg|भाव|रेट|price|रुपे|रुपय)/i.test(windowText)) continue;
    let match;
    while ((match = priceRe.exec(windowText)) !== null) {
      const min = normalizeNumber(match[1]);
      const max = normalizeNumber(match[2] || match[1]);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) continue;
      if ((min >= 1900 && min <= 2100) || (max >= 1900 && max <= 2100)) continue;
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      const unit = detectUnit(windowText);
      if (!isPlausibleMandiPrice(low, high, unit)) continue;
      const commodities = detectCommodities(windowText, title);
      const targets = commodities.length ? commodities : titleCommodities;
      if (!targets.length) continue;
      const seconds = Math.max(0, Math.floor(Number(list[i].start_seconds) || 0));
      for (const commodity of targets) {
        const info = produceInfo(commodity);
        rows.push({
          fruit: info?.english || commodity,
          fruit_hindi: info?.hinglish || '',
          fruit_label: info?.label || commodity,
          fruit_emoji: info?.emoji || '',
          variety: detectVariety(windowText),
          unit,
          min_price_inr: low,
          max_price_inr: high,
          market_date: marketDate || '',
          market_date_sort: marketSort,
          confidence: match[2] ? 'medium' : 'low',
          original_line: safeText(list[i].text),
          clean_hinglish_line: safeText(list[i].text),
          context: windowText,
          source: 'regex-supplement',
          timestamp_seconds: seconds,
          timestamp_label: secondsToClock(seconds),
          timestamp_url: timestampUrl(videoUrl, seconds),
          video_id: videoId,
          video_title: title,
          video_url: videoUrl,
          upload_date: uploadDate,
        });
      }
    }
  }
  return rows;
}

const MARKET_INSIGHT_RULES = [
  { bucket: 'facts', kind: 'arrivals', title: 'Truck / load arrivals', test: (t) => /(गाड़ी|gadi|truck|लोड|load|record|पचास|पच्पन)/i.test(t) && /\d+/.test(t) },
  { bucket: 'facts', kind: 'weather', title: 'Rain / weather impact', test: (t) => /(बारिश|बारिशी|rain|पानी|weather)/i.test(t) },
  { bucket: 'facts', kind: 'season', title: 'Season status', test: (t) => /(सीजन|season|आखरी|closing|खत्म|band|क्लोज)/i.test(t) },
  { bucket: 'facts', kind: 'supply', title: 'Supply / stock on ground', test: (t) => /(माल|maal|आवक|supply|पड़े|arrival|बच|left)/i.test(t) },
  { bucket: 'facts', kind: 'demand', title: 'Demand / buyer interest', test: (t) => /(माँग|demand|ग्राहक|buyer|बिक|बिक्री|sell|खरीद)/i.test(t) },
  { bucket: 'guidance', kind: 'quality', title: 'Quality / grading note', test: (t) => /(क्वालिटी|quality|grade|नंबर|safed|सफेद|कच्छा|पक्का|बारिशी|निशान)/i.test(t) },
  { bucket: 'guidance', kind: 'trade', title: 'Trade / clearance advice', test: (t) => /(क्लियर|clear|बेच|खरीद|hold|रोक|खालो|बेचना|रोकेंगे)/i.test(t) },
  { bucket: 'learnings', kind: 'trend', title: 'Rate trend / market movement', test: (t) => /(बाजार|market|रेट|rate|भाव).{0,60}(ऊपर|नीचे|up|down|कम|ज्यादा|सुधार|डाउन|बेहतर|खराब|औसत|average)/i.test(t) },
  { bucket: 'learnings', kind: 'comparison', title: 'Today vs earlier market', test: (t) => /(आज|today|पहले|कल|yesterday|पिछले|last week|हफ्ता|सुधार)/i.test(t) && /(रेट|rate|भाव|market|बाजार|बिक)/i.test(t) },
  { bucket: 'chapters', kind: 'variety_shift', title: 'Variety / origin section', test: (t) => /(बादाम|badam|kaghzi|कागजी|लंगड़ा|langda|दिश्यारी|dussehri|golden|केसर|kesar|chausa|totapuri|gujarat|गुजरात|यूपी|अगला|next lot)/i.test(t) },
];

function extractMarketInsightsFromSegments(segments, title = '') {
  const buckets = { facts: [], guidance: [], learnings: [], chapters: [] };
  for (const segment of Array.isArray(segments) ? segments : []) {
    const text = safeText(segment.text);
    if (text.length < 16) continue;
    const seconds = Math.max(0, Math.floor(Number(segment.start_seconds) || 0));
    for (const rule of MARKET_INSIGHT_RULES) {
      if (!rule.test(text)) continue;
      buckets[rule.bucket].push({
        timestamp_seconds: seconds,
        timestamp_label: secondsToClock(seconds),
        title: rule.title,
        kind: rule.kind,
        text_english: '',
        text_hinglish: text.slice(0, 320),
        importance: rule.bucket === 'learnings' ? 'high' : 'medium',
        source: 'insight-supplement',
      });
      break;
    }
  }
  if (!buckets.facts.length && title) {
    const topics = detectCommodities(title);
    if (topics.length) {
      buckets.facts.push({
        timestamp_seconds: 0,
        timestamp_label: '0:00',
        title: 'Video topic',
        kind: 'topic',
        text_english: `Wholesale market report covering ${topics.join(', ')}.`,
        text_hinglish: title.slice(0, 200),
        importance: 'medium',
        source: 'insight-supplement',
      });
    }
  }
  return buckets;
}

function dedupeRawRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.video_id, row.fruit_label || row.fruit, row.variety, row.quality_grade, row.unit, row.min_price_inr, row.max_price_inr, row.timestamp_seconds, row.original_line].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueClean(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(safeText).filter(Boolean)));
}

function normalizeMetaList(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    if (typeof item === 'string') {
      return { timestamp_seconds: 0, timestamp_label: '0:00', title: item.slice(0, 80), text_english: item, text_hinglish: item, importance: 'medium' };
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

function dedupeMetaItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const text = safeText(item.text_english || item.text_hinglish || item.title).toLowerCase();
    if (!text) return false;
    const key = `${item.timestamp_seconds || 0}|${safeText(item.title).toLowerCase()}|${text.slice(0, 96)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0));
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
    party_name: safeText(item?.party_name || fallback.party_name),
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
  normalized.source = 'railway-openai';
  normalized.market_date_sort = safeText(normalized.market_date_sort) || marketDateSort(normalized.market_date || uploadDate);
  normalized.mandi_names = uniqueClean(normalized.mandi_names);
  normalized.areas = uniqueClean(normalized.areas);
  normalized.parties = uniqueClean(normalized.parties);
  normalized.qualities = uniqueClean(normalized.qualities);
  normalized.produce = uniqueClean(normalized.produce).map((item) => {
    const info = produceInfo(item);
    return info ? `${info.emoji} ${info.label}` : item;
  });
  normalized.facts = dedupeMetaItems(normalizeMetaList(normalized.facts));
  normalized.guidance = dedupeMetaItems(normalizeMetaList(normalized.guidance));
  normalized.learnings = dedupeMetaItems(normalizeMetaList([...(Array.isArray(normalized.key_takeaways) ? normalized.key_takeaways : []), ...(Array.isArray(normalized.learnings) ? normalized.learnings : [])]));
  normalized.key_takeaways = normalized.learnings;
  normalized.transcript_highlights = dedupeMetaItems(normalizeMetaList(normalized.transcript_highlights));
  normalized.chapters = dedupeMetaItems(normalizeMetaList(normalized.chapters));
  const rowMentions = (Array.isArray(rows) ? rows : []).map((row) => normalizePriceMention(row, row));
  const aiMentions = (Array.isArray(normalized.price_mentions) ? normalized.price_mentions : []).map((item) => normalizePriceMention(item));
  const seen = new Set();
  normalized.price_mentions = [...aiMentions, ...rowMentions].filter((mention) => {
    const key = [mention.fruit_label, mention.quality_grade, mention.quality_label, mention.size_label, mention.party_name, mention.min_price_inr, mention.max_price_inr, mention.timestamp_seconds, mention.text_hinglish].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return mention.fruit_label || mention.text_english || mention.text_hinglish;
  });
  const grouped = new Map();
  for (const mention of normalized.price_mentions) {
    const key = mention.fruit_label || mention.fruit || 'Unknown produce';
    if (!grouped.has(key)) grouped.set(key, { fruit_label: key, fruit_emoji: mention.fruit_emoji, varieties: [], qualities: [], areas: [], parties: [], timestamps: [], mention_count: 0, min_price_inr: null, max_price_inr: null });
    const group = grouped.get(key);
    group.mention_count += 1;
    if (mention.variety) group.varieties.push(mention.variety);
    if (mention.quality_grade || mention.quality_label || mention.size_label) group.qualities.push([mention.quality_grade, mention.quality_label, mention.size_label].filter(Boolean).join(' · '));
    if (mention.area_name || mention.mandi_name) group.areas.push(mention.area_name || mention.mandi_name);
    if (mention.party_name) group.parties.push(mention.party_name);
    group.timestamps.push(mention.timestamp_seconds);
    if (Number.isFinite(mention.min_price_inr)) group.min_price_inr = group.min_price_inr == null ? mention.min_price_inr : Math.min(group.min_price_inr, mention.min_price_inr);
    if (Number.isFinite(mention.max_price_inr)) group.max_price_inr = group.max_price_inr == null ? mention.max_price_inr : Math.max(group.max_price_inr, mention.max_price_inr);
  }
  normalized.grouped_produce = Array.from(grouped.values()).map((group) => ({ ...group, varieties: uniqueClean(group.varieties).slice(0, 12), qualities: uniqueClean(group.qualities).slice(0, 20), areas: uniqueClean(group.areas).slice(0, 12), parties: uniqueClean(group.parties).slice(0, 12), timestamps: Array.from(new Set(group.timestamps)).sort((a, b) => a - b).slice(0, 20) }));
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
    let low = null;
    let high = null;
    if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
      low = Math.min(min, max);
      high = Math.max(min, max);
    } else if (Number.isFinite(min) && min > 0) {
      low = high = min;
    } else if (Number.isFinite(max) && max > 0) {
      low = high = max;
    } else {
      return null;
    }
    const unit = safeText(row.unit) || 'unknown';
    if (!isPlausibleMandiPrice(low, high, unit)) return null;
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
      party_name: safeText(row.party_name),
      mandi_name: safeText(row.mandi_name),
      area_name: safeText(row.area_name),
      origin: safeText(row.origin),
      unit,
      min_price_inr: low,
      max_price_inr: high,
      price_notes: safeText(row.price_notes || row.notes),
      market_name: safeText(row.market_name || row.mandi_name),
      market_date: marketDate,
      market_date_sort: marketSort,
      confidence: ['high', 'medium', 'low'].includes(safeText(row.confidence).toLowerCase()) ? safeText(row.confidence).toLowerCase() : 'medium',
      original_line: safeText(row.original_line),
      clean_hindi_line: safeText(row.clean_hindi_line || row.clean_hinglish_line || row.clean_english_line),
      context: safeText(row.context),
      notes: safeText(row.notes),
      source: safeText(row.source) || 'railway-openai',
      timestamp_seconds: seconds,
      timestamp_label: secondsToClock(seconds),
      timestamp_url: timestampUrl(videoUrl, seconds),
      video_title: title,
      video_url: videoUrl,
      upload_date: uploadDate,
      fruit_label: fruitLabel,
      clean_english_line: safeText(row.clean_english_line),
      clean_hinglish_line: safeText(row.clean_hinglish_line),
    };
  }).filter(Boolean);
}

async function analyzeTranscriptRich({ apiKey, model, videoId, videoUrl, title, uploadDate, segments, onStep }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on Railway.');
  const normalizedSegments = normalizeSegments(segments);
  if (!normalizedSegments.length) throw new Error('No transcript segments were provided for analysis.');
  const chunks = chunkTranscriptSegments(normalizedSegments, 9000);
  let mergedMeta = {};
  const allRows = [];
  for (let i = 0; i < chunks.length; i += 1) {
    if (onStep) onStep({ stage: 'ai_extraction', message: `Analyzing transcript chunk ${i + 1}/${chunks.length}`, progress: Math.round(35 + (i / Math.max(1, chunks.length)) * 45) });
    const result = await callOpenAIExtractorChunk({ apiKey, model, videoId, videoUrl, title, segments: chunks[i], chunkIndex: i, chunkTotal: chunks.length, uploadDate });
    mergedMeta = mergeExtractionMeta(mergedMeta, result.meta || {});
    if (Array.isArray(result.rows)) allRows.push(...result.rows);
  }
  if (onStep) onStep({ stage: 'regex_supplement', message: 'Adding regex price supplements and market insight rules', progress: 82 });
  const regexRows = extractPricesFromSegments({ segments: normalizedSegments, title, videoId, videoUrl, uploadDate, marketDate: mergedMeta.market_date });
  allRows.push(...regexRows);
  const insights = extractMarketInsightsFromSegments(normalizedSegments, title);
  mergedMeta = mergeExtractionMeta(mergedMeta, insights);
  const rawRows = dedupeRawRows(allRows);
  const meta = normalizeAnalysisMeta({ videoId, videoUrl, title, uploadDate, meta: mergedMeta, rows: rawRows, segments: normalizedSegments });
  const priceRows = normalizeAnalysisRows({ videoId, videoUrl, title, uploadDate, meta, rows: rawRows });
  return {
    videoId,
    meta,
    priceRows,
    priceRowCount: priceRows.length,
    transcriptLineCount: normalizedSegments.length,
    model: model || 'gpt-4o-mini',
  };
}

module.exports = {
  analyzeTranscriptRich,
  normalizeSegments,
  safeText,
};
