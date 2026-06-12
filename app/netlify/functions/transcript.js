const { fs, os, path, crypto, json, parseBody, safeText, parseVtt, languageScore, guessLanguage, runYtdlp } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fruit-ytdlp-'));
  try {
    const body = parseBody(event);
    const videoUrl = safeText(body.videoUrl || body.url);
    const id = safeText(body.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '');
    const languages = safeText(body.languages || 'hi.*,hi,en.*');

    if (!/^https?:\/\//i.test(videoUrl)) {
      return json(400, { ok: false, error: 'Invalid video URL.' });
    }

    const outTemplate = path.join(tempRoot, '%(id)s.%(ext)s');
    await runYtdlp(videoUrl, {
      skipDownload: true,
      writeSubs: true,
      writeAutoSubs: true,
      subLangs: languages,
      subFormat: 'vtt',
      output: outTemplate,
      noWarnings: true,
    }, { timeout: 25000, cwd: tempRoot });

    const files = fs.readdirSync(tempRoot)
      .filter(file => file.toLowerCase().endsWith('.vtt'))
      .sort((a, b) => languageScore(a) - languageScore(b));

    if (!files.length) {
      return json(404, { ok: false, id, error: 'No transcript/caption file found for this video.' });
    }

    const selectedFile = files[0];
    const vtt = fs.readFileSync(path.join(tempRoot, selectedFile), 'utf-8');
    const segments = parseVtt(vtt);
    const transcriptText = segments.map(s => s.text).join(' ');

    return json(200, {
      ok: true,
      id,
      language: guessLanguage(selectedFile),
      fileName: selectedFile,
      segmentCount: segments.length,
      transcriptText,
      segments,
    });
  } catch (error) {
    return json(500, { ok: false, error: error.stderr || error.message });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
};
