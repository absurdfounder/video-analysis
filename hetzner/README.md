# Hetzner VPS YouTube Extractor

Lightweight VPS extractor using [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api).

**Your server:** `ubuntu-4gb-fsn1-1` · `167.233.120.228`

## Architecture

```
Cloudflare Worker
        ↓ POST /api/transcript
Hetzner VPS (167.233.120.228:3000)
        ↓
youtube-transcript-api (Python)
        ↓
JSON segments → Worker → analysis
```

No Chrome, Puppeteer, yt-dlp, or Whisper on the server.

## Quick deploy (from Mac)

```bash
cd /Users/usman/Desktop/videoanalyzer
./hetzner/deploy.sh
```

## Manual setup

```bash
rsync -avz --exclude node_modules --exclude .git \
  ./ root@167.233.120.228:/opt/videoanalyzer/

ssh root@167.233.120.228 'bash /opt/videoanalyzer/hetzner/setup.sh'
```

## Test

```bash
curl http://167.233.120.228:3000/api/health

curl -X POST http://167.233.120.228:3000/api/transcript \
  -H 'content-type: application/json' \
  -d '{"videoUrl":"https://www.youtube.com/watch?v=WzP_gW6sBG8","id":"WzP_gW6sBG8","language":"hi"}'
```

## Cloudflare Worker

`wrangler.toml` should point to Hetzner:

```
YOUTUBE_EXTRACTOR_URL = "http://167.233.120.228:3000/api/transcript"
```

Then `cd cloudflare && npx wrangler deploy`.

## Useful commands

```bash
journalctl -u videoanalyzer-extractor -f
systemctl restart videoanalyzer-extractor
systemctl status videoanalyzer-extractor
```

## Config

`/etc/videoanalyzer-extractor.env`:

```
PORT=3000
YTT_PYTHON=/opt/videoanalyzer/hetzner/extractor/.venv/bin/python3
```

Optional: `YTT_FETCH_TIMEOUT_MS=90000`

## Chrome extension import

`POST /api/transcript` with `fromExtension: true` and `segments` still works — the dashboard can push captions from the user's browser without fetching on the server.
