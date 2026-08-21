-- P1.1 — PMS avancé

ALTER TABLE reservations ADD COLUMN surbooking_autorise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reservations ADD COLUMN surbooking_motif TEXT;
ALTER TABLE reservations ADD COLUMN politique_annulation_id INTEGER REFERENCES pms_politiques_annulation(id);

CREATE TABLE IF NOT EXISTS pms_occupants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT,
  date_naissance TEXT,
  nationalite TEXT,
  type_document TEXT,
  numero_document TEXT,
  principal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pms_occupants_reservation ON pms_occupants(reservation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pms_occupant_principal
  ON pms_occupants(reservation_id) WHERE principal = 1;

CREATE TABLE IF NOT EXISTS pms_mouvements_chambre (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  ancienne_chambre_id INTEGER REFERENCES chambres(id),
  nouvelle_chambre_id INTEGER NOT NULL REFERENCES chambres(id),
  motif TEXT NOT NULL,
  surbooking_autorise INTEGER NOT NULL DEFAULT 0,
  effectue_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pms_mouvements_reservation ON pms_mouvements_chambre(reservation_id, created_at);

CREATE TABLE IF NOT EXISTS pms_liste_attente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  type_chambre_id INTEGER REFERENCES types_chambres(id),
  client_nom TEXT NOT NULL,
  client_prenom TEXT,
  client_email TEXT,
  client_telephone TEXT,
  date_arrivee TEXT NOT NULL,
  date_depart TEXT NOT NULL,
  nb_adultes INTEGER NOT NULL DEFAULT 1,
  nb_enfants INTEGER NOT NULL DEFAULT 0,
  priorite INTEGER NOT NULL DEFAULT 3 CHECK(priorite BETWEEN 1 AND 5),
  statut TEXT NOT NULL DEFAULT 'attente' CHECK(statut IN ('attente','contacte','convertie','annulee','expiree')),
  notes TEXT,
  reservation_id INTEGER REFERENCES reservations(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pms_attente_hotel_dates ON pms_liste_attente(hotel_id, statut, date_arrivee, priorite);

CREATE TABLE IF NOT EXISTS pms_politiques_annulation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  nom TEXT NOT NULL,
  delai_sans_frais_jours INTEGER NOT NULL DEFAULT 0,
  penalite_type TEXT NOT NULL DEFAULT 'pourcentage' CHECK(penalite_type IN ('pourcentage','montant','nuitees')),
  penalite_valeur REAL NOT NULL DEFAULT 0 CHECK(penalite_valeur >= 0),
  no_show_type TEXT NOT NULL DEFAULT 'pourcentage' CHECK(no_show_type IN ('pourcentage','montant','nuitees')),
  no_show_valeur REAL NOT NULL DEFAULT 100 CHECK(no_show_valeur >= 0),
  actif INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id, nom)
);

CREATE TABLE IF NOT EXISTS pms_annulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  politique_id INTEGER REFERENCES pms_politiques_annulation(id),
  motif TEXT NOT NULL,
  montant_penalite REAL NOT NULL DEFAULT 0,
  montant_remboursable REAL NOT NULL DEFAULT 0,
  annule_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pms_depot_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  depot_id INTEGER NOT NULL REFERENCES pms_depots(id),
  type_operation TEXT NOT NULL CHECK(type_operation IN ('remboursement','annulation')),
  montant REAL NOT NULL CHECK(montant >= 0),
  motif TEXT NOT NULL,
  reference TEXT,
  effectue_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pms_depot_operations_depot ON pms_depot_operations(depot_id);

CREATE TABLE IF NOT EXISTS pms_folio_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_source_id INTEGER NOT NULL REFERENCES hebergement_folios(id),
  folio_destination_id INTEGER NOT NULL REFERENCES hebergement_folios(id),
  ligne_source_id INTEGER REFERENCES hebergement_folio_lignes(id),
  montant_ttc REAL NOT NULL DEFAULT 0,
  motif TEXT NOT NULL,
  effectue_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pms_folio_partages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_id INTEGER NOT NULL REFERENCES hebergement_folios(id) ON DELETE CASCADE,
  reservation_partagee_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(folio_id, reservation_partagee_id)
);
