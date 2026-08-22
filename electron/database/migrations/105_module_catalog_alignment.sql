-- Aligner modules_config avec les applications réellement exposées par le catalogue central.

INSERT OR IGNORE INTO modules_config (module_id) VALUES
  ('cloture-night-audit'),
  ('comptabilite-scf'),
  ('fiscalite-dgi'),
  ('pointeuses-badgeuses'),
  ('workflows-validations'),
  ('checklists-controle'),
  ('conformite-hoteliere'),
  ('protection-donnees-personnelles'),
  ('modules-legaux'),
  ('dashboard-pdg'),
  ('cockpit-dec');
