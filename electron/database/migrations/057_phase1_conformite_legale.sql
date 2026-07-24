-- ============================================================
-- 057 — Phase 1 conformité légale ERP algérien
-- Comptabilité SCF, facturation conforme, fiscalité DGI, paie DZ
-- ============================================================

-- ── LOT 1 : Comptabilité générale SCF ────────────────────────

CREATE TABLE IF NOT EXISTS exercices_comptables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT    NOT NULL UNIQUE,
  libelle           TEXT    NOT NULL,
  date_debut        TEXT    NOT NULL,
  date_fin          TEXT    NOT NULL,
  statut            TEXT    NOT NULL DEFAULT 'ouvert'
                      CHECK(statut IN ('ouvert', 'ferme')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  closed_at         TEXT,
  closed_by         INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comptes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          TEXT    NOT NULL UNIQUE,
  libelle         TEXT    NOT NULL,
  classe          INTEGER NOT NULL CHECK(classe BETWEEN 1 AND 7),
  type_solde      TEXT    NOT NULL DEFAULT 'debit'
                      CHECK(type_solde IN ('debit', 'credit')),
  actif           INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journaux (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT    NOT NULL UNIQUE,
  libelle         TEXT    NOT NULL,
  type            TEXT    NOT NULL,
  actif           INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ecritures_comptables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  journal_id      INTEGER NOT NULL REFERENCES journaux(id),
  exercice_id     INTEGER NOT NULL REFERENCES exercices_comptables(id),
  date_ecriture   TEXT    NOT NULL,
  piece           TEXT,
  libelle         TEXT    NOT NULL,
  statut          TEXT    NOT NULL DEFAULT 'brouillon'
                      CHECK(statut IN ('brouillon', 'valide')),
  source_module   TEXT,
  source_ref      TEXT,
  hotel_id        INTEGER REFERENCES hotels(id),
  created_by      INTEGER REFERENCES users(id),
  validated_by    INTEGER REFERENCES users(id),
  validated_at    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lignes_ecriture (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ecriture_id     INTEGER NOT NULL REFERENCES ecritures_comptables(id) ON DELETE CASCADE,
  compte_id       INTEGER NOT NULL REFERENCES comptes(id),
  libelle         TEXT,
  debit           REAL    NOT NULL DEFAULT 0,
  credit          REAL    NOT NULL DEFAULT 0,
  hotel_id        INTEGER REFERENCES hotels(id),
  ordre           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ecritures_exercice ON ecritures_comptables(exercice_id, date_ecriture);
CREATE INDEX IF NOT EXISTS idx_ecritures_journal ON ecritures_comptables(journal_id, date_ecriture);
CREATE INDEX IF NOT EXISTS idx_lignes_ecriture_compte ON lignes_ecriture(compte_id);

-- ── LOT 2 : Facturation conforme ─────────────────────────────

ALTER TABLE factures ADD COLUMN type_document TEXT NOT NULL DEFAULT 'facture';
ALTER TABLE factures ADD COLUMN serie TEXT NOT NULL DEFAULT 'FAC';
ALTER TABLE factures ADD COLUMN exercice INTEGER;
ALTER TABLE factures ADD COLUMN facture_origine_id INTEGER REFERENCES factures(id);
ALTER TABLE factures ADD COLUMN verrouillee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE factures ADD COLUMN date_validation TEXT;
ALTER TABLE factures ADD COLUMN motif_modification TEXT;

CREATE TABLE IF NOT EXISTS factures_numerotation (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  serie           TEXT    NOT NULL,
  exercice        INTEGER NOT NULL,
  dernier_numero  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(serie, exercice)
);

CREATE TABLE IF NOT EXISTS factures_registre (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER NOT NULL UNIQUE REFERENCES factures(id),
  numero          TEXT    NOT NULL,
  type_document   TEXT    NOT NULL,
  date_emission   TEXT    NOT NULL,
  client_nom      TEXT    NOT NULL DEFAULT '',
  nif_client      TEXT,
  montant_ht      REAL    NOT NULL DEFAULT 0,
  montant_tva     REAL    NOT NULL DEFAULT 0,
  montant_ttc     REAL    NOT NULL DEFAULT 0,
  statut          TEXT    NOT NULL,
  exercice        INTEGER,
  hotel_id        INTEGER REFERENCES hotels(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS factures_fiscales_metadata (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER NOT NULL UNIQUE REFERENCES factures(id),
  nif_emetteur    TEXT,
  nif_receveur    TEXT,
  qr_payload      TEXT,
  document_hash   TEXT,
  horodatage      TEXT,
  sifec_statut    TEXT NOT NULL DEFAULT 'prepare',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_factures_registre_date ON factures_registre(date_emission);
CREATE INDEX IF NOT EXISTS idx_factures_registre_exercice ON factures_registre(exercice);

-- ── LOT 3 : Fiscalité DGI ────────────────────────────────────

CREATE TABLE IF NOT EXISTS registre_tva_ventes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER REFERENCES factures(id),
  date_operation  TEXT    NOT NULL,
  periode         TEXT    NOT NULL,
  numero_piece    TEXT    NOT NULL,
  client_nom      TEXT,
  nif_client      TEXT,
  base_ht         REAL    NOT NULL DEFAULT 0,
  taux_tva        REAL    NOT NULL DEFAULT 19,
  montant_tva     REAL    NOT NULL DEFAULT 0,
  montant_ttc     REAL    NOT NULL DEFAULT 0,
  type_mouvement  TEXT    NOT NULL DEFAULT 'vente'
                      CHECK(type_mouvement IN ('vente', 'avoir')),
  hotel_id        INTEGER REFERENCES hotels(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registre_tva_achats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  achat_ref       TEXT,
  date_operation  TEXT    NOT NULL,
  periode         TEXT    NOT NULL,
  numero_piece    TEXT    NOT NULL,
  fournisseur_nom TEXT,
  nif_fournisseur TEXT,
  base_ht         REAL    NOT NULL DEFAULT 0,
  taux_tva        REAL    NOT NULL DEFAULT 19,
  montant_tva     REAL    NOT NULL DEFAULT 0,
  montant_ttc     REAL    NOT NULL DEFAULT 0,
  hotel_id        INTEGER REFERENCES hotels(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS declarations_tva (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  periode         TEXT    NOT NULL UNIQUE,
  base_ht_ventes  REAL    NOT NULL DEFAULT 0,
  tva_collectee   REAL    NOT NULL DEFAULT 0,
  tva_deductible  REAL    NOT NULL DEFAULT 0,
  credit_anterieur REAL   NOT NULL DEFAULT 0,
  solde           REAL    NOT NULL DEFAULT 0,
  statut          TEXT    NOT NULL DEFAULT 'brouillon'
                      CHECK(statut IN ('brouillon', 'calculee', 'declaree', 'payee')),
  calculated_at   TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retenues_source (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  fournisseur_nom TEXT    NOT NULL,
  nif_fournisseur TEXT,
  base_ht         REAL    NOT NULL,
  taux            REAL    NOT NULL DEFAULT 15,
  montant_retenu  REAL    NOT NULL,
  date_retenue    TEXT    NOT NULL,
  reference       TEXT,
  hotel_id        INTEGER REFERENCES hotels(id),
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS liasse_fiscale_lignes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  exercice        INTEGER NOT NULL,
  code_g50        TEXT    NOT NULL,
  libelle         TEXT    NOT NULL,
  montant         REAL    NOT NULL DEFAULT 0,
  source          TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exercice, code_g50)
);

CREATE INDEX IF NOT EXISTS idx_registre_tva_ventes_periode ON registre_tva_ventes(periode);
CREATE INDEX IF NOT EXISTS idx_registre_tva_achats_periode ON registre_tva_achats(periode);

-- ── LOT 4 : Paie DZ complète ─────────────────────────────────

CREATE TABLE IF NOT EXISTS rh_paie_clotures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  periode         TEXT    NOT NULL UNIQUE,
  statut          TEXT    NOT NULL DEFAULT 'brouillon'
                      CHECK(statut IN ('brouillon', 'valide', 'cloture')),
  nb_bulletins    INTEGER NOT NULL DEFAULT 0,
  valide_at       TEXT,
  valide_by       INTEGER REFERENCES users(id),
  cloture_at      TEXT,
  cloture_by      INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rh_paie_params (
  cle             TEXT    PRIMARY KEY,
  valeur          REAL    NOT NULL,
  libelle         TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── SEED : Plan comptable SCF simplifié hôtellerie ─────────

INSERT OR IGNORE INTO exercices_comptables (code, libelle, date_debut, date_fin, statut)
VALUES ('2026', 'Exercice 2026', '2026-01-01', '2026-12-31', 'ouvert');

INSERT OR IGNORE INTO journaux (code, libelle, type) VALUES
  ('AC', 'Achats', 'achats'),
  ('VE', 'Ventes', 'ventes'),
  ('BQ', 'Banque', 'banque'),
  ('CA', 'Caisse', 'caisse'),
  ('OD', 'Opérations diverses', 'od'),
  ('PA', 'Paie', 'paie');

INSERT OR IGNORE INTO comptes (numero, libelle, classe, type_solde) VALUES
  ('101000', 'Capital social', 1, 'credit'),
  ('211000', 'Terrains', 2, 'debit'),
  ('218000', 'Matériel et mobilier', 2, 'debit'),
  ('311000', 'Stocks marchandises', 3, 'debit'),
  ('401000', 'Fournisseurs', 4, 'credit'),
  ('411000', 'Clients', 4, 'debit'),
  ('445660', 'TVA déductible', 4, 'debit'),
  ('445710', 'TVA collectée', 4, 'credit'),
  ('447100', 'IRG à payer', 4, 'credit'),
  ('512000', 'Banque', 5, 'debit'),
  ('530000', 'Caisse', 5, 'debit'),
  ('601000', 'Achats consommés', 6, 'debit'),
  ('641000', 'Salaires', 6, 'debit'),
  ('645100', 'Cotisations CNAS patronales', 6, 'debit'),
  ('645200', 'Accident de travail', 6, 'debit'),
  ('645300', 'Assurance chômage', 6, 'debit'),
  ('645400', 'Formation professionnelle', 6, 'debit'),
  ('706100', 'Produits restauration', 7, 'credit'),
  ('707100', 'Produits hébergement', 7, 'credit'),
  ('758000', 'Produits divers', 7, 'credit');

INSERT OR IGNORE INTO rh_paie_params (cle, valeur, libelle) VALUES
  ('taux_accident_travail', 0.0125, 'Accident de travail (1,25 %)'),
  ('taux_assurance_chomage', 0.015, 'Assurance chômage (1,5 %)'),
  ('taux_formation_pro', 0.01, 'Formation professionnelle (1 %)');
