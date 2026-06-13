const { fs, os, path, crypto, json, parseBody, safeText, runYtdlp } = require('./_utils');

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_FILE_LIMIT_BYTES = 24 * 1024 * 1024;
const EXTRACTOR_VERSION = 'youtube-audio-openai-v2';
const EXTRACTOR_SOURCE = 'youtube-audio-openai-whisper';

function secondsToClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function mimeFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
  if (ext === '.mp3' || ext === '.mpeg' || ext === '.mpga') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.ogg' || ext === '.oga') return 'audio/ogg';
  return 'application/octet-stream';
}

function pickAudioFile(tempRoot) {
  const ignored = new Set(['.json', '.part', '.vtt', '.srt', '.srv1', '.srv2', '.srv3', '.ttml', '.webp', '.jpg', '.jpeg', '.png']);
  const files = fs.readdirSync(tempRoot)
    .map(file => path.join(tempRoot, file))
    .filter(filePath => {
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size <= 0) return false;
      return !ignored.has(path.extname(filePath).toLowerCase());
    })
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  return files[0] || '';
}

async function downloadYoutubeAudio(videoUrl, tempRoot, body) {
  const outTemplate = path.join(tempRoot, '%(id)s.%(ext)s');
  const format = safeText(body.format) || [
    'bestaudio[ext=m4a][filesize<24M]',
    'bestaudio[ext=webm][filesize<24M]',
    'bestaudio[filesize<24M]',
    'bestaudio[filesize_approx<24M]',
    'worstaudio',
  ].join('/');

  try {
    await runYtdlp(videoUrl, {
      format,
      output: outTemplate,
      noPlaylist: true,
      noWarnings: true,
    }, {
      timeout: Number(body.downloadTimeoutMs) || 90000,
      cwd: tempRoot,
      maxBuffer: 1024 * 1024 * 120,
    });
  } catch (error) {
    error.stage = 'download_audio';
    throw error;
  }

  const audioPath = pickAudioFile(tempRoot);
  if (!audioPath) {
    const error = new Error('yt-dlp did not produce an audio file.');
    error.stage = 'download_audio';
    throw error;
  }

  const size = fs.statSync(audioPath).size;
  if (size > OPENAI_FILE_LIMIT_BYTES) {
    const error = new Error(`Downloaded audio is ${(size / 1024 / 1024).toFixed(1)} MB. OpenAI transcription accepts files under 24 MB; use a shorter video or add chunking.`);
    error.stage = 'download_audio';
    throw error;
  }

  return audioPath;
}

function normalizeLanguage(value) {
  const raw = safeText(value).toLowerCase();
  if (!raw) return 'hi';
  if (raw.startsWith('hi')) return 'hi';
  if (raw.startsWith('en')) return 'en';
  return raw.split(/[,\s]+/)[0] || 'hi';
}

function normalizeSegments(data) {
  const rawSegments = Array.isArray(data?.segments) ? data.segments : [];
  const segments = rawSegments.map((segment, index) => {
    const start = Number(segment.start || 0);
    const end = segment.end == null ? null : Number(segment.end);
    return {
      start: Number.isFinite(start) ? Number(start.toFixed(3)) : 0,
      end: Number.isFinite(end) ? Number(end.toFixed(3)) : null,
      duration: Number.isFinite(end) ? Number(Math.max(0, end - start).toFixed(3)) : null,
      timestamp_label: secondsToClock(start),
      text: safeText(segment.text),
      segment_index: index,
    };
  }).filter(segment => segment.text);

  if (!segments.length && safeText(data?.text)) {
    segments.push({
      start: 0,
      end: null,
      duration: null,
      timestamp_label: '0:00',
      text: safeText(data.text),
      segment_index: 0,
    });
  }

  return segments;
}

async function transcribeWithOpenAI(audioPath, body) {
  const apiKey = safeText(process.env.OPENAI_API_KEY || body.openAiApiKey || body.openaiApiKey);
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not set on the extractor server or request.');
    error.stage = 'openai_transcription';
    throw error;
  }

  const model = safeText(body.model || process.env.OPENAI_TRANSCRIBE_MODEL) || 'whisper-1';
  const language = normalizeLanguage(body.language || body.languages);
  const prompt = safeText(body.prompt || process.env.OPENAI_TRANSCRIBE_PROMPT) || [
    'Hindi and Hinglish Delhi fruit mandi market conversation.',
    'Preserve produce names, rupee prices, quantities, quality grades, areas, parties, and spoken Hindi wording.',
  ].join(' ');

  const buffer = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeFromFile(audioPath) }), path.basename(audioPath));
  form.append('model', model);
  form.append('language', language);
  form.append('prompt', prompt);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!response.ok) {
    const error = new Error(data?.error?.message || `OpenAI transcription failed: ${response.status} ${text.slice(0, 300)}`);
    error.stage = 'openai_transcription';
    throw error;
  }

  const segments = normalizeSegments(data);
  return {
    model,
    language,
    transcriptText: safeText(data.text) || segments.map(segment => segment.text).join(' '),
    segments,
    raw: data,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fruit-youtube-audio-'));
  try {
    const body = parseBody(event);
    const videoUrl = safeText(body.videoUrl || body.url);
    const id = safeText(body.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '');

    if (!/^https?:\/\//i.test(videoUrl)) {
      return json(400, { ok: false, error: 'Invalid video URL.' });
    }

    const audioPath = await downloadYoutubeAudio(videoUrl, tempRoot, body);
    const audioStat = fs.statSync(audioPath);
    const transcription = await transcribeWithOpenAI(audioPath, body);

    return json(200, {
      ok: true,
      id,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      model: transcription.model,
      language: transcription.language,
      fileName: path.basename(audioPath),
      audioBytes: audioStat.size,
      segmentCount: transcription.segments.length,
      transcriptText: transcription.transcriptText,
      segments: transcription.segments,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      stage: error.stage || 'unknown',
      error: error.stderr || error.message,
    });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
};
