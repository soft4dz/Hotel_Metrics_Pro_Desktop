-- Migration 032 : Phase 6 — Conformité Algérie, GED dossiers, validation N+1

-- Dossier administratif employé (loi 90-11 / CNAS)
ALTER TABLE rh_employes ADD COLUMN nin TEXT;
ALTER TABLE rh_employes ADD COLUMN nss TEXT;
ALTER TABLE rh_employes ADD COLUMN rib TEXT;
ALTER TABLE rh_employes ADD COLUMN adresse TEXT;
ALTER TABLE rh_employes ADD COLUMN wilaya TEXT;
ALTER TABLE rh_employes ADD COLUMN commune TEXT;
ALTER TABLE rh_employes ADD COLUMN situation_militaire TEXT
  CHECK(situation_militaire IS NULL OR situation_militaire IN ('fait','exempte','non_concerne','en_cours'));
ALTER TABLE rh_employes ADD COLUMN enfants_charge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rh_employes ADD COLUMN bonus_conges_sud INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rh_employes ADD COLUMN responsable_employe_id INTEGER REFERENCES rh_employes(id);
ALTER TABLE rh_employes ADD COLUMN declaration_anem_statut TEXT NOT NULL DEFAULT 'a_faire'
  CHECK(declaration_anem_statut IN ('a_faire','declaree','non_requis'));
ALTER TABLE rh_employes ADD COLUMN declaration_anem_date TEXT;

-- Validation N+1 (absences & pointages)
ALTER TABLE rh_absences ADD COLUMN statut_n1 TEXT NOT NULL DEFAULT 'en_attente'
  CHECK(statut_n1 IN ('en_attente','approuve','refuse','na'));
ALTER TABLE rh_absences ADD COLUMN valide_n1_par INTEGER REFERENCES users(id);
ALTER TABLE rh_absences ADD COLUMN valide_n1_at TEXT;
ALTER TABLE rh_absences ADD COLUMN commentaire_n1 TEXT;

ALTER TABLE rh_pointages ADD COLUMN statut_n1 TEXT NOT NULL DEFAULT 'en_attente'
  CHECK(statut_n1 IN ('en_attente','approuve','refuse','na'));
ALTER TABLE rh_pointages ADD COLUMN valide_n1_par INTEGER REFERENCES users(id);
ALTER TABLE rh_pointages ADD COLUMN valide_n1_at TEXT;

-- GED — gestion électronique des documents
ALTER TABLE rh_documents ADD COLUMN source TEXT NOT NULL DEFAULT 'upload'
  CHECK(source IN ('upload','scan','import_lot'));
ALTER TABLE rh_documents ADD COLUMN statut_validation TEXT NOT NULL DEFAULT 'brouillon'
  CHECK(statut_validation IN ('brouillon','en_attente_n1','valide','rejete'));
ALTER TABLE rh_documents ADD COLUMN valide_n1_par INTEGER REFERENCES users(id);
ALTER TABLE rh_documents ADD COLUMN valide_n1_at TEXT;
ALTER TABLE rh_documents ADD COLUMN scan_batch TEXT;
ALTER TABLE rh_documents ADD COLUMN modele_code TEXT;

CREATE TABLE IF NOT EXISTS rh_dossier_modeles (
  code           TEXT    PRIMARY KEY,
  libelle        TEXT    NOT NULL,
  type_document  TEXT    NOT NULL,
  obligatoire    INTEGER NOT NULL DEFAULT 1,
  ordre          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rh_conformite_suivi (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id       INTEGER NOT NULL REFERENCES rh_employes(id) ON DELETE CASCADE,
  code             TEXT    NOT NULL,
  libelle          TEXT    NOT NULL,
  statut           TEXT    NOT NULL DEFAULT 'a_faire'
                   CHECK(statut IN ('a_faire','en_cours','fait','non_requis')),
  date_echeance    TEXT,
  date_realisation TEXT,
  notes            TEXT,
  UNIQUE(employe_id, code)
);

INSERT OR IGNORE INTO rh_dossier_modeles (code, libelle, type_document, obligatoire, ordre) VALUES
  ('CIN', 'Carte nationale / passeport', 'identite', 1, 1),
  ('NSS', 'Attestation sécurité sociale (CNAS)', 'identite', 1, 2),
  ('CONTRAT', 'Contrat de travail signé', 'contrat', 1, 3),
  ('RIB', 'Relevé d''identité bancaire', 'autre', 1, 4),
  ('PHOTO', 'Photo d''identité', 'autre', 1, 5),
  ('CV', 'Curriculum vitae', 'cv', 0, 6),
  ('DIPLOME', 'Diplômes / certifications', 'certificat', 0, 7),
  ('VISITE_MED', 'Certificat aptitude médicale', 'certificat', 1, 8),
  ('ANEM', 'Réception déclaration ANEM', 'autre', 1, 9);
