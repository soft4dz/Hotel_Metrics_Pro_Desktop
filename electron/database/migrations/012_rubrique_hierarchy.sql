-- Hierarchie des rubriques : rubrique parente → sous-rubriques feuilles
-- parent_id NULL = rubrique racine ; NOT NULL = sous-rubrique
ALTER TABLE rubriques ADD COLUMN parent_id INTEGER REFERENCES rubriques(id);
CREATE INDEX IF NOT EXISTS idx_rubriques_parent ON rubriques(parent_id);
