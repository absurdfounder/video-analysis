# Netlify path fix

Your deploy failed because Netlify was using `app/public` as the Base directory, then running `cd app && npm install` inside that folder. That makes Netlify look for `app/public/app`, which does not exist.

## Do this in Netlify UI

Project configuration → Build & deploy → Continuous deployment → Build settings → Configure

Set:

- Base directory: leave blank
- Build command: npm --prefix app install
- Publish directory: app/public
- Functions directory: app/netlify/functions

Then trigger Deploys → Clear cache and deploy site.

## Repo file

Put the included `netlify.toml` at the root of the GitHub repo.
Do not put it inside `app/` or `app/public/`.
