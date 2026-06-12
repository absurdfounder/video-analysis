const { json, parseBody, safeText, aiExtractForItem } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  try {
    const body = parseBody(event);
    const items = Array.isArray(body.items) ? body.items : [];
    const apiKey = safeText(body.apiKey || process.env.OPENAI_API_KEY);
    const model = safeText(body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini');
    const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || items.length || 1), 20));
    const maxCharsPerCall = Math.max(2500, Math.min(Number(body.maxCharsPerCall || 8000), 12000));

    if (!apiKey) {
      return json(400, { ok: false, error: 'Missing OpenAI API key. Add OPENAI_API_KEY in Netlify environment variables, or paste it into the app field.' });
    }

    const selected = items.slice(0, maxVideos);
    const allRows = [];
    for (const item of selected) {
      const rows = await aiExtractForItem(item, { apiKey, model, maxCharsPerCall });
      allRows.push(...rows);
    }
    return json(200, { ok: true, count: allRows.length, rows: allRows, model });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};
