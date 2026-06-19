-- Migration 029 : Pré-paie, primes et passerelle DLG PC PAIE

ALTER TABLE rh_employes ADD COLUMN dlg_matricule TEXT;

CREATE TABLE IF NOT EXISTS rh_bulletins (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id        INTEGER NOT NULL REFERENCES rh_employes(id),
  periode           TEXT    NOT NULL,
  brut              REAL    NOT NULL DEFAULT 0,
  net               REAL    NOT NULL DEFAULT 0,
  charges           REAL    NOT NULL DEFAULT 0,
  heures_travaillees REAL   NOT NULL DEFAULT 0,
  jours_absence     REAL    NOT NULL DEFAULT 0,
  primes_total      REAL    NOT NULL DEFAULT 0,
  statut            TEXT    NOT NULL DEFAULT 'brouillon'
                      CHECK(statut IN ('brouillon','exporte','importe','valide')),
  source            TEXT    NOT NULL DEFAULT 'local'
                      CHECK(source IN ('local','dlg')),
  dlg_reference     TEXT,
  tresorerie_id     INTEGER,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, periode)
);

CREATE INDEX IF NOT EXISTS idx_rh_bulletins_periode ON rh_bulletins(periode, statut);

CREATE TABLE IF NOT EXISTS rh_primes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id  INTEGER NOT NULL REFERENCES rh_employes(id),
  periode     TEXT    NOT NULL,
  code        TEXT    NOT NULL,
  libelle     TEXT    NOT NULL,
  montant     REAL    NOT NULL DEFAULT 0,
  source      TEXT    NOT NULL DEFAULT 'manuel'
                CHECK(source IN ('manuel','recettes','dlg')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_primes_periode ON rh_primes(employe_id, periode);

CREATE TABLE IF NOT EXISTS rh_dlg_journal (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sens          TEXT    NOT NULL CHECK(sens IN ('export','import')),
  periode       TEXT,
  fichier       TEXT    NOT NULL,
  nb_lignes     INTEGER NOT NULL DEFAULT 0,
  statut        TEXT    NOT NULL DEFAULT 'ok' CHECK(statut IN ('ok','erreur','partiel')),
  message       TEXT,
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
