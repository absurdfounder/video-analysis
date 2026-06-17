const fs = require('fs');
const path = require('path');

const railwayApiBase = process.env.KRISHI_API_BASE || 'https://video-analysis-extractor-production.up.railway.app';
const sourcePath = path.resolve(__dirname, '../cloudflare/src/dashboard.js');
const outDir = path.resolve(__dirname, '../netlify-dist');
const outPath = path.join(outDir, 'index.html');
const prefix = 'export const DASHBOARD_HTML = String.raw`';

const source = fs.readFileSync(sourcePath, 'utf8');
if (!source.startsWith(prefix) || !source.trimEnd().endsWith('`;')) {
  throw new Error('Unexpected dashboard.js format.');
}

let html = source.trimEnd().slice(prefix.length, -2);
html = html.replace(
  '</head>',
  [
    '  <script>',
    `    window.KRISHI_API_BASE = ${JSON.stringify(railwayApiBase)};`,
    '    window.KRISHI_NETLIFY_STATIC = true;',
    '  </script>',
    '</head>',
  ].join('\n'),
);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, html);
fs.writeFileSync(path.join(outDir, '_redirects'), '/* /index.html 200\n');

console.log(`Built Netlify dashboard at ${outPath}`);
