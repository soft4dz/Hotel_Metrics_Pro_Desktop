-- Migration 033 : Jeu de données démo RH (idempotent, uniquement si marqueur absent)

PRAGMA foreign_keys = ON;

-- ── Employés démo ───────────────────────────────────────────────────────────

INSERT INTO rh_employes (
  nom, prenom, email_personnel, telephone, date_embauche, statut_rh,
  poste_actuel_id, hotel_id, nin, nss, rib, wilaya, commune, enfants_charge
)
SELECT
  'Benali', 'Karim', 'demo.chef@hotel.local', '0555123401', date('now', '-3 years'), 'actif',
  (SELECT id FROM rh_postes WHERE nom LIKE 'Chef de département%' LIMIT 1),
  (SELECT id FROM hotels ORDER BY id LIMIT 1),
  '1234567890123456', '1234567890123', '007999990000000012345601', 'Alger', 'Hydra', 2
WHERE NOT EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.chef@hotel.local')
  AND EXISTS (SELECT 1 FROM hotels LIMIT 1)
  AND EXISTS (SELECT 1 FROM rh_postes LIMIT 1);

INSERT INTO rh_employes (
  nom, prenom, email_personnel, telephone, date_embauche, statut_rh,
  poste_actuel_id, hotel_id, nin, nss, rib, wilaya, commune, enfants_charge, responsable_employe_id
)
SELECT
  'Meziane', 'Amina', 'demo.amina@hotel.local', '0555123402', date('now', '-18 months'), 'actif',
  (SELECT id FROM rh_postes WHERE nom = 'Réceptionniste' LIMIT 1),
  (SELECT id FROM hotels ORDER BY id LIMIT 1),
  '2345678901234567', '2345678901234', '007999990000000012345602', 'Alger', 'Kouba', 0,
  (SELECT id FROM rh_employes WHERE email_personnel = 'demo.chef@hotel.local')
WHERE NOT EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.amina@hotel.local')
  AND EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.chef@hotel.local');

INSERT INTO rh_employes (
  nom, prenom, email_personnel, telephone, date_embauche, statut_rh,
  poste_actuel_id, hotel_id, nin, nss, rib, wilaya, commune, enfants_charge, responsable_employe_id
)
SELECT
  'Khelifi', 'Omar', 'demo.omar@hotel.local', '0555123403', date('now', '-8 months'), 'actif',
  (SELECT id FROM rh_postes WHERE nom = 'Réceptionniste' LIMIT 1),
  (SELECT id FROM hotels ORDER BY id LIMIT 1),
  '3456789012345678', '3456789012345', '007999990000000012345603', 'Blida', 'Blida', 1,
  (SELECT id FROM rh_employes WHERE email_personnel = 'demo.chef@hotel.local')
WHERE NOT EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.omar@hotel.local')
  AND EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.chef@hotel.local');

INSERT INTO rh_employes (
  nom, prenom, email_personnel, telephone, date_embauche, statut_rh,
  poste_actuel_id, hotel_id, nin, nss, rib, wilaya, commune, enfants_charge
)
SELECT
  'Boudiaf', 'Samira', 'demo.rh@hotel.local', '0555123404', date('now', '-5 years'), 'actif',
  (SELECT id FROM rh_postes WHERE nom = 'Responsable RH' LIMIT 1),
  (SELECT id FROM hotels ORDER BY id LIMIT 1),
  '4567890123456789', '4567890123456', '007999990000000012345604', 'Alger', 'Bab Ezzouar', 3
WHERE NOT EXISTS (SELECT 1 FROM rh_employes WHERE email_personnel = 'demo.rh@hotel.local')
  AND EXISTS (SELECT 1 FROM hotels LIMIT 1);

-- ── Contrats & affectations ───────────────────────────────────────────────────

INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, salaire_brut, heures_hebdo, actif)
SELECT e.id, e.poste_actuel_id, 'CDI', e.date_embauche, 75000, 40, 1
FROM rh_employes e
WHERE e.email_personnel = 'demo.chef@hotel.local'
  AND NOT EXISTS (SELECT 1 FROM rh_contrats c WHERE c.employe_id = e.id AND c.actif = 1);

INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, salaire_brut, heures_hebdo, actif)
SELECT e.id, e.poste_actuel_id, 'CDI', e.date_embauche, 42000, 40, 1
FROM rh_employes e
WHERE e.email_personnel IN ('demo.amina@hotel.local', 'demo.omar@hotel.local')
  AND NOT EXISTS (SELECT 1 FROM rh_contrats c WHERE c.employe_id = e.id AND c.actif = 1);

INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, salaire_brut, heures_hebdo, actif)
SELECT e.id, e.poste_actuel_id, 'CDI', e.date_embauche, 85000, 40, 1
FROM rh_employes e
WHERE e.email_personnel = 'demo.rh@hotel.local'
  AND NOT EXISTS (SELECT 1 FROM rh_contrats c WHERE c.employe_id = e.id AND c.actif = 1);

INSERT INTO rh_affectations (employe_id, hotel_id, poste_id, date_debut, statut)
SELECT e.id, e.hotel_id, e.poste_actuel_id, e.date_embauche, 'active'
FROM rh_employes e
WHERE e.email_personnel LIKE 'demo.%@hotel.local'
  AND e.hotel_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rh_affectations a
    WHERE a.employe_id = e.id AND a.statut = 'active'
  );

-- ── Équipe N+1 (chef → membres) ───────────────────────────────────────────────

INSERT OR IGNORE INTO rh_equipes (chef_employe_id, membre_employe_id, hotel_id)
SELECT chef.id, membre.id, chef.hotel_id
FROM rh_employes chef
JOIN rh_employes membre ON membre.email_personnel IN ('demo.amina@hotel.local', 'demo.omar@hotel.local')
WHERE chef.email_personnel = 'demo.chef@hotel.local';

-- ── Suivi conformité & onboarding ─────────────────────────────────────────────

INSERT OR IGNORE INTO rh_conformite_suivi (employe_id, code, libelle, statut)
SELECT e.id, v.code, v.libelle, 'a_faire'
FROM rh_employes e
CROSS JOIN (
  SELECT 'anem' AS code, 'Déclaration embauche ANEM (48h)' AS libelle UNION ALL
  SELECT 'visite_med', 'Visite médicale d''embauche' UNION ALL
  SELECT 'contrat_signe', 'Contrat signé et archivé' UNION ALL
  SELECT 'cnas_affiliation', 'Affiliation CNAS / NSS'
) v
WHERE e.email_personnel LIKE 'demo.%@hotel.local';

INSERT OR IGNORE INTO rh_onboarding_suivi (employe_id, step_code, statut)
SELECT e.id, m.code, 'a_faire'
FROM rh_employes e
CROSS JOIN rh_onboarding_modeles m
WHERE e.email_personnel LIKE 'demo.%@hotel.local';

-- ── Pointage en attente N+1 (démo validations) ────────────────────────────────

INSERT INTO rh_pointages (employe_id, date, heure_entree, heure_sortie, heures_travaillees, statut, statut_n1)
SELECT e.id, date('now'), '08:00', '17:00', 8, 'soumis', 'en_attente'
FROM rh_employes e
WHERE e.email_personnel = 'demo.amina@hotel.local'
  AND NOT EXISTS (
    SELECT 1 FROM rh_pointages p
    WHERE p.employe_id = e.id AND p.date = date('now') AND p.statut = 'soumis'
  );

-- ── Absence en attente N+1 ────────────────────────────────────────────────────

INSERT INTO rh_absences (employe_id, type, date_debut, date_fin, motif, statut, statut_n1)
SELECT e.id, 'CP', date('now', '+7 days'), date('now', '+9 days'), 'Congés familiaux', 'demandee', 'en_attente'
FROM rh_employes e
WHERE e.email_personnel = 'demo.omar@hotel.local'
  AND NOT EXISTS (
    SELECT 1 FROM rh_absences a
    WHERE a.employe_id = e.id AND a.statut = 'demandee' AND a.statut_n1 = 'en_attente'
  );
