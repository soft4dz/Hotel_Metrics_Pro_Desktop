CREATE TABLE IF NOT EXISTS reclamations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id        INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  reference       TEXT    NOT NULL,
  client_nom      TEXT    NOT NULL,
  client_email    TEXT,
  client_tel      TEXT,
  canal           TEXT    NOT NULL DEFAULT 'reception', -- reception | email | telephone | web | autre
  categorie       TEXT    NOT NULL DEFAULT 'service', -- chambre | restauration | service | proprete | bruit | facturation | autre
  objet           TEXT    NOT NULL,
  description     TEXT,
  priorite        TEXT    NOT NULL DEFAULT 'normale', -- urgente | haute | normale | basse
  statut          TEXT    NOT NULL DEFAULT 'ouverte', -- ouverte | en_cours | resolue | fermee | non_fondee
  satisfaction    INTEGER, -- 1-5 étoiles
  assigne_a       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reponse         TEXT,
  date_reception  TEXT    NOT NULL DEFAULT (date('now')),
  date_echeance   TEXT,
  date_resolution TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reclamations_hotel ON reclamations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_statut ON reclamations(statut);

-- Auto-incrément référence
CREATE TABLE IF NOT EXISTS reclamations_seq (
  hotel_id INTEGER PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
