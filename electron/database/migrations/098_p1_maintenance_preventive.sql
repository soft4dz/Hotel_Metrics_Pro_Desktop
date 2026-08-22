-- P1.6 — Maintenance préventive, SLA, contrats et pièces

CREATE TABLE IF NOT EXISTS maintenance_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  equipement_id INTEGER NOT NULL REFERENCES equipements(id),
  code TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  frequence TEXT NOT NULL CHECK(frequence IN ('quotidienne','hebdomadaire','mensuelle','trimestrielle','semestrielle','annuelle')),
  intervalle INTEGER NOT NULL DEFAULT 1 CHECK(intervalle > 0),
  prochaine_date TEXT NOT NULL,
  priorite TEXT NOT NULL DEFAULT 'normale',
  sla_heures INTEGER NOT NULL DEFAULT 72 CHECK(sla_heures > 0),
  technicien_id INTEGER REFERENCES users(id),
  actif INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id,code)
);

ALTER TABLE interventions ADD COLUMN plan_id INTEGER REFERENCES maintenance_plans(id);
ALTER TABLE interventions ADD COLUMN numero_ot TEXT;
ALTER TABLE interventions ADD COLUMN sla_echeance TEXT;
ALTER TABLE interventions ADD COLUMN sla_statut TEXT NOT NULL DEFAULT 'dans_delai' CHECK(sla_statut IN ('dans_delai','a_risque','depasse','respecte'));
ALTER TABLE interventions ADD COLUMN temps_arret_heures REAL NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intervention_numero_ot ON interventions(numero_ot) WHERE numero_ot IS NOT NULL;

CREATE TABLE IF NOT EXISTS maintenance_pieces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id INTEGER NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  magasin_id INTEGER NOT NULL REFERENCES stock_magasins(id),
  produit_id INTEGER NOT NULL REFERENCES stock_produits(id),
  quantite REAL NOT NULL CHECK(quantite > 0),
  cout_unitaire REAL NOT NULL DEFAULT 0,
  cout_total REAL NOT NULL DEFAULT 0,
  sortie_par INTEGER REFERENCES users(id),
  sortie_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_contrats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  equipement_id INTEGER REFERENCES equipements(id),
  fournisseur_id INTEGER REFERENCES fournisseurs(id),
  type TEXT NOT NULL CHECK(type IN ('maintenance','garantie','location')),
  numero TEXT NOT NULL,
  prestataire TEXT NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  montant_annuel REAL NOT NULL DEFAULT 0,
  delai_intervention_heures INTEGER,
  contact TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','expire','resilie')),
  document_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hotel_id,numero)
);

CREATE TABLE IF NOT EXISTS maintenance_temps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id INTEGER NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  technicien_id INTEGER NOT NULL REFERENCES users(id),
  date_travail TEXT NOT NULL,
  heures REAL NOT NULL CHECK(heures > 0),
  taux_horaire REAL NOT NULL DEFAULT 0,
  cout_total REAL NOT NULL DEFAULT 0,
  commentaire TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_due ON maintenance_plans(actif,prochaine_date);
CREATE INDEX IF NOT EXISTS idx_interventions_sla ON interventions(hotel_id,sla_echeance,statut);
CREATE INDEX IF NOT EXISTS idx_contrats_fin ON maintenance_contrats(hotel_id,date_fin);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'maintenance.plan.gerer','Gérer les plans de maintenance','maintenance');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'maintenance.piece.sortir','Sortir les pièces de maintenance','maintenance');

