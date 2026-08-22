-- P1.4 — Stocks avancés

CREATE TABLE IF NOT EXISTS stock_magasins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'principal' CHECK(type IN ('principal','economat','cuisine','bar','maintenance','linge','autre')),
  emplacement TEXT,
  principal INTEGER NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id,code)
);

ALTER TABLE stock_produits ADD COLUMN code_barres TEXT;
ALTER TABLE stock_produits ADD COLUMN suivi_lot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_produits ADD COLUMN suivi_peremption INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_produit_barcode ON stock_produits(code_barres) WHERE code_barres IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id INTEGER NOT NULL REFERENCES stock_magasins(id),
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id),
  numero_lot TEXT NOT NULL,
  date_fabrication TEXT,
  date_peremption TEXT,
  quantite REAL NOT NULL DEFAULT 0,
  cout_unitaire REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'disponible' CHECK(statut IN ('disponible','quarantaine','bloque','epuise')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(magasin_id,produit_id,numero_lot)
);

CREATE TABLE IF NOT EXISTS stock_magasin_niveaux (
  magasin_id INTEGER NOT NULL REFERENCES stock_magasins(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id),
  quantite REAL NOT NULL DEFAULT 0,
  pmp REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(magasin_id,produit_id)
);

ALTER TABLE stock_mouvements ADD COLUMN magasin_id INTEGER REFERENCES stock_magasins(id);
ALTER TABLE stock_mouvements ADD COLUMN magasin_destination_id INTEGER REFERENCES stock_magasins(id);
ALTER TABLE stock_mouvements ADD COLUMN lot_id INTEGER REFERENCES stock_lots(id);

CREATE TABLE IF NOT EXISTS stock_transferts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  magasin_source_id INTEGER NOT NULL REFERENCES stock_magasins(id),
  magasin_destination_id INTEGER NOT NULL REFERENCES stock_magasins(id),
  date_transfert TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide','annule')),
  motif TEXT,
  created_by INTEGER REFERENCES users(id),
  valide_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stock_transfert_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfert_id INTEGER NOT NULL REFERENCES stock_transferts(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id),
  lot_id INTEGER REFERENCES stock_lots(id),
  quantite REAL NOT NULL CHECK(quantite > 0)
);

CREATE TABLE IF NOT EXISTS stock_inventaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  magasin_id INTEGER NOT NULL REFERENCES stock_magasins(id),
  date_inventaire TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK(statut IN ('ouvert','valide','annule')),
  observations TEXT,
  created_by INTEGER REFERENCES users(id),
  valide_par INTEGER REFERENCES users(id),
  valide_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stock_inventaire_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventaire_id INTEGER NOT NULL REFERENCES stock_inventaires(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id),
  quantite_theorique REAL NOT NULL,
  quantite_comptee REAL,
  ecart REAL NOT NULL DEFAULT 0,
  valeur_ecart REAL NOT NULL DEFAULT 0,
  UNIQUE(inventaire_id,produit_id)
);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'stocks.transfert.valider','Valider les transferts de stock','stocks');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'stocks.inventaire.valider','Valider les inventaires physiques','stocks');
