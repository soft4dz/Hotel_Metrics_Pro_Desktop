-- Phase 6 — Automatisation opérationnelle : production cuisine + pointeuses RH

CREATE TABLE IF NOT EXISTS erp_evenements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL,
  entite_type  TEXT,
  entite_id    INTEGER,
  payload      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_erp_evenements_type ON erp_evenements(type, created_at);

CREATE TABLE IF NOT EXISTS cuisine_recettes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  nom          TEXT NOT NULL,
  portions     INTEGER NOT NULL DEFAULT 1,
  prix_vente   REAL,
  cout_revient REAL,
  marge_pct    REAL,
  statut       TEXT NOT NULL DEFAULT 'brouillon'
                 CHECK(statut IN ('brouillon','valide','archive')),
  valide_par   INTEGER REFERENCES users(id),
  valide_at    TEXT,
  cree_par     INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

CREATE TABLE IF NOT EXISTS cuisine_recette_lignes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recette_id  INTEGER NOT NULL REFERENCES cuisine_recettes(id) ON DELETE CASCADE,
  produit_id  INTEGER NOT NULL REFERENCES stock_produits(id),
  quantite    REAL NOT NULL,
  unite       TEXT NOT NULL DEFAULT 'kg',
  taux_perte  REAL NOT NULL DEFAULT 0,
  ordre       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cuisine_recettes_hotel ON cuisine_recettes(hotel_id, statut);
CREATE INDEX IF NOT EXISTS idx_cuisine_lignes_recette ON cuisine_recette_lignes(recette_id);

CREATE TABLE IF NOT EXISTS cuisine_ordres_production (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid                TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  recette_id          INTEGER NOT NULL REFERENCES cuisine_recettes(id),
  date_production     TEXT NOT NULL,
  portions_prevues    INTEGER NOT NULL,
  portions_realisees  INTEGER,
  statut              TEXT NOT NULL DEFAULT 'planifie'
                        CHECK(statut IN ('planifie','en_cours','termine','annule')),
  cout_theorique      REAL,
  execute_par         INTEGER REFERENCES users(id),
  execute_at          TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cuisine_ordres_hotel ON cuisine_ordres_production(hotel_id, date_production);

ALTER TABLE stock_mouvements ADD COLUMN source_type TEXT;
ALTER TABLE stock_mouvements ADD COLUMN source_id INTEGER;

ALTER TABLE rh_employes ADD COLUMN pointeuse_badge_id TEXT;
CREATE INDEX IF NOT EXISTS idx_rh_employes_badge ON rh_employes(pointeuse_badge_id);

ALTER TABLE rh_pointages ADD COLUMN source TEXT NOT NULL DEFAULT 'manuel'
  CHECK(source IN ('manuel','pointeuse'));
ALTER TABLE rh_pointages ADD COLUMN raw_punch_ids TEXT;

CREATE TABLE IF NOT EXISTS rh_pointeuses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id      INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  marque        TEXT NOT NULL DEFAULT 'ZKTeco',
  adresse_ip    TEXT,
  port          INTEGER DEFAULT 4370,
  actif         INTEGER NOT NULL DEFAULT 1,
  derniere_sync TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_pointeuses_hotel ON rh_pointeuses(hotel_id);

CREATE TABLE IF NOT EXISTS rh_raw_punches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pointeuse_id  INTEGER REFERENCES rh_pointeuses(id) ON DELETE SET NULL,
  hotel_id      INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  badge_id      TEXT NOT NULL,
  punch_at      TEXT NOT NULL,
  type_punch    TEXT CHECK(type_punch IN ('entree','sortie','autre')),
  traite        INTEGER NOT NULL DEFAULT 0,
  pointage_id   INTEGER REFERENCES rh_pointages(id) ON DELETE SET NULL,
  hash_ligne    TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_raw_punches_hotel ON rh_raw_punches(hotel_id, traite, punch_at);
CREATE INDEX IF NOT EXISTS idx_rh_raw_punches_badge ON rh_raw_punches(badge_id, punch_at);
