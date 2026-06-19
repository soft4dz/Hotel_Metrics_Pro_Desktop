-- Module création de rapports personnalisés

CREATE TABLE IF NOT EXISTS report_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT    NOT NULL,
  description TEXT,
  data_source TEXT    NOT NULL,
  columns_json TEXT   NOT NULL DEFAULT '[]',
  filters_json TEXT   NOT NULL DEFAULT '{}',
  format      TEXT    NOT NULL DEFAULT 'xlsx',
  is_shared   INTEGER NOT NULL DEFAULT 0,
  hotel_id    INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_data_source ON report_templates(data_source);

CREATE TABLE IF NOT EXISTS report_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  run_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  row_count   INTEGER NOT NULL DEFAULT 0,
  file_path   TEXT,
  status      TEXT    NOT NULL DEFAULT 'success',
  executed_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_report_runs_template ON report_runs(template_id);

INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES (lower(hex(randomblob(16))), 'reports.create', 'Créer des rapports personnalisés', 'rapports');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code IN ('ADMIN_DEC', 'SUPERADMIN', 'PDG', 'DIRECTEUR_UNITE', 'COMPTABILITE', 'AUDIT_INTERNE')
  AND p.code = 'reports.create';
