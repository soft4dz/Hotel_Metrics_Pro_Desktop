CREATE TABLE IF NOT EXISTS fournisseurs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  code        TEXT NOT NULL UNIQUE,
  raison_sociale TEXT NOT NULL,
  contact_nom TEXT,
  email       TEXT,
  telephone   TEXT,
  adresse     TEXT,
  rc          TEXT,
  nif         TEXT,
  nis         TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bons_commande (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  numero       TEXT NOT NULL UNIQUE,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id) ON DELETE RESTRICT,
  statut       TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | valide | envoye | recu_partiel | recu | annule
  date_commande TEXT NOT NULL DEFAULT (date('now')),
  date_livraison_prevue TEXT,
  montant_ht   REAL NOT NULL DEFAULT 0,
  montant_tva  REAL NOT NULL DEFAULT 0,
  montant_ttc  REAL NOT NULL DEFAULT 0,
  notes        TEXT,
  cree_par     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  valide_par   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  valide_at    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bons_commande_lignes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_id        INTEGER NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  produit_id    INTEGER REFERENCES stock_produits(id) ON DELETE SET NULL,
  designation   TEXT NOT NULL,
  quantite      REAL NOT NULL,
  prix_unitaire REAL NOT NULL,
  tva_pct       REAL NOT NULL DEFAULT 19,
  montant_ht    REAL NOT NULL DEFAULT 0,
  qte_recue     REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bc_hotel ON bons_commande(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bc_fournisseur ON bons_commande(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_bc_statut ON bons_commande(statut);
