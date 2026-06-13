CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  channel_index INTEGER,
  title TEXT,
  url TEXT,
  upload_date TEXT,
  market_date TEXT,
  market_date_sort TEXT,
  channel_url TEXT,
  relevance TEXT,
  status TEXT,
  price_status TEXT,
  price_row_count INTEGER DEFAULT 0,
  transcript_line_count INTEGER DEFAULT 0,
  language TEXT,
  price_error TEXT,
  analysis_meta_json TEXT,
  payload_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_hash TEXT NOT NULL UNIQUE,
  video_id TEXT NOT NULL,
  fruit TEXT,
  fruit_hindi TEXT,
  variety TEXT,
  quality_grade TEXT,
  quality_label TEXT,
  party_name TEXT,
  mandi_name TEXT,
  area_name TEXT,
  origin TEXT,
  unit TEXT,
  min_price_inr REAL,
  max_price_inr REAL,
  price_notes TEXT,
  market_name TEXT,
  market_date TEXT,
  market_date_sort TEXT,
  confidence TEXT,
  original_line TEXT,
  clean_hindi_line TEXT,
  context TEXT,
  notes TEXT,
  source TEXT,
  timestamp_seconds INTEGER,
  timestamp_label TEXT,
  timestamp_url TEXT,
  video_title TEXT,
  video_url TEXT,
  upload_date TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS video_analysis (
  video_id TEXT PRIMARY KEY,
  meta_json TEXT NOT NULL,
  market_date TEXT,
  market_date_sort TEXT,
  mention_count INTEGER DEFAULT 0,
  source TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_price_rows_video_id ON price_rows(video_id);
CREATE INDEX IF NOT EXISTS idx_price_rows_fruit ON price_rows(fruit);
CREATE INDEX IF NOT EXISTS idx_price_rows_market_date_sort ON price_rows(market_date_sort);
CREATE INDEX IF NOT EXISTS idx_videos_market_date_sort ON videos(market_date_sort);
CREATE INDEX IF NOT EXISTS idx_video_analysis_market_date_sort ON video_analysis(market_date_sort);

CREATE TABLE IF NOT EXISTS vector_chunks (
  id TEXT PRIMARY KEY,
  doc_type TEXT,
  video_id TEXT,
  market_date TEXT,
  fruit TEXT,
  text TEXT NOT NULL,
  embedding_json TEXT NOT NULL,
  metadata_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vector_chunks_video_id ON vector_chunks(video_id);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_market_date ON vector_chunks(market_date);
