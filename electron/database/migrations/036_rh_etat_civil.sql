-- État civil & filiation employés (acte de naissance, parents)

ALTER TABLE rh_employes ADD COLUMN date_naissance TEXT;
ALTER TABLE rh_employes ADD COLUMN sexe TEXT CHECK(sexe IS NULL OR sexe IN ('M', 'F'));
ALTER TABLE rh_employes ADD COLUMN lieu_naissance_wilaya TEXT;
ALTER TABLE rh_employes ADD COLUMN lieu_naissance_commune TEXT;
ALTER TABLE rh_employes ADD COLUMN nationalite TEXT DEFAULT 'Algérienne';
ALTER TABLE rh_employes ADD COLUMN nom_pere TEXT;
ALTER TABLE rh_employes ADD COLUMN prenom_pere TEXT;
ALTER TABLE rh_employes ADD COLUMN nom_mere TEXT;
ALTER TABLE rh_employes ADD COLUMN prenom_mere TEXT;
ALTER TABLE rh_employes ADD COLUMN situation_familiale TEXT
  CHECK(situation_familiale IS NULL OR situation_familiale IN ('celibataire','marie','divorce','veuf'));
ALTER TABLE rh_employes ADD COLUMN numero_acte_naissance TEXT;
