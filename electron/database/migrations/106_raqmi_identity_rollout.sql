-- Migration 106 : déploiement complet de l'identité Raqmi System.
-- Les anciennes valeurs restent uniquement dans les clauses de migration afin de préserver les données.

PRAGMA foreign_keys = ON;

INSERT OR REPLACE INTO app_settings (key, value, updated_at)
VALUES ('app_display_name', 'Raqmi System', datetime('now'));

UPDATE app_settings
SET value = 'Raqmi System', updated_at = datetime('now')
WHERE key IN ('company_name', 'company_legal_name')
  AND value IN ('Hotel Metrics Pro', 'Hotel Metrics Pro Desktop');

UPDATE app_settings
SET value = 'Raqmi System - Rapport interne', updated_at = datetime('now')
WHERE key = 'report_header'
  AND value IN ('Hotel Metrics Pro - Rapport interne', 'Hotel Metrics Pro Desktop - Rapport interne');

-- Comptes démo : conserver le sous-domaine demo.
UPDATE users AS source
SET email = replace(source.email, '@demo.hotelmetrics.local', '@demo.raqmi.local'),
    updated_at = datetime('now')
WHERE lower(source.email) LIKE '%@demo.hotelmetrics.local'
  AND NOT EXISTS (
    SELECT 1
    FROM users AS target
    WHERE lower(target.email) = lower(replace(source.email, '@demo.hotelmetrics.local', '@demo.raqmi.local'))
      AND target.id != source.id
  );

-- Comptes système et adresses générées automatiquement.
UPDATE users AS source
SET email = replace(source.email, '@hotelmetrics.local', '@raqmi.local'),
    updated_at = datetime('now')
WHERE lower(source.email) LIKE '%@hotelmetrics.local'
  AND NOT EXISTS (
    SELECT 1
    FROM users AS target
    WHERE lower(target.email) = lower(replace(source.email, '@hotelmetrics.local', '@raqmi.local'))
      AND target.id != source.id
  );
