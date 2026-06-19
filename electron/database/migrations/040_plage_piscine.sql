CREATE TABLE IF NOT EXISTS plage_config (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  capacite_plage   INTEGER NOT NULL DEFAULT 0,
  capacite_piscine INTEGER NOT NULL DEFAULT 0,
  tarif_adulte REAL    NOT NULL DEFAULT 0,
  tarif_enfant REAL    NOT NULL DEFAULT 0,
  tarif_resident REAL NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id)
);

CREATE TABLE IF NOT EXISTS plage_entrees (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  zone         TEXT    NOT NULL DEFAULT 'plage', -- plage | piscine | les_deux
  date_entree  TEXT    NOT NULL DEFAULT (date('now')),
  nb_adultes   INTEGER NOT NULL DEFAULT 0,
  nb_enfants   INTEGER NOT NULL DEFAULT 0,
  nb_residents INTEGER NOT NULL DEFAULT 0,
  montant      REAL    NOT NULL DEFAULT 0,
  observation  TEXT,
  saisi_par    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plage_hotel ON plage_entrees(hotel_id);
CREATE INDEX IF NOT EXISTS idx_plage_date ON plage_entrees(date_entree);
