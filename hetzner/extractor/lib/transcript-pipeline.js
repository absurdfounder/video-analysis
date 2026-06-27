const { spawn } = require('child_process');
const path = require('path');
const { safeText, normalizeSubtitleSegments, normalizeLanguage } = require('./ytdlp-utils');

const EXTRACTOR_VERSION = 'hetzner-ytt-api-v1';
const VENV_DIR = path.join(__dirname, '..', '.venv');
const PYTHON = process.env.YTT_PYTHON
  || [path.join(VENV_DIR, 'bin', 'python3'), path.join(VENV_DIR, 'bin', 'python')].find((p) => {
    try { require('fs').accessSync(p, require('fs').constants.X_OK); return true; } catch { return false; }
  })
  || 'python3';
const FETCH_SCRIPT = path.join(__dirname, '..', 'scripts', 'fetch_transcript.py');
const FETCH_TIMEOUT_MS = Number(process.env.YTT_FETCH_TIMEOUT_MS) || 90000;

function parseLanguageList(value) {
  const raw = safeText(value) || 'hi.*,hi,en.*,en';
  const langs = [];
  for (const part of raw.split(',')) {
    const code = part.trim().replace(/\.\*/g, '').replace(/\*/g, '').split('-')[0].toLowerCase();
    if (code && !langs.includes(code)) langs.push(code);
  }
  return langs.length ? langs : ['hi', 'en'];
}

function fetchWithYoutubeTranscriptApi(videoId, body) {
  const languages = parseLanguageList(body.languages || body.language);
  return new Promise((resolve, reject) => {
    const proxyEnv = {};
    if (process.env.WEBSHARE_PROXY_USERNAME) proxyEnv.WEBSHARE_PROXY_USERNAME = process.env.WEBSHARE_PROXY_USERNAME;
    if (process.env.WEBSHARE_PROXY_PASSWORD) proxyEnv.WEBSHARE_PROXY_PASSWORD = process.env.WEBSHARE_PROXY_PASSWORD;
    const proc = spawn(PYTHON, [FETCH_SCRIPT, videoId, languages.join(',')], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...proxyEnv },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      const error = new Error(`youtube-transcript-api timed out after ${FETCH_TIMEOUT_MS}ms`);
      error.stage = 'fetch_subtitles';
      reject(error);
    }, FETCH_TIMEOUT_MS);

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });
    proc.on('error', (error) => {
      clearTimeout(timer);
      error.stage = 'fetch_subtitles';
      reject(error);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const error = new Error(stderr.trim() || stdout.trim() || `youtube-transcript-api exited ${code}`);
        error.stage = 'fetch_subtitles';
        return reject(error);
      }
      try {
        const data = JSON.parse(stdout);
        const segments = normalizeSubtitleSegments(data.segments || []);
        if (!segments.length) {
          const error = new Error('youtube-transcript-api returned no transcript lines.');
          error.stage = 'fetch_subtitles';
          return reject(error);
        }
        resolve({
          model: 'youtube-transcript-api',
          language: data.language || normalizeLanguage(body.language),
          transcriptText: segments.map((segment) => segment.text).join(' '),
          segments,
          method: data.is_generated ? 'youtube-transcript-api:generated' : 'youtube-transcript-api',
          methodLabel: `youtube-transcript-api (${data.languageLabel || data.language || 'unknown'})`,
        });
      } catch (error) {
        error.stage = 'fetch_subtitles';
        reject(error);
      }
    });
  });
}

async function extractTranscript(_videoUrl, body) {
  const id = safeText(body.id);
  if (!id) {
    const error = new Error('Missing video id.');
    error.stage = 'fetch_subtitles';
    throw error;
  }
  const transcription = await fetchWithYoutubeTranscriptApi(id, body);
  return { transcription, subtitleError: null, errors: [] };
}

module.exports = { extractTranscript, EXTRACTOR_VERSION };
