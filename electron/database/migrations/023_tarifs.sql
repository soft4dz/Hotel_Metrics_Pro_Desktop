-- ============================================================
-- Migration 023 — Module Tarifs
-- composants, formules, plans, grille, promotions, conventions
-- ============================================================

-- ── Composants de tarif (PDJ, dîner, minibar, parking…) ───
CREATE TABLE IF NOT EXISTS composants_tarif (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id),
  code         TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  mode_calcul  TEXT    NOT NULL DEFAULT 'PAR_NUIT'
                CHECK(mode_calcul IN ('PAR_NUIT','PAR_PERSONNE_NUIT','PAR_SEJOUR','FIXE')),
  prix_defaut  REAL    NOT NULL DEFAULT 0,
  description  TEXT,
  actif        INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

-- ── Formules tarifaires (RO, BB, HB, FB, AI + custom) ─────
CREATE TABLE IF NOT EXISTS formules_tarif (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id),
  code         TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  description  TEXT,
  actif        INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

-- ── Composants inclus dans une formule ────────────────────
CREATE TABLE IF NOT EXISTS formule_composants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  formule_id      INTEGER NOT NULL REFERENCES formules_tarif(id) ON DELETE CASCADE,
  composant_id    INTEGER NOT NULL REFERENCES composants_tarif(id) ON DELETE CASCADE,
  prix_override   REAL,          -- surcharge du prix du composant pour cette formule
  UNIQUE(formule_id, composant_id)
);

-- ── Plans tarifaires (Standard, Non remboursable…) ────────
CREATE TABLE IF NOT EXISTS plans_tarifaires (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id              INTEGER NOT NULL REFERENCES hotels(id),
  code                  TEXT    NOT NULL,
  label                 TEXT    NOT NULL,
  type_plan             TEXT    NOT NULL DEFAULT 'BASIQUE'
                          CHECK(type_plan IN ('BASIQUE','PROMOTIONNEL','PACKAGE','GROUPE')),
  conditions_annulation TEXT,
  conditions_paiement   TEXT,
  priorite              INTEGER NOT NULL DEFAULT 10,
  actif                 INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, code)
);

-- ── Tarifs journaliers ─────────────────────────────────────
-- Prix par jour × type_chambre × plan × formule
CREATE TABLE IF NOT EXISTS tarifs_journaliers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id),
  type_chambre_id     INTEGER NOT NULL REFERENCES types_chambres(id),
  plan_id             INTEGER NOT NULL REFERENCES plans_tarifaires(id),
  formule_id          INTEGER REFERENCES formules_tarif(id),
  date_application    TEXT    NOT NULL,   -- YYYY-MM-DD
  prix_base           REAL    NOT NULL DEFAULT 0,
  prix_personne_supp  REAL    NOT NULL DEFAULT 0,
  min_sejour          INTEGER NOT NULL DEFAULT 1,
  max_sejour          INTEGER,
  fermeture_vente     INTEGER NOT NULL DEFAULT 0,
  restriction_arrivee TEXT    NOT NULL DEFAULT 'AUCUNE'
                        CHECK(restriction_arrivee IN ('AUCUNE','CDA')),
  restriction_depart  TEXT    NOT NULL DEFAULT 'AUCUNE'
                        CHECK(restriction_depart IN ('AUCUNE','CDD')),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, type_chambre_id, plan_id, formule_id, date_application)
);
CREATE INDEX IF NOT EXISTS idx_tarifs_date ON tarifs_journaliers(hotel_id, date_application);

-- ── Promotions publiques ───────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions_tarif (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id              INTEGER NOT NULL REFERENCES hotels(id),
  nom                   TEXT    NOT NULL,
  description           TEXT,
  date_debut            TEXT    NOT NULL,
  date_fin              TEXT    NOT NULL,
  type_reduction        TEXT    NOT NULL DEFAULT 'POURCENTAGE'
                          CHECK(type_reduction IN ('POURCENTAGE','MONTANT_FIXE')),
  valeur_reduction      REAL    NOT NULL DEFAULT 0,
  min_sejour            INTEGER NOT NULL DEFAULT 1,
  jours_semaine         TEXT,   -- ex: '1,2,3,4,5' (lundi=1…dimanche=7), NULL=tous
  type_chambres_ids     TEXT,   -- JSON array ou NULL (tous)
  formules_ids          TEXT,   -- JSON array ou NULL (toutes)
  actif                 INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Conventions client ────────────────────────────────────
CREATE TABLE IF NOT EXISTS conventions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id     INTEGER NOT NULL REFERENCES hotels(id),
  client_id    INTEGER NOT NULL REFERENCES clients(id),
  nom          TEXT    NOT NULL,
  description  TEXT,
  date_debut   TEXT    NOT NULL,
  date_fin     TEXT    NOT NULL,
  priorite     INTEGER NOT NULL DEFAULT 10,
  est_active   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Tarifs négociés par convention ────────────────────────
CREATE TABLE IF NOT EXISTS convention_tarifs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  convention_id    INTEGER NOT NULL REFERENCES conventions(id) ON DELETE CASCADE,
  type_chambre_id  INTEGER NOT NULL REFERENCES types_chambres(id),
  formule_id       INTEGER REFERENCES formules_tarif(id),  -- NULL = s'applique à toutes formules
  type_reduction   TEXT    NOT NULL CHECK(type_reduction IN ('FIXE_PRIX','POURCENTAGE')),
  valeur           REAL    NOT NULL DEFAULT 0,
  UNIQUE(convention_id, type_chambre_id, formule_id)
);
