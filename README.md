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
