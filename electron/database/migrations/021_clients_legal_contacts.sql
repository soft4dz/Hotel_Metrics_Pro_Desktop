-- Documents légaux et régime fiscal / TVA
ALTER TABLE clients_facturation ADD COLUMN date_creation_entreprise TEXT;
ALTER TABLE clients_facturation ADD COLUMN date_expiration_nrc TEXT;
ALTER TABLE clients_facturation ADD COLUMN date_expiration_nif TEXT;
ALTER TABLE clients_facturation ADD COLUMN numero_agrement TEXT;
ALTER TABLE clients_facturation ADD COLUMN assujetti_tva INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients_facturation ADD COLUMN numero_tva TEXT;
ALTER TABLE clients_facturation ADD COLUMN regime_imposition TEXT;

-- Personnes de contact (multiple par client)
CREATE TABLE IF NOT EXISTS clients_contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER NOT NULL REFERENCES clients_facturation(id),
  type        TEXT NOT NULL DEFAULT 'autre',
  nom         TEXT NOT NULL,
  titre       TEXT,
  telephone   TEXT,
  email       TEXT,
  principal   INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_contacts_client ON clients_contacts(client_id);
