#!/usr/bin/env node
/**
 * Regenerate src/produce-dictionary.js from data/india_produce_dictionary.xlsx
 * Usage: node scripts/generate-produce-dictionary.mjs [path-to-xlsx]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const defaultXlsx = path.join(root, 'data', 'india_produce_dictionary.xlsx');
const xlsxPath = path.resolve(process.argv[2] || defaultXlsx);

if (!fs.existsSync(xlsxPath)) {
  console.error('Missing xlsx:', xlsxPath);
  process.exit(1);
}

const require = createRequire(import.meta.url);
let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  console.error('Install xlsx first: npm install --save-dev xlsx');
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const header = rows[0];
const entries = rows.slice(1).filter((row) => row.some((cell) => String(cell || '').trim())).map((row) => {
  while (row.length < 12) row.push('');
  return {
    id: String(row[0]).trim(),
    category: String(row[1]).trim(),
    english: String(row[2]).trim(),
    hindi: String(row[3]).trim(),
    aliases: String(row[4]).split(',').map((a) => a.trim()).filter(Boolean),
    varieties: String(row[5]).trim(),
    growthAreas: String(row[6]).trim(),
    packingType: String(row[7]).trim(),
    wholesaleUnit: String(row[8]).trim(),
    packSize: String(row[9]).trim(),
    normalize: String(row[10]).trim(),
    standardUnit: String(row[11]).trim(),
  };
});

const jsonPath = path.join(root, 'data', 'india_produce_dictionary.json');
fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2), 'utf8');

const promptLines = entries.map((e) => {
  const alias = e.aliases.slice(0, 8).join(', ') + (e.aliases.length > 8 ? ', …' : '');
  let line = `[${e.id}] ${e.english} / ${e.hindi} | aliases: ${alias || '—'} | std: ${e.standardUnit || e.wholesaleUnit}`;
  const norm = e.normalize.replace(/\s+/g, ' ');
  if (norm) line += ` | normalize: ${norm.slice(0, 140)}${norm.length > 140 ? '…' : ''}`;
  return line;
});
const promptText = promptLines.join('\n');

const needles = [];
for (const e of entries) {
  const terms = new Set([e.english.toLowerCase(), e.hindi.toLowerCase(), ...e.aliases.map((a) => a.toLowerCase())]);
  for (const t of terms) {
    if (t.length >= 2) needles.push([t, e.id]);
  }
}
needles.sort((a, b) => b[0].length - a[0].length);

const jsPath = path.join(root, 'src', 'produce-dictionary.js');
const js = `// Auto-generated from ${path.basename(xlsxPath)} (${entries.length} entries)
export const PRODUCE_DICTIONARY = ${JSON.stringify(entries)};

const PRODUCE_BY_ID = Object.fromEntries(PRODUCE_DICTIONARY.map((entry) => [entry.id, entry]));

const PRODUCE_NEEDLES = ${JSON.stringify(needles)};

export const PRODUCE_DICTIONARY_PROMPT = ${JSON.stringify(promptText)};

const CATEGORY_EMOJI = {
  'FRUITS': '🍎',
  'VEGETABLES': '🥬',
  'FOOD GRAINS / CEREALS': '🌾',
  'PULSES / LEGUMES': '🫘',
  'SPICES / CONDIMENTS': '🌶️',
  'DRY FRUITS / NUTS': '🥜',
  'OILSEEDS': '🌻',
  'ADDITIONAL MANDI / CASH CROPS': '🌿',
};

function categoryEmoji(category) {
  const key = String(category || '').toUpperCase();
  for (const [prefix, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (key.includes(prefix)) return emoji;
  }
  return '🛒';
}

export function lookupProduce(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const [needle, id] of PRODUCE_NEEDLES) {
    if (needle.length >= 3 && lower.includes(needle)) {
      const entry = PRODUCE_BY_ID[id];
      if (!entry) continue;
      return {
        id: entry.id,
        english: entry.english,
        hinglish: entry.hindi,
        label: \`\${entry.english} / \${entry.hindi}\`,
        emoji: categoryEmoji(entry.category),
        standardUnit: entry.standardUnit,
        normalize: entry.normalize,
        category: entry.category,
      };
    }
  }
  return null;
}

export function detectProduceNames(text, title = '') {
  const hay = \`\${title} \${text}\`.toLowerCase();
  const found = [];
  const seen = new Set();
  for (const [needle, id] of PRODUCE_NEEDLES) {
    if (needle.length < 3) continue;
    if (!hay.includes(needle)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    found.push(PRODUCE_BY_ID[id]?.english || id);
  }
  return found;
}

export function buildExtractionSystemPrompt(basePrompt) {
  return [
    basePrompt,
    '',
    '=== INDIA PRODUCE DICTIONARY (canonical reference — use exact English / Hindi labels below) ===',
    'When transcript mentions produce, map it to the closest dictionary entry.',
    'Set fruit_label to "English / Hindi" from the dictionary. Respect std unit and normalize notes for unit conversion.',
    'If variety is spoken separately, keep it in variety field but still use dictionary produce label.',
    '',
    PRODUCE_DICTIONARY_PROMPT,
  ].join('\\n');
}
`;

fs.writeFileSync(jsPath, js, 'utf8');
console.log(`Wrote ${entries.length} entries -> ${path.relative(root, jsPath)} (${js.length} bytes)`);
