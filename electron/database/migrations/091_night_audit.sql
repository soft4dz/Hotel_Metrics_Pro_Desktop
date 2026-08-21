-- P0 — Night Audit hôtelier : date d'exploitation, contrôles et journalisation.

CREATE TABLE IF NOT EXISTS hotel_business_dates (
  hotel_id               INTEGER PRIMARY KEY REFERENCES hotels(id) ON DELETE CASCADE,
  current_business_date  TEXT NOT NULL,
  last_closed_date       TEXT,
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS night_audit_runs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  closure_id            INTEGER NOT NULL UNIQUE REFERENCES daily_closures(id) ON DELETE CASCADE,
  hotel_id              INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  business_date         TEXT NOT NULL,
  statut                TEXT NOT NULL DEFAULT 'controle'
                          CHECK(statut IN ('controle','bloque','cloture','rouvert')),
  blockers_count        INTEGER NOT NULL DEFAULT 0,
  warnings_count        INTEGER NOT NULL DEFAULT 0,
  occupied_rooms        INTEGER NOT NULL DEFAULT 0,
  room_charges_posted   INTEGER NOT NULL DEFAULT 0,
  room_revenue          REAL NOT NULL DEFAULT 0,
  stay_tax_total        REAL NOT NULL DEFAULT 0,
  generated_by          INTEGER REFERENCES users(id),
  generated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  closed_by             INTEGER REFERENCES users(id),
  closed_at             TEXT,
  reopened_by           INTEGER REFERENCES users(id),
  reopened_at           TEXT,
  reopen_reason         TEXT
);

CREATE INDEX IF NOT EXISTS idx_night_audit_hotel_date
ON night_audit_runs(hotel_id, business_date DESC);

CREATE TABLE IF NOT EXISTS night_audit_controls (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                INTEGER NOT NULL REFERENCES night_audit_runs(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,
  libelle               TEXT NOT NULL,
  severity              TEXT NOT NULL CHECK(severity IN ('blocking','warning','info')),
  statut                TEXT NOT NULL CHECK(statut IN ('ok','failed')),
  occurrences           INTEGER NOT NULL DEFAULT 0,
  details_json          TEXT,
  UNIQUE(run_id, code)
);

CREATE TABLE IF NOT EXISTS night_audit_room_postings (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                INTEGER NOT NULL REFERENCES night_audit_runs(id) ON DELETE CASCADE,
  reservation_id        INTEGER NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  hotel_id              INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  business_date         TEXT NOT NULL,
  room_amount           REAL NOT NULL DEFAULT 0,
  stay_tax_amount       REAL NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(reservation_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_night_audit_postings_hotel_date
ON night_audit_room_postings(hotel_id, business_date);

CREATE TABLE IF NOT EXISTS night_audit_events (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                INTEGER NOT NULL REFERENCES night_audit_runs(id) ON DELETE CASCADE,
  action                TEXT NOT NULL CHECK(action IN ('controle','cloture','reouverture')),
  actor_user_id         INTEGER REFERENCES users(id),
  motif                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_settings (key, value)
VALUES ('night_audit_taxe_sejour_par_adulte', '200');
