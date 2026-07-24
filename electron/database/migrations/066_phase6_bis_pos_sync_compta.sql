-- Phase 6 bis — Vente POS, sync pointeuse temps réel, écritures stock SCF

CREATE TABLE IF NOT EXISTS cuisine_ventes_pos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid             TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id         INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  recette_id       INTEGER NOT NULL REFERENCES cuisine_recettes(id),
  quantite         INTEGER NOT NULL DEFAULT 1,
  montant_ttc      REAL,
  reference_ticket TEXT,
  date_vente       TEXT NOT NULL DEFAULT (date('now')),
  cree_par         INTEGER REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cuisine_ventes_pos_hotel ON cuisine_ventes_pos(hotel_id, date_vente DESC);

ALTER TABLE stock_mouvements ADD COLUMN ecriture_comptable_id INTEGER REFERENCES ecritures_comptables(id);

ALTER TABLE rh_pointeuses ADD COLUMN sync_auto INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rh_pointeuses ADD COLUMN sync_interval_min INTEGER NOT NULL DEFAULT 5;
ALTER TABLE rh_pointeuses ADD COLUMN dernier_sync_statut TEXT;
ALTER TABLE rh_pointeuses ADD COLUMN dernier_sync_message TEXT;
