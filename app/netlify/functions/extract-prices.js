const { json, parseBody, extractPricesFromSegments } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  try {
    const body = parseBody(event);
    const items = Array.isArray(body.items) ? body.items : [];
    const rows = items.flatMap(extractPricesFromSegments);
    return json(200, { ok: true, count: rows.length, rows });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};
