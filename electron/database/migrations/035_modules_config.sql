CREATE TABLE IF NOT EXISTS modules_config (
  module_id  TEXT    NOT NULL PRIMARY KEY,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO modules_config (module_id) VALUES
  ('administration-utilisateurs'),
  ('parametrage-global'),
  ('unites-hotelieres'),
  ('recettes-journalieres'),
  ('encaissements-tresorerie'),
  ('budget-previsions'),
  ('hebergement-occupation'),
  ('facturation'),
  ('creances-recouvrement'),
  ('contrats-conventions'),
  ('rh-productivite'),
  ('tarifs-conventions'),
  ('audit-controle-interne'),
  ('portmaster'),
  ('clients'),
  ('tableaux-bord-directionnels'),
  ('rapports-automatiques'),
  ('alertes-notifications'),
  ('sauvegarde-restauration'),
  ('synchronisation-multi-postes'),
  ('journalisation-tracabilite');
