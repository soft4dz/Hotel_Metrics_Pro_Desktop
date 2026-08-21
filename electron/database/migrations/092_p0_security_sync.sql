-- P0 — sessions persistantes sécurisées, séparation des tâches et suivi sync.

CREATE TABLE IF NOT EXISTS auth_remember_tokens (
  token_hash    TEXT PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,
  last_used_at  TEXT,
  revoked_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_remember_tokens_user
ON auth_remember_tokens(user_id, expires_at);

ALTER TABLE sync_conflicts ADD COLUMN status TEXT NOT NULL DEFAULT 'open'
  CHECK(status IN ('open','resolved'));
ALTER TABLE sync_conflicts ADD COLUMN remote_action TEXT NOT NULL DEFAULT 'update'
  CHECK(remote_action IN ('create','update','delete'));
ALTER TABLE sync_conflicts ADD COLUMN resolved_by INTEGER REFERENCES users(id);
ALTER TABLE sync_conflicts ADD COLUMN resolved_at TEXT;
ALTER TABLE sync_conflicts ADD COLUMN resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status
ON sync_conflicts(status, created_at DESC);
