const { json, parseBody } = require('./_utils');
const { classifyVideosHeuristic } = require('./_classify');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });

  try {
    const body = parseBody(event);
    const videos = Array.isArray(body.videos) ? body.videos : [];
    if (!videos.length) return json(400, { ok: false, error: 'No videos to classify.' });

    const classified = classifyVideosHeuristic(videos);
    const counts = classified.reduce((acc, video) => {
      const key = video.relevance || 'unclassified';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return json(200, { ok: true, videos: classified, aiUsed: false, counts });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Classification failed.' });
  }
};
