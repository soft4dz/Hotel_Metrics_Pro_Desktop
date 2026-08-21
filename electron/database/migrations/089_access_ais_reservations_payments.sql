CREATE TABLE IF NOT EXISTS operational_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  module TEXT NOT NULL CHECK(module IN ('portmaster','parking','plage')),
  resource_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK(party_size > 0),
  amount_due REAL NOT NULL DEFAULT 0 CHECK(amount_due >= 0),
  amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
  status TEXT NOT NULL DEFAULT 'confirmee' CHECK(status IN ('option','confirmee','en_cours','terminee','annulee','no_show')),
  access_token TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  CHECK(ends_at > starts_at),
  CHECK(amount_paid <= amount_due)
);
CREATE INDEX IF NOT EXISTS idx_operational_reservations_slot ON operational_reservations(module,hotel_id,resource_code,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS idx_operational_reservations_status ON operational_reservations(module,status,starts_at);

CREATE TABLE IF NOT EXISTS operational_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL REFERENCES operational_reservations(id),
  amount REAL NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL CHECK(method IN ('especes','carte','virement','mobile','folio')),
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'valide' CHECK(status IN ('valide','annule','rembourse')),
  paid_at TEXT NOT NULL DEFAULT(datetime('now')),
  received_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_operational_payments_reservation ON operational_payments(reservation_id,paid_at DESC);

CREATE TABLE IF NOT EXISTS operational_access_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER REFERENCES operational_reservations(id),
  module TEXT NOT NULL CHECK(module IN ('portmaster','parking','plage')),
  access_token TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('entree','sortie')),
  decision TEXT NOT NULL CHECK(decision IN ('autorise','refuse')),
  reason TEXT,
  controlled_by INTEGER REFERENCES users(id),
  controlled_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_operational_access_events_date ON operational_access_events(module,controlled_at DESC);

CREATE TABLE IF NOT EXISTS port_ais_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bateau_id INTEGER REFERENCES port_bateaux(id),
  mmsi TEXT NOT NULL,
  vessel_name TEXT,
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  speed_knots REAL NOT NULL DEFAULT 0 CHECK(speed_knots >= 0),
  course REAL CHECK(course IS NULL OR course BETWEEN 0 AND 360),
  navigation_status TEXT,
  source TEXT NOT NULL DEFAULT 'manuel',
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(mmsi,received_at)
);
CREATE INDEX IF NOT EXISTS idx_port_ais_latest ON port_ais_positions(mmsi,received_at DESC);
