const express = require('express');
const fs = require('fs');
const path = require('path');
const { safeText, normalizeSubtitleSegments } = require('./lib/ytdlp-utils');
const { extractTranscript, EXTRACTOR_VERSION } = require('./lib/transcript-pipeline');

const PORT = Number(process.env.PORT || 3000);
const EXTRACTOR_SOURCE = 'hetzner-extractor';
const PYTHON = process.env.YTT_PYTHON || path.join(__dirname, '.venv', 'bin', 'python3');

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

function extractVideoId(value) {
  const raw = safeText(value);
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtu.be')) return safeText(url.pathname.split('/').filter(Boolean)[0]);
    if (url.searchParams.get('v')) return safeText(url.searchParams.get('v'));
  } catch {}
  const match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return match ? match[1] : '';
}

function youtubeTranscriptApiReady() {
  if (!fs.existsSync(PYTHON)) return false;
  try {
    fs.accessSync(path.join(__dirname, 'scripts', 'fetch_transcript.py'), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: EXTRACTOR_SOURCE,
    version: EXTRACTOR_VERSION,
    pipeline: ['youtube-transcript-api'],
    python: PYTHON,
    youtubeTranscriptApi: youtubeTranscriptApiReady(),
  });
});

app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: false,
    databaseConfigured: false,
    youtubeCookiesConfigured: false,
    storage: 'hetzner-vps',
    primaryMethod: 'youtube-transcript-api',
  });
});

app.post('/api/transcript', async (req, res) => {
  const body = req.body || {};
  const videoUrl = safeText(body.videoUrl || body.url);
  const id = safeText(body.id || extractVideoId(videoUrl)).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!/^https?:\/\//i.test(videoUrl) || !id) {
    return res.status(400).json({ ok: false, error: 'Invalid YouTube video URL.' });
  }

  const imported = normalizeSubtitleSegments(body.segments);
  if (imported.length && (body.fromExtension === true || body.skipFetch === true)) {
    return res.json({
      ok: true,
      id,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      method: safeText(body.method) || 'chrome-extension',
      methodLabel: safeText(body.methodLabel) || 'Chrome extension import',
      model: 'chrome-extension',
      language: safeText(body.language) || 'hi',
      fileName: '',
      audioBytes: 0,
      subtitleError: '',
      segmentCount: imported.length,
      transcriptText: safeText(body.transcriptText) || imported.map((segment) => segment.text).join(' '),
      segments: imported,
    });
  }

  try {
    const { transcription, subtitleError, errors } = await extractTranscript(videoUrl, { ...body, id });
    return res.json({
      ok: true,
      id,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      method: transcription.method,
      methodLabel: transcription.methodLabel,
      model: transcription.model,
      language: transcription.language,
      fileName: '',
      audioBytes: 0,
      subtitleError: subtitleError ? (subtitleError.message || String(subtitleError)) : (errors.length ? errors.join(' · ') : ''),
      segmentCount: transcription.segments.length,
      transcriptText: transcription.transcriptText,
      segments: transcription.segments,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      source: EXTRACTOR_SOURCE,
      version: EXTRACTOR_VERSION,
      stage: error.stage || 'unknown',
      error: error.stderr || error.message || String(error),
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hetzner extractor (${EXTRACTOR_VERSION}) on http://0.0.0.0:${PORT}`);
});
