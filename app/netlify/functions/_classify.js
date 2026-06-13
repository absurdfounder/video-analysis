const {
  IRRELEVANT_PATTERNS,
  RELEVANT_PATTERNS,
} = (() => {
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
  return { IRRELEVANT_PATTERNS, RELEVANT_PATTERNS };
})();

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
  if (result.relevance === 'irrelevant' && next.status === 'pending') next.status = 'skipped';
  return next;
}

function classifyVideosHeuristic(videos) {
  return videos.map(video => applyClassification(video, classifyByTitle(video.title)));
}

module.exports = {
  classifyByTitle,
  applyClassification,
  classifyVideosHeuristic,
};
