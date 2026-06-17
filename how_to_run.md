# Run locally

**Terminal 1:** `cd app && npm install && npm run start:local` → extractor on http://localhost:3000  
**Terminal 2:** `cd cloudflare && npm install && npm run db:migrate:local && npm run dev` → dashboard on http://localhost:8787  
Put `OPENAI_API_KEY=sk-...` in `cloudflare/.dev.vars`, then restart wrangler.  
Open http://localhost:8787 → **Test transcript worker** → paste YouTube URL or upload audio.

**Netlify + Railway:** load `chrome-extension/` in Chrome, open https://videostudy.netlify.app — extension fetches YouTube, Railway processes.
