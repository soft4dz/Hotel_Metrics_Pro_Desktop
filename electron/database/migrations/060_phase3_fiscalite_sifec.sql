-- ============================================================
-- 060 — Phase 3 Lot 2 : Fiscalité avancée & SIFEC
-- Base légale : Code des impôts directs et indirects (Algérie),
-- système SIFEC / télédéclaration DGI.
-- ============================================================

-- Configuration connecteur SIFEC (singleton)
CREATE TABLE IF NOT EXISTS sifec_config (
  id                  INTEGER PRIMARY KEY CHECK(id = 1),
  mode                TEXT    NOT NULL DEFAULT 'sandbox'
                        CHECK(mode IN ('sandbox','production')),
  api_base_url        TEXT,
  api_key_ref         TEXT,
  nif_declarant       TEXT,
  actif               INTEGER NOT NULL DEFAULT 0 CHECK(actif IN (0,1)),
  dernier_test_at     TEXT,
  dernier_test_ok     INTEGER CHECK(dernier_test_ok IN (0,1)),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO sifec_config (id) VALUES (1);

-- Journal des transmissions SIFEC
CREATE TABLE IF NOT EXISTS sifec_transmissions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER NOT NULL REFERENCES factures(id),
  metadata_id     INTEGER REFERENCES factures_fiscales_metadata(id),
  statut          TEXT    NOT NULL DEFAULT 'prepare'
                    CHECK(statut IN ('prepare','soumis','accepte','rejete','erreur')),
  uid_sifec       TEXT,
  payload_json    TEXT,
  response_json   TEXT,
  qr_final        TEXT,
  signature_token TEXT,
  message_erreur  TEXT,
  tentative       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  transmitted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sifec_trans_facture ON sifec_transmissions(facture_id);
CREATE INDEX IF NOT EXISTS idx_sifec_trans_statut ON sifec_transmissions(statut);

-- Métadonnées fiscales factures — colonnes SIFEC avancées
ALTER TABLE factures_fiscales_metadata ADD COLUMN sifec_uid TEXT;
ALTER TABLE factures_fiscales_metadata ADD COLUMN date_transmission TEXT;
ALTER TABLE factures_fiscales_metadata ADD COLUMN derniere_erreur TEXT;

-- Registre TVA achats — traçabilité source
ALTER TABLE registre_tva_achats ADD COLUMN achat_ref_id INTEGER;
ALTER TABLE registre_tva_achats ADD COLUMN source TEXT NOT NULL DEFAULT 'manuel'
  CHECK(source IN ('manuel','achats','import'));

-- Télédéclarations DGI (TVA, liasse, retenue)
CREATE TABLE IF NOT EXISTS fiscalite_teledeclarations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type_decl           TEXT    NOT NULL CHECK(type_decl IN ('tva','liasse','retenue')),
  periode             TEXT    NOT NULL,
  reference_dgi       TEXT,
  statut              TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','exportee','declaree','payee')),
  montant_declare     REAL,
  export_payload      TEXT,
  date_export         TEXT,
  date_declaration    TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_teledecl_type_periode ON fiscalite_teledeclarations(type_decl, periode);

-- Référentiel G50 étendu (liasse fiscale)
CREATE TABLE IF NOT EXISTS fiscalite_g50_referentiel (
  code        TEXT PRIMARY KEY,
  libelle     TEXT NOT NULL,
  categorie   TEXT NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO fiscalite_g50_referentiel (code, libelle, categorie, ordre) VALUES
  ('G50-001', 'Chiffre d''affaires HT', 'G50', 10),
  ('G50-002', 'Achats et charges HT', 'G50', 20),
  ('G50-010', 'TVA collectée', 'G50', 30),
  ('G50-011', 'TVA déductible', 'G50', 40),
  ('G50-012', 'Crédit de TVA antérieur', 'G50', 50),
  ('G50-013', 'Solde TVA à payer', 'G50', 60),
  ('G4-001', 'Résultat fiscal (simplifié)', 'G4', 70),
  ('G29-001', 'Résultat comptable', 'G29', 80),
  ('G29-002', 'Impôt sur les bénéfices estimé (IBS 26%)', 'G29', 90);
