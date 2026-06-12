# Push the Netlify fix

Your current deploy returns 404 for `/api/list-videos` because Netlify is serving `app/public` as a static site. The Express `server.js` never runs on Netlify.

This patch adds Netlify Functions:

```text
app/netlify/functions/status.js
app/netlify/functions/list-videos.js
app/netlify/functions/transcript.js
app/netlify/functions/extract-prices.js
app/netlify/functions/extract-prices-ai.js
netlify.toml
```

## Push to GitHub

```bash
unzip video-analysis-netlify-fix-pack.zip
cd video-analysis-netlify-fix-pack
chmod +x push-netlify-fix.sh
./push-netlify-fix.sh
```

It pushes to branch:

```text
netlify-functions-fix
```

Then open a PR or merge it into `main`.

## Netlify settings

Use:

```text
Base directory: leave blank
Build command: cd app && npm install
Publish directory: app/public
Functions directory: app/netlify/functions
```

Also add env var for AI:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Test URLs

After deploy:

```text
https://videostudy.netlify.app/api/status
```

should return JSON.

Then in the app, click “Check setup”.
