# Fruit Price Transcript Miner

Pull YouTube channel videos, collect timestamped captions, extract fruit mandi price rows, and export CSV/JSON.

## Hosted Netlify app

The Netlify app lives in `app/`.

Netlify settings:

- Base directory: blank
- Build command: `npm --prefix app install && npm --prefix app run install-ytdlp`
- Publish directory: `app/public`
- Functions directory: `app/netlify/functions`

If YouTube blocks Netlify with `Sign in to confirm you're not a bot`, add YouTube cookies as a Netlify environment variable:

```text
YOUTUBE_COOKIES_BASE64=base64_encoded_cookies_file
```

Use a dedicated/throwaway YouTube account for cookies. Never commit cookies to GitHub.

## Chrome extension mode

The Chrome extension lives in `chrome-extension/`.

Use this when Netlify/cloud IPs get blocked by YouTube. The extension fetches YouTube data from your own Chrome browser session instead of a serverless IP.

Load it from `chrome://extensions` with Developer mode -> Load unpacked -> select `chrome-extension`.

After code updates, click **Reload** on the extension card in `chrome://extensions`.

### Channel watch + filtering (v1.2)

- **Title heuristics** auto-skip gold/silver/petrol/etc. on fetch
- **Classify titles** button runs heuristics + optional OpenAI for uncertain videos
- **Check for new videos** compares channel uploads against `chrome.storage` registry
- **Background poll** every N minutes (default 6h) with badge + desktop notification
- **Pull transcripts** only processes relevant videos (skipped ones are not fetched)


## Cloudflare D1 database (recommended)

Structured SQL storage with CRUD — no Supabase/Firebase required.

Setup lives in [`cloudflare/README.md`](cloudflare/README.md):

1. `cd cloudflare && npm install`
2. `npm run db:create` → paste `database_id` into `wrangler.toml`
3. `npm run db:migrate && npm run deploy`
4. Extension **Settings → API URL** → `https://fruit-mandi-api.<you>.workers.dev`
5. **Step 4 → Update dataset**

API highlights:

- `POST /api/data` — bulk sync from extension (same as before)
- `GET /api/prices?fruit=onion&market_date=2026-06-13` — query prices
- `GET /api/analysis/:videoId` — per-video structured rollup
- `DELETE /api/videos/:id` — real CRUD

Optional: set Worker env `SYNC_TOKEN` and the same value in extension **Sync token**.

## Website JSON sync (legacy Netlify)

Processed data can sync to one JSON blob instead of a database:

- **Netlify production:** [Netlify Blobs](https://docs.netlify.com/blobs/overview/) via `GET/POST /api/data`
- **Local dev:** `app/data/project.json` when you run `npm start`

Optional write protection: set Netlify env var `DATA_SYNC_TOKEN`, then paste the same token in the extension **Sync token** field.

Extension flow:

1. Process videos in the extension (fetch → transcripts → prices).
2. Set **Website / Netlify URL** (e.g. `https://your-site.netlify.app`).
3. Click **Push to website**.
4. Open the Netlify site — it can **Pull from website** or read the same `/api/data` JSON.

