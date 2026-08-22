-- P2.5 — Intégrations matérielles et pilotes opérationnels

CREATE TABLE IF NOT EXISTS hardware_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id), point_vente_id INTEGER REFERENCES pos_points_vente(id),
  code TEXT NOT NULL, nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('serrure','encodeur_carte','pbx','iptv','terminal_paiement','scanner','imprimante_fiscale','imprimante_pos','tiroir_caisse')),
  provider TEXT NOT NULL, driver TEXT NOT NULL CHECK(driver IN ('http_json','tcp_raw','escpos_tcp','webhook_inbox','hid_keyboard','vendor_sdk')),
  endpoint TEXT, secret_ref TEXT, config_json TEXT NOT NULL DEFAULT '{}', capabilities_json TEXT NOT NULL DEFAULT '[]',
  statut TEXT NOT NULL DEFAULT 'inactif' CHECK(statut IN ('inactif','actif','erreur','maintenance')),
  last_seen_at TEXT, last_error TEXT, firmware_version TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')), updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(hotel_id,code)
);
CREATE TABLE IF NOT EXISTS hardware_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL UNIQUE,
  device_id INTEGER NOT NULL REFERENCES hardware_devices(id), command_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}', idempotency_key TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','processing','acknowledged','failed','dead','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0, next_retry_at TEXT, response_json TEXT, last_error TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT(datetime('now')), processed_at TEXT
);
CREATE TABLE IF NOT EXISTS hardware_payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL UNIQUE, device_id INTEGER NOT NULL REFERENCES hardware_devices(id),
  ticket_id INTEGER REFERENCES pos_tickets(id), facture_id INTEGER REFERENCES factures(id), reservation_id INTEGER REFERENCES reservations(id),
  provider TEXT NOT NULL CHECK(provider IN ('CIB','EDAHABIA','SATIM','AUTRE')), operation TEXT NOT NULL CHECK(operation IN ('vente','remboursement','annulation')),
  montant REAL NOT NULL CHECK(montant>0), devise TEXT NOT NULL DEFAULT 'DZD', reference TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'initiee' CHECK(statut IN ('initiee','envoyee','autorisee','refusee','annulee','remboursee','erreur')),
  autorisation TEXT, command_id INTEGER REFERENCES hardware_commands(id), parent_transaction_id INTEGER REFERENCES hardware_payment_transactions(id),
  response_code TEXT, response_message TEXT, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT(datetime('now')), completed_at TEXT
);
CREATE TABLE IF NOT EXISTS hardware_room_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL REFERENCES hardware_devices(id), reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  chambre_id INTEGER NOT NULL REFERENCES chambres(id), credential_reference TEXT NOT NULL UNIQUE, support_uid TEXT,
  valid_from TEXT NOT NULL, valid_to TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','active','revoked','expired','error')),
  command_id INTEGER REFERENCES hardware_commands(id), issued_by INTEGER REFERENCES users(id), issued_at TEXT, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS hardware_pbx_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL REFERENCES hardware_devices(id), external_id TEXT NOT NULL,
  reservation_id INTEGER REFERENCES reservations(id), chambre_id INTEGER REFERENCES chambres(id), extension TEXT,
  started_at TEXT NOT NULL, duree_secondes INTEGER NOT NULL DEFAULT 0, destination TEXT, type TEXT NOT NULL DEFAULT 'sortant',
  cout REAL NOT NULL DEFAULT 0, folio_line_id INTEGER REFERENCES hebergement_folio_lignes(id), payload_json TEXT, UNIQUE(device_id,external_id)
);
CREATE TABLE IF NOT EXISTS hardware_iptv_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL REFERENCES hardware_devices(id), reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  chambre_id INTEGER NOT NULL REFERENCES chambres(id), profil TEXT NOT NULL DEFAULT 'standard', valid_from TEXT NOT NULL, valid_to TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','active','revoked','error')), command_id INTEGER REFERENCES hardware_commands(id), UNIQUE(device_id,reservation_id)
);
CREATE TABLE IF NOT EXISTS hardware_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL REFERENCES hardware_devices(id), client_id INTEGER REFERENCES clients_facturation(id),
  reservation_id INTEGER REFERENCES reservations(id), type_document TEXT NOT NULL, document_number TEXT, barcode_value TEXT, file_path TEXT,
  metadata_json TEXT, scanned_by INTEGER REFERENCES users(id), scanned_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS hardware_fiscal_print_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL REFERENCES hardware_devices(id), facture_id INTEGER REFERENCES factures(id),
  ticket_id INTEGER REFERENCES pos_tickets(id), document_type TEXT NOT NULL CHECK(document_type IN ('ticket','facture','avoir','rapport_z')),
  numero_document TEXT NOT NULL, montant_ttc REAL, payload_json TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','printed','failed','cancelled')),
  command_id INTEGER REFERENCES hardware_commands(id), fiscal_reference TEXT, printed_at TEXT, created_by INTEGER REFERENCES users(id)
);
ALTER TABLE pos_peripheriques ADD COLUMN hardware_device_id INTEGER REFERENCES hardware_devices(id);
CREATE INDEX IF NOT EXISTS idx_hardware_commands_queue ON hardware_commands(statut,next_retry_at);
CREATE INDEX IF NOT EXISTS idx_hardware_payments_ref ON hardware_payment_transactions(reference,statut);
CREATE INDEX IF NOT EXISTS idx_hardware_keys_reservation ON hardware_room_keys(reservation_id,statut);
CREATE INDEX IF NOT EXISTS idx_hardware_calls_room ON hardware_pbx_calls(chambre_id,started_at);
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'hardware.configurer','Configurer les intégrations matérielles','hardware');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'hardware.executer','Exécuter les commandes matérielles','hardware');
INSERT OR IGNORE INTO modules_config(module_id) VALUES('integrations-materielles');

