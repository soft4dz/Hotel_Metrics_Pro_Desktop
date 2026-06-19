-- Migration 027 : Phase 1 RH — sortie employé, soldes congés

ALTER TABLE rh_employes ADD COLUMN date_sortie TEXT;
ALTER TABLE rh_employes ADD COLUMN motif_sortie TEXT;

CREATE TABLE IF NOT EXISTS rh_soldes_conges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id  INTEGER NOT NULL REFERENCES rh_employes(id),
  annee       INTEGER NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('CP','RTT','Maladie')),
  acquis      REAL    NOT NULL DEFAULT 0,
  pris        REAL    NOT NULL DEFAULT 0,
  reste       REAL    NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, annee, type)
);

CREATE INDEX IF NOT EXISTS idx_rh_soldes_conges_employe ON rh_soldes_conges(employe_id, annee);
