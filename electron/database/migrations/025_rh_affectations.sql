-- Migration 025 : Affectations RH (employé → unité / poste)

CREATE TABLE IF NOT EXISTS rh_affectations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id  INTEGER NOT NULL REFERENCES rh_employes(id),
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id),
  poste_id    INTEGER NOT NULL REFERENCES rh_postes(id),
  type        TEXT    NOT NULL DEFAULT 'principale'
                CHECK(type IN ('principale','temporaire','renfort')),
  date_debut  TEXT    NOT NULL,
  date_fin    TEXT,
  statut      TEXT    NOT NULL DEFAULT 'active'
                CHECK(statut IN ('active','terminee')),
  notes       TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_affectations_employe ON rh_affectations(employe_id, statut);
CREATE INDEX IF NOT EXISTS idx_rh_affectations_hotel ON rh_affectations(hotel_id, statut);
CREATE INDEX IF NOT EXISTS idx_rh_affectations_dates ON rh_affectations(date_debut, date_fin);
