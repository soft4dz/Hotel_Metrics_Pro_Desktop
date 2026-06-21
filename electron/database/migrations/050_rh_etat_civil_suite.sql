-- État civil — suite : groupe sanguin, conjoint, enfants détaillés

ALTER TABLE rh_employes ADD COLUMN groupe_sanguin TEXT
  CHECK(groupe_sanguin IS NULL OR groupe_sanguin IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
ALTER TABLE rh_employes ADD COLUMN conjoint_prenom TEXT;
ALTER TABLE rh_employes ADD COLUMN conjoint_nom TEXT;
ALTER TABLE rh_employes ADD COLUMN date_mariage TEXT;
ALTER TABLE rh_employes ADD COLUMN enfants_scolarises INTEGER NOT NULL DEFAULT 0;
