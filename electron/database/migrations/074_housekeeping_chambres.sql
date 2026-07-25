-- Module Housekeeping — tâches ménage chambres + checklists

CREATE TABLE IF NOT EXISTS housekeeping_taches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  chambre_id      INTEGER NOT NULL REFERENCES chambres(id) ON DELETE CASCADE,
  reservation_id  INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  type_tache      TEXT NOT NULL DEFAULT 'checkout'
                    CHECK(type_tache IN ('checkout', 'recouche', 'grand_menage', 'controle')),
  statut          TEXT NOT NULL DEFAULT 'a_faire'
                    CHECK(statut IN ('a_faire', 'en_cours', 'controle', 'terminee', 'annulee')),
  assignee_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_prevue     TEXT NOT NULL DEFAULT (date('now')),
  date_debut      TEXT,
  date_fin        TEXT,
  notes           TEXT,
  cree_par        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS housekeeping_checklist_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tache_id     INTEGER NOT NULL REFERENCES housekeeping_taches(id) ON DELETE CASCADE,
  libelle      TEXT NOT NULL,
  ordre        INTEGER NOT NULL DEFAULT 0,
  statut       TEXT NOT NULL DEFAULT 'pending'
                 CHECK(statut IN ('pending', 'ok', 'ko')),
  commentaire  TEXT
);

CREATE INDEX IF NOT EXISTS idx_hk_taches_hotel_date ON housekeeping_taches(hotel_id, date_prevue DESC);
CREATE INDEX IF NOT EXISTS idx_hk_taches_chambre ON housekeeping_taches(chambre_id, statut);
CREATE INDEX IF NOT EXISTS idx_hk_checklist_tache ON housekeeping_checklist_items(tache_id, ordre);

INSERT OR IGNORE INTO modules_config (module_id) VALUES ('housekeeping-chambres');
