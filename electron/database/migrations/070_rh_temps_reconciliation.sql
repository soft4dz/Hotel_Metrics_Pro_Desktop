-- Lot 3 RH — Réconciliation temps : planning / pointage / paie, alertes H+15

CREATE TABLE IF NOT EXISTS rh_reconciliations_jour (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id       INTEGER NOT NULL REFERENCES rh_employes(id),
  hotel_id         INTEGER REFERENCES hotels(id),
  date             TEXT    NOT NULL,
  heures_prevues   REAL    NOT NULL DEFAULT 0,
  heures_pointees  REAL    NOT NULL DEFAULT 0,
  ecart_heures     REAL    NOT NULL DEFAULT 0,
  retard_minutes   INTEGER NOT NULL DEFAULT 0,
  statut           TEXT    NOT NULL DEFAULT 'ok'
                     CHECK(statut IN ('ok','ecart','alerte','sans_planning','sans_pointage')),
  paie_valide      INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rh_reconcil_date ON rh_reconciliations_jour(date, statut);
CREATE INDEX IF NOT EXISTS idx_rh_reconcil_employe ON rh_reconciliations_jour(employe_id, date);

CREATE TABLE IF NOT EXISTS rh_temps_alertes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id  INTEGER NOT NULL REFERENCES rh_employes(id),
  hotel_id    INTEGER REFERENCES hotels(id),
  date        TEXT    NOT NULL,
  type        TEXT    NOT NULL
                CHECK(type IN ('retard_h15','absence_non_pointee','pointage_sans_planning','depassement_horaire','ecart_heures')),
  message     TEXT    NOT NULL,
  severite    TEXT    NOT NULL DEFAULT 'warning'
                CHECK(severite IN ('info','warning','critique')),
  statut      TEXT    NOT NULL DEFAULT 'ouverte'
                CHECK(statut IN ('ouverte','traitee','ignoree')),
  traite_par  INTEGER REFERENCES users(id),
  traite_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_temps_alertes_statut ON rh_temps_alertes(statut, date);
