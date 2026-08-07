-- Paramétrage des procédures de validation (qui / quoi / quand / comment)

CREATE TABLE IF NOT EXISTS workflow_procedures (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT NOT NULL UNIQUE,
  module                TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  label                 TEXT NOT NULL,
  description           TEXT,
  enabled               INTEGER NOT NULL DEFAULT 1,
  hotel_id              INTEGER REFERENCES hotels(id),
  trigger_type          TEXT NOT NULL DEFAULT 'manual'
                          CHECK(trigger_type IN (
                            'manual','always','amount_threshold','amount_or_client_type',
                            'ecart_detected','gravite_incident','transmission_echec'
                          )),
  trigger_config_json   TEXT NOT NULL DEFAULT '{}',
  auto_submit           INTEGER NOT NULL DEFAULT 0,
  approval_mode         TEXT NOT NULL DEFAULT 'hub'
                          CHECK(approval_mode IN ('hub','module_only','hybrid')),
  module_route          TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_procedures_module ON workflow_procedures(module, entity_type, enabled);

CREATE TABLE IF NOT EXISTS workflow_procedure_steps (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id              INTEGER NOT NULL REFERENCES workflow_procedures(id) ON DELETE CASCADE,
  step_order                INTEGER NOT NULL,
  step_code                 TEXT NOT NULL,
  label                     TEXT NOT NULL,
  target_statut             TEXT NOT NULL,
  approver_roles_json       TEXT NOT NULL DEFAULT '[]',
  approver_permissions_json TEXT NOT NULL DEFAULT '[]',
  sla_hours                 INTEGER,
  module_action             TEXT,
  UNIQUE(procedure_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_workflow_procedure_steps_proc ON workflow_procedure_steps(procedure_id, step_order);

-- ── Procédures par défaut (activité hôtelière EGT / groupe) ─────────────────

INSERT OR IGNORE INTO workflow_procedures (code, module, entity_type, label, description, trigger_type, trigger_config_json, auto_submit, approval_mode, module_route, sort_order)
VALUES
  ('achats_bc_validation', 'achats', 'bon_commande',
   'Validation bon de commande', 'Approbation des achats dépassant le seuil TTC — contrôle des dépenses significatives.',
   'amount_threshold', '{"settingKey":"workflow_seuil_achat_ttc","defaultAmount":200000}', 1, 'hub', NULL, 10),

  ('facturation_validation', 'facturation', 'facture',
   'Validation facture', 'Approbation factures entreprises ou montants élevés avant numérotation légale.',
   'amount_or_client_type', '{"settingKey":"workflow_seuil_facture_ttc","defaultAmount":500000,"clientTypes":["entreprise"]}', 1, 'hub', '/facturation', 20),

  ('cloture_journaliere', 'cloture_journaliere', 'daily_closure',
   'Clôture journalière hôtel', 'Circuit exploitation : soumission → directeur unité → contrôle DEC → clôture définitive.',
   'always', '{}', 0, 'module_only', '/recettes/cloture', 30),

  ('rapprochement_financier', 'rapprochement', 'finance_reconciliation',
   'Rapprochement CA / encaissements', 'Contrôle trésorerie — validation DEC après justification des écarts.',
   'manual', '{}', 0, 'hybrid', '/recettes/cloture', 40),

  ('inventaire_legal_ecart', 'inventaire_legal', 'session',
   'Inventaire légal — écart constaté', 'Validation comptable des écarts d''inventaire obligatoire.',
   'ecart_detected', '{"minEcart":0.01}', 1, 'hub', '/conformite/modules-legaux', 50),

  ('rgpd_demande_droit', 'rgpd', 'demande_droit',
   'Demande droits personnels (Loi 18-07)', 'Traitement des demandes d''accès, rectification ou suppression.',
   'always', '{}', 1, 'hub', '/conformite/rgpd', 60),

  ('rgpd_incident_grave', 'rgpd', 'incident_donnees',
   'Incident données personnelles', 'Incidents graves/critiques — évaluation notification ANPDP.',
   'gravite_incident', '{"levels":["grave","critique"]}', 1, 'hub', '/conformite/rgpd', 70),

  ('sifec_transmission_echec', 'sifec', 'facture',
   'Échec transmission SIFEC', 'Correction et retransmission factures rejetées par la plateforme fiscale.',
   'transmission_echec', '{}', 1, 'hub', '/facturation', 80);

-- Étapes : achats (1 niveau — directeur unité ou comptabilité)
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'approbation_achat', 'Approbation bon de commande', 'valide',
  '["DIRECTEUR_UNITE","COMPTABILITE","PDG","ADMIN_DEC","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'achats_bc_validation';

-- Facturation (1 niveau — comptabilité / PDG)
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'approbation_facture', 'Approbation facture', 'valide',
  '["COMPTABILITE","PDG","ADMIN_DEC","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'facturation_validation';

-- Clôture journalière (3 niveaux hiérarchiques)
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'validation_unite', 'Validation directeur d''unité', 'valide_unite',
  '["DIRECTEUR_UNITE","ADMIN_DEC","SUPERADMIN"]', '["recettes.validate"]', 'cloture.validateUnit'
FROM workflow_procedures p WHERE p.code = 'cloture_journaliere';

INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 2, 'validation_dec', 'Validation contrôle de gestion (DEC)', 'valide_dec',
  '["ADMIN_DEC","PDG","SUPERADMIN"]', '[]', 'cloture.validateDec'
FROM workflow_procedures p WHERE p.code = 'cloture_journaliere';

INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 3, 'cloture_finale', 'Clôture définitive', 'cloture',
  '["ADMIN_DEC","CONTROLEUR_UNITE","SUPERADMIN"]', '["recettes.validate"]', 'cloture.close'
FROM workflow_procedures p WHERE p.code = 'cloture_journaliere';

-- Rapprochement (1 niveau DEC)
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'validation_dec', 'Validation rapprochement', 'valide',
  '["ADMIN_DEC","PDG","SUPERADMIN"]', '[]', 'rapprochement.validate'
FROM workflow_procedures p WHERE p.code = 'rapprochement_financier';

-- Inventaire légal
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'validation_compta', 'Validation écart inventaire', 'valide',
  '["COMPTABILITE","ADMIN_DEC","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'inventaire_legal_ecart';

-- RGPD demande
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'traitement_rgpd', 'Traitement demande RGPD', 'valide',
  '["ADMIN_DEC","PDG","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'rgpd_demande_droit';

-- RGPD incident
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'gestion_incident', 'Gestion incident données', 'valide',
  '["PDG","ADMIN_DEC","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'rgpd_incident_grave';

-- SIFEC
INSERT OR IGNORE INTO workflow_procedure_steps (procedure_id, step_order, step_code, label, target_statut, approver_roles_json, approver_permissions_json, module_action)
SELECT p.id, 1, 'correction_sifec', 'Correction transmission fiscale', 'valide',
  '["COMPTABILITE","ADMIN_DEC","SUPERADMIN"]', '[]', NULL
FROM workflow_procedures p WHERE p.code = 'sifec_transmission_echec';
