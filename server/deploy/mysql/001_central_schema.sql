-- Hotel Metrics Pro — base centrale MySQL (sync multi-postes)
-- Importer via phpMyAdmin après création de la base sur cPanel.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS hmp_devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id CHAR(36) NOT NULL,
  organization_code VARCHAR(64) NOT NULL,
  label VARCHAR(255) NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hmp_devices_org_device (organization_code, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hmp_sync_inbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  organization_code VARCHAR(64) NOT NULL,
  device_id CHAR(36) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id INT NULL,
  action VARCHAR(32) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hmp_sync_inbox_org_uuid (organization_code, uuid),
  KEY idx_hmp_sync_inbox_device (device_id),
  KEY idx_hmp_sync_inbox_entity (entity_type, entity_id),
  KEY idx_hmp_sync_inbox_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hmp_sync_changes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  organization_code VARCHAR(64) NOT NULL,
  source_device_id CHAR(36) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id INT NULL,
  action VARCHAR(32) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hmp_sync_changes_org_uuid (organization_code, uuid),
  KEY idx_hmp_sync_changes_created (created_at),
  KEY idx_hmp_sync_changes_source (source_device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hmp_sync_cursors (
  organization_code VARCHAR(64) NOT NULL,
  device_id CHAR(36) NOT NULL,
  last_change_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_code, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hmp_sync_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  direction ENUM('push','pull','system') NOT NULL,
  organization_code VARCHAR(64) NULL,
  device_id CHAR(36) NULL,
  status VARCHAR(16) NOT NULL,
  message VARCHAR(512) NULL,
  items_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hmp_sync_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
