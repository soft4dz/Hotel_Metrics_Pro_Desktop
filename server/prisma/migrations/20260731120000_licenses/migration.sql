-- Licences multi-sociétés (Raqmi)

CREATE TABLE IF NOT EXISTS license_organizations (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_records (
  id SERIAL PRIMARY KEY,
  license_key TEXT NOT NULL UNIQUE,
  organization_id INTEGER NOT NULL REFERENCES license_organizations(id),
  edition TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_activations INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_records_org ON license_records(organization_id);

CREATE TABLE IF NOT EXISTS license_activations (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES license_records(id),
  machine_id TEXT NOT NULL,
  device_label TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(license_id, machine_id)
);
