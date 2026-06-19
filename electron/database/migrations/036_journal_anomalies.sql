CREATE TABLE IF NOT EXISTS anomalies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id    INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  titre       TEXT    NOT NULL,
  description TEXT,
  categorie   TEXT    NOT NULL DEFAULT 'autre', -- incident | materiel | rh | hygiene | securite | autre
  severite    TEXT    NOT NULL DEFAULT 'mineure', -- critique | majeure | mineure
  statut      TEXT    NOT NULL DEFAULT 'ouverte', -- ouverte | en_cours | resolue | fermee
  signale_par INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigne_a   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_signalement TEXT NOT NULL DEFAULT (date('now')),
  date_resolution  TEXT,
  action_corrective TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_anomalies_hotel ON anomalies(hotel_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_statut ON anomalies(statut);
CREATE INDEX IF NOT EXISTS idx_anomalies_severite ON anomalies(severite);
