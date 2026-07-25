-- Lot 4 RH — GPEC : compétences employé, campagnes d'évaluation

CREATE TABLE IF NOT EXISTS rh_employe_competences (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id    INTEGER NOT NULL REFERENCES rh_employes(id) ON DELETE CASCADE,
  competence_id INTEGER NOT NULL REFERENCES rh_competences(id) ON DELETE CASCADE,
  niveau_actuel INTEGER NOT NULL DEFAULT 1 CHECK(niveau_actuel BETWEEN 1 AND 5),
  source        TEXT    NOT NULL DEFAULT 'manuel'
                  CHECK(source IN ('manuel','evaluation','formation')),
  date_maj      TEXT    NOT NULL DEFAULT (date('now')),
  commentaire   TEXT,
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, competence_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_emp_comp_employe ON rh_employe_competences(employe_id);

CREATE TABLE IF NOT EXISTS rh_campagnes_evaluation (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  titre         TEXT    NOT NULL,
  description   TEXT,
  periode_debut TEXT    NOT NULL,
  periode_fin   TEXT    NOT NULL,
  statut        TEXT    NOT NULL DEFAULT 'brouillon'
                  CHECK(statut IN ('brouillon','en_cours','cloturee')),
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rh_campagne_evaluations (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  campagne_id             INTEGER NOT NULL REFERENCES rh_campagnes_evaluation(id) ON DELETE CASCADE,
  employe_id              INTEGER NOT NULL REFERENCES rh_employes(id),
  competence_id           INTEGER NOT NULL REFERENCES rh_competences(id),
  niveau_requis           INTEGER NOT NULL DEFAULT 1 CHECK(niveau_requis BETWEEN 1 AND 5),
  niveau_observe          INTEGER CHECK(niveau_observe IS NULL OR (niveau_observe BETWEEN 1 AND 5)),
  ecart                   INTEGER,
  commentaire             TEXT,
  evaluateur_employe_id   INTEGER REFERENCES rh_employes(id),
  statut                  TEXT    NOT NULL DEFAULT 'brouillon'
                            CHECK(statut IN ('brouillon','soumis','valide')),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campagne_id, employe_id, competence_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_camp_eval_campagne ON rh_campagne_evaluations(campagne_id, statut);
CREATE INDEX IF NOT EXISTS idx_rh_camp_eval_employe ON rh_campagne_evaluations(employe_id);
