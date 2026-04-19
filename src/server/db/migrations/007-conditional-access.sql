CREATE TABLE IF NOT EXISTS conditional_access_policies (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  state TEXT,
  conditions_json TEXT,
  grant_controls_json TEXT,
  session_controls_json TEXT,
  last_synced_at TEXT NOT NULL,
  raw_json TEXT
);
