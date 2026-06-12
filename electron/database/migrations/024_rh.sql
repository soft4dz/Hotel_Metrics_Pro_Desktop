-- Migration 024 : Module RH & Productivité

PRAGMA foreign_keys = ON;

-- ── Référentiel ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rh_departements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL UNIQUE,
  description TEXT,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rh_postes (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                   TEXT    NOT NULL,
  departement_id        INTEGER NOT NULL REFERENCES rh_departements(id),
  salaire_min           REAL,
  salaire_max           REAL,
  role_system_associe   TEXT,
  description           TEXT,
  actif                 INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(departement_id, nom)
);

CREATE INDEX IF NOT EXISTS idx_rh_postes_departement ON rh_postes(departement_id);

-- ── Employés & recrutement ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rh_employes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nom             TEXT    NOT NULL,
  prenom          TEXT    NOT NULL,
  email_personnel TEXT,
  telephone       TEXT,
  date_embauche   TEXT    NOT NULL,
  statut_rh       TEXT    NOT NULL DEFAULT 'actif'
                    CHECK(statut_rh IN ('actif','inactif','sorti')),
  poste_actuel_id INTEGER REFERENCES rh_postes(id),
  hotel_id        INTEGER REFERENCES hotels(id),
  user_id         INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_rh_employes_statut ON rh_employes(statut_rh);
CREATE INDEX IF NOT EXISTS idx_rh_employes_poste ON rh_employes(poste_actuel_id);

CREATE TABLE IF NOT EXISTS rh_recrutements (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  poste_id              INTEGER NOT NULL REFERENCES rh_postes(id),
  candidat_nom          TEXT    NOT NULL,
  candidat_prenom       TEXT,
  candidat_email        TEXT,
  candidat_telephone    TEXT,
  notes                 TEXT,
  statut                TEXT    NOT NULL DEFAULT 'en_cours'
                          CHECK(statut IN ('en_cours','valide','refuse')),
  employe_cree_id       INTEGER REFERENCES rh_employes(id),
  utilisateur_cree_id   INTEGER REFERENCES users(id),
  created_by            INTEGER REFERENCES users(id),
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_recrutements_statut ON rh_recrutements(statut);

-- ── Contrats, pointages, absences ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rh_contrats (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id   INTEGER NOT NULL REFERENCES rh_employes(id),
  poste_id     INTEGER NOT NULL REFERENCES rh_postes(id),
  type         TEXT    NOT NULL CHECK(type IN ('CDI','CDD','Interim')),
  date_debut   TEXT    NOT NULL,
  date_fin     TEXT,
  salaire_brut REAL    NOT NULL DEFAULT 0,
  heures_hebdo REAL    NOT NULL DEFAULT 35,
  actif        INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_contrats_employe ON rh_contrats(employe_id, actif);

CREATE TABLE IF NOT EXISTS rh_pointages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id        INTEGER NOT NULL REFERENCES rh_employes(id),
  date              TEXT    NOT NULL,
  heure_entree      TEXT,
  heure_sortie      TEXT,
  heures_travaillees REAL,
  statut            TEXT    NOT NULL DEFAULT 'brouillon'
                      CHECK(statut IN ('brouillon','soumis','valide','refuse')),
  valide_par        INTEGER REFERENCES users(id),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employe_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rh_pointages_date ON rh_pointages(date, statut);

CREATE TABLE IF NOT EXISTS rh_absences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id  INTEGER NOT NULL REFERENCES rh_employes(id),
  type        TEXT    NOT NULL CHECK(type IN ('CP','Maladie','RTT','Sans_solde','Autre')),
  date_debut  TEXT    NOT NULL,
  date_fin    TEXT    NOT NULL,
  motif       TEXT,
  statut      TEXT    NOT NULL DEFAULT 'demandee'
                CHECK(statut IN ('demandee','approuvee','refusee')),
  decide_par  INTEGER REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_absences_employe ON rh_absences(employe_id, statut);

-- ── Extension utilisateurs (comptes en attente) ───────────────────────────────

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'actif';
ALTER TABLE users ADD COLUMN employe_id INTEGER REFERENCES rh_employes(id);

-- ── Permissions & rôles RH ──────────────────────────────────────────────────

INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES
  (lower(hex(randomblob(16))), 'rh.manage', 'Gestion RH complète', 'rh'),
  (lower(hex(randomblob(16))), 'rh.team', 'Validation équipe (pointages/absences)', 'rh'),
  (lower(hex(randomblob(16))), 'rh.self', 'Mon espace employé', 'rh');

INSERT OR IGNORE INTO roles (uuid, code, label, description)
VALUES
  (lower(hex(randomblob(16))), 'RH_MANAGER', 'Responsable RH', 'Gestion complète du module RH'),
  (lower(hex(randomblob(16))), 'CHEF_DEPARTEMENT', 'Chef de département', 'Validation pointages et absences de son équipe'),
  (lower(hex(randomblob(16))), 'RECEPTIONNISTE', 'Réceptionniste', 'Accès mon espace employé');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'RH_MANAGER' AND p.code IN ('rh.manage', 'rh.team', 'rh.self');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'CHEF_DEPARTEMENT' AND p.code IN ('rh.team', 'rh.self');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'RECEPTIONNISTE' AND p.code = 'rh.self';

-- ── Données référentielles initiales ─────────────────────────────────────────

INSERT OR IGNORE INTO rh_departements (nom, description) VALUES
  ('Direction', 'Direction et management'),
  ('Réception', 'Accueil et front office'),
  ('Hébergement', 'Chambres et housekeeping'),
  ('Restauration', 'F&B et cuisine'),
  ('RH', 'Ressources humaines');

INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT 'Directeur d''unité', d.id, 120000, 180000, 'DIRECTEUR_UNITE', 'Direction opérationnelle hôtel'
FROM rh_departements d WHERE d.nom = 'Direction';

INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT 'Réceptionniste', d.id, 35000, 55000, 'RECEPTIONNISTE', 'Accueil clients'
FROM rh_departements d WHERE d.nom = 'Réception';

INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT 'Chef de département', d.id, 60000, 90000, 'CHEF_DEPARTEMENT', 'Encadrement d''équipe'
FROM rh_departements d WHERE d.nom = 'Hébergement';

INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT 'Responsable RH', d.id, 70000, 110000, 'RH_MANAGER', 'Gestion RH et recrutement'
FROM rh_departements d WHERE d.nom = 'RH';
