-- ============================================================
-- 059 — Phase 3 Lot 1 : Conformité Loi 18-07 / ANPDP
-- Base légale : Loi n° 18-07 du 10 juin 2018 relative à la
-- protection des personnes physiques dans le traitement des
-- données à caractère personnel (Algérie).
-- ============================================================

-- Registre des traitements (obligation responsable de traitement — art. 30)
CREATE TABLE IF NOT EXISTS rgpd_traitements (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  code                    TEXT    NOT NULL UNIQUE,
  libelle                 TEXT    NOT NULL,
  finalite                TEXT    NOT NULL,
  base_legale             TEXT    NOT NULL DEFAULT 'obligation_legale'
                            CHECK(base_legale IN ('consentement','contrat','obligation_legale','interet_legitime','mission_publique')),
  categories_donnees      TEXT,
  categories_personnes    TEXT,
  destinataires           TEXT,
  duree_conservation      TEXT,
  mesures_securite        TEXT,
  responsable_traitement  TEXT,
  sous_traitants          TEXT,
  transfert_hors_algerie  INTEGER NOT NULL DEFAULT 0 CHECK(transfert_hors_algerie IN (0,1)),
  actif                   INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rgpd_consentements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  traitement_id       INTEGER REFERENCES rgpd_traitements(id),
  sujet_type          TEXT    NOT NULL CHECK(sujet_type IN ('client','employe','heberge','autre')),
  sujet_id            INTEGER,
  sujet_label         TEXT    NOT NULL,
  finalite            TEXT    NOT NULL,
  consentement_donne  INTEGER NOT NULL DEFAULT 1 CHECK(consentement_donne IN (0,1)),
  preuve_path         TEXT,
  date_consentement   TEXT    NOT NULL,
  date_retrait        TEXT,
  statut              TEXT    NOT NULL DEFAULT 'actif'
                        CHECK(statut IN ('actif','retire','expire')),
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rgpd_consentements_sujet ON rgpd_consentements(sujet_type, sujet_id);

-- Exercice des droits (accès, rectification, suppression, opposition, portabilité — art. 7 à 12)
CREATE TABLE IF NOT EXISTS rgpd_demandes_droits (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type_demande        TEXT    NOT NULL
                        CHECK(type_demande IN ('acces','rectification','suppression','opposition','portabilite')),
  sujet_type          TEXT    NOT NULL CHECK(sujet_type IN ('client','employe','heberge','autre')),
  sujet_id            INTEGER,
  sujet_label         TEXT    NOT NULL,
  canal               TEXT,
  description         TEXT,
  statut              TEXT    NOT NULL DEFAULT 'recue'
                        CHECK(statut IN ('recue','en_cours','traitee','refusee')),
  date_reception      TEXT    NOT NULL,
  date_echeance       TEXT,
  date_traitement     TEXT,
  reponse             TEXT,
  traite_par          INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rgpd_demandes_statut ON rgpd_demandes_droits(statut, date_reception);

-- Violations / incidents de données (notification ANPDP — art. 41)
CREATE TABLE IF NOT EXISTS rgpd_incidents (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  date_incident           TEXT    NOT NULL,
  date_detection          TEXT    NOT NULL,
  gravite                 TEXT    NOT NULL CHECK(gravite IN ('faible','moderee','grave','critique')),
  nature                  TEXT    NOT NULL,
  donnees_concernees      TEXT,
  personnes_concernees    INTEGER NOT NULL DEFAULT 0,
  mesures_correctives     TEXT,
  notification_anpdp      INTEGER NOT NULL DEFAULT 0 CHECK(notification_anpdp IN (0,1)),
  date_notification_anpdp TEXT,
  statut                  TEXT    NOT NULL DEFAULT 'ouvert'
                            CHECK(statut IN ('ouvert','en_cours','clos')),
  created_by              INTEGER REFERENCES users(id),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Politiques de conservation (liées GED Phase 2 — art. 8 minimisation / durée)
CREATE TABLE IF NOT EXISTS rgpd_politique_conservation (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  code                    TEXT    NOT NULL UNIQUE,
  type_donnee             TEXT    NOT NULL,
  libelle                 TEXT    NOT NULL,
  duree_mois              INTEGER NOT NULL CHECK(duree_mois > 0),
  base_legale             TEXT,
  ged_retention_policy_id INTEGER REFERENCES ged_retention_policies(id),
  justification           TEXT,
  actif                   INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Seed traitements hôteliers types
INSERT OR IGNORE INTO rgpd_traitements (code, libelle, finalite, base_legale, categories_donnees, categories_personnes, duree_conservation, mesures_securite, responsable_traitement) VALUES
  ('RH_PAIE', 'Gestion RH et paie', 'Exécution contrat de travail et obligations CNAS/IRG', 'obligation_legale', '["identite","contact","bancaire","sante_limited"]', '["employes"]', '10 ans après fin contrat', 'Chiffrement local, RBAC, audit log', 'Direction RH'),
  ('CLIENT_FACT', 'Relation client et facturation', 'Gestion contrats, facturation, recouvrement', 'contrat', '["identite","contact","fiscal"]', '["clients"]', '10 ans obligations comptables', 'RBAC, archivage GED légal', 'Direction commerciale'),
  ('HEBERG_FICHE_POLICE', 'Fiche police hébergement', 'Obligation registre hôtelier', 'obligation_legale', '["identite","piece_identite","nationalite"]', '["heberges"]', '5 ans registre hôtelier', 'Accès restreint, audit', 'Réception / hébergement'),
  ('VIDEO_SURV', 'Vidéosurveillance sécurité', 'Sécurité des personnes et des biens', 'interet_legitime', '["image"]', '["visiteurs","clients","personnel"]', '30 jours max sauf incident', 'Panneaux information, accès DPO', 'Direction sécurité');

INSERT OR IGNORE INTO rgpd_politique_conservation (code, type_donnee, libelle, duree_mois, base_legale, ged_retention_policy_id, justification)
SELECT 'CONS_RH', 'rh', 'Données RH et paie', 120, 'Loi 18-07 + Code travail', p.id, 'Conservation légale bulletins et registres'
FROM ged_retention_policies p WHERE p.code='LEGAL_RH';

INSERT OR IGNORE INTO rgpd_politique_conservation (code, type_donnee, libelle, duree_mois, base_legale, ged_retention_policy_id, justification)
SELECT 'CONS_COMPTA', 'comptabilite', 'Pièces comptables et fiscales', 120, 'Code commerce + fiscalité', p.id, '10 ans pièces justificatives'
FROM ged_retention_policies p WHERE p.code='LEGAL_COMPTA';

INSERT OR IGNORE INTO rgpd_politique_conservation (code, type_donnee, libelle, duree_mois, base_legale, ged_retention_policy_id, justification)
SELECT 'CONS_HOTEL', 'hebergement', 'Registres hôteliers', 60, 'Réglementation hôtelière', p.id, 'Fiches police et registres'
FROM ged_retention_policies p WHERE p.code='LEGAL_HOTEL';

INSERT OR IGNORE INTO rgpd_politique_conservation (code, type_donnee, libelle, duree_mois, base_legale, ged_retention_policy_id, justification)
SELECT 'CONS_CONTRATS', 'contrats', 'Contrats et conventions', 120, 'Prescription civile', p.id, 'Contrats clients et fournisseurs'
FROM ged_retention_policies p WHERE p.code='LEGAL_CONTRATS';
