const fs = require('fs');
const path = require('path');

const DATA_KEY = 'project';
const LOCAL_PATH = path.join(__dirname, '..', '..', 'data', 'project.json');

function emptyProject() {
  return {
    version: 2,
    updatedAt: null,
    channelUrl: '',
    videos: [],
    priceRows: [],
    videoAnalysis: {},
    knownVideoIds: [],
  };
}

async function getBlobStore() {
  try {
    const { getStore } = require('@netlify/blobs');
    return getStore('fruit-price-data');
  } catch {
    return null;
  }
}

async function loadProjectData() {
  const store = await getBlobStore();
  if (store) {
    const data = await store.get(DATA_KEY, { type: 'json' });
    if (data) return { ...emptyProject(), ...data };
  }

  try {
    if (fs.existsSync(LOCAL_PATH)) {
      return { ...emptyProject(), ...JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8')) };
    }
  } catch {}

  return emptyProject();
}

async function saveProjectData(data) {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(DATA_KEY, payload);
    return payload;
  }

  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

function dedupePriceRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = [
      row.video_id,
      row.fruit,
      row.unit,
      row.min_price_inr,
      row.max_price_inr,
      row.timestamp_seconds,
      row.original_line,
    ].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeProjectData(existing, patch) {
  const next = { ...existing };
  if (patch.channelUrl) next.channelUrl = String(patch.channelUrl).trim();

  const videosById = new Map((existing.videos || []).map(video => [video.id, video]));
  for (const video of Array.isArray(patch.videos) ? patch.videos : []) {
    if (!video?.id) continue;
    videosById.set(video.id, { ...videosById.get(video.id), ...video });
  }
  next.videos = [...videosById.values()];

  const known = new Set(existing.knownVideoIds || []);
  for (const video of next.videos) known.add(video.id);
  for (const id of Array.isArray(patch.knownVideoIds) ? patch.knownVideoIds : []) {
    if (id) known.add(id);
  }
  next.knownVideoIds = [...known];

  const mergedRows = [
    ...(existing.priceRows || []),
    ...(Array.isArray(patch.priceRows) ? patch.priceRows : []),
  ];
  next.priceRows = dedupePriceRows(mergedRows);

  const videoAnalysis = { ...(existing.videoAnalysis || {}) };
  if (patch.videoAnalysis && typeof patch.videoAnalysis === 'object') {
    for (const [videoId, meta] of Object.entries(patch.videoAnalysis)) {
      if (meta && typeof meta === 'object') videoAnalysis[videoId] = meta;
    }
  }
  for (const video of next.videos) {
    if (video?.analysisMeta?.video_id) {
      videoAnalysis[video.id] = video.analysisMeta;
    }
  }
  next.videoAnalysis = videoAnalysis;

  return next;
}

function authorizeWrite(event) {
  const token = process.env.DATA_SYNC_TOKEN || '';
  if (!token) return true;
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header === `Bearer ${token}`;
}

module.exports = {
  loadProjectData,
  saveProjectData,
  mergeProjectData,
  authorizeWrite,
};
