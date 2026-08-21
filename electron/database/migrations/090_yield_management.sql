-- ============================================================
-- Migration 090 — Yield management (tarification dynamique)
-- Règles d'ajustement de prix basées sur le taux d'occupation
-- ============================================================

-- ── Règles de yield ────────────────────────────────────────
-- Une règle s'applique à un hôtel (et optionnellement un type de
-- chambre précis) quand le taux d'occupation du jour tombe dans
-- [occupation_min, occupation_max] et, si renseigné, que la date
-- visée est à moins de jours_avant_max jours de la date du jour.
CREATE TABLE IF NOT EXISTS yield_rules (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id           INTEGER NOT NULL REFERENCES hotels(id),
  type_chambre_id    INTEGER REFERENCES types_chambres(id),  -- NULL = tous les types
  nom                TEXT    NOT NULL,
  occupation_min     REAL,   -- % — NULL = pas de borne basse
  occupation_max     REAL,   -- % — NULL = pas de borne haute
  jours_avant_max    INTEGER, -- NULL = pas de contrainte de délai
  ajustement_type    TEXT    NOT NULL DEFAULT 'POURCENTAGE'
                       CHECK(ajustement_type IN ('POURCENTAGE','MONTANT_FIXE')),
  ajustement_valeur  REAL    NOT NULL DEFAULT 0,  -- signé : positif = hausse, négatif = baisse
  priorite           INTEGER NOT NULL DEFAULT 10, -- plus haut = prioritaire en cas de règles concurrentes
  actif              INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_yield_rules_hotel ON yield_rules(hotel_id, actif);
