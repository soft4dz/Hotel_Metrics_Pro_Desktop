-- Lot 1 RH — Paie certifiable : HS, retenues absences, détail bulletin

ALTER TABLE rh_bulletins ADD COLUMN brut_base REAL NOT NULL DEFAULT 0;
ALTER TABLE rh_bulletins ADD COLUMN heures_sup REAL NOT NULL DEFAULT 0;
ALTER TABLE rh_bulletins ADD COLUMN montant_hs REAL NOT NULL DEFAULT 0;
ALTER TABLE rh_bulletins ADD COLUMN retenue_absence REAL NOT NULL DEFAULT 0;
ALTER TABLE rh_bulletins ADD COLUMN jours_absence_non_remuneree REAL NOT NULL DEFAULT 0;
