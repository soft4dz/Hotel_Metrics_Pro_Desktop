ALTER TABLE ged_documents ADD COLUMN parent_document_id INTEGER REFERENCES ged_documents(id);
ALTER TABLE ged_documents ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ged_documents ADD COLUMN content_hash TEXT;
ALTER TABLE ged_documents ADD COLUMN is_current INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_ged_versions ON ged_documents(parent_document_id,version_number DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ged_current_version ON ged_documents(parent_document_id) WHERE parent_document_id IS NOT NULL AND is_current=1;

CREATE TABLE IF NOT EXISTS ged_ocr_jobs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,document_id INTEGER NOT NULL UNIQUE REFERENCES ged_documents(id),
 statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente','en_cours','termine','erreur')),
 langue TEXT NOT NULL DEFAULT 'fra',texte_extrait TEXT,confidence REAL,error_message TEXT,
 requested_by INTEGER REFERENCES users(id),requested_at TEXT NOT NULL DEFAULT(datetime('now')),
 processed_at TEXT,updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE VIRTUAL TABLE IF NOT EXISTS ged_ocr_fts USING fts5(document_id UNINDEXED,texte_extrait,tokenize='unicode61');

CREATE TABLE IF NOT EXISTS ged_signatures (
 id INTEGER PRIMARY KEY AUTOINCREMENT,document_id INTEGER NOT NULL REFERENCES ged_documents(id),
 signataire_id INTEGER NOT NULL REFERENCES users(id),signataire_nom TEXT NOT NULL,role_code TEXT NOT NULL,
 type_signature TEXT NOT NULL DEFAULT 'interne' CHECK(type_signature IN ('interne','externe_qualifiee')),
 document_hash TEXT NOT NULL,signature_hash TEXT NOT NULL,motif TEXT,
 statut TEXT NOT NULL DEFAULT 'valide' CHECK(statut IN ('valide','revoquee')),
 signed_at TEXT NOT NULL,revoked_at TEXT,revoked_by INTEGER REFERENCES users(id),
 UNIQUE(document_id,signataire_id,statut)
);
CREATE INDEX IF NOT EXISTS idx_ged_signatures_doc ON ged_signatures(document_id,signed_at DESC);

