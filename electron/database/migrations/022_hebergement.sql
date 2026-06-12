-- Migration 022 : Hébergement & Occupation

CREATE TABLE IF NOT EXISTS types_chambres (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  label       TEXT NOT NULL,
  capacite    INTEGER NOT NULL DEFAULT 2,
  tarif_base  REAL    NOT NULL DEFAULT 0,
  description TEXT,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

CREATE TABLE IF NOT EXISTS chambres (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  type_chambre_id INTEGER REFERENCES types_chambres(id),
  numero          TEXT    NOT NULL,
  etage           INTEGER NOT NULL DEFAULT 0,
  statut          TEXT    NOT NULL DEFAULT 'libre'
                    CHECK(statut IN ('libre','occupee','hors_service','menage')),
  description     TEXT,
  actif           INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, numero)
);

CREATE TABLE IF NOT EXISTS reservations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  chambre_id      INTEGER REFERENCES chambres(id),
  date_arrivee    TEXT    NOT NULL,
  date_depart     TEXT    NOT NULL,
  nb_nuits        INTEGER NOT NULL DEFAULT 1,
  nb_adultes      INTEGER NOT NULL DEFAULT 1,
  nb_enfants      INTEGER NOT NULL DEFAULT 0,
  client_nom      TEXT    NOT NULL DEFAULT '',
  client_prenom   TEXT,
  client_email    TEXT,
  client_telephone TEXT,
  montant_total   REAL    NOT NULL DEFAULT 0,
  montant_paye    REAL    NOT NULL DEFAULT 0,
  statut          TEXT    NOT NULL DEFAULT 'confirmee'
                    CHECK(statut IN ('provisoire','confirmee','arrivee','depart','annulee','no_show')),
  source          TEXT    NOT NULL DEFAULT 'direct'
                    CHECK(source IN ('direct','booking','expedia','airbnb','agence','autre')),
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_reservations_hotel_dates
  ON reservations(hotel_id, date_arrivee, date_depart);
CREATE INDEX IF NOT EXISTS idx_reservations_statut
  ON reservations(statut);
CREATE INDEX IF NOT EXISTS idx_chambres_hotel
  ON chambres(hotel_id, actif);
