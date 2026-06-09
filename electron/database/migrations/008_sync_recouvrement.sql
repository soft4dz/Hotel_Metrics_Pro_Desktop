-- Phase 8 : synchronisation offline + relances recouvrement

CREATE TABLE IF NOT EXISTS sync_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:3847',
  device_id TEXT NOT NULL,
  last_sync_at TEXT,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  items_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS port_relances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  client_id INTEGER,
  facture_id INTEGER,
  contrat_id INTEGER,
  type_relance TEXT NOT NULL DEFAULT 'courrier',
  niveau INTEGER NOT NULL DEFAULT 1,
  date_relance TEXT NOT NULL,
  commentaire TEXT,
  statut TEXT NOT NULL DEFAULT 'planifiee',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES port_clients(id),
  FOREIGN KEY (facture_id) REFERENCES port_factures(id),
  FOREIGN KEY (contrat_id) REFERENCES port_contrats(id)
);

CREATE INDEX IF NOT EXISTS idx_port_relances_client ON port_relances(client_id);
CREATE INDEX IF NOT EXISTS idx_port_relances_facture ON port_relances(facture_id);
