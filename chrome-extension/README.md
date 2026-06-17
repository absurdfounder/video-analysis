# Chrome extension mode

This extension avoids Netlify server IP blocking by using your own Chrome YouTube session.

## Netlify / Railway website bridge

When you open the hosted dashboard (`videostudy.netlify.app`), the extension can fetch YouTube captions from **your browser** instead of Railway's blocked server IP.

1. Load this extension in Chrome (`chrome://extensions` → Load unpacked).
2. Stay signed in to YouTube in the same Chrome profile.
3. Open the Netlify dashboard in Chrome and click **Add source**.

The page talks to the extension automatically. Extension fetches captions → Railway saves transcript → OpenAI analysis runs on Railway.

Reload the extension after code updates.

## Load it

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this `chrome-extension` folder.
5. Click the extension icon to open the app in a tab.

## Use it

1. Sign in to YouTube in the same Chrome profile.
2. Open the extension app.
3. Fetch videos or **Check for new videos**.
4. Run **Classify titles** (add OpenAI key for uncertain titles).
5. Pull transcripts for relevant videos only.
6. Extract prices, push JSON to website.

Background polling: set poll interval, enable notifications, click **Save watch settings**. Chrome will check the channel on that schedule and badge the extension icon when new uploads need work.

The extension does not need Netlify, `yt-dlp`, Python, or exported YouTube cookies.
