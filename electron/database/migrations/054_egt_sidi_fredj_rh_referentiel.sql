-- Migration 054 : Référentiel RH cible EGT Sidi Fredj
-- Directions, départements et postes de base pour alimenter RH > Référentiel.
-- Migration idempotente : peut être rejouée sans dupliquer les lignes grâce aux contraintes UNIQUE existantes.

PRAGMA foreign_keys = ON;

-- ── Directions / fonctions siège ─────────────────────────────────────────────

INSERT OR IGNORE INTO rh_directions (nom, code, description) VALUES
  ('Présidence Direction Générale', 'PDG', 'Présidence, direction générale, gouvernance et coordination stratégique'),
  ('Direction de l''Exploitation et du Contrôle', 'DEC', 'Pilotage de l''exploitation, contrôle quotidien, reporting et coordination des unités'),
  ('Direction RH & Moyens Généraux', 'DRHMG', 'Administration du personnel, paie, développement RH, moyens généraux et social'),
  ('Direction Finances & Comptabilité', 'DFC', 'Comptabilité, finances, trésorerie, budget, caisse et recouvrement'),
  ('Direction Commerce & Marketing', 'DCM', 'Commercial, marketing, communication, conventions, partenariats et réservations'),
  ('Direction Équipement & Maintenance', 'DEM', 'Maintenance, investissements, équipements, travaux et contrôle technique'),
  ('Direction Qualité', 'DQ', 'Qualité, procédures, réclamations, conformité, hygiène et amélioration continue'),
  ('Direction Informatique', 'DSI', 'Systèmes d''information, support applicatif, réseaux, sécurité informatique et digitalisation'),
  ('Fonction Sécurité', 'SEC', 'Sécurité générale, surveillance, contrôle d''accès et sûreté des sites'),
  ('Fonction Audit Interne', 'AUDIT', 'Audit interne, contrôle interne, risques et suivi des recommandations'),
  ('Fonction Juridique & Contentieux', 'DJC', 'Juridique, contentieux, contrats, assurances et marchés'),
  ('Fonction Achats & Approvisionnements', 'DA', 'Achats, fournisseurs, approvisionnements, stocks et magasins'),
  ('Direction des Unités', 'DUNITES', 'Management opérationnel des hôtels, centre touristique, club Azur Plage et port de plaisance');

-- ── Départements / services rattachés ───────────────────────────────────────

WITH deps(nom, direction_code, description) AS (
  VALUES
    ('Cabinet PDG', 'PDG', 'Cabinet, assistance et coordination de la direction générale'),
    ('Secrétariat Général', 'PDG', 'Courrier, secrétariat, classement et suivi administratif'),
    ('Conseil d''Administration & Gouvernance', 'PDG', 'Préparation CA, PV, décisions, suivi des résolutions'),

    ('Contrôle d''exploitation', 'DEC', 'Contrôle quotidien des recettes, activités et indicateurs d''exploitation'),
    ('Reporting & tableaux de bord', 'DEC', 'Tableaux de bord, consolidations, analyses et reporting périodique'),
    ('Inspection unités', 'DEC', 'Visites, constats, réserves, suivi des actions correctives dans les unités'),

    ('RH Administration & Paie', 'DRHMG', 'Administration RH, paie, contrats, dossiers employés et déclarations'),
    ('Développement RH & Formation', 'DRHMG', 'Recrutement, formation, compétences, carrières et mobilité'),
    ('Moyens généraux & archives', 'DRHMG', 'Moyens généraux, archives, fournitures, logistique interne'),
    ('Social', 'DRHMG', 'Affaires sociales, médecine du travail, suivi social du personnel'),

    ('Comptabilité générale', 'DFC', 'Comptabilité générale, écritures, états financiers et rapprochements'),
    ('Trésorerie & caisse', 'DFC', 'Banques, caisse, paiements, encaissements et suivi liquidités'),
    ('Budget & contrôle budgétaire', 'DFC', 'Budgets, prévisions, engagements et analyse des écarts'),
    ('Recouvrement', 'DFC', 'Créances, relances, suivi clients et recouvrement'),

    ('Marketing & communication', 'DCM', 'Communication, image, réseaux sociaux, campagnes et supports'),
    ('Commercial & partenariats', 'DCM', 'Prospection, conventions, partenariats, sponsoring et relations clients'),
    ('Réservations & conventions', 'DCM', 'Réservations groupe, agences, entreprises, allotements et conventions tarifaires'),

    ('Maintenance préventive', 'DEM', 'Planification et suivi des opérations de maintenance préventive'),
    ('Travaux & investissement', 'DEM', 'Travaux, investissements, projets techniques et suivi des chantiers'),
    ('Équipements techniques', 'DEM', 'Équipements, installations, interventions techniques et dépannage'),
    ('Contrôle technique', 'DEM', 'Audits techniques, conformité, réserves et réception des travaux'),

    ('Qualité & procédures', 'DQ', 'Système qualité, procédures, modes opératoires et amélioration continue'),
    ('Réclamations clients', 'DQ', 'Traitement des doléances, suivi satisfaction et actions correctives'),
    ('Hygiène & conformité', 'DQ', 'Hygiène, salubrité, conformité réglementaire et contrôles internes'),

    ('Systèmes & réseaux', 'DSI', 'Infrastructure, réseaux, postes, sécurité et maintenance informatique'),
    ('Applications & support', 'DSI', 'Applications métiers, support utilisateurs, PMS, logiciels et digitalisation'),
    ('Sécurité informatique', 'DSI', 'Cybersécurité, sauvegardes, accès, mots de passe et protection des données'),

    ('Sécurité générale', 'SEC', 'Surveillance générale, sûreté, rondes et sécurité des personnes et biens'),
    ('Surveillance & accès', 'SEC', 'Contrôle d''accès, filtrage, badges, postes et consignes de sécurité'),

    ('Audit interne', 'AUDIT', 'Missions d''audit, contrôle interne, vérifications et recommandations'),
    ('Gestion des risques', 'AUDIT', 'Cartographie des risques, plans de maîtrise et suivi des actions'),

    ('Juridique & contentieux', 'DJC', 'Consultation juridique, contentieux, dossiers sensibles et suivi judiciaire'),
    ('Marchés & contrats', 'DJC', 'Marchés, contrats, conventions, assurances et conformité documentaire'),

    ('Achats & fournisseurs', 'DA', 'Consultations fournisseurs, bons de commande, achats et suivi approvisionnement'),
    ('Stocks & magasins', 'DA', 'Stocks, magasins, inventaires, mouvements et seuils d''alerte'),

    ('Hôtel El Marsa', 'DUNITES', 'Unité hôtelière El Marsa'),
    ('Hôtel El Riadh', 'DUNITES', 'Unité hôtelière El Riadh'),
    ('Hôtel El Manar', 'DUNITES', 'Unité hôtelière El Manar'),
    ('Centre Touristique & Résidence Marina', 'DUNITES', 'Centre touristique, résidence Marina et hébergement associé'),
    ('Club de Vacances Azur Plage', 'DUNITES', 'Club de vacances, plage, piscine et exploitation saisonnière'),
    ('Port de plaisance', 'DUNITES', 'PortMaster, amarrage, mouvements bateaux, facturation portuaire et recouvrement')
)
INSERT OR IGNORE INTO rh_departements (nom, direction_id, description)
SELECT deps.nom, dir.id, deps.description
FROM deps
JOIN rh_directions dir ON dir.code = deps.direction_code;

-- ── Postes EGT Sidi Fredj ───────────────────────────────────────────────────

WITH postes(nom, departement_nom, role_system_associe, description) AS (
  VALUES
    -- Direction générale
    ('Président-Directeur Général', 'Cabinet PDG', 'PDG', 'Responsabilité générale, stratégie, gouvernance et représentation de l''entreprise'),
    ('Directeur Général Adjoint', 'Cabinet PDG', 'ADMIN_DEC', 'Coordination générale et appui au PDG dans le pilotage des directions'),
    ('Assistant du PDG', 'Cabinet PDG', NULL, 'Assistance, suivi des dossiers et coordination avec les directions'),
    ('Secrétaire de direction', 'Secrétariat Général', NULL, 'Secrétariat, courrier, classement et suivi administratif'),
    ('Secrétaire du Conseil d''Administration', 'Conseil d''Administration & Gouvernance', 'ADMIN_DEC', 'Préparation des conseils, PV, résolutions et suivi de gouvernance'),

    -- DEC
    ('Directeur de l''Exploitation et du Contrôle', 'Contrôle d''exploitation', 'ADMIN_DEC', 'Pilotage exploitation, contrôle quotidien, tableaux de bord et coordination des unités'),
    ('Contrôleur d''exploitation', 'Contrôle d''exploitation', 'CONTROLEUR_UNITE', 'Contrôle des recettes, vérification des saisies et suivi des écarts'),
    ('Inspecteur exploitation', 'Inspection unités', NULL, 'Contrôles terrain, constats, réserves et suivi des actions correctives'),
    ('Chargé du reporting exploitation', 'Reporting & tableaux de bord', NULL, 'Consolidation des données, rapports périodiques et indicateurs de performance'),
    ('Analyste exploitation', 'Reporting & tableaux de bord', NULL, 'Analyse des performances, occupation, recettes et rentabilité par unité'),

    -- RH & moyens généraux
    ('Directeur RH & Moyens Généraux', 'RH Administration & Paie', 'RH_MANAGER', 'Pilotage RH, administration, paie, moyens généraux et climat social'),
    ('Sous-directeur RH Administration et Paie', 'RH Administration & Paie', 'RH_MANAGER', 'Supervision administration du personnel, paie, contrats et déclarations'),
    ('Chef de service Personnel siège', 'RH Administration & Paie', 'CHEF_DEPARTEMENT', 'Gestion administrative du personnel du siège'),
    ('Chef de service Personnel unités', 'RH Administration & Paie', 'CHEF_DEPARTEMENT', 'Coordination RH avec les unités opérationnelles'),
    ('Gestionnaire paie', 'RH Administration & Paie', NULL, 'Préparation paie, variables, bulletins et déclarations sociales'),
    ('Chef de département Développement RH', 'Développement RH & Formation', 'CHEF_DEPARTEMENT', 'Recrutement, formation, compétences, mobilité et développement RH'),
    ('Chargé du recrutement', 'Développement RH & Formation', NULL, 'Recrutement, intégration et suivi des dossiers candidats'),
    ('Chargé de formation', 'Développement RH & Formation', NULL, 'Plan de formation, suivi des sessions et évaluations'),
    ('Chef de service Moyens Généraux', 'Moyens généraux & archives', 'CHEF_DEPARTEMENT', 'Gestion moyens généraux, logistique interne, consommables et services généraux'),
    ('Chargé de mission archives', 'Moyens généraux & archives', NULL, 'Classement, archivage et conservation des dossiers administratifs'),
    ('Magasinier moyens généraux', 'Moyens généraux & archives', NULL, 'Gestion des fournitures, mouvements et inventaires des moyens généraux'),
    ('Chef de service social', 'Social', 'CHEF_DEPARTEMENT', 'Suivi social du personnel, dossiers sociaux et médecine du travail'),
    ('Assistant RH', 'RH Administration & Paie', NULL, 'Appui administratif RH, saisie, classement et suivi quotidien'),

    -- Finances
    ('Directeur Finances & Comptabilité', 'Comptabilité générale', 'COMPTABILITE', 'Pilotage comptable, financier, fiscal et reporting financier'),
    ('Chef comptable', 'Comptabilité générale', 'COMPTABILITE', 'Supervision comptabilité générale, écritures et clôtures'),
    ('Comptable', 'Comptabilité générale', 'COMPTABILITE', 'Saisie comptable, rapprochements et pièces justificatives'),
    ('Trésorier', 'Trésorerie & caisse', 'COMPTABILITE', 'Suivi banques, paiements, encaissements et trésorerie'),
    ('Caissier', 'Trésorerie & caisse', 'COMPTABILITE', 'Gestion caisse, encaissements et justificatifs'),
    ('Chargé budget', 'Budget & contrôle budgétaire', NULL, 'Préparation budgétaire, suivi des engagements et écarts'),
    ('Chargé recouvrement', 'Recouvrement', 'COMPTABILITE', 'Suivi créances, relances et recouvrement clients'),

    -- Commerce & marketing
    ('Directeur Commerce & Marketing', 'Commercial & partenariats', NULL, 'Stratégie commerciale, marketing, conventions et partenariats'),
    ('Responsable commercial', 'Commercial & partenariats', NULL, 'Prospection, négociation, suivi clients et développement commercial'),
    ('Chargé partenariats', 'Commercial & partenariats', NULL, 'Sponsoring, partenariats, conventions et actions commerciales'),
    ('Chargé marketing', 'Marketing & communication', NULL, 'Campagnes, supports, image, offres et actions promotionnelles'),
    ('Community manager', 'Marketing & communication', NULL, 'Réseaux sociaux, contenus digitaux et animation communautaire'),
    ('Agent réservations', 'Réservations & conventions', 'RECEPTIONNISTE', 'Traitement réservations, groupes, agences et demandes clients'),
    ('Chargé conventions', 'Réservations & conventions', NULL, 'Suivi conventions agences, entreprises, tarifs et allotements'),

    -- Équipement & maintenance
    ('Directeur Équipement & Maintenance', 'Équipements techniques', NULL, 'Pilotage technique, maintenance, équipements, travaux et investissements'),
    ('Superviseur technique', 'Équipements techniques', 'CHEF_DEPARTEMENT', 'Supervision des interventions et équipes techniques'),
    ('Chargé planification maintenance préventive', 'Maintenance préventive', NULL, 'Planification préventive, calendriers d''intervention et suivi périodique'),
    ('Chef service travaux et investissement', 'Travaux & investissement', 'CHEF_DEPARTEMENT', 'Suivi travaux, projets d''investissement et chantiers'),
    ('Contrôleur technique', 'Contrôle technique', NULL, 'Audits techniques, conformité, réserves et réception des interventions'),
    ('Technicien maintenance', 'Équipements techniques', NULL, 'Interventions techniques et maintenance courante'),
    ('Électricien', 'Équipements techniques', NULL, 'Maintenance électrique et dépannage'),
    ('Plombier', 'Équipements techniques', NULL, 'Maintenance plomberie, réseaux eau et dépannage'),
    ('Menuisier', 'Équipements techniques', NULL, 'Travaux de menuiserie, réparation et remise en état'),
    ('Jardinier', 'Équipements techniques', NULL, 'Entretien espaces verts et aménagement extérieur'),

    -- Qualité
    ('Directeur Qualité', 'Qualité & procédures', NULL, 'Pilotage qualité, procédures et amélioration continue'),
    ('Chargé qualité & procédures', 'Qualité & procédures', NULL, 'Rédaction, diffusion et suivi des procédures internes'),
    ('Chargé réclamations clients', 'Réclamations clients', NULL, 'Traitement des doléances et suivi satisfaction client'),
    ('Contrôleur hygiène & conformité', 'Hygiène & conformité', NULL, 'Contrôle hygiène, salubrité et conformité des prestations'),

    -- Informatique
    ('Directeur Informatique', 'Systèmes & réseaux', NULL, 'Pilotage SI, infrastructure, applications et digitalisation'),
    ('Administrateur systèmes & réseaux', 'Systèmes & réseaux', NULL, 'Administration serveurs, réseau, postes et sécurité'),
    ('Technicien informatique', 'Applications & support', NULL, 'Support utilisateurs, maintenance postes et assistance applicative'),
    ('Chargé support applicatif', 'Applications & support', NULL, 'Support logiciels métiers, PMS, sauvegardes et incidents applicatifs'),
    ('Chargé sécurité informatique', 'Sécurité informatique', NULL, 'Sécurité SI, accès, mots de passe, sauvegardes et conformité données'),

    -- Sécurité
    ('Responsable sécurité', 'Sécurité générale', NULL, 'Organisation sécurité, consignes, rondes et prévention des risques'),
    ('Chef de brigade sécurité', 'Sécurité générale', 'CHEF_DEPARTEMENT', 'Encadrement des agents de sécurité et planning des postes'),
    ('Agent de sécurité', 'Surveillance & accès', NULL, 'Surveillance, filtrage, rondes et protection des sites'),
    ('Agent contrôle accès', 'Surveillance & accès', NULL, 'Contrôle accès, badges, entrées et sorties'),

    -- Audit
    ('Auditeur interne', 'Audit interne', 'AUDIT_INTERNE', 'Missions d''audit, contrôle interne et recommandations'),
    ('Chef de mission audit', 'Audit interne', 'AUDIT_INTERNE', 'Planification et supervision des missions d''audit'),
    ('Chargé gestion des risques', 'Gestion des risques', 'AUDIT_INTERNE', 'Cartographie des risques et suivi des plans de maîtrise'),

    -- Juridique
    ('Juriste', 'Juridique & contentieux', NULL, 'Conseil juridique, analyse des dossiers et conformité'),
    ('Chargé contentieux', 'Juridique & contentieux', NULL, 'Suivi contentieux, litiges, mises en demeure et dossiers judiciaires'),
    ('Chargé marchés & contrats', 'Marchés & contrats', NULL, 'Marchés, contrats, conventions, assurances et dossiers réglementaires'),

    -- Achats
    ('Responsable achats', 'Achats & fournisseurs', NULL, 'Pilotage achats, consultations fournisseurs et suivi commandes'),
    ('Acheteur', 'Achats & fournisseurs', NULL, 'Consultation, comparaison, commande et relation fournisseurs'),
    ('Gestionnaire approvisionnement', 'Achats & fournisseurs', NULL, 'Besoins, approvisionnements, livraisons et suivi commandes'),
    ('Magasinier central', 'Stocks & magasins', NULL, 'Gestion magasin central, entrées, sorties et inventaires'),
    ('Contrôleur stock', 'Stocks & magasins', NULL, 'Contrôle stocks, écarts, inventaires et seuils d''alerte'),

    -- Unités hôtelières communes
    ('Directeur d''unité', 'Hôtel El Marsa', 'DIRECTEUR_UNITE', 'Direction opérationnelle de l''unité'),
    ('Assistant directeur d''unité', 'Hôtel El Marsa', NULL, 'Appui à la direction de l''unité et suivi quotidien'),
    ('Chef de réception', 'Hôtel El Marsa', 'CHEF_DEPARTEMENT', 'Encadrement réception, arrivées, départs et coordination front office'),
    ('Réceptionniste', 'Hôtel El Marsa', 'RECEPTIONNISTE', 'Accueil, check-in, check-out et information client'),
    ('Gouvernante générale', 'Hôtel El Marsa', 'CHEF_DEPARTEMENT', 'Supervision housekeeping, chambres, lingerie et propreté'),
    ('Femme / Valet de chambre', 'Hôtel El Marsa', NULL, 'Nettoyage, préparation des chambres et espaces clients'),
    ('Responsable restauration', 'Hôtel El Marsa', 'CHEF_DEPARTEMENT', 'Supervision restauration, service et coordination cuisine'),
    ('Chef cuisinier', 'Hôtel El Marsa', 'CHEF_DEPARTEMENT', 'Production cuisine, menus, hygiène et organisation brigade'),
    ('Serveur', 'Hôtel El Marsa', NULL, 'Service salle, accueil client et mise en place'),
    ('Barman', 'Hôtel El Marsa', NULL, 'Service boissons, bar et encaissements associés'),
    ('Économe unité', 'Hôtel El Marsa', NULL, 'Gestion économat, stocks de l''unité et consommations'),
    ('Chef maintenance unité', 'Hôtel El Marsa', 'CHEF_DEPARTEMENT', 'Maintenance courante et coordination technique de l''unité'),
    ('Agent maintenance polyvalent', 'Hôtel El Marsa', NULL, 'Petites interventions et maintenance quotidienne'),

    ('Directeur d''unité', 'Hôtel El Riadh', 'DIRECTEUR_UNITE', 'Direction opérationnelle de l''unité'),
    ('Chef de réception', 'Hôtel El Riadh', 'CHEF_DEPARTEMENT', 'Encadrement réception et front office'),
    ('Réceptionniste', 'Hôtel El Riadh', 'RECEPTIONNISTE', 'Accueil, check-in, check-out et information client'),
    ('Gouvernante générale', 'Hôtel El Riadh', 'CHEF_DEPARTEMENT', 'Supervision housekeeping et propreté'),
    ('Femme / Valet de chambre', 'Hôtel El Riadh', NULL, 'Nettoyage et préparation des chambres'),
    ('Responsable restauration', 'Hôtel El Riadh', 'CHEF_DEPARTEMENT', 'Supervision restauration et service'),
    ('Chef cuisinier', 'Hôtel El Riadh', 'CHEF_DEPARTEMENT', 'Production cuisine et organisation brigade'),
    ('Serveur', 'Hôtel El Riadh', NULL, 'Service salle et accueil client'),
    ('Chef maintenance unité', 'Hôtel El Riadh', 'CHEF_DEPARTEMENT', 'Maintenance courante de l''unité'),
    ('Agent maintenance polyvalent', 'Hôtel El Riadh', NULL, 'Interventions techniques de premier niveau'),

    ('Directeur d''unité', 'Hôtel El Manar', 'DIRECTEUR_UNITE', 'Direction opérationnelle de l''unité'),
    ('Chef de réception', 'Hôtel El Manar', 'CHEF_DEPARTEMENT', 'Encadrement réception et front office'),
    ('Réceptionniste', 'Hôtel El Manar', 'RECEPTIONNISTE', 'Accueil, check-in, check-out et information client'),
    ('Gouvernante générale', 'Hôtel El Manar', 'CHEF_DEPARTEMENT', 'Supervision housekeeping et propreté'),
    ('Femme / Valet de chambre', 'Hôtel El Manar', NULL, 'Nettoyage et préparation des chambres'),
    ('Responsable restauration', 'Hôtel El Manar', 'CHEF_DEPARTEMENT', 'Supervision restauration et service'),
    ('Chef maintenance unité', 'Hôtel El Manar', 'CHEF_DEPARTEMENT', 'Maintenance courante de l''unité'),

    ('Directeur du Centre Touristique', 'Centre Touristique & Résidence Marina', 'DIRECTEUR_UNITE', 'Direction du centre touristique et de la résidence Marina'),
    ('Responsable Résidence Marina', 'Centre Touristique & Résidence Marina', 'CHEF_DEPARTEMENT', 'Gestion hébergement résidence, duplex, accueil et suivi clients'),
    ('Agent accueil résidence', 'Centre Touristique & Résidence Marina', 'RECEPTIONNISTE', 'Accueil clients résidence et suivi des séjours'),
    ('Agent entretien résidence', 'Centre Touristique & Résidence Marina', NULL, 'Entretien duplex, espaces communs et petites interventions'),

    ('Directeur Club Azur Plage', 'Club de Vacances Azur Plage', 'DIRECTEUR_UNITE', 'Direction opérationnelle du club de vacances'),
    ('Responsable plage', 'Club de Vacances Azur Plage', 'CHEF_DEPARTEMENT', 'Organisation plage, accès, équipements et équipes saisonnières'),
    ('Responsable piscine', 'Club de Vacances Azur Plage', 'CHEF_DEPARTEMENT', 'Organisation piscine, sécurité, accès et équipes saisonnières'),
    ('Maître-nageur', 'Club de Vacances Azur Plage', NULL, 'Surveillance baignade, sécurité et assistance clients'),
    ('Agent plage', 'Club de Vacances Azur Plage', NULL, 'Mise en place, transats, parasols, orientation et propreté plage'),
    ('Caissier plage/piscine', 'Club de Vacances Azur Plage', 'COMPTABILITE', 'Encaissement accès plage, piscine et prestations associées'),

    ('Responsable port', 'Port de plaisance', 'RESPONSABLE_PORT', 'Pilotage PortMaster, amarrage, mouvements, facturation et coordination portuaire'),
    ('Agent capitainerie', 'Port de plaisance', 'RESPONSABLE_PORT', 'Accueil plaisanciers, suivi administratif et orientation portuaire'),
    ('Chargé amarrage', 'Port de plaisance', NULL, 'Suivi emplacements, contrats d''amarrage et occupation du port'),
    ('Agent mouvement bateaux', 'Port de plaisance', NULL, 'Enregistrement entrées, sorties et mouvements bateaux'),
    ('Chargé facturation portuaire', 'Port de plaisance', 'COMPTABILITE', 'Facturation portuaire, paiements et suivi des créances'),
    ('Technicien portuaire', 'Port de plaisance', NULL, 'Maintenance portuaire, équipements et petites interventions')
)
INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT postes.nom, d.id, NULL, NULL, postes.role_system_associe, postes.description
FROM postes
JOIN rh_departements d ON d.nom = postes.departement_nom;
