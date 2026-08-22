-- P1.7 — Channel Manager réel et Booking Engine

ALTER TABLE pms_channel_connectors ADD COLUMN credential_ref TEXT;
ALTER TABLE pms_channel_connectors ADD COLUMN webhook_secret TEXT;
ALTER TABLE pms_channel_connectors ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 5;
ALTER TABLE pms_channel_events ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pms_channel_events ADD COLUMN next_retry_at TEXT;
ALTER TABLE pms_channel_events ADD COLUMN processed_at TEXT;
ALTER TABLE pms_channel_events ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_event_idempotency ON pms_channel_events(connector_id,idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS pms_channel_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_id INTEGER NOT NULL REFERENCES pms_channel_connectors(id) ON DELETE CASCADE,
  type_chambre_id INTEGER NOT NULL REFERENCES types_chambres(id),
  external_room_code TEXT NOT NULL,
  plan_tarifaire_id INTEGER REFERENCES plans_tarifaires(id),
  external_rate_code TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  UNIQUE(connector_id,external_room_code,external_rate_code)
);

CREATE TABLE IF NOT EXISTS pms_channel_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  type_chambre_id INTEGER NOT NULL REFERENCES types_chambres(id),
  date_jour TEXT NOT NULL,
  ferme INTEGER NOT NULL DEFAULT 0,
  arrivee_fermee INTEGER NOT NULL DEFAULT 0,
  depart_ferme INTEGER NOT NULL DEFAULT 0,
  min_sejour INTEGER NOT NULL DEFAULT 1,
  max_sejour INTEGER,
  UNIQUE(hotel_id,type_chambre_id,date_jour)
);

CREATE TABLE IF NOT EXISTS pms_channel_sync_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_id INTEGER NOT NULL REFERENCES pms_channel_connectors(id),
  job_type TEXT NOT NULL CHECK(job_type IN ('availability','rates','restrictions','reservation_ack','cancellation_ack')),
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','processing','success','retry','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  http_status INTEGER,
  response_excerpt TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  UNIQUE(connector_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS pms_channel_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_id INTEGER NOT NULL REFERENCES pms_channel_connectors(id),
  delivery_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_valide INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'recu' CHECK(statut IN ('recu','traite','rejete')),
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  UNIQUE(connector_id,delivery_id)
);

CREATE TABLE IF NOT EXISTS booking_engine_config (
  hotel_id INTEGER PRIMARY KEY REFERENCES hotels(id),
  actif INTEGER NOT NULL DEFAULT 0,
  domaine TEXT,
  devise TEXT NOT NULL DEFAULT 'DZD',
  acompte_type TEXT NOT NULL DEFAULT 'pourcentage' CHECK(acompte_type IN ('pourcentage','montant','aucun')),
  acompte_valeur REAL NOT NULL DEFAULT 30,
  paiement_provider TEXT,
  email_confirmation INTEGER NOT NULL DEFAULT 1,
  sms_confirmation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL,
  type_remise TEXT NOT NULL CHECK(type_remise IN ('pourcentage','montant')),
  valeur REAL NOT NULL CHECK(valeur > 0),
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  usage_max INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  montant_minimum REAL NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1,
  UNIQUE(hotel_id,code)
);

CREATE TABLE IF NOT EXISTS booking_engine_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  reservation_id INTEGER REFERENCES reservations(id),
  type_chambre_id INTEGER NOT NULL REFERENCES types_chambres(id),
  reference TEXT NOT NULL UNIQUE,
  client_nom TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_telephone TEXT,
  date_arrivee TEXT NOT NULL,
  date_depart TEXT NOT NULL,
  nb_adultes INTEGER NOT NULL DEFAULT 1,
  nb_enfants INTEGER NOT NULL DEFAULT 0,
  montant_brut REAL NOT NULL,
  promo_code TEXT,
  remise REAL NOT NULL DEFAULT 0,
  montant_total REAL NOT NULL,
  acompte_requis REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'pending_payment' CHECK(statut IN ('pending_payment','confirmee','echec_paiement','annulee','expiree')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS booking_engine_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES booking_engine_orders(id),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  montant REAL NOT NULL,
  statut TEXT NOT NULL CHECK(statut IN ('pending','authorized','captured','failed','refunded')),
  error_code TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_confirmations_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES booking_engine_orders(id),
  canal TEXT NOT NULL CHECK(canal IN ('email','sms')),
  destinataire TEXT NOT NULL,
  template TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','sent','failed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_channel_jobs_retry ON pms_channel_sync_jobs(statut,next_retry_at);
CREATE INDEX IF NOT EXISTS idx_booking_orders_status ON booking_engine_orders(hotel_id,statut,expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_outbox_retry ON booking_confirmations_outbox(statut,next_retry_at);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'pms.channel.sync','Synchroniser le Channel Manager','hebergement');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'pms.booking.config','Configurer le Booking Engine','hebergement');
