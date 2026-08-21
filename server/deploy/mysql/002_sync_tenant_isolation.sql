-- P0 — migration d'une base centrale 001 existante vers l'isolation multi-sociétés.

ALTER TABLE hmp_devices ADD COLUMN organization_code VARCHAR(64) NOT NULL DEFAULT 'LEGACY' AFTER device_id;
ALTER TABLE hmp_devices DROP INDEX uq_hmp_devices_device_id;
ALTER TABLE hmp_devices ADD UNIQUE KEY uq_hmp_devices_org_device (organization_code, device_id);

ALTER TABLE hmp_sync_inbox ADD COLUMN organization_code VARCHAR(64) NOT NULL DEFAULT 'LEGACY' AFTER uuid;
ALTER TABLE hmp_sync_inbox DROP INDEX uq_hmp_sync_inbox_uuid;
ALTER TABLE hmp_sync_inbox ADD UNIQUE KEY uq_hmp_sync_inbox_org_uuid (organization_code, uuid);

ALTER TABLE hmp_sync_changes ADD COLUMN organization_code VARCHAR(64) NOT NULL DEFAULT 'LEGACY' AFTER uuid;
ALTER TABLE hmp_sync_changes DROP INDEX uq_hmp_sync_changes_uuid;
ALTER TABLE hmp_sync_changes ADD UNIQUE KEY uq_hmp_sync_changes_org_uuid (organization_code, uuid);

ALTER TABLE hmp_sync_cursors ADD COLUMN organization_code VARCHAR(64) NOT NULL DEFAULT 'LEGACY' FIRST;
ALTER TABLE hmp_sync_cursors ADD COLUMN last_change_id BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER device_id;
ALTER TABLE hmp_sync_cursors DROP PRIMARY KEY;
ALTER TABLE hmp_sync_cursors ADD PRIMARY KEY (organization_code, device_id);

ALTER TABLE hmp_sync_log ADD COLUMN organization_code VARCHAR(64) NULL AFTER direction;
