-- P1.5 — Trésorerie, rapprochement bancaire et analytique

CREATE TABLE IF NOT EXISTS ordres_paiement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  numero TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  facture_fournisseur_id INTEGER REFERENCES factures_fournisseurs(id),
  compte_bancaire_id INTEGER REFERENCES comptes_bancaires(id),
  beneficiaire TEXT NOT NULL,
  montant REAL NOT NULL CHECK(montant > 0),
  mode TEXT NOT NULL CHECK(mode IN ('virement','cheque','prelevement','autre')),
  date_echeance TEXT NOT NULL,
  reference TEXT,
  numero_cheque TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','soumis','approuve','execute','rejete','annule')),
  cree_par INTEGER REFERENCES users(id),
  approuve_par INTEGER REFERENCES users(id),
  approuve_at TEXT,
  execute_par INTEGER REFERENCES users(id),
  execute_at TEXT,
  paiement_fournisseur_id INTEGER REFERENCES paiements_fournisseurs(id),
  ecriture_comptable_id INTEGER REFERENCES ecritures_comptables(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS previsions_tresorerie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  date_prevue TEXT NOT NULL,
  libelle TEXT NOT NULL,
  categorie TEXT NOT NULL,
  sens TEXT NOT NULL CHECK(sens IN ('encaissement','decaissement')),
  montant REAL NOT NULL CHECK(montant > 0),
  probabilite INTEGER NOT NULL DEFAULT 100 CHECK(probabilite BETWEEN 0 AND 100),
  statut TEXT NOT NULL DEFAULT 'prevue' CHECK(statut IN ('prevue','realisee','annulee')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS releves_bancaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compte_bancaire_id INTEGER NOT NULL REFERENCES comptes_bancaires(id),
  nom_fichier TEXT NOT NULL,
  date_debut TEXT,
  date_fin TEXT,
  solde_ouverture REAL,
  solde_cloture REAL,
  nb_lignes INTEGER NOT NULL DEFAULT 0,
  importe_par INTEGER REFERENCES users(id),
  importe_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS releve_bancaire_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  releve_id INTEGER NOT NULL REFERENCES releves_bancaires(id) ON DELETE CASCADE,
  date_operation TEXT NOT NULL,
  date_valeur TEXT,
  libelle TEXT NOT NULL,
  reference TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  solde REAL,
  empreinte TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'non_rapprochee' CHECK(statut IN ('non_rapprochee','rapprochee','ignoree')),
  UNIQUE(releve_id,empreinte)
);

CREATE TABLE IF NOT EXISTS rapprochements_bancaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ligne_releve_id INTEGER NOT NULL UNIQUE REFERENCES releve_bancaire_lignes(id),
  type_source TEXT NOT NULL CHECK(type_source IN ('encaissement','paiement_fournisseur','ecriture')),
  source_id INTEGER NOT NULL,
  montant_banque REAL NOT NULL,
  montant_source REAL NOT NULL,
  ecart REAL NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'confirme' CHECK(statut IN ('suggere','confirme','rejete')),
  confirme_par INTEGER REFERENCES users(id),
  confirme_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS centres_cout (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  responsable TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id,code)
);

CREATE TABLE IF NOT EXISTS ventilations_analytiques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ligne_ecriture_id INTEGER NOT NULL REFERENCES lignes_ecriture(id) ON DELETE CASCADE,
  centre_cout_id INTEGER NOT NULL REFERENCES centres_cout(id),
  montant REAL NOT NULL CHECK(montant > 0),
  pourcentage REAL NOT NULL CHECK(pourcentage > 0 AND pourcentage <= 100),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ligne_ecriture_id,centre_cout_id)
);

CREATE INDEX IF NOT EXISTS idx_ordres_paiement_statut ON ordres_paiement(hotel_id,statut,date_echeance);
CREATE INDEX IF NOT EXISTS idx_previsions_tresorerie_date ON previsions_tresorerie(hotel_id,date_prevue);
CREATE INDEX IF NOT EXISTS idx_releve_lignes_statut ON releve_bancaire_lignes(statut,date_operation);
CREATE INDEX IF NOT EXISTS idx_ventilations_centre ON ventilations_analytiques(centre_cout_id);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'tresorerie.ordre.approuver','Approuver les ordres de paiement','tresorerie');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'tresorerie.ordre.executer','Exécuter les ordres de paiement','tresorerie');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'tresorerie.rapprocher','Confirmer un rapprochement bancaire','tresorerie');

