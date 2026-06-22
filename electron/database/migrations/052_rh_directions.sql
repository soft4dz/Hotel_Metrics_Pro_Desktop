-- Migration 052 : Directions RH (hiérarchie Direction → Département → Poste)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rh_directions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL UNIQUE,
  code        TEXT,
  description TEXT,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE rh_departements ADD COLUMN direction_id INTEGER REFERENCES rh_directions(id);

CREATE INDEX IF NOT EXISTS idx_rh_departements_direction ON rh_departements(direction_id);

INSERT OR IGNORE INTO rh_directions (nom, code, description) VALUES
  ('Direction générale', 'DG', 'Pilotage et direction de l''établissement'),
  ('Direction hôtelière', 'DH', 'Exploitation, réception, hébergement'),
  ('Direction administrative', 'DAF', 'Finance, RH et administration');

UPDATE rh_departements
SET direction_id = (SELECT id FROM rh_directions WHERE code = 'DG' LIMIT 1)
WHERE nom = 'Direction' AND direction_id IS NULL;

UPDATE rh_departements
SET direction_id = (SELECT id FROM rh_directions WHERE code = 'DH' LIMIT 1)
WHERE nom IN ('Réception', 'Hébergement', 'Restauration', 'Housekeeping') AND direction_id IS NULL;

UPDATE rh_departements
SET direction_id = (SELECT id FROM rh_directions WHERE code = 'DAF' LIMIT 1)
WHERE direction_id IS NULL;
