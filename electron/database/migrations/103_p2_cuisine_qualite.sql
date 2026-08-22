-- P2.4 — HACCP, allergènes, gaspillage, coûts et traçabilité alimentaire

CREATE TABLE IF NOT EXISTS cuisine_haccp_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL, nom TEXT NOT NULL, zone TEXT NOT NULL, frequence TEXT NOT NULL DEFAULT 'quotidien',
  actif INTEGER NOT NULL DEFAULT 1, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT(datetime('now')),
  UNIQUE(hotel_id,code)
);
CREATE TABLE IF NOT EXISTS cuisine_haccp_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL REFERENCES cuisine_haccp_plans(id) ON DELETE CASCADE,
  code TEXT NOT NULL, libelle TEXT NOT NULL, type_controle TEXT NOT NULL CHECK(type_controle IN ('oui_non','temperature','texte','nombre')),
  limite_min REAL, limite_max REAL, critique INTEGER NOT NULL DEFAULT 0, ordre INTEGER NOT NULL DEFAULT 0,
  UNIQUE(plan_id,code)
);
CREATE TABLE IF NOT EXISTS cuisine_haccp_controles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, point_id INTEGER NOT NULL REFERENCES cuisine_haccp_points(id),
  date_controle TEXT NOT NULL DEFAULT(datetime('now')), valeur_texte TEXT, valeur_nombre REAL,
  conforme INTEGER NOT NULL, observation TEXT, action_corrective TEXT, photo_path TEXT,
  statut_action TEXT NOT NULL DEFAULT 'aucune' CHECK(statut_action IN ('aucune','ouverte','traitee','verifiee')),
  controle_par INTEGER REFERENCES users(id), traite_par INTEGER REFERENCES users(id), traite_at TEXT
);

CREATE TABLE IF NOT EXISTS cuisine_equipements_temperature (
  id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER NOT NULL REFERENCES hotels(id), code TEXT NOT NULL, nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('chambre_froide','congelateur','refrigerateur','cuisson','maintien_chaud','reception','autre')),
  temperature_min REAL NOT NULL, temperature_max REAL NOT NULL, actif INTEGER NOT NULL DEFAULT 1, UNIQUE(hotel_id,code)
);
CREATE TABLE IF NOT EXISTS cuisine_temperatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT, equipement_id INTEGER NOT NULL REFERENCES cuisine_equipements_temperature(id),
  lot_id INTEGER REFERENCES stock_lots(id), temperature REAL NOT NULL, mesure_at TEXT NOT NULL DEFAULT(datetime('now')),
  conforme INTEGER NOT NULL, action_corrective TEXT, photo_path TEXT, mesure_par INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cuisine_allergenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, nom TEXT NOT NULL, description TEXT
);
INSERT OR IGNORE INTO cuisine_allergenes(code,nom) VALUES
('GLUTEN','Céréales contenant du gluten'),('CRUSTACES','Crustacés'),('OEUFS','Œufs'),('POISSON','Poissons'),
('ARACHIDES','Arachides'),('SOJA','Soja'),('LAIT','Lait'),('FRUITS_COQUE','Fruits à coque'),('CELERI','Céleri'),
('MOUTARDE','Moutarde'),('SESAME','Sésame'),('SULFITES','Anhydride sulfureux et sulfites'),('LUPIN','Lupin'),('MOLLUSQUES','Mollusques');
CREATE TABLE IF NOT EXISTS cuisine_produit_allergenes (
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id) ON DELETE CASCADE,
  allergene_id INTEGER NOT NULL REFERENCES cuisine_allergenes(id), presence TEXT NOT NULL DEFAULT 'contient' CHECK(presence IN ('contient','traces_possibles')),
  PRIMARY KEY(produit_id,allergene_id)
);
CREATE TABLE IF NOT EXISTS cuisine_recette_allergenes (
  recette_id INTEGER NOT NULL REFERENCES cuisine_recettes(id) ON DELETE CASCADE,
  allergene_id INTEGER NOT NULL REFERENCES cuisine_allergenes(id), source TEXT NOT NULL DEFAULT 'manuel' CHECK(source IN ('ingredient','manuel')),
  PRIMARY KEY(recette_id,allergene_id)
);

CREATE TABLE IF NOT EXISTS cuisine_gaspillage (
  id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER NOT NULL REFERENCES hotels(id), recette_id INTEGER REFERENCES cuisine_recettes(id),
  produit_id INTEGER REFERENCES stock_produits(id), lot_id INTEGER REFERENCES stock_lots(id), type TEXT NOT NULL CHECK(type IN ('preparation','surproduction','retour_assiette','peremption','casse','autre')),
  quantite REAL NOT NULL CHECK(quantite>0), unite TEXT NOT NULL, cout_unitaire REAL NOT NULL DEFAULT 0,
  montant_perte REAL NOT NULL DEFAULT 0, motif TEXT, date_journal TEXT NOT NULL DEFAULT(date('now')), saisi_par INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT(datetime('now'))
);

CREATE TABLE IF NOT EXISTS cuisine_tracabilite (
  id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  lot_source_id INTEGER REFERENCES stock_lots(id), ordre_production_id INTEGER REFERENCES cuisine_ordres_production(id),
  recette_id INTEGER REFERENCES cuisine_recettes(id), ticket_id INTEGER REFERENCES pos_tickets(id),
  lot_production TEXT, type_etape TEXT NOT NULL CHECK(type_etape IN ('reception','consommation','production','vente','retrait','destruction')),
  quantite REAL, reference TEXT, details_json TEXT, created_at TEXT NOT NULL DEFAULT(datetime('now')), created_by INTEGER REFERENCES users(id)
);

ALTER TABLE cuisine_ordres_production ADD COLUMN cout_reel REAL;
ALTER TABLE cuisine_ordres_production ADD COLUMN ecart_cout REAL;
ALTER TABLE cuisine_ordres_production ADD COLUMN lot_production TEXT;

CREATE INDEX IF NOT EXISTS idx_haccp_controles_date ON cuisine_haccp_controles(date_controle,conforme);
CREATE INDEX IF NOT EXISTS idx_temperatures_equipement ON cuisine_temperatures(equipement_id,mesure_at);
CREATE INDEX IF NOT EXISTS idx_gaspillage_hotel_date ON cuisine_gaspillage(hotel_id,date_journal);
CREATE INDEX IF NOT EXISTS idx_trace_lot ON cuisine_tracabilite(lot_source_id,ordre_production_id,ticket_id);
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'cuisine.haccp.controler','Réaliser les contrôles HACCP','cuisine');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'cuisine.qualite.superviser','Superviser la qualité cuisine','cuisine');
INSERT OR IGNORE INTO modules_config(module_id) VALUES('cuisine-qualite');

