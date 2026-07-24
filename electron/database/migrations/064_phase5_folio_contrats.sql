-- Phase 5 — Folios hébergement, contrats hôteliers, paramètres workflow/créances

CREATE TABLE IF NOT EXISTS hebergement_folios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id  INTEGER NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  statut          TEXT NOT NULL DEFAULT 'ouvert' CHECK(statut IN ('ouvert','clos','facture')),
  total_ht        REAL NOT NULL DEFAULT 0,
  total_ttc       REAL NOT NULL DEFAULT 0,
  facture_id      INTEGER REFERENCES factures(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hebergement_folio_lignes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_id    INTEGER NOT NULL REFERENCES hebergement_folios(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite    REAL NOT NULL DEFAULT 1,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  taux_tva    REAL NOT NULL DEFAULT 0,
  montant_ht  REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  categorie   TEXT NOT NULL DEFAULT 'autre',
  ordre       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_folios_reservation ON hebergement_folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folio_lignes_folio ON hebergement_folio_lignes(folio_id);

CREATE TABLE IF NOT EXISTS contrats_hotel (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  client_id       INTEGER REFERENCES clients_facturation(id) ON DELETE SET NULL,
  type_contrat    TEXT NOT NULL DEFAULT 'convention_entreprise',
  reference       TEXT NOT NULL,
  date_debut      TEXT NOT NULL,
  date_fin        TEXT NOT NULL,
  montant         REAL NOT NULL DEFAULT 0,
  statut          TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('brouillon','actif','suspendu','expire','resilie')),
  document_ged_id INTEGER,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contrats_hotel_hotel ON contrats_hotel(hotel_id, statut);
CREATE INDEX IF NOT EXISTS idx_contrats_hotel_echeance ON contrats_hotel(date_fin);

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('workflow_seuil_facture_ttc', '500000');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('workflow_seuil_achat_ttc', '200000');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('creances_relances_auto', '1');
