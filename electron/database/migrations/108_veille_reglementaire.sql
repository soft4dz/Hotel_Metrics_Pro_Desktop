-- ============================================================
-- Migration 108 — Veille juridique et réglementaire
-- Répertoire interne des textes (lois, décrets, arrêtés,
-- circulaires, normes) alimenté manuellement, avec suivi de
-- mise en conformité et rappels d'échéance.
-- ============================================================

CREATE TABLE IF NOT EXISTS veille_reglementaire (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid                  TEXT    NOT NULL UNIQUE,
  hotel_id              INTEGER REFERENCES hotels(id),  -- NULL = s'applique à toutes les unités
  reference             TEXT,
  titre                 TEXT    NOT NULL,
  type_texte            TEXT    NOT NULL DEFAULT 'autre'
                          CHECK(type_texte IN ('loi','decret','arrete','circulaire','norme','autre')),
  categorie             TEXT    NOT NULL DEFAULT 'autre'
                          CHECK(categorie IN ('marches_publics','fiscal','travail','tourisme','securite','environnement','sante','urbanisme','autre')),
  date_publication      TEXT,
  date_entree_vigueur   TEXT,
  date_revue            TEXT,   -- échéance de revue / rappel
  resume                TEXT,
  statut_conformite     TEXT    NOT NULL DEFAULT 'a_evaluer'
                          CHECK(statut_conformite IN ('a_evaluer','en_cours','conforme','non_applicable')),
  responsable           TEXT,
  nom_fichier           TEXT,
  chemin                TEXT,
  taille_octets         INTEGER,
  cree_par              INTEGER REFERENCES users(id),
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_veille_hotel ON veille_reglementaire(hotel_id, statut_conformite);
CREATE INDEX IF NOT EXISTS idx_veille_revue ON veille_reglementaire(date_revue);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'veille.gerer','Créer et modifier les textes de veille réglementaire','veille-reglementaire');

INSERT OR IGNORE INTO modules_config(module_id) VALUES('veille-reglementaire');
