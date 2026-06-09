-- Phase 6 : module PortMaster (emplacements, bateaux, contrats, encaissements)

CREATE TABLE IF NOT EXISTS port_emplacements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  zone TEXT,
  longueur_max_m REAL,
  statut TEXT NOT NULL DEFAULT 'libre',
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS port_bateaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  immatriculation TEXT,
  type_navire TEXT,
  proprietaire TEXT NOT NULL,
  contact_email TEXT,
  contact_tel TEXT,
  longueur_m REAL,
  largeur_m REAL,
  statut TEXT NOT NULL DEFAULT 'actif',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_port_bateaux_nom ON port_bateaux(nom);

CREATE TABLE IF NOT EXISTS port_contrats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  numero TEXT NOT NULL UNIQUE,
  bateau_id INTEGER NOT NULL,
  emplacement_id INTEGER NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT,
  montant_mensuel REAL NOT NULL DEFAULT 0,
  montant_total REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif',
  observation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (bateau_id) REFERENCES port_bateaux(id),
  FOREIGN KEY (emplacement_id) REFERENCES port_emplacements(id)
);

CREATE INDEX IF NOT EXISTS idx_port_contrats_statut ON port_contrats(statut);
CREATE INDEX IF NOT EXISTS idx_port_contrats_bateau ON port_contrats(bateau_id);

CREATE TABLE IF NOT EXISTS port_encaissements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  contrat_id INTEGER NOT NULL,
  date_encaissement TEXT NOT NULL,
  montant REAL NOT NULL,
  mode_paiement TEXT,
  reference TEXT,
  observation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  FOREIGN KEY (contrat_id) REFERENCES port_contrats(id)
);

CREATE INDEX IF NOT EXISTS idx_port_encaissements_contrat ON port_encaissements(contrat_id);
