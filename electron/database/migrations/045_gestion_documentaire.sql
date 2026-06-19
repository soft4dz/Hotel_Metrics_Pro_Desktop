CREATE TABLE IF NOT EXISTS ged_categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  code      TEXT NOT NULL UNIQUE,
  label     TEXT NOT NULL,
  parent_id INTEGER REFERENCES ged_categories(id) ON DELETE SET NULL,
  icone     TEXT NOT NULL DEFAULT 'file'
);

INSERT OR IGNORE INTO ged_categories (code, label, icone) VALUES
  ('contrats',   'Contrats & conventions', 'file-text'),
  ('factures',   'Factures & comptabilité', 'receipt'),
  ('rh',         'RH & personnel',          'users'),
  ('technique',  'Technique & maintenance', 'wrench'),
  ('qualite',    'Qualité & normes',        'check-circle'),
  ('legal',      'Juridique & légal',       'scale'),
  ('divers',     'Divers',                  'folder');

CREATE TABLE IF NOT EXISTS ged_documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id     INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  categorie_id INTEGER REFERENCES ged_categories(id) ON DELETE SET NULL,
  titre        TEXT NOT NULL,
  description  TEXT,
  nom_fichier  TEXT NOT NULL,
  chemin       TEXT NOT NULL,
  taille_octets INTEGER,
  mime_type    TEXT,
  tags         TEXT, -- JSON array
  version      TEXT NOT NULL DEFAULT '1.0',
  statut       TEXT NOT NULL DEFAULT 'actif', -- actif | archive | supprime
  confidentiel INTEGER NOT NULL DEFAULT 0,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_document TEXT,
  date_expiration TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ged_hotel ON ged_documents(hotel_id);
CREATE INDEX IF NOT EXISTS idx_ged_cat ON ged_documents(categorie_id);
CREATE INDEX IF NOT EXISTS idx_ged_statut ON ged_documents(statut);
