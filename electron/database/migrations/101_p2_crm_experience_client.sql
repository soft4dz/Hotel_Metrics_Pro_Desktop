-- P2.2 — CRM 360°, fidélité, campagnes, NPS, réputation et portail client

ALTER TABLE clients_facturation ADD COLUMN date_naissance TEXT;
ALTER TABLE clients_facturation ADD COLUMN langue_preferee TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE clients_facturation ADD COLUMN vip INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients_facturation ADD COLUMN source_acquisition TEXT;

CREATE TABLE IF NOT EXISTS crm_consentements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients_facturation(id) ON DELETE CASCADE,
  finalite TEXT NOT NULL CHECK(finalite IN ('marketing_email','marketing_sms','marketing_whatsapp','profilage','enquete','portail')),
  accorde INTEGER NOT NULL,
  source TEXT NOT NULL,
  preuve TEXT,
  adresse_ip TEXT,
  version_notice TEXT,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at TEXT
);

CREATE TABLE IF NOT EXISTS crm_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  criteres_json TEXT NOT NULL DEFAULT '{}',
  dynamique INTEGER NOT NULL DEFAULT 1,
  actif INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_segment_membres (
  segment_id INTEGER NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients_facturation(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0,
  matched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(segment_id,client_id)
);

CREATE TABLE IF NOT EXISTS crm_fidelite_comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients_facturation(id),
  numero TEXT NOT NULL UNIQUE,
  niveau TEXT NOT NULL DEFAULT 'classic' CHECK(niveau IN ('classic','silver','gold','platinum')),
  points_solde INTEGER NOT NULL DEFAULT 0,
  points_vie INTEGER NOT NULL DEFAULT 0,
  date_adhesion TEXT NOT NULL DEFAULT (date('now')),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','suspendu','ferme'))
);

CREATE TABLE IF NOT EXISTS crm_fidelite_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compte_id INTEGER NOT NULL REFERENCES crm_fidelite_comptes(id),
  type TEXT NOT NULL CHECK(type IN ('gain','utilisation','expiration','ajustement')),
  points INTEGER NOT NULL,
  motif TEXT NOT NULL,
  source_type TEXT,
  source_id INTEGER,
  expires_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_campagnes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  segment_id INTEGER REFERENCES crm_segments(id),
  canal TEXT NOT NULL CHECK(canal IN ('email','sms','whatsapp','multicanal')),
  objet TEXT,
  contenu TEXT NOT NULL,
  date_planifiee TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','planifiee','en_cours','terminee','annulee')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients_facturation(id),
  campagne_id INTEGER REFERENCES crm_campagnes(id),
  reservation_id INTEGER REFERENCES reservations(id),
  canal TEXT NOT NULL CHECK(canal IN ('email','sms','whatsapp','portail')),
  direction TEXT NOT NULL DEFAULT 'out' CHECK(direction IN ('in','out')),
  destinataire TEXT NOT NULL,
  contenu TEXT NOT NULL,
  provider TEXT,
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending','sent','delivered','read','failed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS crm_enquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  nom TEXT NOT NULL,
  declencheur TEXT NOT NULL CHECK(declencheur IN ('checkout','manuel','reclamation')),
  actif INTEGER NOT NULL DEFAULT 1,
  questions_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_reponses_enquete (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquete_id INTEGER NOT NULL REFERENCES crm_enquetes(id),
  client_id INTEGER REFERENCES clients_facturation(id),
  reservation_id INTEGER REFERENCES reservations(id),
  token_hash TEXT NOT NULL UNIQUE,
  note_nps INTEGER CHECK(note_nps BETWEEN 0 AND 10),
  note_globale INTEGER CHECK(note_globale BETWEEN 1 AND 5),
  commentaire TEXT,
  reponses_json TEXT,
  statut TEXT NOT NULL DEFAULT 'invite' CHECK(statut IN ('invite','repondu','expire')),
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
);

CREATE TABLE IF NOT EXISTS crm_reputation_avis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id),
  client_id INTEGER REFERENCES clients_facturation(id),
  source TEXT NOT NULL,
  external_id TEXT,
  auteur TEXT NOT NULL,
  note REAL NOT NULL CHECK(note BETWEEN 0 AND 5),
  titre TEXT,
  commentaire TEXT,
  sentiment TEXT CHECK(sentiment IN ('positif','neutre','negatif')),
  reponse TEXT,
  repondu_par INTEGER REFERENCES users(id),
  publie_at TEXT,
  repondu_at TEXT,
  UNIQUE(source,external_id)
);

CREATE TABLE IF NOT EXISTS crm_portail_comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients_facturation(id),
  email TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'invite' CHECK(statut IN ('invite','actif','bloque','ferme')),
  activation_token_hash TEXT,
  activation_expires_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_precheckins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id),
  client_id INTEGER REFERENCES clients_facturation(id),
  token_hash TEXT NOT NULL UNIQUE,
  heure_arrivee_prevue TEXT,
  adresse TEXT,
  nationalite TEXT,
  type_document TEXT,
  numero_document TEXT,
  document_path TEXT,
  consentement_fiche_police INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'invite' CHECK(statut IN ('invite','soumis','valide','rejete','expire')),
  expires_at TEXT NOT NULL,
  submitted_at TEXT,
  validated_by INTEGER REFERENCES users(id),
  validated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_messages_queue ON crm_messages(statut,next_retry_at);
CREATE INDEX IF NOT EXISTS idx_crm_avis_hotel ON crm_reputation_avis(hotel_id,publie_at);
CREATE INDEX IF NOT EXISTS idx_crm_precheckin_statut ON crm_precheckins(statut,expires_at);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'crm.campagne.envoyer','Envoyer les campagnes CRM','crm');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'crm.reputation.repondre','Répondre aux avis clients','crm');
INSERT OR IGNORE INTO modules_config(module_id) VALUES('crm-experience-client');

