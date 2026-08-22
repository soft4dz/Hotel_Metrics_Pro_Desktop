-- P1.3 — Achats et fournisseurs avancés

CREATE TABLE IF NOT EXISTS demandes_achat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  numero TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  service_demandeur TEXT NOT NULL,
  objet TEXT NOT NULL,
  justification TEXT,
  priorite TEXT NOT NULL DEFAULT 'normale' CHECK(priorite IN ('basse','normale','haute','urgente')),
  date_besoin TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','soumise','approuvee','rejetee','consultation','commandee','annulee')),
  montant_estime REAL NOT NULL DEFAULT 0,
  demande_par INTEGER REFERENCES users(id),
  approuve_par INTEGER REFERENCES users(id),
  approuve_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demande_achat_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL REFERENCES demandes_achat(id) ON DELETE CASCADE,
  produit_id INTEGER REFERENCES stock_produits(id),
  designation TEXT NOT NULL,
  quantite REAL NOT NULL CHECK(quantite > 0),
  unite TEXT NOT NULL DEFAULT 'unite',
  prix_estime REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS consultations_achat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  numero TEXT NOT NULL UNIQUE,
  demande_id INTEGER NOT NULL REFERENCES demandes_achat(id),
  date_lancement TEXT NOT NULL DEFAULT (date('now')),
  date_limite TEXT NOT NULL,
  criteres_json TEXT,
  statut TEXT NOT NULL DEFAULT 'ouverte' CHECK(statut IN ('ouverte','analyse','attribuee','annulee')),
  cree_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultation_fournisseurs (
  consultation_id INTEGER NOT NULL REFERENCES consultations_achat(id) ON DELETE CASCADE,
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id),
  invite_at TEXT NOT NULL DEFAULT (datetime('now')),
  reponse_at TEXT,
  PRIMARY KEY(consultation_id,fournisseur_id)
);

CREATE TABLE IF NOT EXISTS offres_fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL REFERENCES consultations_achat(id) ON DELETE CASCADE,
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id),
  reference TEXT,
  date_offre TEXT NOT NULL DEFAULT (date('now')),
  validite_jours INTEGER NOT NULL DEFAULT 30,
  delai_livraison_jours INTEGER NOT NULL DEFAULT 0,
  conditions_paiement TEXT,
  montant_ht REAL NOT NULL DEFAULT 0,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  note_technique REAL NOT NULL DEFAULT 0,
  retenue INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(consultation_id,fournisseur_id)
);

CREATE TABLE IF NOT EXISTS offre_fournisseur_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offre_id INTEGER NOT NULL REFERENCES offres_fournisseurs(id) ON DELETE CASCADE,
  demande_ligne_id INTEGER NOT NULL REFERENCES demande_achat_lignes(id),
  quantite REAL NOT NULL CHECK(quantite > 0),
  prix_unitaire REAL NOT NULL CHECK(prix_unitaire >= 0),
  tva_pct REAL NOT NULL DEFAULT 19
);

ALTER TABLE bons_commande ADD COLUMN demande_id INTEGER REFERENCES demandes_achat(id);
ALTER TABLE bons_commande ADD COLUMN offre_id INTEGER REFERENCES offres_fournisseurs(id);

CREATE TABLE IF NOT EXISTS factures_fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id),
  bon_id INTEGER REFERENCES bons_commande(id),
  numero TEXT NOT NULL,
  date_facture TEXT NOT NULL,
  date_echeance TEXT NOT NULL,
  montant_ht REAL NOT NULL,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_controler' CHECK(statut IN ('a_controler','validee','partiellement_payee','payee','litige','annulee')),
  rapprochement_statut TEXT NOT NULL DEFAULT 'non_rapprochee' CHECK(rapprochement_statut IN ('non_rapprochee','conforme','ecart','sans_commande')),
  ecart_montant REAL NOT NULL DEFAULT 0,
  ecart_quantite REAL NOT NULL DEFAULT 0,
  observations TEXT,
  created_by INTEGER REFERENCES users(id),
  valide_par INTEGER REFERENCES users(id),
  valide_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(fournisseur_id,numero)
);

CREATE TABLE IF NOT EXISTS echeances_fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures_fournisseurs(id) ON DELETE CASCADE,
  date_echeance TEXT NOT NULL,
  montant REAL NOT NULL CHECK(montant > 0),
  montant_paye REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_payer' CHECK(statut IN ('a_payer','partielle','payee','en_retard'))
);

CREATE TABLE IF NOT EXISTS paiements_fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures_fournisseurs(id),
  echeance_id INTEGER REFERENCES echeances_fournisseurs(id),
  date_paiement TEXT NOT NULL,
  montant REAL NOT NULL CHECK(montant > 0),
  mode TEXT NOT NULL CHECK(mode IN ('virement','cheque','especes','prelevement','autre')),
  reference TEXT,
  compte_bancaire_id INTEGER REFERENCES comptes_bancaires(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_da_hotel_statut ON demandes_achat(hotel_id,statut);
CREATE INDEX IF NOT EXISTS idx_consultation_demande ON consultations_achat(demande_id);
CREATE INDEX IF NOT EXISTS idx_factures_fournisseur_echeance ON factures_fournisseurs(fournisseur_id,date_echeance);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'achats.demande.approuver','Approuver les demandes d’achat','achats');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'achats.offre.attribuer','Attribuer une consultation fournisseur','achats');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'achats.facture.valider','Valider les factures fournisseurs','achats');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'achats.paiement.executer','Exécuter les paiements fournisseurs','achats');
