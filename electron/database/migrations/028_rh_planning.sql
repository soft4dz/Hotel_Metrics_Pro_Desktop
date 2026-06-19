-- Migration 028 : Planning RH & équipes (chef → membres)

CREATE TABLE IF NOT EXISTS rh_plannings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id),
  employe_id   INTEGER NOT NULL REFERENCES rh_employes(id),
  poste_id     INTEGER REFERENCES rh_postes(id),
  date         TEXT    NOT NULL,
  shift        TEXT    NOT NULL DEFAULT 'jour'
                 CHECK(shift IN ('matin','apres_midi','soir','nuit','jour')),
  heure_debut  TEXT,
  heure_fin    TEXT,
  statut       TEXT    NOT NULL DEFAULT 'planifie'
                 CHECK(statut IN ('planifie','confirme','annule')),
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, date, shift)
);

CREATE INDEX IF NOT EXISTS idx_rh_plannings_hotel_date ON rh_plannings(hotel_id, date);
CREATE INDEX IF NOT EXISTS idx_rh_plannings_employe ON rh_plannings(employe_id, date);

CREATE TABLE IF NOT EXISTS rh_equipes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_employe_id     INTEGER NOT NULL REFERENCES rh_employes(id),
  membre_employe_id   INTEGER NOT NULL REFERENCES rh_employes(id),
  hotel_id            INTEGER REFERENCES hotels(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chef_employe_id, membre_employe_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_equipes_chef ON rh_equipes(chef_employe_id);
