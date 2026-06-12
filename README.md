# Netlify Base Directory Lock Fix

Your Netlify deploy log still shows:

```text
base: /opt/build/repo/app/public
publish: /opt/build/repo/app/public/app/public
functionsDirectory: /opt/build/repo/app/public/app/netlify/functions
```

That means Netlify is still using `app/public` as the Base directory. Replace the root `netlify.toml` in your GitHub repo with the `netlify.toml` in this folder.

This version includes:

```toml
base = "."
```

That forces Netlify to resolve all paths from the repository root.

Then in Netlify UI, also set:

- Base directory: blank
- Build command: `npm --prefix app install`
- Publish directory: `app/public`
- Functions directory: `app/netlify/functions`

After pushing, use **Clear cache and deploy site**.

Test:

```text
https://videostudy.netlify.app/api/status
```
