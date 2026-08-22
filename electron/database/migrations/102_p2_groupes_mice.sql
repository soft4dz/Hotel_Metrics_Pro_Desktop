-- P2.3 — Groupes, rooming lists, allotements et MICE

CREATE TABLE IF NOT EXISTS pms_groupe_allotements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupe_id INTEGER NOT NULL REFERENCES pms_groupes(id) ON DELETE CASCADE,
  type_chambre_id INTEGER NOT NULL REFERENCES types_chambres(id),
  quantite INTEGER NOT NULL CHECK(quantite > 0),
  tarif_negocie REAL NOT NULL DEFAULT 0 CHECK(tarif_negocie >= 0),
  date_release TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','libere','ferme')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(groupe_id,type_chambre_id)
);

CREATE TABLE IF NOT EXISTS pms_rooming_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupe_id INTEGER NOT NULL REFERENCES pms_groupes(id) ON DELETE CASCADE,
  ligne_no INTEGER NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  type_chambre_id INTEGER REFERENCES types_chambres(id),
  chambre_id INTEGER REFERENCES chambres(id),
  date_arrivee TEXT NOT NULL,
  date_depart TEXT NOT NULL,
  nb_adultes INTEGER NOT NULL DEFAULT 1,
  nb_enfants INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  statut TEXT NOT NULL DEFAULT 'a_valider' CHECK(statut IN ('a_valider','valide','reserve','erreur','annule')),
  erreur TEXT,
  reservation_id INTEGER REFERENCES reservations(id),
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(groupe_id,ligne_no)
);

CREATE TABLE IF NOT EXISTS mice_espaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'conference' CHECK(type IN ('conference','banquet','reunion','exposition','plein_air','autre')),
  capacite_theatre INTEGER NOT NULL DEFAULT 0,
  capacite_classe INTEGER NOT NULL DEFAULT 0,
  capacite_banquet INTEGER NOT NULL DEFAULT 0,
  tarif_heure REAL NOT NULL DEFAULT 0,
  tarif_journee REAL NOT NULL DEFAULT 0,
  equipements_json TEXT NOT NULL DEFAULT '[]',
  actif INTEGER NOT NULL DEFAULT 1,
  UNIQUE(hotel_id,code)
);

CREATE TABLE IF NOT EXISTS mice_evenements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  groupe_id INTEGER REFERENCES pms_groupes(id),
  client_id INTEGER REFERENCES clients_facturation(id),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('seminaire','conference','mariage','banquet','reunion','salon','autre')),
  debut TEXT NOT NULL,
  fin TEXT NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'prospect' CHECK(statut IN ('prospect','option','confirme','en_cours','termine','annule')),
  contact_nom TEXT,
  contact_email TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mice_reservations_espaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL REFERENCES mice_evenements(id) ON DELETE CASCADE,
  espace_id INTEGER NOT NULL REFERENCES mice_espaces(id),
  debut TEXT NOT NULL,
  fin TEXT NOT NULL,
  disposition TEXT NOT NULL DEFAULT 'theatre',
  participants INTEGER NOT NULL DEFAULT 1,
  temps_montage_minutes INTEGER NOT NULL DEFAULT 0,
  temps_demontage_minutes INTEGER NOT NULL DEFAULT 0,
  tarif REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'option' CHECK(statut IN ('option','confirme','annule')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mice_devis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL REFERENCES mice_evenements(id),
  numero TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','envoye','accepte','refuse','expire')),
  valide_jusquau TEXT,
  montant_ht REAL NOT NULL DEFAULT 0,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  conditions TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mice_devis_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id INTEGER NOT NULL REFERENCES mice_devis(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL CHECK(categorie IN ('salle','hebergement','restauration','audiovisuel','animation','transport','autre')),
  designation TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1 CHECK(quantite > 0),
  prix_unitaire REAL NOT NULL DEFAULT 0 CHECK(prix_unitaire >= 0),
  taux_tva REAL NOT NULL DEFAULT 19 CHECK(taux_tva >= 0),
  montant_ht REAL NOT NULL DEFAULT 0,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mice_beo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL REFERENCES mice_evenements(id),
  numero TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','diffuse','valide','annule')),
  programme_json TEXT NOT NULL DEFAULT '[]',
  menu_json TEXT NOT NULL DEFAULT '[]',
  mise_en_place_json TEXT NOT NULL DEFAULT '{}',
  audiovisuel_json TEXT NOT NULL DEFAULT '[]',
  consignes TEXT,
  contacts_json TEXT NOT NULL DEFAULT '[]',
  diffuse_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mice_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL REFERENCES mice_evenements(id),
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1 CHECK(quantite > 0),
  prix_unitaire REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 19,
  montant_ht REAL NOT NULL DEFAULT 0,
  montant_tva REAL NOT NULL DEFAULT 0,
  montant_ttc REAL NOT NULL DEFAULT 0,
  facture_id INTEGER REFERENCES factures(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rooming_groupe ON pms_rooming_list(groupe_id,statut);
CREATE INDEX IF NOT EXISTS idx_mice_evenements_hotel ON mice_evenements(hotel_id,debut,fin);
CREATE INDEX IF NOT EXISTS idx_mice_espace_planning ON mice_reservations_espaces(espace_id,debut,fin,statut);
CREATE INDEX IF NOT EXISTS idx_mice_charges_event ON mice_charges(evenement_id,facture_id);
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'mice.gerer','Gérer les groupes et événements MICE','mice');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'mice.facturer','Facturer les événements MICE','mice');
INSERT OR IGNORE INTO modules_config(module_id) VALUES('groupes-mice');

