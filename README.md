# Delhi Fruit Market Transcript Miner

A local HTML + JavaScript app for pulling YouTube channel video transcripts and extracting fruit price mentions from Hindi market videos.

## What changed in this version

- Keeps transcript timestamps from YouTube caption files.
- Shows a transcript segment table where every line links back to the exact YouTube timestamp.
- Exports timestamped transcript segments as CSV.
- Adds clickable timestamp links in extracted price rows.
- Adds AI extraction for messy Hindi auto-captions.
- Exports AI-cleaned price rows with `timestamp_seconds`, `timestamp_label`, and `timestamp_url`.

## What it does

- Lists videos from a YouTube channel/playlist.
- Pulls available Hindi/English subtitles using `yt-dlp`.
- Parses VTT captions into timestamped segments.
- Saves raw transcript text and segments in your browser.
- Extracts price mentions in two ways:
  - Basic regex extraction.
  - AI cleanup + extraction for noisy Hindi captions.
- Exports:
  - `delhi_fruit_market_transcripts.csv`
  - `delhi_fruit_market_segments_with_timestamps.csv`
  - `fruit_price_mentions_with_timestamps.csv`
  - `fruit_transcript_project_with_timestamps.json`

## Important limitation

A pure browser-only app cannot reliably fetch YouTube channel pages or captions because of browser CORS and YouTube anti-bot behavior. This app runs a tiny local Node server and calls `yt-dlp` on your machine.

## Should I deploy it?

For this use case, local is better.

Deployment can work, but cloud/VPS IPs are more likely to get blocked or rate-limited by YouTube. Also, if you deploy the AI part, you must secure your API key and not expose it in frontend code.

Recommended setup:

- Run locally on your Mac.
- Use small batches first, like 10 to 25 videos.
- Use 1500 to 3000 ms delay between transcript pulls.
- Use AI extraction only after transcripts are saved.

## Install

### 1. Install Node.js

Use Node 18 or newer.

Check:

```bash
node -v
```

If Node is missing on Mac:

```bash
brew install node
```

### 2. Install yt-dlp

Mac with Homebrew:

```bash
brew install yt-dlp
```

Or with Python:

```bash
python3 -m pip install -U yt-dlp
```

Check:

```bash
yt-dlp --version
```

### 3. Install app dependencies

From this folder:

```bash
npm install
```

### 4. Start the app

Without AI key:

```bash
npm start
```

With AI key set in terminal:

```bash
OPENAI_API_KEY="your_key_here" npm start
```

Optional model override:

```bash
OPENAI_API_KEY="your_key_here" OPENAI_MODEL="gpt-4o-mini" npm start
```

Open:

```text
http://localhost:3000
```

## Recommended usage

1. Click **Check setup**.
2. Keep the default channel URL or paste another YouTube channel/playlist URL.
3. Start with **Max videos = 10 or 25** for a test run.
4. Click **Fetch videos**.
5. Click **Pull timestamped transcripts**.
6. Check the **Transcript segments** table.
7. Click **3A Basic extraction** for a fast first pass.
8. Click **3B AI clean & extract prices** for better Hindi understanding.
9. Click a timestamp in any price row to open the exact YouTube section.
10. Export CSV files.

## AI extraction notes

The AI reads timestamped transcript chunks like:

```text
[123s | 2:03] आज आम के रेट 60 से 80 रुपये किलो चल रहे हैं
```

Then it returns structured rows:

```json
{
  "fruit": "mango",
  "fruit_hindi": "आम",
  "variety": "",
  "unit": "kg",
  "min_price_inr": 60,
  "max_price_inr": 80,
  "timestamp_seconds": 123,
  "timestamp_url": "https://www.youtube.com/watch?v=VIDEO_ID&t=123s"
}
```

## If local does not work

### Problem: `yt-dlp not found`

Install it:

```bash
brew install yt-dlp
```

or:

```bash
python3 -m pip install -U yt-dlp
```

Then restart:

```bash
npm start
```

### Problem: `node: command not found`

Install Node:

```bash
brew install node
```

Then:

```bash
npm install
npm start
```

### Problem: port already in use

Run on another port:

```bash
PORT=3001 npm start
```

Open:

```text
http://localhost:3001
```

### Problem: No transcript found

Some videos do not expose captions. Also try changing language priority:

```text
hi.*,hi,en.*,en
```

or just:

```text
en.*,hi.*
```

### Problem: YouTube blocks or throttles

Use a smaller batch and larger delay:

```text
Max videos: 10
Delay per video: 3000
```

### Problem: AI extraction fails

Check:

- Your API key is valid.
- You started with `OPENAI_API_KEY="your_key" npm start`, or pasted the key into the local app.
- Try fewer videos, like 1 to 3.
- Lower `Max chars per AI call` to 6000.

## Deployment notes

You can deploy this to a VPS, but do not deploy it as a plain static site because it needs the Node backend and `yt-dlp` installed on the server.

Minimum VPS deployment needs:

- Node 18+
- yt-dlp installed
- app files
- environment variable `OPENAI_API_KEY` if using AI
- a reverse proxy like Nginx or Caddy if public

For your use case, local is cleaner and safer.
