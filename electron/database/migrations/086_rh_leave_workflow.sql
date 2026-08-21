ALTER TABLE rh_absences ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
ALTER TABLE rh_absences ADD COLUMN cancelled_at TEXT;
ALTER TABLE rh_absences ADD COLUMN decision_comment TEXT;
CREATE INDEX IF NOT EXISTS idx_rh_absences_overlap ON rh_absences(employe_id, date_debut, date_fin, statut);

CREATE TABLE IF NOT EXISTS rh_teledeclarations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_declaration TEXT NOT NULL CHECK(type_declaration IN ('DAS','DADS_U','CNAS','ANEM','VIREMENTS')),
  periode TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'preparee' CHECK(statut IN ('preparee','exportee','deposee','acceptee','rejetee')),
  fichier_path TEXT,
  reference_depot TEXT,
  error_message TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(type_declaration, periode)
);
CREATE INDEX IF NOT EXISTS idx_rh_teledecl_periode ON rh_teledeclarations(periode DESC, type_declaration);

