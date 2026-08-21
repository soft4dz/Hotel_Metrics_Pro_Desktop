-- Synchronisation descendante securisee, deduplication et journal des conflits.
ALTER TABLE sync_config ADD COLUMN last_pull_cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE port_mouvements ADD COLUMN updated_at TEXT;
ALTER TABLE port_relances ADD COLUMN updated_at TEXT;
UPDATE port_mouvements SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE port_relances SET updated_at = created_at WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS sync_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_uuid TEXT NOT NULL UNIQUE,
  source_device_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_uuid TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  remote_updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'ignored', 'conflict', 'quarantined', 'failed')),
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_inbox_status ON sync_inbox(status);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_uuid TEXT NOT NULL,
  local_updated_at TEXT,
  remote_updated_at TEXT NOT NULL,
  local_payload_json TEXT,
  remote_payload_json TEXT NOT NULL,
  resolution TEXT NOT NULL CHECK (resolution IN ('local_wins', 'remote_wins', 'quarantined')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
