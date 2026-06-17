const {
  fs,
  os,
  path,
  crypto,
  json,
  parseBody,
  safeText,
  parseVtt,
  languageScore,
  guessLanguage,
  runYtdlp,
} = require('./_utils');

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_FILE_LIMIT_BYTES = 24 * 1024 * 1024;
const EXTRACTOR_VERSION = 'youtube-subtitles-first-v3';
const EXTRACTOR_SOURCE = 'youtube-subtitles-first';

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

function normalizeSubtitleSegments(segments) {
  return (Array.isArray(segments) ? segments : []).map((segment, index) => {
    const start = Number(segment.start_seconds ?? segment.start ?? 0);
    const endValue = segment.end_seconds ?? segment.end;
    const end = endValue == null ? null : Number(endValue);
    return {
      start: Number.isFinite(start) ? Number(start.toFixed(3)) : 0,
      end: Number.isFinite(end) ? Number(end.toFixed(3)) : null,
      duration: Number.isFinite(end) ? Number(Math.max(0, end - start).toFixed(3)) : null,
      timestamp_label: safeText(segment.timestamp_label) || secondsToClock(start),
      text: safeText(segment.text),
      segment_index: index,
    };
  }).filter(segment => segment.text);
}

function parseJson3Subtitle(text) {
  let data = {};
  try { data = JSON.parse(String(text || '')); } catch { return []; }
  const segments = (Array.isArray(data.events) ? data.events : []).map((event) => {
    const rawText = (Array.isArray(event.segs) ? event.segs : [])
      .map(seg => String(seg?.utf8 ?? ''))
      .join('')
      .replace(/\n/g, ' ');
    const start = Number(event.tStartMs || 0) / 1000;
    const duration = Number(event.dDurationMs || 0) / 1000;
    return {
      start,
      end: duration > 0 ? start + duration : null,
      timestamp_label: secondsToClock(start),
      text: rawText,
    };
  });
  return normalizeSubtitleSegments(segments);
}

function parseXmlSubtitle(text) {
  const segments = [];
  const blocks = String(text || '').matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g);
  for (const block of blocks) {
    const attrs = block[1] || '';
    const start = Number((attrs.match(/\bstart="([^"]+)"/) || [])[1] || 0);
    const duration = Number((attrs.match(/\bdur="([^"]+)"/) || [])[1] || 0);
    const body = String(block[2] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    segments.push({
      start,
      end: duration > 0 ? start + duration : null,
      timestamp_label: secondsToClock(start),
      text: body,
    });
  }
  return normalizeSubtitleSegments(segments);
}

function parseSubtitleFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const text = fs.readFileSync(filePath, 'utf8');
  if (ext === '.json3') return parseJson3Subtitle(text);
  if (ext === '.vtt') return normalizeSubtitleSegments(parseVtt(text));
  if (ext === '.srv1' || ext === '.srv2' || ext === '.srv3' || ext === '.ttml' || ext === '.xml') return parseXmlSubtitle(text);
  return [];
}

async function downloadYoutubeSubtitles(videoUrl, tempRoot, body) {
  const outTemplate = path.join(tempRoot, '%(id)s.%(ext)s');
  const languages = safeText(body.languages || body.language) || 'hi.*,hi,en.*,en';
  let ytdlpError = null;
  try {
    await runYtdlp(videoUrl, {
      skipDownload: true,
      writeSubs: true,
      writeAutoSubs: true,
      subLangs: languages,
      subFormat: 'json3/vtt/srv3/best',
      output: outTemplate,
      noPlaylist: true,
      noWarnings: true,
    }, {
      timeout: Number(body.subtitleTimeoutMs) || 60000,
      cwd: tempRoot,
      maxBuffer: 1024 * 1024 * 80,
    });
  } catch (error) {
    ytdlpError = error;
  }

  const subtitleFiles = fs.readdirSync(tempRoot)
    .map(file => path.join(tempRoot, file))
    .filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      if (!['.json3', '.vtt', '.srv1', '.srv2', '.srv3', '.ttml', '.xml'].includes(ext)) return false;
      try { return fs.statSync(filePath).size > 0; } catch { return false; }
    })
    .sort((a, b) => languageScore(path.basename(a)) - languageScore(path.basename(b)));

  const errors = [];
  for (const subtitlePath of subtitleFiles) {
    try {
      const segments = parseSubtitleFile(subtitlePath);
      if (segments.length) {
        return {
          model: 'yt-dlp-subtitles',
          language: guessLanguage(path.basename(subtitlePath)),
          transcriptText: segments.map(segment => segment.text).join(' '),
          segments,
          fileName: path.basename(subtitlePath),
          method: `yt-dlp-subtitles:${path.extname(subtitlePath).slice(1)}`,
          methodLabel: `yt-dlp subtitles (${guessLanguage(path.basename(subtitlePath))})`,
        };
      }
      errors.push(`${path.basename(subtitlePath)}: no lines`);
    } catch (error) {
      errors.push(`${path.basename(subtitlePath)}: ${error.message}`);
    }
  }

  const detail = [
    ytdlpError ? (ytdlpError.stderr || ytdlpError.message) : '',
    errors.length ? errors.join(' · ') : '',
    subtitleFiles.length ? '' : 'yt-dlp did not find subtitle files.',
  ].filter(Boolean).join(' · ');
  const error = new Error(detail || 'yt-dlp did not return usable subtitle lines.');
  error.stage = 'fetch_subtitles';
  throw error;
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
    const start = Number(segment.start_seconds ?? segment.start ?? 0);
    const endValue = segment.end_seconds ?? segment.end;
    const end = endValue == null ? null : Number(endValue);
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

async function transcribeWithWorker(audioPath, body, videoUrl, id) {
  const endpoint = safeText(process.env.WORKER_TRANSCRIBE_URL || body.workerTranscribeUrl);
  if (!endpoint) return null;
  const buffer = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('videoId', id);
  form.append('videoUrl', videoUrl);
  form.append('language', normalizeLanguage(body.language || body.languages));
  form.append('audio', new Blob([buffer], { type: mimeFromFile(audioPath) }), path.basename(audioPath));
  const headers = {};
  const token = safeText(process.env.WORKER_SYNC_TOKEN || body.workerSyncToken);
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(endpoint, { method: 'POST', headers, body: form });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Worker transcription failed: ${response.status} ${text.slice(0, 300)}`);
    error.stage = 'worker_transcription';
    throw error;
  }
  const segments = normalizeSegments({ segments: data.segments, text: data.transcriptText });
  return {
    model: safeText(data.job?.model || data.model) || 'workers-ai-whisper',
    language: safeText(data.job?.language || data.language) || normalizeLanguage(body.language || body.languages),
    transcriptText: safeText(data.transcriptText) || segments.map(segment => segment.text).join(' '),
    segments,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST required.' });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fruit-youtube-audio-'));
  let subtitleError = null;
  try {
    const body = parseBody(event);
    const videoUrl = safeText(body.videoUrl || body.url);
    const id = safeText(body.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '');

    if (!/^https?:\/\//i.test(videoUrl)) {
      return json(400, { ok: false, error: 'Invalid video URL.' });
    }

    let transcription = null;
    if (body.preferAudio !== true && body.skipSubtitles !== true) {
      try {
        transcription = await downloadYoutubeSubtitles(videoUrl, tempRoot, body);
      } catch (error) {
        subtitleError = error;
      }
    }

    let audioPath = '';
    let audioStat = { size: 0 };
    if (!transcription) {
      audioPath = await downloadYoutubeAudio(videoUrl, tempRoot, body);
      audioStat = fs.statSync(audioPath);
      transcription = await transcribeWithWorker(audioPath, body, videoUrl, id)
        || await transcribeWithOpenAI(audioPath, body);
      transcription.method = transcription.method || 'audio-openai-whisper';
      transcription.methodLabel = transcription.methodLabel || 'audio download + Whisper';
    }

    return json(200, {
      ok: true,
      id,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      method: transcription.method || EXTRACTOR_SOURCE,
      methodLabel: transcription.methodLabel || EXTRACTOR_SOURCE,
      model: transcription.model,
      language: transcription.language,
      fileName: transcription.fileName || path.basename(audioPath),
      audioBytes: audioStat.size,
      subtitleError: subtitleError ? (subtitleError.stderr || subtitleError.message) : '',
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
      subtitleError: subtitleError ? (subtitleError.stderr || subtitleError.message) : '',
    });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
};
