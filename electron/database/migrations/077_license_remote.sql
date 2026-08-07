-- Licences distantes (ERP multi-sociétés)
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_mode', 'offline', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_server_url', '', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_org_code', '', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_last_remote_sync', '', datetime('now'));
