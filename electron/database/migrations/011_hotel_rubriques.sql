-- Rubriques rattachées à une unité hôtelière
-- Règle : si aucune ligne n'existe pour un hôtel → toutes les rubriques actives s'appliquent
CREATE TABLE IF NOT EXISTS hotel_rubriques (
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id),
  rubrique_id INTEGER NOT NULL REFERENCES rubriques(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, rubrique_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_rubriques_hotel ON hotel_rubriques(hotel_id);
