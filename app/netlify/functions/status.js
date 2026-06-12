const { json } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  return json(200, {
    ok: true,
    ytdlpVersion: 'bundled via youtube-dl-exec during Netlify build',
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    note: 'Netlify Functions are active. Start with small batches because serverless functions have time limits.',
  });
};
