const { json, parseBody, safeText, runYtdlp } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  try {
    const body = parseBody(event);
    const channelUrl = safeText(body.channelUrl);
    const maxVideos = Math.max(1, Math.min(Number(body.maxVideos || 25), 100));

    if (!/^https?:\/\//i.test(channelUrl) || !/youtube\.com|youtu\.be/i.test(channelUrl)) {
      return json(400, { ok: false, error: 'Please enter a valid YouTube channel/video/playlist URL.' });
    }

    const { stdout } = await runYtdlp(channelUrl, {
      flatPlaylist: true,
      dumpJson: true,
      ignoreErrors: true,
      noWarnings: true,
      playlistEnd: String(maxVideos),
    }, { timeout: 25000 });

    const videos = stdout.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean)
      .map(item => {
        const id = item.id || '';
        return {
          id,
          title: item.title || '',
          url: item.url && /^https?:/.test(item.url) ? item.url : `https://www.youtube.com/watch?v=${id}`,
          upload_date: item.upload_date || item.release_date || '',
          duration: item.duration || '',
          channel: item.channel || item.uploader || '',
          status: 'pending',
          language: '',
          transcriptText: '',
          segments: [],
          error: '',
        };
      })
      .filter(v => v.id);

    return json(200, { ok: true, count: videos.length, videos });
  } catch (error) {
    return json(500, { ok: false, error: error.stderr || error.message });
  }
};
