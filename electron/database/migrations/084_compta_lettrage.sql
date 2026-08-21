-- Lettrage des comptes de tiers (clients 411 / fournisseurs 401).
CREATE TABLE IF NOT EXISTS compta_lettrages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  compte_id INTEGER NOT NULL REFERENCES comptes(id),
  hotel_id INTEGER REFERENCES hotels(id),
  total_debit REAL NOT NULL,
  total_credit REAL NOT NULL,
  ecart REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide', 'annule')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_by INTEGER REFERENCES users(id),
  cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS compta_lettrage_lignes (
  lettrage_id INTEGER NOT NULL REFERENCES compta_lettrages(id),
  ligne_ecriture_id INTEGER NOT NULL REFERENCES lignes_ecriture(id),
  PRIMARY KEY (lettrage_id, ligne_ecriture_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lettrage_ligne_active
ON compta_lettrage_lignes(ligne_ecriture_id);
CREATE INDEX IF NOT EXISTS idx_lettrages_compte_date
ON compta_lettrages(compte_id, created_at DESC);

