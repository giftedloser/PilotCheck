CREATE TABLE IF NOT EXISTS config_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  profile_type TEXT,
  last_synced_at TEXT NOT NULL,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS device_config_states (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  profile_name TEXT,
  state TEXT NOT NULL,
  last_reported_at TEXT,
  last_synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_config_device
  ON device_config_states(device_id);
