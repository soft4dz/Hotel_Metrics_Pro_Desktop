-- Lot 2 RH — ATS recrutement : offres, pipeline candidats, entretiens

CREATE TABLE IF NOT EXISTS rh_offres_emploi (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  poste_id      INTEGER NOT NULL REFERENCES rh_postes(id),
  titre         TEXT    NOT NULL,
  description   TEXT,
  statut        TEXT    NOT NULL DEFAULT 'brouillon'
                  CHECK(statut IN ('brouillon','publiee','pourvue','archivee')),
  nb_postes     INTEGER NOT NULL DEFAULT 1,
  date_ouverture TEXT,
  date_cloture  TEXT,
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_offres_statut ON rh_offres_emploi(statut, poste_id);

ALTER TABLE rh_recrutements ADD COLUMN offre_id INTEGER REFERENCES rh_offres_emploi(id);
ALTER TABLE rh_recrutements ADD COLUMN etape TEXT NOT NULL DEFAULT 'candidature';
ALTER TABLE rh_recrutements ADD COLUMN source TEXT;
ALTER TABLE rh_recrutements ADD COLUMN score INTEGER;

CREATE TABLE IF NOT EXISTS rh_recrutement_entretiens (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recrutement_id  INTEGER NOT NULL REFERENCES rh_recrutements(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL DEFAULT 'rh'
                    CHECK(type IN ('telephone','rh','technique','direction','autre')),
  date_heure      TEXT    NOT NULL,
  lieu            TEXT,
  intervieweur_id INTEGER REFERENCES users(id),
  notes           TEXT,
  note_evaluation INTEGER CHECK(note_evaluation IS NULL OR (note_evaluation BETWEEN 1 AND 5)),
  statut          TEXT    NOT NULL DEFAULT 'planifie'
                    CHECK(statut IN ('planifie','realise','annule','reporte')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_rec_entretiens_rec ON rh_recrutement_entretiens(recrutement_id, date_heure);

CREATE TABLE IF NOT EXISTS rh_recrutement_historique (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recrutement_id  INTEGER NOT NULL REFERENCES rh_recrutements(id) ON DELETE CASCADE,
  etape_avant     TEXT,
  etape_apres     TEXT    NOT NULL,
  commentaire     TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_rec_hist_rec ON rh_recrutement_historique(recrutement_id, created_at);
