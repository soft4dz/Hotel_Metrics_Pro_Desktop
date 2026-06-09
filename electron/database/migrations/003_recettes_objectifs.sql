-- Phase import : recettes journalières et objectifs

CREATE TABLE IF NOT EXISTS recettes_journalieres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL,
  rubrique_id INTEGER NOT NULL,
  date_journal TEXT NOT NULL,
  montant REAL NOT NULL DEFAULT 0,
  observation TEXT,
  statut TEXT NOT NULL DEFAULT 'validated',
  encaissement_ht REAL,
  chambres INTEGER DEFAULT 0,
  nuitees INTEGER DEFAULT 0,
  couverts INTEGER DEFAULT 0,
  legacy_revenue_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (rubrique_id) REFERENCES rubriques(id)
);

CREATE INDEX IF NOT EXISTS idx_recettes_hotel_date ON recettes_journalieres(hotel_id, date_journal);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recettes_unique_line
  ON recettes_journalieres(hotel_id, date_journal, rubrique_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS objectifs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  objectif_hebergement REAL DEFAULT 0,
  objectif_restauration REAL DEFAULT 0,
  objectif_boissons REAL DEFAULT 0,
  objectif_autres REAL DEFAULT 0,
  capacite_chambres INTEGER,
  chambres_vendues INTEGER,
  taux_occupation_chambres REAL,
  capacite_nuitees INTEGER,
  nuitees_vendues INTEGER,
  taux_frequentation_nuitees REAL,
  capacite_restaurant INTEGER,
  couverts_vendus INTEGER,
  taux_frequentation_restaurant REAL,
  prix_moyen_chambre REAL,
  revenu_par_chambre_construite REAL,
  prix_moyen_couvert REAL,
  conso_hebergement REAL,
  conso_restauration REAL,
  conso_boissons REAL,
  conso_autres REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  UNIQUE (hotel_id, mois, annee)
);
