const { json, parseBody } = require('./_utils');
const { loadProjectData, saveProjectData, mergeProjectData, authorizeWrite } = require('./_dataStore');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    if (event.httpMethod === 'GET') {
      const data = await loadProjectData();
      return json(200, { ok: true, data });
    }

    if (event.httpMethod === 'POST') {
      if (!authorizeWrite(event)) {
        return json(401, { ok: false, error: 'Unauthorized. Set Authorization: Bearer <DATA_SYNC_TOKEN>.' });
      }

      const patch = parseBody(event);
      const existing = await loadProjectData();
      const merged = mergeProjectData(existing, patch);
      const saved = await saveProjectData(merged);
      return json(200, {
        ok: true,
        counts: {
          videos: saved.videos.length,
          priceRows: saved.priceRows.length,
          knownVideoIds: saved.knownVideoIds.length,
        },
        updatedAt: saved.updatedAt,
      });
    }

    return json(405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Data store failed.' });
  }
};
