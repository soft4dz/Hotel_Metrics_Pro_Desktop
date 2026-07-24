-- ============================================================
-- 058 — Phase 2 : Hôtellerie légale + archivage GED
-- ============================================================

-- ── Fiche police (registre clients hébergés) ─────────────────

CREATE TABLE IF NOT EXISTS fiche_police (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id),
  reservation_id      INTEGER REFERENCES reservations(id),
  nom                 TEXT    NOT NULL,
  prenom              TEXT    NOT NULL,
  date_naissance      TEXT,
  lieu_naissance      TEXT,
  nationalite         TEXT,
  type_piece          TEXT    NOT NULL DEFAULT 'cni'
                        CHECK(type_piece IN ('cni','passeport','permis_sejour','autre')),
  numero_piece        TEXT    NOT NULL,
  date_entree         TEXT    NOT NULL,
  date_sortie_prevue  TEXT,
  date_sortie_reelle  TEXT,
  chambre_numero      TEXT,
  statut              TEXT    NOT NULL DEFAULT 'present'
                        CHECK(statut IN ('present','parti','annule')),
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fiche_police_hotel_date ON fiche_police(hotel_id, date_entree);
CREATE INDEX IF NOT EXISTS idx_fiche_police_statut ON fiche_police(statut);

-- ── Taxe de séjour ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taxe_sejour_declarations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id),
  periode             TEXT    NOT NULL,
  nb_nuites           INTEGER NOT NULL DEFAULT 0,
  taux_unitaire       REAL    NOT NULL DEFAULT 200,
  montant_total       REAL    NOT NULL DEFAULT 0,
  statut              TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','calculee','declaree','reversee')),
  date_declaration    TEXT,
  reference_versement   TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, periode)
);

CREATE TABLE IF NOT EXISTS taxe_sejour_lignes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  declaration_id      INTEGER NOT NULL REFERENCES taxe_sejour_declarations(id) ON DELETE CASCADE,
  fiche_police_id     INTEGER REFERENCES fiche_police(id),
  nb_nuites           INTEGER NOT NULL DEFAULT 1,
  montant             REAL    NOT NULL DEFAULT 0
);

-- ── Rapports tourisme ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rapports_tourisme (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id),
  periode             TEXT    NOT NULL,
  nb_nuites           INTEGER NOT NULL DEFAULT 0,
  nb_clients          INTEGER NOT NULL DEFAULT 0,
  taux_occupation     REAL    NOT NULL DEFAULT 0,
  nationalites_json   TEXT,
  statut              TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','genere','transmis')),
  generated_at        TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, periode)
);

-- ── Archivage légal GED (rétention 10 ans) ───────────────────

CREATE TABLE IF NOT EXISTS ged_retention_policies (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT    NOT NULL UNIQUE,
  libelle             TEXT    NOT NULL,
  categorie_code      TEXT,
  duree_annees        INTEGER NOT NULL DEFAULT 10 CHECK(duree_annees > 0),
  actif               INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO ged_retention_policies (code, libelle, categorie_code, duree_annees) VALUES
  ('LEGAL_COMPTA', 'Documents comptables et fiscaux', 'factures', 10),
  ('LEGAL_RH', 'Bulletins et registres RH', 'rh', 10),
  ('LEGAL_HOTEL', 'Fiches police et registres hôteliers', 'legal', 10),
  ('LEGAL_CONTRATS', 'Contrats et conventions', 'contrats', 10);

CREATE TABLE IF NOT EXISTS ged_legal_archives (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id         INTEGER NOT NULL REFERENCES ged_documents(id),
  politique_id        INTEGER REFERENCES ged_retention_policies(id),
  hash_sha256         TEXT    NOT NULL,
  horodatage          TEXT    NOT NULL,
  retention_until     TEXT    NOT NULL,
  statut              TEXT    NOT NULL DEFAULT 'actif'
                        CHECK(statut IN ('actif','expire','detruit')),
  archived_by         INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ged_legal_archives_doc ON ged_legal_archives(document_id);
CREATE INDEX IF NOT EXISTS idx_ged_legal_archives_retention ON ged_legal_archives(retention_until, statut);

-- Lien clôture journalière ↔ rapprochement
ALTER TABLE daily_closures ADD COLUMN reconciliation_id INTEGER REFERENCES finance_reconciliations(id);

-- Items checklist (modèles seedés en 055)
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'CA journalier saisi et validé', 'haute', 1, 1 FROM control_checklist_templates t WHERE t.code='DEC_CA_JOUR';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Encaissements rapprochés', 'haute', 2, 1 FROM control_checklist_templates t WHERE t.code='DEC_CA_JOUR';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Écarts justifiés ou nuls', 'normale', 3, 1 FROM control_checklist_templates t WHERE t.code='DEC_CA_JOUR';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Propreté chambres contrôlée', 'normale', 1, 1 FROM control_checklist_templates t WHERE t.code='QUALITE_CHAMBRES';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Hygiène cuisine vérifiée', 'haute', 1, 1 FROM control_checklist_templates t WHERE t.code='HYGIENE_RESTAURATION';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Équipements critiques inspectés', 'normale', 1, 1 FROM control_checklist_templates t WHERE t.code='MAINT_PREVENTIVE';
INSERT OR IGNORE INTO control_checklist_items (template_id, libelle, criticite, ordre, actif)
SELECT t.id, 'Rondes sécurité effectuées', 'haute', 1, 1 FROM control_checklist_templates t WHERE t.code='SECURITE_ACCES';
