CREATE TABLE IF NOT EXISTS compliance_policies (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  last_synced_at TEXT NOT NULL,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS device_compliance_states (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_name TEXT,
  state TEXT NOT NULL,
  last_reported_at TEXT,
  last_synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_compliance_device
  ON device_compliance_states(device_id);
