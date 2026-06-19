-- Migration 031 : Phase 5 RH — pilotage, onboarding, PortMaster

ALTER TABLE rh_employes ADD COLUMN type_activite TEXT NOT NULL DEFAULT 'hotel'
  CHECK(type_activite IN ('hotel','port','mixte'));

CREATE TABLE IF NOT EXISTS rh_onboarding_modeles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  libelle     TEXT    NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  obligatoire INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rh_onboarding_suivi (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id   INTEGER NOT NULL REFERENCES rh_employes(id) ON DELETE CASCADE,
  step_code    TEXT    NOT NULL,
  statut       TEXT    NOT NULL DEFAULT 'a_faire' CHECK(statut IN ('a_faire','fait','ignore')),
  completed_at TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, step_code)
);

CREATE INDEX IF NOT EXISTS idx_rh_onboarding_employe ON rh_onboarding_suivi(employe_id);

INSERT OR IGNORE INTO rh_onboarding_modeles (code, libelle, ordre, obligatoire) VALUES
  ('compte_active', 'Compte utilisateur activé', 1, 1),
  ('contrat_signe', 'Contrat signé et archivé', 2, 1),
  ('affectation', 'Affectation à une unité', 3, 1),
  ('formations_obligatoires', 'Formations obligatoires planifiées', 4, 1),
  ('dlg_matricule', 'Matricule DLG renseigné', 5, 0),
  ('pointage_demo', 'Premier pointage validé', 6, 0);
