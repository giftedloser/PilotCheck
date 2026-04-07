CREATE TABLE IF NOT EXISTS action_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_serial TEXT,
  device_name TEXT,
  intune_id TEXT,
  action_type TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  graph_response_status INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_log_serial ON action_log(device_serial);
CREATE INDEX IF NOT EXISTS idx_action_log_type ON action_log(action_type);
