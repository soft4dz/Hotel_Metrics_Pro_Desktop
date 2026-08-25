-- Licence V2 : état distant et métadonnées de contrôle local.
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_id', '', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_remote_state', '', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('license_clock_anchor', '', datetime('now'));
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('app_first_run_secure', '', datetime('now'));
