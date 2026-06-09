-- PortMaster sérieux : référentiel hiérarchique, clients, documents, tarifs, factures, validations

CREATE TABLE IF NOT EXISTS port_bassins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS port_quais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  bassin_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (bassin_id) REFERENCES port_bassins(id),
  UNIQUE (bassin_id, code)
);

CREATE TABLE IF NOT EXISTS port_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  type_client TEXT NOT NULL DEFAULT 'physique',
  raison_sociale TEXT,
  nom TEXT,
  prenom TEXT,
  adresse TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  nin TEXT,
  nif TEXT,
  rc TEXT,
  piece_identite TEXT,
  representant_legal TEXT,
  statut_dossier TEXT NOT NULL DEFAULT 'incomplet',
  solde_creances REAL NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_port_clients_nom ON port_clients(nom, raison_sociale);

CREATE TABLE IF NOT EXISTS port_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  label TEXT NOT NULL,
  file_name TEXT,
  date_expiration TEXT,
  statut TEXT NOT NULL DEFAULT 'a_verifier',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_port_documents_entity ON port_documents(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS port_tarifs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  type_prestation TEXT NOT NULL DEFAULT 'amarrage',
  montant_journalier REAL,
  date_effet TEXT NOT NULL,
  date_fin TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS port_tarif_tranches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarif_id INTEGER NOT NULL,
  longueur_min_m REAL NOT NULL DEFAULT 0,
  longueur_max_m REAL,
  montant_periode REAL NOT NULL,
  FOREIGN KEY (tarif_id) REFERENCES port_tarifs(id)
);

CREATE TABLE IF NOT EXISTS port_factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  numero TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  contrat_id INTEGER,
  bateau_id INTEGER,
  emplacement_id INTEGER,
  periode_debut TEXT,
  periode_fin TEXT,
  montant_ht REAL NOT NULL DEFAULT 0,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_facture TEXT NOT NULL,
  observation TEXT,
  validated_at TEXT,
  validated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES port_clients(id),
  FOREIGN KEY (contrat_id) REFERENCES port_contrats(id)
);

CREATE INDEX IF NOT EXISTS idx_port_factures_client ON port_factures(client_id);
CREATE INDEX IF NOT EXISTS idx_port_factures_statut ON port_factures(statut);

CREATE TABLE IF NOT EXISTS port_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  bateau_id INTEGER NOT NULL,
  type_mouvement TEXT NOT NULL,
  emplacement_from_id INTEGER,
  emplacement_to_id INTEGER,
  date_mouvement TEXT NOT NULL,
  motif TEXT,
  autorise_par INTEGER,
  statut TEXT NOT NULL DEFAULT 'valide',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  FOREIGN KEY (bateau_id) REFERENCES port_bateaux(id)
);

CREATE TABLE IF NOT EXISTS port_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action_demandee TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  motif_soumission TEXT,
  motif_decision TEXT,
  submitted_by INTEGER,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_by INTEGER,
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_port_validations_attente ON port_validations(statut);

-- Extensions tables existantes (idempotent via pragma check — SQLite ignore si colonne existe: on utilise recréation logique)

-- port_emplacements
ALTER TABLE port_emplacements ADD COLUMN quai_id INTEGER REFERENCES port_quais(id);
ALTER TABLE port_emplacements ADD COLUMN largeur_max_m REAL;
ALTER TABLE port_emplacements ADD COLUMN profondeur_m REAL;
ALTER TABLE port_emplacements ADD COLUMN type_emplacement TEXT DEFAULT 'standard';

-- port_bateaux
ALTER TABLE port_bateaux ADD COLUMN client_id INTEGER REFERENCES port_clients(id);
ALTER TABLE port_bateaux ADD COLUMN tirant_eau_m REAL;

-- port_contrats
ALTER TABLE port_contrats ADD COLUMN client_id INTEGER REFERENCES port_clients(id);
ALTER TABLE port_contrats ADD COLUMN tarif_id INTEGER REFERENCES port_tarifs(id);
ALTER TABLE port_contrats ADD COLUMN validated_at TEXT;
ALTER TABLE port_contrats ADD COLUMN validated_by INTEGER;
ALTER TABLE port_contrats ADD COLUMN motif_rejet TEXT;

-- port_encaissements
ALTER TABLE port_encaissements ADD COLUMN facture_id INTEGER REFERENCES port_factures(id);
ALTER TABLE port_encaissements ADD COLUMN statut TEXT DEFAULT 'valide';
