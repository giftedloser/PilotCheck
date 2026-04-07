CREATE TABLE IF NOT EXISTS rule_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'warning',
  scope TEXT NOT NULL DEFAULT 'global',
  scope_value TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  predicate TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE device_state ADD COLUMN active_rule_ids TEXT NOT NULL DEFAULT '[]';
