CREATE TABLE IF NOT EXISTS mobile_apps (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  app_type TEXT,
  publisher TEXT,
  last_synced_at TEXT NOT NULL,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS device_app_install_states (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT,
  install_state TEXT NOT NULL,
  error_code TEXT,
  last_synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_app_device
  ON device_app_install_states(device_id);
