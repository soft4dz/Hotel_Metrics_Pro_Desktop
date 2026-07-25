-- Phase 7 — Module POS complet (points de vente, factions, clôtures)

CREATE TABLE IF NOT EXISTS pos_points_vente (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid       TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id   INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  nom        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'restaurant',
  actif      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

CREATE TABLE IF NOT EXISTS pos_factions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  point_vente_id  INTEGER NOT NULL REFERENCES pos_points_vente(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  nom             TEXT NOT NULL,
  heure_debut     TEXT,
  heure_fin       TEXT,
  ordre           INTEGER NOT NULL DEFAULT 0,
  actif           INTEGER NOT NULL DEFAULT 1,
  UNIQUE(point_vente_id, code)
);

CREATE TABLE IF NOT EXISTS pos_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  point_vente_id  INTEGER NOT NULL REFERENCES pos_points_vente(id),
  faction_id      INTEGER NOT NULL REFERENCES pos_factions(id),
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id),
  caissier_id     INTEGER NOT NULL REFERENCES users(id),
  date_service    TEXT NOT NULL,
  fond_caisse     REAL NOT NULL DEFAULT 0,
  statut          TEXT NOT NULL DEFAULT 'ouverte',
  total_ventes    REAL NOT NULL DEFAULT 0,
  total_especes   REAL NOT NULL DEFAULT 0,
  total_carte     REAL NOT NULL DEFAULT 0,
  total_cheque    REAL NOT NULL DEFAULT 0,
  total_virement  REAL NOT NULL DEFAULT 0,
  fond_cloture    REAL,
  ecart_caisse    REAL,
  observations    TEXT,
  ouvert_at       TEXT NOT NULL DEFAULT (datetime('now')),
  cloture_at      TEXT,
  cloture_par     INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pos_tickets (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid                 TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  session_id           INTEGER NOT NULL REFERENCES pos_sessions(id),
  point_vente_id       INTEGER NOT NULL REFERENCES pos_points_vente(id),
  hotel_id             INTEGER NOT NULL REFERENCES hotels(id),
  numero               TEXT NOT NULL,
  statut               TEXT NOT NULL DEFAULT 'brouillon',
  total_ht             REAL NOT NULL DEFAULT 0,
  total_ttc            REAL NOT NULL DEFAULT 0,
  tva_montant          REAL NOT NULL DEFAULT 0,
  mode_paiement        TEXT,
  encaissement_id      INTEGER REFERENCES encaissements(id),
  ecriture_comptable_id INTEGER REFERENCES ecritures_comptables(id),
  date_ticket          TEXT NOT NULL DEFAULT (date('now')),
  cree_par             INTEGER REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  validated_at         TEXT
);

CREATE TABLE IF NOT EXISTS pos_ticket_lignes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id      INTEGER NOT NULL REFERENCES pos_tickets(id) ON DELETE CASCADE,
  recette_id     INTEGER NOT NULL REFERENCES cuisine_recettes(id),
  designation    TEXT NOT NULL,
  quantite       INTEGER NOT NULL DEFAULT 1,
  prix_unitaire  REAL NOT NULL,
  montant_ligne  REAL NOT NULL,
  taux_tva       REAL NOT NULL DEFAULT 19
);

CREATE TABLE IF NOT EXISTS pos_clotures_journalieres (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  point_vente_id  INTEGER NOT NULL REFERENCES pos_points_vente(id),
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id),
  date_journal    TEXT NOT NULL,
  statut          TEXT NOT NULL DEFAULT 'brouillon',
  total_ventes    REAL NOT NULL DEFAULT 0,
  total_especes   REAL NOT NULL DEFAULT 0,
  total_carte     REAL NOT NULL DEFAULT 0,
  nb_tickets      INTEGER NOT NULL DEFAULT 0,
  nb_sessions     INTEGER NOT NULL DEFAULT 0,
  ecart_caisse    REAL NOT NULL DEFAULT 0,
  observations    TEXT,
  cloture_par     INTEGER REFERENCES users(id),
  cloture_at      TEXT,
  UNIQUE(point_vente_id, date_journal)
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_pv_date ON pos_sessions(point_vente_id, date_service DESC);
CREATE INDEX IF NOT EXISTS idx_pos_tickets_session ON pos_tickets(session_id, statut);
CREATE INDEX IF NOT EXISTS idx_pos_clotures_pv_date ON pos_clotures_journalieres(point_vente_id, date_journal DESC);

INSERT OR IGNORE INTO modules_config (module_id) VALUES ('pos-restauration');
