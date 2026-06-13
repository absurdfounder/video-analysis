const { json, runYtdlp, youtubeCookiesConfigured } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  try {
    const { stdout } = await runYtdlp('', { version: true }, { timeout: 15000 });
    return json(200, {
      ok: true,
      ytdlpVersion: stdout.trim(),
      youtubeCookiesConfigured: youtubeCookiesConfigured(),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      note: 'Netlify Functions are active. Start with small batches because serverless functions have time limits.',
    });
  } catch (error) {
    return json(500, { ok: false, error: error.stderr || error.message });
  }
};
