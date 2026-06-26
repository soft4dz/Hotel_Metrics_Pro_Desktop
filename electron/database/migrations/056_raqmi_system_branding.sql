-- Migration 056 : Rebranding applicatif Raqmi System
-- Met à jour les libellés par défaut sans écraser une personnalisation volontaire de l'entreprise.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES
  ('app_display_name', 'Raqmi System', datetime('now')),
  ('report_header', 'Raqmi System - Rapport interne', datetime('now'));

UPDATE app_settings
SET value = 'Raqmi System', updated_at = datetime('now')
WHERE key = 'company_name'
  AND value IN ('Hotel Metrics Pro', 'Hotel Metrics Pro Desktop');

UPDATE app_settings
SET value = 'Raqmi System - Rapport interne', updated_at = datetime('now')
WHERE key = 'report_header'
  AND value IN ('Hotel Metrics Pro - Rapport interne', 'Hotel Metrics Pro Desktop - Rapport interne');
