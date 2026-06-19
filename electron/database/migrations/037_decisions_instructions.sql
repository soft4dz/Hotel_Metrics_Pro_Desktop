CREATE TABLE IF NOT EXISTS decisions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid          TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id      INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  type          TEXT    NOT NULL DEFAULT 'decision', -- decision | instruction | note_service | circulaire
  titre         TEXT    NOT NULL,
  contenu       TEXT    NOT NULL,
  priorite      TEXT    NOT NULL DEFAULT 'normale', -- urgente | haute | normale | basse
  statut        TEXT    NOT NULL DEFAULT 'active', -- brouillon | active | archivee
  auteur_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_emission TEXT    NOT NULL DEFAULT (date('now')),
  date_echeance TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decisions_destinataires (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lu_at       TEXT,
  accuse_at   TEXT,
  UNIQUE(decision_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_hotel ON decisions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_decisions_statut ON decisions(statut);
