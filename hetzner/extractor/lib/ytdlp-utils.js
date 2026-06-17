function safeText(value) {
  return String(value ?? '').trim();
}

function secondsToClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function normalizeSubtitleSegments(segments) {
  return (Array.isArray(segments) ? segments : []).map((segment, index) => {
    const start = Number(segment.start_seconds ?? segment.start ?? 0);
    const endValue = segment.end_seconds ?? segment.end;
    const end = endValue == null ? null : Number(endValue);
    return {
      start: Number.isFinite(start) ? Number(start.toFixed(3)) : 0,
      end: Number.isFinite(end) ? Number(end.toFixed(3)) : null,
      duration: Number.isFinite(end) ? Number(Math.max(0, end - start).toFixed(3)) : null,
      timestamp_label: safeText(segment.timestamp_label) || secondsToClock(start),
      text: safeText(segment.text),
      segment_index: index,
    };
  }).filter((segment) => segment.text);
}

function normalizeLanguage(value) {
  const raw = safeText(value).toLowerCase();
  if (!raw) return 'hi';
  if (raw.startsWith('hi')) return 'hi';
  if (raw.startsWith('en')) return 'en';
  return raw.split(/[,\s]+/)[0] || 'hi';
}

module.exports = {
  safeText,
  normalizeSubtitleSegments,
  normalizeLanguage,
};
