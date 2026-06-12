-- Module Encaissements & Trésorerie

CREATE TABLE IF NOT EXISTS comptes_bancaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  intitule TEXT NOT NULL,
  banque TEXT NOT NULL DEFAULT '',
  numero_compte TEXT DEFAULT '',
  solde_initial REAL NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

CREATE INDEX IF NOT EXISTS idx_comptes_bancaires_hotel ON comptes_bancaires(hotel_id);

CREATE TABLE IF NOT EXISTS encaissements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id INTEGER NOT NULL,
  date_encaissement TEXT NOT NULL,
  montant REAL NOT NULL CHECK(montant > 0),
  mode TEXT NOT NULL DEFAULT 'especes',
  reference TEXT,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  compte_bancaire_id INTEGER,
  recette_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  deleted_at TEXT,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (compte_bancaire_id) REFERENCES comptes_bancaires(id)
);

CREATE INDEX IF NOT EXISTS idx_encaissements_hotel_date ON encaissements(hotel_id, date_encaissement);
CREATE INDEX IF NOT EXISTS idx_encaissements_statut ON encaissements(statut);
CREATE INDEX IF NOT EXISTS idx_encaissements_mode ON encaissements(mode);

CREATE TABLE IF NOT EXISTS journal_caisse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  date_operation TEXT NOT NULL,
  libelle TEXT NOT NULL,
  entree REAL NOT NULL DEFAULT 0,
  sortie REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  deleted_at TEXT,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_caisse_hotel_date ON journal_caisse(hotel_id, date_operation);
