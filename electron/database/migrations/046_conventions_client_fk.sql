-- Corrige la FK conventions.client_id → clients_facturation (table clients inexistante)

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS convention_tarifs;
DROP TABLE IF EXISTS conventions;

CREATE TABLE conventions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id),
  client_id    INTEGER NOT NULL REFERENCES clients_facturation(id),
  nom          TEXT    NOT NULL,
  description  TEXT,
  date_debut   TEXT    NOT NULL,
  date_fin     TEXT    NOT NULL,
  priorite     INTEGER NOT NULL DEFAULT 10,
  est_active   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE convention_tarifs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  convention_id    INTEGER NOT NULL REFERENCES conventions(id) ON DELETE CASCADE,
  type_chambre_id  INTEGER NOT NULL REFERENCES types_chambres(id),
  formule_id       INTEGER REFERENCES formules_tarif(id),
  type_reduction   TEXT    NOT NULL CHECK(type_reduction IN ('FIXE_PRIX','POURCENTAGE')),
  valeur           REAL    NOT NULL DEFAULT 0,
  UNIQUE(convention_id, type_chambre_id, formule_id)
);

PRAGMA foreign_keys=ON;
