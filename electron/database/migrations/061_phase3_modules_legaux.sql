-- ============================================================
-- 061 — Phase 3 Lot 3 : Modules légaux restants
-- Immobilisations (SCF), CASNOS (TNS), inventaire légal annuel
-- ============================================================

INSERT OR IGNORE INTO comptes (numero, libelle, classe, type_solde) VALUES
  ('281000', 'Amortissements du matériel', 2, 'credit'),
  ('681000', 'Dotations aux amortissements', 6, 'debit');

CREATE TABLE IF NOT EXISTS immobilisations (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  code                    TEXT    NOT NULL UNIQUE,
  libelle                 TEXT    NOT NULL,
  categorie               TEXT    NOT NULL DEFAULT 'corporelle'
                            CHECK(categorie IN ('corporelle','incorporelle','financiere')),
  date_acquisition        TEXT    NOT NULL,
  valeur_acquisition      REAL    NOT NULL,
  valeur_residuelle       REAL    NOT NULL DEFAULT 0,
  duree_amortissement_mois INTEGER NOT NULL DEFAULT 60,
  methode                 TEXT    NOT NULL DEFAULT 'lineaire'
                            CHECK(methode IN ('lineaire','degressif')),
  compte_immobilisation   TEXT    NOT NULL DEFAULT '218000',
  compte_amortissement    TEXT    NOT NULL DEFAULT '281000',
  compte_dotation         TEXT    NOT NULL DEFAULT '681000',
  hotel_id                INTEGER REFERENCES hotels(id),
  statut                  TEXT    NOT NULL DEFAULT 'actif'
                            CHECK(statut IN ('actif','cede','sorti')),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS immobilisations_amortissements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  immobilisation_id   INTEGER NOT NULL REFERENCES immobilisations(id) ON DELETE CASCADE,
  periode             TEXT    NOT NULL,
  dotation            REAL    NOT NULL,
  cumul_amortissement REAL    NOT NULL,
  vnc                 REAL    NOT NULL,
  ecriture_id         INTEGER REFERENCES ecritures_comptables(id),
  statut              TEXT    NOT NULL DEFAULT 'prevu'
                        CHECK(statut IN ('prevu','comptabilise')),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(immobilisation_id, periode)
);

CREATE INDEX IF NOT EXISTS idx_immo_amort_periode ON immobilisations_amortissements(periode);

CREATE TABLE IF NOT EXISTS casnos_affilies (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type_affilie        TEXT    NOT NULL DEFAULT 'prestataire'
                        CHECK(type_affilie IN ('gerant','prestataire','artisan','autre')),
  nom                 TEXT    NOT NULL,
  prenom              TEXT,
  nin                 TEXT,
  nif                 TEXT,
  numero_casnos       TEXT,
  activite            TEXT,
  date_affiliation    TEXT,
  taux_cotisation     REAL    NOT NULL DEFAULT 15,
  revenu_assiette     REAL    NOT NULL DEFAULT 0,
  hotel_id            INTEGER REFERENCES hotels(id),
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS casnos_declarations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  affilie_id          INTEGER NOT NULL REFERENCES casnos_affilies(id) ON DELETE CASCADE,
  periode             TEXT    NOT NULL,
  revenu_declare      REAL    NOT NULL DEFAULT 0,
  cotisation_calculee REAL    NOT NULL DEFAULT 0,
  statut              TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','calculee','declaree','payee')),
  reference_casnos    TEXT,
  date_declaration    TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(affilie_id, periode)
);

CREATE TABLE IF NOT EXISTS inventaire_legal_sessions (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  exercice                INTEGER NOT NULL,
  hotel_id                INTEGER NOT NULL REFERENCES hotels(id),
  date_inventaire         TEXT    NOT NULL,
  statut                  TEXT    NOT NULL DEFAULT 'en_cours'
                            CHECK(statut IN ('en_cours','cloture','valide')),
  responsable_user_id     INTEGER REFERENCES users(id),
  commentaire             TEXT,
  total_valeur_comptable  REAL    NOT NULL DEFAULT 0,
  total_valeur_physique   REAL    NOT NULL DEFAULT 0,
  ecart_total             REAL    NOT NULL DEFAULT 0,
  closed_at               TEXT,
  validated_at            TEXT,
  created_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventaire_legal_lignes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id          INTEGER NOT NULL REFERENCES inventaire_legal_sessions(id) ON DELETE CASCADE,
  produit_id          INTEGER REFERENCES stock_produits(id),
  reference           TEXT,
  designation         TEXT    NOT NULL,
  compte_comptable    TEXT    NOT NULL DEFAULT '311000',
  quantite_comptable  REAL    NOT NULL DEFAULT 0,
  quantite_physique   REAL    NOT NULL DEFAULT 0,
  prix_unitaire       REAL    NOT NULL DEFAULT 0,
  valeur_comptable    REAL    NOT NULL DEFAULT 0,
  valeur_physique     REAL    NOT NULL DEFAULT 0,
  ecart_quantite      REAL    NOT NULL DEFAULT 0,
  ecart_valeur        REAL    NOT NULL DEFAULT 0,
  motif_ecart         TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventaire_legal_exercice ON inventaire_legal_sessions(exercice, hotel_id);

INSERT OR IGNORE INTO immobilisations (code, libelle, categorie, date_acquisition, valeur_acquisition, duree_amortissement_mois, hotel_id)
VALUES ('IMMO-001', 'Mobilier chambres — lot initial', 'corporelle', '2026-01-01', 2500000, 60, 1);
