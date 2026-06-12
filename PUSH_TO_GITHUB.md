# Push this app to `absurdfounder/video-analysis`

This pack contains the complete local YouTube transcript miner app and a helper script that copies it into your GitHub repo, commits it, and pushes it.

## What will be pushed

- HTML/CSS/JS frontend
- Node/Express local backend
- `yt-dlp` based YouTube video and transcript pulling
- Timestamped transcript segments
- Clickable YouTube timestamp URLs
- Basic price extraction
- Optional OpenAI-powered Hindi cleanup and price extraction
- README and `.gitignore`

## Requirements

```bash
brew install git node yt-dlp
```

Or install `yt-dlp` using Python:

```bash
python3 -m pip install -U yt-dlp
```

You must also be authenticated with GitHub from your terminal.

Recommended:

```bash
gh auth login
```

Or use GitHub's normal HTTPS credential helper / personal access token flow.

## Push to a new branch

From inside this unzipped folder:

```bash
chmod +x push-to-github.sh
./push-to-github.sh
```

By default this pushes to:

```text
add-transcript-miner
```

## Push directly to main

Only do this if you are sure:

```bash
TARGET_BRANCH=main ./push-to-github.sh
```

## After push

Run the app:

```bash
cd video-analysis
npm install
OPENAI_API_KEY="your_key_here" npm start
```

Then open:

```text
http://localhost:3000
```
