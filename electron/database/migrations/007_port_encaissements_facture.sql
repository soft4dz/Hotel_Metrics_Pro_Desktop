-- Paiements liés aux factures (contrat_id optionnel)

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS port_encaissements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  contrat_id INTEGER,
  facture_id INTEGER,
  date_encaissement TEXT NOT NULL,
  montant REAL NOT NULL,
  mode_paiement TEXT,
  reference TEXT,
  observation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  statut TEXT DEFAULT 'valide',
  FOREIGN KEY (contrat_id) REFERENCES port_contrats(id),
  FOREIGN KEY (facture_id) REFERENCES port_factures(id)
);

INSERT INTO port_encaissements_new (
  id, uuid, contrat_id, facture_id, date_encaissement, montant, mode_paiement,
  reference, observation, created_at, created_by, sync_status, statut
)
SELECT
  id, uuid, contrat_id, facture_id, date_encaissement, montant, mode_paiement,
  reference, observation, created_at, created_by, sync_status, COALESCE(statut, 'valide')
FROM port_encaissements;

DROP TABLE port_encaissements;
ALTER TABLE port_encaissements_new RENAME TO port_encaissements;

CREATE INDEX IF NOT EXISTS idx_port_encaissements_contrat ON port_encaissements(contrat_id);
CREATE INDEX IF NOT EXISTS idx_port_encaissements_facture ON port_encaissements(facture_id);

PRAGMA foreign_keys = ON;
