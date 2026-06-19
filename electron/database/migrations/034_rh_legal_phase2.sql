-- Migration 034 : Phase 2 — Registres légaux, visites médicales, accidents, ruptures/STC

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rh_accidents_travail (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id      INTEGER NOT NULL REFERENCES rh_employes(id),
  date_accident   TEXT    NOT NULL,
  lieu            TEXT,
  nature          TEXT    NOT NULL,
  mesures_prises  TEXT,
  declaration_cnas INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_accidents_employe ON rh_accidents_travail(employe_id, date_accident);

CREATE TABLE IF NOT EXISTS rh_visites_medicales (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id      INTEGER NOT NULL REFERENCES rh_employes(id),
  type_visite     TEXT    NOT NULL DEFAULT 'embauche'
                    CHECK(type_visite IN ('embauche','periodique','reprise')),
  date_visite     TEXT    NOT NULL,
  date_echeance   TEXT,
  medecin         TEXT,
  apte            INTEGER NOT NULL DEFAULT 1,
  restrictions    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_visites_employe ON rh_visites_medicales(employe_id, date_echeance);

CREATE TABLE IF NOT EXISTS rh_ruptures_contrat (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id            INTEGER NOT NULL REFERENCES rh_employes(id),
  date_sortie           TEXT    NOT NULL,
  type_rupture          TEXT    NOT NULL
                          CHECK(type_rupture IN ('demission','licenciement','fin_cdd','retraite','rupture_conventionnelle')),
  motif                 TEXT,
  salaire_brut_ref      REAL    NOT NULL DEFAULT 0,
  anciennete_mois       INTEGER NOT NULL DEFAULT 0,
  jours_conges_restants REAL    NOT NULL DEFAULT 0,
  indemnite_conges      REAL    NOT NULL DEFAULT 0,
  indemnite_preavis     REAL    NOT NULL DEFAULT 0,
  indemnite_licenciement REAL   NOT NULL DEFAULT 0,
  total_brut_stc        REAL    NOT NULL DEFAULT 0,
  retenues              REAL    NOT NULL DEFAULT 0,
  net_a_payer           REAL    NOT NULL DEFAULT 0,
  certificat_genere_at  TEXT,
  stc_genere_at         TEXT,
  created_by            INTEGER REFERENCES users(id),
  created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_ruptures_employe ON rh_ruptures_contrat(employe_id);

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('rh_employeur_nis', '', datetime('now')),
  ('rh_employeur_nss', '', datetime('now')),
  ('rh_employeur_agence_cnas', '', datetime('now'));
