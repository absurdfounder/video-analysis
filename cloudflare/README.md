# Fruit Mandi API — Cloudflare D1 + Workers

SQL database with CRUD for Delhi Fruit Market Miner.

## Quick setup (recommended)

From repo root, with [Node.js](https://nodejs.org/) installed:

```bash
chmod +x cloudflare/setup.sh
./cloudflare/setup.sh
```

This will: install deps → `wrangler login` → create D1 → migrate schema → deploy → print your Worker URL.

Paste that URL into the extension **Settings → API URL**.

---

## GitHub Actions deploy (no local Node)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → template **Edit Cloudflare Workers**
2. GitHub repo → **Settings → Secrets → Actions**:
   - `CLOUDFLARE_API_TOKEN` — your token
   - `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard URL (right sidebar on any zone)
3. **Actions → Deploy Cloudflare Worker → Run workflow**

After deploy, your URL is `https://fruit-mandi-api.<account-subdomain>.workers.dev` (shown in workflow logs).

---

## Manual setup

### 1. Install Wrangler and log in

```bash
cd cloudflare
npm install
npx wrangler login
```

### 2. Create the D1 database

```bash
npm run db:create
```

Copy the `database_id` from the output into `wrangler.toml` (replace the placeholder UUID).

### 3. Run migrations

```bash
npm run db:migrate
```

For local dev:

```bash
npm run db:migrate:local
```

### 4. (Optional) Set a sync token

In [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → **fruit-mandi-api** → Settings → Variables:

| Name | Value |
|------|--------|
| `SYNC_TOKEN` | your-secret-token |

Paste the same token in the extension **Settings → Sync token**.

### 5. Deploy

```bash
npm run deploy
```

Your API URL will look like:

```text
https://fruit-mandi-api.<your-subdomain>.workers.dev
```

### 6. Point the extension at it

1. Reload extension (v1.5.35+)
2. **Settings → API URL** → paste Worker URL (no trailing slash)
3. **Step 4 → Update dataset on website**

4. **Step 5 → Build search index → Chat Data**

---

## Step 5 — Vector chat

After syncing data in Step 4:

1. Extension **Step 5 → Build search index** (uses OpenAI embeddings)
2. Ask questions in the chat box — answers use retrieved mandi context from your D1 data

Uses **Cloudflare Vectorize** when bound; otherwise stores embeddings in D1 (`vector_chunks` table).

Create Vectorize index manually if needed:

```bash
cd cloudflare
npm run vectorize:create
npm run db:migrate
npm run deploy
```

---

## Server-side transcription

The Worker now has a Cloudflare Workers AI Whisper route for Hindi/Hinglish transcripts with timestamps.

What it can do:

- Transcribe an uploaded audio file, a direct `audioUrl`, `audioBase64`, or pre-split `chunks[]`
- Store transcript jobs and timestamped segments in D1
- Return normalized `[time] caption` lines for downstream price extraction

What it cannot do inside a Worker:

- Run `yt-dlp`, Chrome, or ffmpeg
- Reliably extract private YouTube audio streams from a normal `youtube.com/watch` URL

For fully automatic YouTube videos, add a small downloader/splitter outside Workers, store/send audio chunks, then call this route. Workers AI handles the transcription step.

### Transcribe one audio URL

```bash
curl -X POST "https://fruit-mandi-api.YOUR.workers.dev/api/transcripts/transcribe" \
  -H "content-type: application/json" \
  -H "authorization: Bearer YOUR_SYNC_TOKEN" \
  --data '{
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "audioUrl": "https://example.com/audio.mp3",
    "language": "hi"
  }'
```

### Transcribe pre-split chunks

```bash
curl -X POST "https://fruit-mandi-api.YOUR.workers.dev/api/transcripts/transcribe" \
  -H "content-type: application/json" \
  -H "authorization: Bearer YOUR_SYNC_TOKEN" \
  --data '{
    "videoId": "VIDEO_ID",
    "language": "hi",
    "chunks": [
      { "audioUrl": "https://example.com/video-part-1.mp3", "offsetSeconds": 0 },
      { "audioUrl": "https://example.com/video-part-2.mp3", "offsetSeconds": 300 }
    ]
  }'
```

Fetch stored transcript:

```bash
curl "https://fruit-mandi-api.YOUR.workers.dev/api/transcripts/VIDEO_ID"
```

---

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health + row counts |
| GET | `/api/data` | — | Full export (extension pull) |
| POST | `/api/data` | Bearer* | Bulk sync from extension |
| GET | `/api/videos` | — | List videos (`?market_date=&price_status=&limit=&offset=`) |
| GET | `/api/videos/:id` | — | One video |
| DELETE | `/api/videos/:id` | Bearer* | Delete video + its prices/analysis |
| GET | `/api/prices` | — | Query prices (`?fruit=onion&market_date=2026-06-13&party=&video_id=`) |
| GET | `/api/analysis` | — | List analysis (`?market_date=`) |
| GET | `/api/analysis/:videoId` | — | Per-video structured analysis |
| POST | `/api/transcripts/transcribe` | Bearer* | Transcribe Hindi/Hinglish audio through Workers AI Whisper |
| GET | `/api/transcripts/:videoId` | — | Latest stored transcript for a video |
| GET | `/api/transcript-jobs/:jobId` | — | One transcript job + timestamp segments |
| GET | `/api/vectors/status` | — | Vector index status |
| POST | `/api/vectors/index` | — | Build/rebuild embeddings index (`apiKey` in body) |
| POST | `/api/vectors/chat` | — | RAG chat over indexed data (`apiKey`, `message`, optional `history`) |

\* Required only if `SYNC_TOKEN` is set on the Worker.

---

## Example queries

```bash
# Health
curl https://fruit-mandi-api.YOUR.workers.dev/api/health

# All onion prices
curl "https://fruit-mandi-api.YOUR.workers.dev/api/prices?fruit=onion&limit=50"

# One day's analysis rollups
curl "https://fruit-mandi-api.YOUR.workers.dev/api/analysis?market_date=2026-06-13"
```

---

## Tables

- **videos** — metadata, price status, analysis summary (no full transcript segments — keeps DB small)
- **price_rows** — flat timestamped price mentions (CRUD + dedupe by `row_hash`)
- **video_analysis** — structured per-video rollup (`videoAnalysis` from extension)
- **transcript_jobs** — Workers AI transcript runs and raw normalized text
- **transcript_segments** — timestamped transcript lines by job/video
- **settings** — channel URL, last sync time

---

## Local dev

```bash
npm run db:migrate:local
npm run dev
# → http://localhost:8787/api/health
```

---

## Netlify vs Cloudflare

| | Netlify Blobs | Cloudflare D1 |
|--|---------------|---------------|
| Setup | Already on Netlify site | Worker + D1 (this folder) |
| Query by fruit/day | No (load whole JSON) | Yes (`/api/prices?fruit=`) |
| Extension Step 4 | `POST /api/data` | Same `POST /api/data` |
| Cost | Included in Netlify | Free tier generous |

You can keep Netlify for the public website and use Cloudflare **only** as the database API.
