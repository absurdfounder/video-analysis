const IRRELEVANT_PATTERNS = [
  /\b(gold|silver|सोन[ाे]|चांदी|gold\s*market|silver\s*market|gold\s*rate|silver\s*rate|today\s*gold|today\s*silver)\b/i,
  /\b(petrol|diesel|fuel|crude\s*oil|lpg|cng)\b/i,
  /\b(sensex|nifty|stock\s*market|share\s*market|ipo)\b/i,
  /\b(cricket|ipl|election|politics|modi|rahul)\b/i,
  /\b(travel\s*vlog|tour\s*guide|holiday\s*trip)\b/i,
];

const RELEVANT_PATTERNS = [
  /\b(fruit|फल|mandi|मंडी|भाव|market\s*price|wholesale|holsale|azadpur|आजादपुर|delhi\s*fruit)\b/i,
  /\b(mango|आम|apple|सेब|banana|केला|orange|संतरा|lychee|लीची|grapes|अंगूर|guava|अमरूद|pomegranate|अनार|papaya|पपीता|kinnow|केसर)\b/i,
  /\b(onion|प्याज|potato|आलू|tomato|टमाटर|garlic|लहसुन|vegetable|सब्जी|sabzi|cabbage|गोभी|cauliflower|फूलगोभी|brinjal|बैंगन|chilli|मिर्च)\b/i,
];

function classifyByTitle(title) {
  const text = String(title || '').trim();
  const lower = text.toLowerCase();
  let irrelevantHits = 0;
  let relevantHits = 0;

  for (const pattern of IRRELEVANT_PATTERNS) {
    if (pattern.test(text)) irrelevantHits++;
  }
  for (const pattern of RELEVANT_PATTERNS) {
    if (pattern.test(text)) relevantHits++;
  }

  if (irrelevantHits > 0 && relevantHits === 0) {
    return {
      relevance: 'irrelevant',
      relevanceCategory: 'other',
      relevanceScore: Math.min(0.95, 0.55 + irrelevantHits * 0.15),
      relevanceReason: 'Title looks unrelated to fruit/vegetable mandi prices.',
      relevanceSource: 'heuristic',
    };
  }

  if (relevantHits > 0 && irrelevantHits === 0) {
    const isVeg = /\b(onion|प्याज|potato|आलू|tomato|टमाटर|garlic|लहसुन|vegetable|सब्जी|sabzi|cabbage|गोभी|cauliflower|फूलगोभी|brinjal|बैंगन|chilli|मिर्च)\b/i.test(lower);
    const isFruit = /\b(mango|आम|apple|सेब|banana|केला|orange|संतरा|lychee|लीची|grapes|अंगूर|guava|अमरूद|pomegranate|अनार|papaya|पपीता|kinnow|केसर|fruit|फल)\b/i.test(lower);
    return {
      relevance: 'relevant',
      relevanceCategory: isVeg && !isFruit ? 'vegetable' : isFruit && !isVeg ? 'fruit' : 'mixed',
      relevanceScore: Math.min(0.98, 0.6 + relevantHits * 0.1),
      relevanceReason: 'Title mentions mandi produce or market prices.',
      relevanceSource: 'heuristic',
    };
  }

  if (irrelevantHits > 0 && relevantHits > 0) {
    return {
      relevance: 'uncertain',
      relevanceCategory: 'mixed',
      relevanceScore: 0.45,
      relevanceReason: 'Title mixes market terms with unrelated topics (e.g. gold/silver).',
      relevanceSource: 'heuristic',
    };
  }

  return {
    relevance: 'uncertain',
    relevanceCategory: 'other',
    relevanceScore: 0.35,
    relevanceReason: 'Could not tell from title alone.',
    relevanceSource: 'heuristic',
  };
}

function applyClassification(video, result) {
  const next = { ...video, ...result };
  if (result.relevance === 'irrelevant' && next.status === 'pending') {
    next.status = 'skipped';
  }
  return next;
}

function classifyVideosHeuristic(videos) {
  return videos.map(video => applyClassification(video, classifyByTitle(video.title)));
}

async function classifyVideosWithAi(videos, apiKey, model, callOpenAI) {
  const heuristic = classifyVideosHeuristic(videos);
  const uncertain = heuristic.filter(video => video.relevance === 'uncertain');
  if (!uncertain.length || !apiKey) {
    return {
      videos: heuristic,
      aiUsed: false,
      counts: countRelevance(heuristic),
    };
  }

  const lines = uncertain.map((video, index) => `${index + 1}. [${video.id}] ${video.title}`).join('\n');
  const prompt = [
    'Classify these YouTube videos from a Delhi mandi / wholesale market channel.',
    'Keep only videos primarily about fruit or vegetable wholesale/mandi prices.',
    'Reject gold, silver, petrol, stocks, politics, travel vlogs, and unrelated news.',
    'Return JSON only:',
    '{"items":[{"id":"videoId","relevant":true,"category":"fruit|vegetable|mixed|other","confidence":0.0,"reason":"short reason"}]}',
    '',
    lines,
  ].join('\n');

  const json = await callOpenAI({
    apiKey,
    model: model || 'gpt-4o-mini',
    system: 'You classify YouTube titles for fruit/vegetable mandi price coverage. Return JSON only.',
    prompt,
  });

  const byId = new Map(
    (Array.isArray(json.items) ? json.items : []).map(item => [String(item.id || ''), item]),
  );

  const merged = heuristic.map(video => {
    if (video.relevance !== 'uncertain') return video;
    const ai = byId.get(video.id);
    if (!ai) return video;
    const relevant = Boolean(ai.relevant);
    const result = {
      relevance: relevant ? 'relevant' : 'irrelevant',
      relevanceCategory: String(ai.category || 'other'),
      relevanceScore: Number(ai.confidence) || (relevant ? 0.75 : 0.7),
      relevanceReason: String(ai.reason || 'AI title classification'),
      relevanceSource: 'ai',
    };
    return applyClassification(video, result);
  });

  return {
    videos: merged,
    aiUsed: true,
    counts: countRelevance(merged),
  };
}

function countRelevance(videos) {
  return videos.reduce((acc, video) => {
    const key = video.relevance || 'unclassified';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function isProcessableVideo(video) {
  return video.relevance !== 'irrelevant' && video.status !== 'skipped';
}
