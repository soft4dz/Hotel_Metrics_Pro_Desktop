-- Phase 4 : recettes mensuelles, validations, verrouillage mois

CREATE TABLE IF NOT EXISTS recettes_mensuelles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  mois INTEGER NOT NULL,
  total_journalier REAL NOT NULL DEFAULT 0,
  total_mensuel REAL NOT NULL DEFAULT 0,
  ecart REAL NOT NULL DEFAULT 0,
  justification_ecart TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  verrouille INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  validated_by INTEGER,
  validated_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  UNIQUE (hotel_id, annee, mois)
);

CREATE TABLE IF NOT EXISTS recettes_mensuelles_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  recette_mensuelle_id INTEGER NOT NULL,
  rubrique_id INTEGER NOT NULL,
  montant_journalier REAL NOT NULL DEFAULT 0,
  montant_mensuel REAL NOT NULL DEFAULT 0,
  ecart REAL NOT NULL DEFAULT 0,
  justification TEXT,
  FOREIGN KEY (recette_mensuelle_id) REFERENCES recettes_mensuelles(id),
  FOREIGN KEY (rubrique_id) REFERENCES rubriques(id),
  UNIQUE (recette_mensuelle_id, rubrique_id)
);

CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  hotel_id INTEGER NOT NULL,
  date_ref TEXT,
  action TEXT NOT NULL,
  motif TEXT,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_validations_hotel ON validations(hotel_id, created_at DESC);
