-- Migration 055 : Fondation ERP — 10 axes d'amélioration
-- Objectif : poser les tables transversales nécessaires pour structurer Raqmi System
-- en ERP opérationnel EGT Sidi Fredj : cockpit DEC, clôture journalière,
-- workflows, créances globales, fiches de poste, checklists, rapprochement,
-- reporting directionnel, sauvegarde/sync et suivi de mise en œuvre.

PRAGMA foreign_keys = ON;

-- ── 0. Catalogue des 10 axes ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_improvement_axes (
  id              INTEGER PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  titre           TEXT NOT NULL,
  domaine         TEXT NOT NULL,
  priorite        INTEGER NOT NULL DEFAULT 1 CHECK(priorite BETWEEN 1 AND 5),
  statut          TEXT NOT NULL DEFAULT 'a_lancer'
                    CHECK(statut IN ('a_lancer','en_cours','socle_pret','operationnel','reporte')),
  description     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO erp_improvement_axes (id, code, titre, domaine, priorite, statut, description) VALUES
  (1, 'cockpit_dec', 'Cockpit DEC', 'Pilotage', 5, 'socle_pret', 'Vue consolidée quotidienne pour la Direction de l''Exploitation et du Contrôle'),
  (2, 'cloture_journaliere', 'Clôture journalière par unité', 'Finance / Exploitation', 5, 'socle_pret', 'Circuit quotidien CA, encaissements, écarts, validation unité et validation DEC'),
  (3, 'creances_globales', 'Créances globales hors PortMaster', 'Finance', 5, 'socle_pret', 'Centralisation des créances hôtels, entreprises, agences, sponsoring et port'),
  (4, 'workflow_transversal', 'Moteur transversal de workflow', 'Contrôle', 5, 'socle_pret', 'Circuit commun de soumission, validation, refus, clôture et historique'),
  (5, 'organisation_egt', 'Organisation EGT et effectifs cibles', 'RH', 4, 'socle_pret', 'Directions, départements, postes, responsables, effectifs cibles et écarts'),
  (6, 'fiches_poste', 'Fiches de poste et compétences', 'RH', 4, 'socle_pret', 'Missions, responsabilités, rattachement, compétences et KPI par poste'),
  (7, 'dashboard_pdg', 'Dashboard PDG et rapports standards', 'Pilotage', 5, 'socle_pret', 'KPI consolidés, rapports CA, occupation, trésorerie, créances, RH et qualité'),
  (8, 'rapprochement_financier', 'Rapprochement recettes / encaissements', 'Finance', 5, 'socle_pret', 'Contrôle CA déclaré, caisse, TPE, virements, créances et écarts'),
  (9, 'checklists_controle', 'Checklists DEC, qualité, hygiène et maintenance', 'Contrôle / Qualité', 4, 'socle_pret', 'Contrôles terrain, plans d''action, délais, preuves et clôture'),
  (10, 'securisation_ipc_tests', 'Sécurisation IPC, sauvegarde, sync et tests', 'Système', 5, 'socle_pret', 'Validation des entrées, suivi technique, sauvegardes, conflits sync et tests critiques');

-- ── 1. Statuts standards communs ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_standard_statuses (
  code        TEXT PRIMARY KEY,
  libelle     TEXT NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  final       INTEGER NOT NULL DEFAULT 0 CHECK(final IN (0,1)),
  description TEXT
);

INSERT OR IGNORE INTO erp_standard_statuses (code, libelle, ordre, final, description) VALUES
  ('brouillon', 'Brouillon', 10, 0, 'Élément créé mais non soumis'),
  ('soumis', 'Soumis', 20, 0, 'Élément transmis pour validation'),
  ('en_validation', 'En validation', 30, 0, 'Élément en cours de traitement par un validateur'),
  ('valide', 'Validé', 40, 0, 'Élément approuvé'),
  ('refuse', 'Refusé', 50, 1, 'Élément refusé avec motif'),
  ('annule', 'Annulé', 60, 1, 'Élément annulé'),
  ('cloture', 'Clôturé', 70, 1, 'Élément clôturé définitivement'),
  ('archive', 'Archivé', 80, 1, 'Élément conservé en archive');

-- ── 2. Moteur transversal workflow / validation ─────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  module              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           INTEGER NOT NULL,
  hotel_id            INTEGER REFERENCES hotels(id),
  statut              TEXT NOT NULL DEFAULT 'brouillon',
  priorite            TEXT NOT NULL DEFAULT 'normale'
                        CHECK(priorite IN ('basse','normale','haute','critique')),
  niveau_validation   INTEGER NOT NULL DEFAULT 0,
  demandeur_user_id   INTEGER REFERENCES users(id),
  validateur_user_id  INTEGER REFERENCES users(id),
  assigned_user_id    INTEGER REFERENCES users(id),
  due_at              TEXT,
  submitted_at        TEXT,
  completed_at        TEXT,
  motif_refus         TEXT,
  commentaire         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(module, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_module_statut ON workflow_instances(module, statut);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_hotel_due ON workflow_instances(hotel_id, due_at);

CREATE TABLE IF NOT EXISTS workflow_history (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id         INTEGER NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  action              TEXT NOT NULL,
  ancien_statut       TEXT,
  nouveau_statut      TEXT,
  actor_user_id       INTEGER REFERENCES users(id),
  motif               TEXT,
  commentaire         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow ON workflow_history(workflow_id, created_at);

-- ── 3. Cockpit DEC : alertes consolidées ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS dec_cockpit_alerts (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source_module       TEXT NOT NULL,
  entity_type         TEXT,
  entity_id           INTEGER,
  hotel_id            INTEGER REFERENCES hotels(id),
  severity            TEXT NOT NULL DEFAULT 'info'
                        CHECK(severity IN ('info','warning','critical')),
  statut              TEXT NOT NULL DEFAULT 'ouverte'
                        CHECK(statut IN ('ouverte','prise_en_charge','cloturee','ignoree')),
  titre               TEXT NOT NULL,
  description         TEXT,
  due_at              TEXT,
  assigned_user_id    INTEGER REFERENCES users(id),
  closed_by           INTEGER REFERENCES users(id),
  closed_at           TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dec_alerts_status_severity ON dec_cockpit_alerts(statut, severity);
CREATE INDEX IF NOT EXISTS idx_dec_alerts_hotel_due ON dec_cockpit_alerts(hotel_id, due_at);

CREATE TABLE IF NOT EXISTS dec_cockpit_widgets (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  domaine             TEXT NOT NULL,
  ordre               INTEGER NOT NULL DEFAULT 0,
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  config_json         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO dec_cockpit_widgets (code, libelle, domaine, ordre, actif) VALUES
  ('ca_jour', 'CA du jour par unité', 'finance', 10, 1),
  ('retard_saisie_0930', 'Retards de saisie avant 09h30', 'controle', 20, 1),
  ('occupation', 'Occupation hébergement', 'exploitation', 30, 1),
  ('encaissements', 'Encaissements et caisse', 'finance', 40, 1),
  ('anomalies', 'Anomalies ouvertes', 'controle', 50, 1),
  ('reclamations', 'Réclamations clients', 'qualite', 60, 1),
  ('maintenance_urgente', 'Maintenance urgente', 'maintenance', 70, 1),
  ('rh_presence', 'Présence et absences RH', 'rh', 80, 1),
  ('creances', 'Créances et relances', 'finance', 90, 1),
  ('decisions', 'Décisions en attente', 'controle', 100, 1);

-- ── 4. Clôture journalière par unité ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_closures (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id                INTEGER NOT NULL REFERENCES hotels(id),
  date_journal            TEXT NOT NULL,
  statut                  TEXT NOT NULL DEFAULT 'brouillon'
                            CHECK(statut IN ('brouillon','soumis','valide_unite','valide_dec','refuse','cloture')),
  ca_declare              REAL NOT NULL DEFAULT 0,
  encaissements_total     REAL NOT NULL DEFAULT 0,
  creances_total          REAL NOT NULL DEFAULT 0,
  ecart_caisse            REAL NOT NULL DEFAULT 0,
  observations            TEXT,
  submitted_by            INTEGER REFERENCES users(id),
  submitted_at            TEXT,
  validated_unite_by      INTEGER REFERENCES users(id),
  validated_unite_at      TEXT,
  validated_dec_by        INTEGER REFERENCES users(id),
  validated_dec_at        TEXT,
  closed_at               TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, date_journal)
);

CREATE INDEX IF NOT EXISTS idx_daily_closures_date_statut ON daily_closures(date_journal, statut);

CREATE TABLE IF NOT EXISTS daily_closure_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  closure_id          INTEGER NOT NULL REFERENCES daily_closures(id) ON DELETE CASCADE,
  rubrique            TEXT NOT NULL,
  montant             REAL NOT NULL DEFAULT 0,
  source_module       TEXT,
  observation         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 5. Rapprochement recettes / encaissements ───────────────────────────────

CREATE TABLE IF NOT EXISTS finance_reconciliations (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id                INTEGER NOT NULL REFERENCES hotels(id),
  date_journal            TEXT NOT NULL,
  ca_declare              REAL NOT NULL DEFAULT 0,
  montant_especes         REAL NOT NULL DEFAULT 0,
  montant_tpe             REAL NOT NULL DEFAULT 0,
  montant_virement        REAL NOT NULL DEFAULT 0,
  montant_cheque          REAL NOT NULL DEFAULT 0,
  montant_creance         REAL NOT NULL DEFAULT 0,
  total_rapproche         REAL NOT NULL DEFAULT 0,
  ecart                   REAL NOT NULL DEFAULT 0,
  statut                  TEXT NOT NULL DEFAULT 'a_controler'
                            CHECK(statut IN ('a_controler','equilibre','ecart_justifie','ecart_non_justifie','valide')),
  justification           TEXT,
  controle_by             INTEGER REFERENCES users(id),
  controle_at             TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, date_journal)
);

CREATE INDEX IF NOT EXISTS idx_finance_reconciliations_date ON finance_reconciliations(date_journal, statut);

-- ── 6. Créances globales ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS global_creances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source_module       TEXT NOT NULL,
  source_entity_type  TEXT,
  source_entity_id    INTEGER,
  hotel_id            INTEGER REFERENCES hotels(id),
  client_label        TEXT NOT NULL,
  client_id           INTEGER,
  reference_piece     TEXT,
  date_piece          TEXT,
  date_echeance       TEXT,
  montant_total       REAL NOT NULL DEFAULT 0,
  montant_regle       REAL NOT NULL DEFAULT 0,
  montant_restant     REAL NOT NULL DEFAULT 0,
  statut              TEXT NOT NULL DEFAULT 'ouverte'
                        CHECK(statut IN ('ouverte','partielle','reglee','litige','irrecouvrable','annulee')),
  niveau_risque       TEXT NOT NULL DEFAULT 'normal'
                        CHECK(niveau_risque IN ('faible','normal','eleve','critique')),
  last_relance_at     TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_global_creances_statut ON global_creances(statut, niveau_risque);
CREATE INDEX IF NOT EXISTS idx_global_creances_hotel_echeance ON global_creances(hotel_id, date_echeance);

CREATE TABLE IF NOT EXISTS global_creance_relances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  creance_id          INTEGER NOT NULL REFERENCES global_creances(id) ON DELETE CASCADE,
  niveau              INTEGER NOT NULL DEFAULT 1,
  canal               TEXT NOT NULL DEFAULT 'courrier'
                        CHECK(canal IN ('telephone','email','courrier','mise_en_demeure','autre')),
  statut              TEXT NOT NULL DEFAULT 'preparee'
                        CHECK(statut IN ('preparee','envoyee','repondue','cloturee')),
  objet               TEXT,
  contenu             TEXT,
  created_by          INTEGER REFERENCES users(id),
  sent_at             TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 7. Organisation EGT : fiches de poste et effectifs cibles ───────────────

CREATE TABLE IF NOT EXISTS rh_fiches_poste (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  poste_id                      INTEGER NOT NULL REFERENCES rh_postes(id),
  direction_id                  INTEGER REFERENCES rh_directions(id),
  departement_id                INTEGER REFERENCES rh_departements(id),
  mission_principale            TEXT,
  rattachement_hierarchique     TEXT,
  responsabilites               TEXT,
  competences_requises          TEXT,
  indicateurs_performance       TEXT,
  exigences_reglementaires      TEXT,
  version                       INTEGER NOT NULL DEFAULT 1,
  actif                         INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(poste_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rh_fiches_poste_poste ON rh_fiches_poste(poste_id, actif);

CREATE TABLE IF NOT EXISTS rh_effectifs_cibles_egt (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER REFERENCES hotels(id),
  direction_id        INTEGER REFERENCES rh_directions(id),
  departement_id      INTEGER REFERENCES rh_departements(id),
  poste_id            INTEGER NOT NULL REFERENCES rh_postes(id),
  effectif_cible      INTEGER NOT NULL DEFAULT 0 CHECK(effectif_cible >= 0),
  saison              TEXT NOT NULL DEFAULT 'annuelle'
                        CHECK(saison IN ('annuelle','basse_saison','haute_saison','ramadhan','ete','evenement')),
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, poste_id, saison)
);

-- ── 8. Checklists contrôle / qualité / maintenance ──────────────────────────

CREATE TABLE IF NOT EXISTS control_checklist_templates (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  domaine             TEXT NOT NULL CHECK(domaine IN ('dec','qualite','hygiene','maintenance','securite','exploitation')),
  frequence           TEXT NOT NULL DEFAULT 'ponctuelle'
                        CHECK(frequence IN ('quotidienne','hebdomadaire','mensuelle','saisonniere','ponctuelle')),
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS control_checklist_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id         INTEGER NOT NULL REFERENCES control_checklist_templates(id) ON DELETE CASCADE,
  ordre               INTEGER NOT NULL DEFAULT 0,
  libelle             TEXT NOT NULL,
  criticite           TEXT NOT NULL DEFAULT 'normale'
                        CHECK(criticite IN ('basse','normale','haute','critique')),
  preuve_obligatoire  INTEGER NOT NULL DEFAULT 0 CHECK(preuve_obligatoire IN (0,1)),
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1))
);

CREATE TABLE IF NOT EXISTS control_checklist_runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id         INTEGER NOT NULL REFERENCES control_checklist_templates(id),
  hotel_id            INTEGER REFERENCES hotels(id),
  date_controle       TEXT NOT NULL DEFAULT (date('now')),
  statut              TEXT NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','en_cours','soumis','valide','cloture')),
  controleur_user_id  INTEGER REFERENCES users(id),
  validated_by        INTEGER REFERENCES users(id),
  validated_at        TEXT,
  score               REAL,
  observation         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS control_checklist_results (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id              INTEGER NOT NULL REFERENCES control_checklist_runs(id) ON DELETE CASCADE,
  item_id             INTEGER NOT NULL REFERENCES control_checklist_items(id),
  statut              TEXT NOT NULL DEFAULT 'na'
                        CHECK(statut IN ('conforme','non_conforme','na')),
  commentaire         TEXT,
  action_corrective   TEXT,
  due_at              TEXT,
  preuve_path         TEXT,
  closed_at           TEXT,
  UNIQUE(run_id, item_id)
);

INSERT OR IGNORE INTO control_checklist_templates (code, libelle, domaine, frequence) VALUES
  ('DEC_CA_JOUR', 'Contrôle DEC — CA journalier et encaissements', 'dec', 'quotidienne'),
  ('QUALITE_CHAMBRES', 'Qualité — Chambres et espaces clients', 'qualite', 'hebdomadaire'),
  ('HYGIENE_RESTAURATION', 'Hygiène — Restauration et cuisine', 'hygiene', 'hebdomadaire'),
  ('MAINT_PREVENTIVE', 'Maintenance — Préventif équipements critiques', 'maintenance', 'mensuelle'),
  ('SECURITE_ACCES', 'Sécurité — Accès, rondes et surveillance', 'securite', 'quotidienne');

-- ── 9. Achats et maintenance préventive ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER REFERENCES hotels(id),
  demandeur_user_id   INTEGER REFERENCES users(id),
  objet               TEXT NOT NULL,
  justification       TEXT,
  montant_estime      REAL NOT NULL DEFAULT 0,
  statut              TEXT NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','soumis','valide','refuse','commande','receptionne','cloture')),
  priorite            TEXT NOT NULL DEFAULT 'normale'
                        CHECK(priorite IN ('basse','normale','haute','critique')),
  due_at              TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id          INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  designation         TEXT NOT NULL,
  quantite            REAL NOT NULL DEFAULT 1,
  prix_estime         REAL NOT NULL DEFAULT 0,
  observation         TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_preventive_plans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id            INTEGER REFERENCES hotels(id),
  equipement_id       INTEGER,
  libelle             TEXT NOT NULL,
  frequence_jours     INTEGER NOT NULL DEFAULT 30 CHECK(frequence_jours > 0),
  criticite           TEXT NOT NULL DEFAULT 'normale'
                        CHECK(criticite IN ('basse','normale','haute','critique')),
  dernier_controle_at TEXT,
  prochain_controle_at TEXT,
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_preventive_runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id             INTEGER NOT NULL REFERENCES maintenance_preventive_plans(id) ON DELETE CASCADE,
  intervention_id     INTEGER,
  statut              TEXT NOT NULL DEFAULT 'planifie'
                        CHECK(statut IN ('planifie','en_cours','realise','reporte','annule')),
  planned_at          TEXT NOT NULL,
  completed_at        TEXT,
  technician_user_id  INTEGER REFERENCES users(id),
  observation         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 10. Dashboard PDG, rapports standards, sauvegarde et sync ───────────────

CREATE TABLE IF NOT EXISTS dashboard_kpi_definitions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  domaine             TEXT NOT NULL,
  formule             TEXT,
  unite               TEXT,
  ordre               INTEGER NOT NULL DEFAULT 0,
  visible_pdg         INTEGER NOT NULL DEFAULT 1 CHECK(visible_pdg IN (0,1)),
  visible_dec         INTEGER NOT NULL DEFAULT 1 CHECK(visible_dec IN (0,1)),
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1))
);

INSERT OR IGNORE INTO dashboard_kpi_definitions (code, libelle, domaine, unite, ordre) VALUES
  ('CA_JOUR', 'Chiffre d''affaires du jour', 'finance', 'DA', 10),
  ('CA_MOIS', 'Chiffre d''affaires du mois', 'finance', 'DA', 20),
  ('OBJECTIF_REALISE', 'Objectif vs réalisé', 'finance', '%', 30),
  ('TAUX_OCCUPATION', 'Taux d''occupation', 'hebergement', '%', 40),
  ('CREANCES_OUVERTES', 'Créances ouvertes', 'finance', 'DA', 50),
  ('ENCAISSEMENTS_JOUR', 'Encaissements du jour', 'tresorerie', 'DA', 60),
  ('ANOMALIES_OUVERTES', 'Anomalies ouvertes', 'controle', 'nb', 70),
  ('RECLAMATIONS_OUVERTES', 'Réclamations ouvertes', 'qualite', 'nb', 80),
  ('ABSENTEISME', 'Absentéisme', 'rh', '%', 90),
  ('INTERVENTIONS_URGENTES', 'Interventions urgentes', 'maintenance', 'nb', 100);

CREATE TABLE IF NOT EXISTS standard_report_definitions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  domaine             TEXT NOT NULL,
  frequence           TEXT NOT NULL DEFAULT 'mensuelle'
                        CHECK(frequence IN ('quotidienne','hebdomadaire','mensuelle','trimestrielle','annuelle','ponctuelle')),
  destinataire        TEXT,
  description         TEXT,
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO standard_report_definitions (code, libelle, domaine, frequence, destinataire, description) VALUES
  ('RPT_CA_QUOTIDIEN', 'CA quotidien consolidé', 'finance', 'quotidienne', 'PDG, DEC, DFC', 'Synthèse CA par unité et rubrique'),
  ('RPT_CA_MENSUEL_CA', 'Rapport mensuel CA pour Conseil d''Administration', 'finance', 'mensuelle', 'PDG, CA', 'Rapport consolidé mensuel pour gouvernance'),
  ('RPT_OCCUPATION', 'Rapport occupation hébergement', 'hebergement', 'mensuelle', 'DEC, Directions unités', 'Occupation, arrivées, départs et disponibilité'),
  ('RPT_CREANCES', 'Balance âgée des créances', 'finance', 'mensuelle', 'DFC, PDG', 'Créances par ancienneté, client, unité et niveau de risque'),
  ('RPT_RH_EFFECTIFS', 'Effectifs et absentéisme', 'rh', 'mensuelle', 'DRH, PDG', 'Effectifs par unité, contrat, poste, absentéisme et masse salariale'),
  ('RPT_QUALITE', 'Qualité et réclamations clients', 'qualite', 'mensuelle', 'Qualité, DEC, PDG', 'Réclamations, délais de traitement et actions correctives'),
  ('RPT_MAINTENANCE', 'Maintenance et interventions critiques', 'maintenance', 'mensuelle', 'DEM, DEC', 'Interventions ouvertes, préventif, coûts et urgences');

CREATE TABLE IF NOT EXISTS backup_policies (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  frequence           TEXT NOT NULL DEFAULT 'quotidienne'
                        CHECK(frequence IN ('horaire','quotidienne','hebdomadaire','mensuelle')),
  retention_jours     INTEGER NOT NULL DEFAULT 30 CHECK(retention_jours > 0),
  chiffrement         INTEGER NOT NULL DEFAULT 0 CHECK(chiffrement IN (0,1)),
  actif               INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1)),
  last_success_at     TEXT,
  last_error          TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO backup_policies (code, libelle, frequence, retention_jours, chiffrement, actif) VALUES
  ('BACKUP_LOCAL_DAILY', 'Sauvegarde locale quotidienne', 'quotidienne', 30, 0, 1),
  ('BACKUP_PRE_MIGRATION', 'Sauvegarde automatique avant migration', 'quotidienne', 90, 0, 1);

CREATE TABLE IF NOT EXISTS sync_conflict_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  module              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           INTEGER,
  local_version       TEXT,
  remote_version      TEXT,
  statut              TEXT NOT NULL DEFAULT 'ouvert'
                        CHECK(statut IN ('ouvert','resolu','ignore')),
  resolution          TEXT,
  resolved_by         INTEGER REFERENCES users(id),
  resolved_at         TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_conflict_module_status ON sync_conflict_log(module, statut);
