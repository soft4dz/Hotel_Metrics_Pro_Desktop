-- P1.2 — POS restauration avancé

CREATE TABLE IF NOT EXISTS pos_salles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_vente_id INTEGER NOT NULL REFERENCES pos_points_vente(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  largeur INTEGER NOT NULL DEFAULT 1000,
  hauteur INTEGER NOT NULL DEFAULT 700,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(point_vente_id, nom)
);

CREATE TABLE IF NOT EXISTS pos_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salle_id INTEGER NOT NULL REFERENCES pos_salles(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  capacite INTEGER NOT NULL DEFAULT 2 CHECK(capacite > 0),
  forme TEXT NOT NULL DEFAULT 'carree' CHECK(forme IN ('carree','ronde','rectangle')),
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  largeur INTEGER NOT NULL DEFAULT 90,
  hauteur INTEGER NOT NULL DEFAULT 90,
  statut TEXT NOT NULL DEFAULT 'libre' CHECK(statut IN ('libre','reservee','occupee','a_nettoyer','hors_service')),
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(salle_id, numero)
);

ALTER TABLE pos_tickets ADD COLUMN table_id INTEGER REFERENCES pos_tables(id);
ALTER TABLE pos_tickets ADD COLUMN nb_couverts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pos_tickets ADD COLUMN etape_service TEXT NOT NULL DEFAULT 'commande'
  CHECK(etape_service IN ('commande','envoyee','preparation','prete','servie','addition','terminee'));
ALTER TABLE pos_tickets ADD COLUMN remise_montant REAL NOT NULL DEFAULT 0;
ALTER TABLE pos_tickets ADD COLUMN remise_pourcentage REAL NOT NULL DEFAULT 0;
ALTER TABLE pos_tickets ADD COLUMN remise_motif TEXT;
ALTER TABLE pos_tickets ADD COLUMN remise_autorisee_par INTEGER REFERENCES users(id);
ALTER TABLE pos_tickets ADD COLUMN folio_id INTEGER REFERENCES hebergement_folios(id);
ALTER TABLE pos_tickets ADD COLUMN parent_ticket_id INTEGER REFERENCES pos_tickets(id);

CREATE TABLE IF NOT EXISTS pos_ticket_paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES pos_tickets(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('especes','carte','cheque','virement','autre','folio')),
  montant REAL NOT NULL CHECK(montant > 0),
  reference TEXT,
  encaissement_id INTEGER REFERENCES encaissements(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_paiements_ticket ON pos_ticket_paiements(ticket_id);

CREATE TABLE IF NOT EXISTS pos_ticket_evenements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES pos_tickets(id) ON DELETE CASCADE,
  type_evenement TEXT NOT NULL,
  details_json TEXT,
  effectue_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pos_ticket_remboursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES pos_tickets(id),
  montant REAL NOT NULL CHECK(montant > 0),
  mode TEXT NOT NULL,
  motif TEXT NOT NULL,
  reference TEXT,
  remettre_en_stock INTEGER NOT NULL DEFAULT 0,
  autorise_par INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_remboursements_ticket ON pos_ticket_remboursements(ticket_id);

INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES (lower(hex(randomblob(16))), 'pos.remise.autoriser', 'Autoriser les remises POS', 'pos-restauration');
INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES (lower(hex(randomblob(16))), 'pos.remboursement.autoriser', 'Autoriser les remboursements POS', 'pos-restauration');
