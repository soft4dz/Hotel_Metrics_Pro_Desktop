-- Migration 030 : Phase 4 RH — compétences, formations, entretiens, documents

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rh_competences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  libelle     TEXT    NOT NULL,
  categorie   TEXT,
  description TEXT,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rh_poste_competences (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  poste_id       INTEGER NOT NULL REFERENCES rh_postes(id) ON DELETE CASCADE,
  competence_id  INTEGER NOT NULL REFERENCES rh_competences(id) ON DELETE CASCADE,
  niveau_requis  INTEGER NOT NULL DEFAULT 1 CHECK(niveau_requis BETWEEN 1 AND 5),
  UNIQUE(poste_id, competence_id)
);

CREATE TABLE IF NOT EXISTS rh_formations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT    NOT NULL UNIQUE,
  libelle        TEXT    NOT NULL,
  organisme      TEXT,
  duree_heures   REAL,
  validite_mois  INTEGER,
  obligatoire    INTEGER NOT NULL DEFAULT 0,
  actif          INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rh_employe_formations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id      INTEGER NOT NULL REFERENCES rh_employes(id),
  formation_id    INTEGER NOT NULL REFERENCES rh_formations(id),
  date_obtention  TEXT,
  date_echeance   TEXT,
  statut          TEXT    NOT NULL DEFAULT 'planifie'
                  CHECK(statut IN ('planifie','en_cours','obtenu','expire','annule')),
  certificat_ref  TEXT,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_emp_formations_employe ON rh_employe_formations(employe_id);
CREATE INDEX IF NOT EXISTS idx_rh_emp_formations_echeance ON rh_employe_formations(date_echeance);

CREATE TABLE IF NOT EXISTS rh_entretiens (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id            INTEGER NOT NULL REFERENCES rh_employes(id),
  date_entretien        TEXT    NOT NULL,
  type                  TEXT    NOT NULL DEFAULT 'annuel'
                        CHECK(type IN ('annuel','probatoire','mi_parcours','sortie')),
  evaluateur_employe_id INTEGER REFERENCES rh_employes(id),
  note_globale          REAL    CHECK(note_globale IS NULL OR (note_globale >= 0 AND note_globale <= 5)),
  objectifs             TEXT,
  commentaires          TEXT,
  statut                TEXT    NOT NULL DEFAULT 'planifie'
                        CHECK(statut IN ('planifie','realise','annule')),
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_entretiens_employe ON rh_entretiens(employe_id);
CREATE INDEX IF NOT EXISTS idx_rh_entretiens_date ON rh_entretiens(date_entretien);

CREATE TABLE IF NOT EXISTS rh_documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id   INTEGER NOT NULL REFERENCES rh_employes(id),
  type         TEXT    NOT NULL DEFAULT 'autre'
               CHECK(type IN ('cv','contrat','certificat','identite','autre')),
  nom          TEXT    NOT NULL,
  fichier_path TEXT    NOT NULL,
  mime_type    TEXT,
  taille       INTEGER,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rh_documents_employe ON rh_documents(employe_id);

-- Référentiel formations hôtellerie
INSERT OR IGNORE INTO rh_formations (code, libelle, organisme, duree_heures, validite_mois, obligatoire) VALUES
  ('HACCP', 'Hygiène alimentaire HACCP', 'Organisme agréé', 14, 36, 1),
  ('SST', 'Sauveteur Secouriste du Travail', 'INRS / organisme agréé', 14, 24, 1),
  ('INCENDIE', 'Équipier de 1ère intervention incendie', 'SSIAP', 7, 12, 1),
  ('ANGLAIS', 'Anglais hôtellerie — niveau opérationnel', 'Centre de langues', 40, NULL, 0),
  ('MANAGEMENT', 'Management d''équipe hôtelière', 'CFA / OPCO', 21, NULL, 0),
  ('PMS', 'Maîtrise PMS (Property Management System)', 'Éditeur logiciel', 8, 12, 0);

INSERT OR IGNORE INTO rh_competences (code, libelle, categorie) VALUES
  ('ACCUEIL', 'Accueil et relation client', 'Réception'),
  ('MENAGE', 'Propreté et préparation chambres', 'Hébergement'),
  ('CUISINE', 'Techniques de cuisine', 'Restauration'),
  ('LEADERSHIP', 'Encadrement d''équipe', 'Management'),
  ('PMS', 'Système de gestion hôtelière', 'Technique'),
  ('VENTE', 'Techniques de vente additionnelle', 'Commercial'),
  ('SECURITE', 'Sécurité et prévention', 'Transversal');
