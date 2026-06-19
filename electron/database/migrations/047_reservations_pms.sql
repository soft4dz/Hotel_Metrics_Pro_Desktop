-- Chaîne PMS : réservation ↔ client ↔ tarif ↔ facture

ALTER TABLE reservations ADD COLUMN client_id INTEGER REFERENCES clients_facturation(id);
ALTER TABLE reservations ADD COLUMN plan_id INTEGER REFERENCES plans_tarifaires(id);
ALTER TABLE reservations ADD COLUMN formule_id INTEGER REFERENCES formules_tarif(id);
ALTER TABLE reservations ADD COLUMN facture_id INTEGER REFERENCES factures(id);

ALTER TABLE factures ADD COLUMN reservation_id INTEGER REFERENCES reservations(id);

CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_reservation ON factures(reservation_id);
