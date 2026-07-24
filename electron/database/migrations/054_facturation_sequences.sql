-- 054 — Séquences de facturation atomiques par unité et exercice

CREATE TABLE IF NOT EXISTS facture_sequences (
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id),
  exercice    INTEGER NOT NULL,
  last_value  INTEGER NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hotel_id, exercice)
);

-- Initialise les séquences à partir des factures existantes afin de ne pas
-- réutiliser un rang déjà attribué lors de la migration.
INSERT INTO facture_sequences (hotel_id, exercice, last_value)
SELECT
  hotel_id,
  CAST(strftime('%Y', date_emission) AS INTEGER) AS exercice,
  COUNT(*) AS last_value
FROM factures
WHERE date_emission IS NOT NULL
GROUP BY hotel_id, CAST(strftime('%Y', date_emission) AS INTEGER)
ON CONFLICT (hotel_id, exercice) DO UPDATE SET
  last_value = MAX(facture_sequences.last_value, excluded.last_value),
  updated_at = datetime('now');
