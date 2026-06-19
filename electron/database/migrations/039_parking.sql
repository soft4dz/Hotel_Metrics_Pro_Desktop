CREATE TABLE IF NOT EXISTS parking_config (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  capacite     INTEGER NOT NULL DEFAULT 0,
  tarif_heure  REAL    NOT NULL DEFAULT 0,
  tarif_jour   REAL    NOT NULL DEFAULT 0,
  tarif_nuit   REAL    NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id)
);

CREATE TABLE IF NOT EXISTS parking_tickets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  immatriculation TEXT,
  type_vehicule TEXT   NOT NULL DEFAULT 'voiture', -- voiture | moto | camionnette | bus
  entree_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  sortie_at    TEXT,
  duree_minutes INTEGER,
  montant      REAL,
  statut       TEXT    NOT NULL DEFAULT 'en_cours', -- en_cours | termine | annule
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_parking_hotel ON parking_tickets(hotel_id);
CREATE INDEX IF NOT EXISTS idx_parking_statut ON parking_tickets(statut);
