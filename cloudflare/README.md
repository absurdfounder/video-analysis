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
