-- Compléter modules_config pour les modules opérationnels récents

INSERT OR IGNORE INTO modules_config (module_id) VALUES
  ('stocks-consommations'),
  ('achats-approvisionnements'),
  ('maintenance-interventions'),
  ('journal-anomalies'),
  ('decisions-instructions'),
  ('qualite-reclamations'),
  ('plage-piscine'),
  ('parking'),
  ('commercial-partenariats'),
  ('comparatif-inter-unites'),
  ('gestion-documentaire');
