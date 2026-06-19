-- Migration 026 : Organisation RH (effectifs cibles, responsables, écarts)

CREATE TABLE IF NOT EXISTS rh_organisation (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id                INTEGER NOT NULL REFERENCES hotels(id),
  poste_id                INTEGER NOT NULL REFERENCES rh_postes(id),
  effectif_cible          INTEGER NOT NULL DEFAULT 0 CHECK(effectif_cible >= 0),
  responsable_employe_id  INTEGER REFERENCES rh_employes(id),
  notes                   TEXT,
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, poste_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_organisation_hotel ON rh_organisation(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rh_organisation_poste ON rh_organisation(poste_id);
