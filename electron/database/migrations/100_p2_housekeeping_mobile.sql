-- P2.1 — Housekeeping mobile, inspections, minibar, lingerie et objets trouvés

ALTER TABLE housekeeping_taches ADD COLUMN charge_points INTEGER NOT NULL DEFAULT 1;
ALTER TABLE housekeeping_taches ADD COLUMN superviseur_id INTEGER REFERENCES users(id);
ALTER TABLE housekeeping_taches ADD COLUMN mobile_updated_at TEXT;
ALTER TABLE housekeeping_taches ADD COLUMN priorite INTEGER NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS housekeeping_inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tache_id INTEGER NOT NULL REFERENCES housekeeping_taches(id) ON DELETE CASCADE,
  superviseur_id INTEGER NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  statut TEXT NOT NULL CHECK(statut IN ('approuvee','rejetee','a_reprendre')),
  commentaire TEXT,
  inspected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS housekeeping_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tache_id INTEGER NOT NULL REFERENCES housekeeping_taches(id) ON DELETE CASCADE,
  inspection_id INTEGER REFERENCES housekeeping_inspections(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL CHECK(categorie IN ('avant','apres','anomalie','objet_trouve','minibar')),
  file_path TEXT NOT NULL,
  commentaire TEXT,
  captured_by INTEGER REFERENCES users(id),
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS housekeeping_minibar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tache_id INTEGER NOT NULL REFERENCES housekeeping_taches(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id),
  produit_id INTEGER REFERENCES stock_produits(id),
  magasin_id INTEGER REFERENCES stock_magasins(id),
  designation TEXT NOT NULL,
  quantite REAL NOT NULL CHECK(quantite > 0),
  prix_unitaire REAL NOT NULL CHECK(prix_unitaire >= 0),
  montant_total REAL NOT NULL,
  facturee INTEGER NOT NULL DEFAULT 0,
  releve_par INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS housekeeping_linge_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  stock_propre REAL NOT NULL DEFAULT 0,
  stock_sale REAL NOT NULL DEFAULT 0,
  stock_blanchisserie REAL NOT NULL DEFAULT 0,
  seuil_alerte REAL NOT NULL DEFAULT 0,
  UNIQUE(hotel_id,code)
);

CREATE TABLE IF NOT EXISTS housekeeping_linge_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES housekeeping_linge_articles(id),
  tache_id INTEGER REFERENCES housekeeping_taches(id),
  type TEXT NOT NULL CHECK(type IN ('distribution','collecte_sale','envoi_blanchisserie','retour_blanchisserie','rebut','ajustement')),
  quantite REAL NOT NULL CHECK(quantite > 0),
  date_mouvement TEXT NOT NULL DEFAULT (date('now')),
  reference TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS housekeeping_objets_trouves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  chambre_id INTEGER REFERENCES chambres(id),
  tache_id INTEGER REFERENCES housekeeping_taches(id),
  numero TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  categorie TEXT,
  lieu_stockage TEXT NOT NULL,
  proprietaire TEXT,
  contact TEXT,
  statut TEXT NOT NULL DEFAULT 'conserve' CHECK(statut IN ('conserve','restitue','transfere_police','detruit','donne')),
  trouve_par INTEGER REFERENCES users(id),
  trouve_at TEXT NOT NULL DEFAULT (datetime('now')),
  restitue_at TEXT,
  preuve_restitution TEXT
);

CREATE TABLE IF NOT EXISTS housekeeping_blocages_chambres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chambre_id INTEGER NOT NULL REFERENCES chambres(id),
  motif_code TEXT NOT NULL CHECK(motif_code IN ('maintenance','hygiene','nuisible','sinistre','inventaire','securite','autre')),
  motif_detail TEXT NOT NULL,
  date_debut TEXT NOT NULL DEFAULT (datetime('now')),
  date_fin_prevue TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','leve')),
  bloque_par INTEGER REFERENCES users(id),
  leve_par INTEGER REFERENCES users(id),
  leve_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hk_planning_mobile ON housekeeping_taches(hotel_id,date_prevue,assignee_id,statut);
CREATE INDEX IF NOT EXISTS idx_hk_objets_statut ON housekeeping_objets_trouves(hotel_id,statut,trouve_at);
CREATE INDEX IF NOT EXISTS idx_hk_blocages_actifs ON housekeeping_blocages_chambres(statut,date_fin_prevue);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hk_blocage_unique_actif ON housekeeping_blocages_chambres(chambre_id) WHERE statut='actif';

CREATE TRIGGER IF NOT EXISTS trg_housekeeping_inspection_required
BEFORE UPDATE OF statut ON housekeeping_taches
WHEN NEW.statut='terminee' AND OLD.statut!='terminee'
 AND NOT EXISTS(SELECT 1 FROM housekeeping_inspections i WHERE i.tache_id=NEW.id AND i.statut='approuvee')
BEGIN SELECT RAISE(ABORT,'Inspection superviseur approuvée requise'); END;

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'housekeeping.planifier','Planifier et équilibrer le housekeeping','housekeeping');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'housekeeping.inspecter','Inspecter et libérer les chambres','housekeeping');
