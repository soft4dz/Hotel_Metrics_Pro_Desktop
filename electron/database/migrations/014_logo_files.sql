-- Logos stockés en fichiers (data/logos/) au lieu de base64 en base
ALTER TABLE hotels ADD COLUMN logo_file TEXT;
