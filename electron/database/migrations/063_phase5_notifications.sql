-- Phase 5 — Moteur notifications backend
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  titre       TEXT NOT NULL,
  message     TEXT NOT NULL,
  lien        TEXT,
  lu          INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  module      TEXT NOT NULL,
  condition_label TEXT NOT NULL DEFAULT '',
  actif       INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id  INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  canal            TEXT NOT NULL DEFAULT 'in_app',
  statut           TEXT NOT NULL DEFAULT 'delivered',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, lu, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

INSERT OR IGNORE INTO notification_rules (code, module, condition_label, actif) VALUES
  ('facture_echeue', 'facturation', 'Facture impayée J+30', 1),
  ('cloture_retard', 'recettes', 'Clôture unité manquante après 09h30', 1),
  ('stock_seuil', 'stocks', 'Stock sous seuil d''alerte', 1),
  ('workflow_attente', 'workflows', 'Workflow en attente de validation', 1),
  ('backup_retard', 'system', 'Sauvegarde > 24h', 1);
