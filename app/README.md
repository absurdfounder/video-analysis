# Video Analysis: Hindi YouTube Transcript + Fruit Price Miner

This app collects timestamped captions/transcripts from YouTube videos, lets you click into the exact moment a price was said, and extracts fruit mandi price rows using regex or AI.

## Local run

```bash
cd app
npm install
python3 -m pip install -U yt-dlp
npm start
```

Open `http://localhost:3000`.

## Netlify deploy

This repo includes Netlify Functions so `/api/*` works on Netlify.

Use these Netlify settings:

- Base directory: leave blank
- Build command: `cd app && npm install`
- Publish directory: `app/public`
- Functions directory: `app/netlify/functions`

The root `netlify.toml` already sets these.

For AI extraction, add environment variables in Netlify:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Notes

Netlify is serverless, so use small batches first. Start with 5 to 10 videos. For large scraping jobs, local or a long-running server on Render/Railway/Fly is more reliable.

`youtube-dl-exec` downloads/bundles the latest `yt-dlp` during build, but YouTube may throttle cloud IPs.
