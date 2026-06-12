-- ============================================================
-- 019 — Module Facturation (général, hors PortMaster)
-- ============================================================

-- Clients de facturation (partagés entre hôtels)
CREATE TABLE IF NOT EXISTS clients_facturation (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            TEXT    NOT NULL DEFAULT 'particulier',   -- particulier | entreprise
  nom             TEXT    NOT NULL,
  raison_sociale  TEXT,
  email           TEXT,
  telephone       TEXT,
  adresse         TEXT,
  nif             TEXT,                                     -- numéro d'identification fiscale
  rc              TEXT,                                     -- registre de commerce
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

-- Factures
CREATE TABLE IF NOT EXISTS factures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id),
  client_id       INTEGER REFERENCES clients_facturation(id),
  client_nom      TEXT    NOT NULL DEFAULT '',              -- copie dénormalisée
  numero          TEXT    NOT NULL UNIQUE,                  -- FAC-2025-0001
  date_emission   TEXT    NOT NULL DEFAULT (date('now')),
  date_echeance   TEXT,
  statut          TEXT    NOT NULL DEFAULT 'brouillon',     -- brouillon | soumise | validee | payee | annulee
  montant_ht      REAL    NOT NULL DEFAULT 0,
  montant_tva     REAL    NOT NULL DEFAULT 0,
  montant_ttc     REAL    NOT NULL DEFAULT 0,
  montant_paye    REAL    NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

-- Lignes de facture
CREATE TABLE IF NOT EXISTS lignes_facture (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  designation     TEXT    NOT NULL,
  quantite        REAL    NOT NULL DEFAULT 1,
  prix_unitaire   REAL    NOT NULL DEFAULT 0,
  taux_tva        REAL    NOT NULL DEFAULT 19,              -- 19% TVA standard Algérie
  montant_ht      REAL    NOT NULL DEFAULT 0,
  montant_tva     REAL    NOT NULL DEFAULT 0,
  montant_ttc     REAL    NOT NULL DEFAULT 0,
  ordre           INTEGER NOT NULL DEFAULT 0
);

-- Paiements liés aux factures
CREATE TABLE IF NOT EXISTS paiements_facture (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id      INTEGER NOT NULL REFERENCES factures(id),
  date_paiement   TEXT    NOT NULL DEFAULT (date('now')),
  montant         REAL    NOT NULL,
  mode            TEXT    NOT NULL DEFAULT 'especes',       -- especes | cheque | virement | carte | effet | autre
  reference       TEXT,
  notes           TEXT,
  created_by      INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_factures_hotel_id       ON factures(hotel_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut          ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_date_emission   ON factures(date_emission);
CREATE INDEX IF NOT EXISTS idx_factures_client_id       ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_lignes_facture_id        ON lignes_facture(facture_id);
CREATE INDEX IF NOT EXISTS idx_paiements_facture_id     ON paiements_facture(facture_id);
CREATE INDEX IF NOT EXISTS idx_clients_facturation_nom  ON clients_facturation(nom);
