CREATE TABLE IF NOT EXISTS pms_groupes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id), code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL, contact_nom TEXT, contact_email TEXT, contact_telephone TEXT,
  date_arrivee TEXT NOT NULL, date_depart TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'option' CHECK(statut IN ('option','confirme','en_cours','termine','annule')),
  allotement INTEGER NOT NULL DEFAULT 1, notes TEXT, created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE reservations ADD COLUMN groupe_id INTEGER REFERENCES pms_groupes(id);
ALTER TABLE reservations ADD COLUMN external_reference TEXT;
ALTER TABLE reservations ADD COLUMN channel_code TEXT;
CREATE INDEX IF NOT EXISTS idx_reservations_groupe ON reservations(groupe_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_channel_ref ON reservations(channel_code, external_reference) WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS pms_depots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL UNIQUE,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id), montant REAL NOT NULL CHECK(montant > 0),
  mode TEXT NOT NULL CHECK(mode IN ('especes','carte','virement','cheque','autre')),
  reference TEXT, statut TEXT NOT NULL DEFAULT 'recu' CHECK(statut IN ('recu','affecte','rembourse','annule')),
  date_depot TEXT NOT NULL, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pms_depots_reservation ON pms_depots(reservation_id, statut);

CREATE TABLE IF NOT EXISTS pms_channel_connectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL, label TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'inactif' CHECK(statut IN ('inactif','actif','erreur')),
  endpoint_url TEXT, last_sync_at TEXT, last_error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(hotel_id, code)
);
CREATE TABLE IF NOT EXISTS pms_channel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, connector_id INTEGER NOT NULL REFERENCES pms_channel_connectors(id),
  external_reference TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('in','out')),
  event_type TEXT NOT NULL, payload_json TEXT NOT NULL, statut TEXT NOT NULL CHECK(statut IN ('traite','rejete','en_attente')),
  error_message TEXT, reservation_id INTEGER REFERENCES reservations(id), created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(connector_id, external_reference, event_type)
);
CREATE INDEX IF NOT EXISTS idx_channel_events_status ON pms_channel_events(statut, created_at);

