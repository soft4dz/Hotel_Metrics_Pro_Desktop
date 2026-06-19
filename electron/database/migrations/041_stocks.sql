CREATE TABLE IF NOT EXISTS stock_categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  code      TEXT NOT NULL UNIQUE,
  label     TEXT NOT NULL,
  parent_id INTEGER REFERENCES stock_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_produits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  code         TEXT NOT NULL UNIQUE,
  designation  TEXT NOT NULL,
  categorie_id INTEGER REFERENCES stock_categories(id) ON DELETE SET NULL,
  unite        TEXT NOT NULL DEFAULT 'pièce', -- pièce | kg | litre | m2 | boite | carton
  prix_unitaire REAL NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_mouvements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  produit_id   INTEGER NOT NULL REFERENCES stock_produits(id) ON DELETE CASCADE,
  type_mouvement TEXT NOT NULL, -- entree | sortie | inventaire | transfert | perte
  quantite     REAL NOT NULL,
  prix_unitaire REAL,
  montant      REAL,
  reference    TEXT,
  motif        TEXT,
  date_mouvement TEXT NOT NULL DEFAULT (date('now')),
  saisi_par    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_niveaux (
  hotel_id   INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id) ON DELETE CASCADE,
  quantite   REAL    NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hotel_id, produit_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_mvt_hotel ON stock_mouvements(hotel_id);
CREATE INDEX IF NOT EXISTS idx_stock_mvt_produit ON stock_mouvements(produit_id);
CREATE INDEX IF NOT EXISTS idx_stock_mvt_date ON stock_mouvements(date_mouvement);
