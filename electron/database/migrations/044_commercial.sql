CREATE TABLE IF NOT EXISTS partenaires (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  code         TEXT NOT NULL UNIQUE,
  raison_sociale TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'agence', -- agence | operateur | entreprise | ambassade | autre
  contact_nom  TEXT,
  email        TEXT,
  telephone    TEXT,
  adresse      TEXT,
  remise_pct   REAL NOT NULL DEFAULT 0,
  credit_jours INTEGER NOT NULL DEFAULT 30,
  is_active    INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunites (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid           TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id       INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  partenaire_id  INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  titre          TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'groupe', -- groupe | evenement | contrat_annuel | sejour | autre
  statut         TEXT NOT NULL DEFAULT 'prospect', -- prospect | en_negociation | gagne | perdu | annule
  montant_estime REAL,
  probabilite    INTEGER NOT NULL DEFAULT 50, -- 0-100
  date_echeance  TEXT,
  notes          TEXT,
  commercial_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_opport_hotel ON opportunites(hotel_id);
CREATE INDEX IF NOT EXISTS idx_opport_statut ON opportunites(statut);
