CREATE TABLE IF NOT EXISTS equipements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  designation  TEXT NOT NULL,
  categorie    TEXT NOT NULL DEFAULT 'autre', -- climatisation | plomberie | electrique | ascenseur | piscine | cuisine | informatique | autre
  localisation TEXT,
  marque       TEXT,
  modele       TEXT,
  num_serie    TEXT,
  date_achat   TEXT,
  garantie_fin TEXT,
  statut       TEXT NOT NULL DEFAULT 'operationnel', -- operationnel | en_maintenance | hs | retire
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interventions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid           TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id       INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  equipement_id  INTEGER REFERENCES equipements(id) ON DELETE SET NULL,
  type_intervention TEXT NOT NULL DEFAULT 'corrective', -- preventive | corrective | ameliorative
  titre          TEXT NOT NULL,
  description    TEXT,
  priorite       TEXT NOT NULL DEFAULT 'normale', -- urgente | haute | normale | basse
  statut         TEXT NOT NULL DEFAULT 'demandee', -- demandee | planifiee | en_cours | terminee | annulee
  technicien_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_demande   TEXT NOT NULL DEFAULT (date('now')),
  date_planifiee TEXT,
  date_debut     TEXT,
  date_fin       TEXT,
  duree_heures   REAL,
  cout_pieces    REAL NOT NULL DEFAULT 0,
  cout_main_oeuvre REAL NOT NULL DEFAULT 0,
  rapport        TEXT,
  cree_par       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_equip_hotel ON equipements(hotel_id);
CREATE INDEX IF NOT EXISTS idx_interv_hotel ON interventions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_interv_statut ON interventions(statut);
CREATE INDEX IF NOT EXISTS idx_interv_equip ON interventions(equipement_id);
