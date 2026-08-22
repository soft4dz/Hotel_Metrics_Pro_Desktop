export type ModuleStatus = 'operationnel' | 'socle' | 'a-developper';

export interface ModuleDefinition {
  id: string;
  order: number;
  name: string;
  group: string;
  status: ModuleStatus;
  route: string;
  existingRoute?: string;
  connectedTo: string[];
  /** Fonctions métier incluses dans le module, sans créer de faux modules autonomes. */
  capabilities?: string[];
}

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  operationnel: 'Opérationnel',
  socle: 'Socle prêt',
  'a-developper': 'À développer',
};

const moduleRoute = (id: string) => `/modules/${id}`;

export const MODULES: ModuleDefinition[] = [
  {
    id: 'administration-utilisateurs', order: 1, name: 'Administration & utilisateurs', group: 'Socle', status: 'operationnel',
    route: moduleRoute('administration-utilisateurs'), existingRoute: '/admin/users',
    connectedTo: ['Paramétrage global', 'Journalisation & traçabilité', 'Tableaux de bord directionnels'],
    capabilities: ['Comptes utilisateurs', 'Rôles et permissions', 'Périmètres par unité'],
  },
  {
    id: 'parametrage-global', order: 2, name: 'Paramétrage global', group: 'Socle', status: 'operationnel',
    route: moduleRoute('parametrage-global'), existingRoute: '/settings',
    connectedTo: ['Administration & utilisateurs', 'CA journalier (ERP)', 'Budget & prévisions', 'Alertes & notifications'],
    capabilities: ['Préférences générales', 'Interface et thème', 'Santé du système'],
  },
  {
    id: 'unites-hotelieres', order: 3, name: 'Unités hôtelières', group: 'Socle', status: 'operationnel',
    route: moduleRoute('unites-hotelieres'), existingRoute: '/admin/hotels',
    connectedTo: ['CA journalier (ERP)', 'Hébergement & occupation', 'Stocks & consommations', 'Comparatif inter-unités'],
    capabilities: ['Référentiel des unités', 'Paramètres par établissement', 'Affectations utilisateurs'],
  },

  {
    id: 'recettes-journalieres', order: 4, name: 'CA journalier (ERP)', group: 'Finance', status: 'operationnel',
    route: moduleRoute('recettes-journalieres'), existingRoute: '/recettes/journalieres',
    connectedTo: ['Encaissements & trésorerie', 'Budget & prévisions', 'Tableaux de bord directionnels', 'Rapports automatiques'],
    capabilities: ['Saisie quotidienne', 'Validation unité et DEC', 'Consolidation du chiffre d’affaires'],
  },
  {
    id: 'cloture-night-audit', order: 4.5, name: 'Clôture journalière & Night Audit', group: 'Finance', status: 'socle',
    route: moduleRoute('cloture-night-audit'), existingRoute: '/recettes/cloture',
    connectedTo: ['CA journalier (ERP)', 'Hébergement & occupation', 'Points de vente (POS)', 'Comptabilité SCF'],
    capabilities: ['Clôture journalière', 'Contrôles Night Audit', 'Date métier hôtelière'],
  },
  {
    id: 'encaissements-tresorerie', order: 5, name: 'Encaissements & trésorerie', group: 'Finance', status: 'operationnel',
    route: moduleRoute('encaissements-tresorerie'), existingRoute: '/encaissements',
    connectedTo: ['CA journalier (ERP)', 'Facturation', 'Créances & recouvrement', 'Comptabilité SCF'],
    capabilities: ['Encaissements', 'Comptes bancaires', 'Ordres de paiement', 'Prévisions de trésorerie', 'Rapprochement bancaire'],
  },
  {
    id: 'comptabilite-scf', order: 5.2, name: 'Comptabilité SCF', group: 'Finance', status: 'operationnel',
    route: moduleRoute('comptabilite-scf'), existingRoute: '/comptabilite',
    connectedTo: ['Encaissements & trésorerie', 'Facturation', 'Fiscalité DGI & SIFEC', 'Budget & prévisions'],
    capabilities: ['Plan comptable SCF', 'Journaux et écritures', 'Balance', 'Exercices', 'Lettrage'],
  },
  {
    id: 'fiscalite-dgi', order: 5.4, name: 'Fiscalité DGI & SIFEC', group: 'Finance', status: 'socle',
    route: moduleRoute('fiscalite-dgi'), existingRoute: '/fiscalite',
    connectedTo: ['Comptabilité SCF', 'Facturation', 'Achats & approvisionnements', 'Journalisation & traçabilité'],
    capabilities: ['TVA ventes et achats', 'Déclarations fiscales', 'Retenues à la source', 'Liasse fiscale', 'Connecteur SIFEC'],
  },
  {
    id: 'budget-previsions', order: 6, name: 'Budget & prévisions', group: 'Finance', status: 'operationnel',
    route: moduleRoute('budget-previsions'), existingRoute: '/objectifs',
    connectedTo: ['CA journalier (ERP)', 'Hébergement & occupation', 'Achats & approvisionnements', 'Tableaux de bord directionnels'],
    capabilities: ['Objectifs', 'Budgets mensuels', 'Réalisé et écarts'],
  },
  {
    id: 'facturation', order: 8, name: 'Facturation', group: 'Finance', status: 'operationnel',
    route: moduleRoute('facturation'), existingRoute: '/facturation',
    connectedTo: ['Contrats & conventions', 'Encaissements & trésorerie', 'Créances & recouvrement', 'Gestion documentaire'],
    capabilities: ['Factures clients', 'Avoirs', 'Registre des ventes'],
  },
  {
    id: 'creances-recouvrement', order: 9, name: 'Créances & recouvrement', group: 'Finance', status: 'operationnel',
    route: moduleRoute('creances-recouvrement'), existingRoute: '/creances',
    connectedTo: ['Facturation', 'Encaissements & trésorerie', 'Commercial & partenariats', 'Alertes & notifications'],
    capabilities: ['Balance âgée', 'Relances', 'Suivi du risque client'],
  },
  {
    id: 'clients', order: 9.2, name: 'Clients', group: 'Finance', status: 'operationnel',
    route: moduleRoute('clients'), existingRoute: '/clients',
    connectedTo: ['Facturation', 'Créances & recouvrement', 'CRM & expérience client', 'Audit & contrôle interne'],
    capabilities: ['Fichier clients', 'Coordonnées', 'Historique commercial'],
  },

  {
    id: 'hebergement-occupation', order: 10, name: 'Hébergement & occupation', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('hebergement-occupation'), existingRoute: '/hebergement',
    connectedTo: ['CA journalier (ERP)', 'Housekeeping & chambres', 'CRM & expérience client', 'Groupes & MICE'],
    capabilities: ['PMS avancé', 'Réservations et folios', 'Channel Manager', 'Booking Engine', 'Yield management'],
  },
  {
    id: 'housekeeping-chambres', order: 10.2, name: 'Housekeeping & chambres', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('housekeeping-chambres'), existingRoute: '/housekeeping',
    connectedTo: ['Hébergement & occupation', 'Qualité & réclamations clients', 'Maintenance & interventions', 'Journal des anomalies'],
    capabilities: ['Planning des équipes', 'Inspection des chambres', 'Minibar', 'Lingerie', 'Objets trouvés'],
  },
  {
    id: 'crm-experience-client', order: 10.4, name: 'CRM & expérience client', group: 'Exploitation', status: 'socle',
    route: moduleRoute('crm-experience-client'), existingRoute: '/crm',
    connectedTo: ['Clients', 'Hébergement & occupation', 'Commercial & partenariats', 'Qualité & réclamations clients'],
    capabilities: ['Vue client 360°', 'Segmentation', 'Fidélité', 'Campagnes', 'NPS', 'Portail et pré-check-in'],
  },
  {
    id: 'groupes-mice', order: 10.6, name: 'Groupes & MICE', group: 'Exploitation', status: 'socle',
    route: moduleRoute('groupes-mice'), existingRoute: '/mice',
    connectedTo: ['Hébergement & occupation', 'Facturation', 'Commercial & partenariats', 'Cuisine, production & qualité'],
    capabilities: ['Rooming lists', 'Allotements', 'Événements et salles', 'Devis', 'BEO', 'Facturation événementielle'],
  },
  {
    id: 'stocks-consommations', order: 11, name: 'Stocks & consommations', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('stocks-consommations'), existingRoute: '/stocks',
    connectedTo: ['Achats & approvisionnements', 'Cuisine, production & qualité', 'Maintenance & interventions', 'Budget & prévisions'],
    capabilities: ['Magasins multiples', 'Lots et péremption', 'Transferts', 'Inventaires physiques', 'Codes-barres', 'Valorisation'],
  },
  {
    id: 'cuisine-qualite', order: 11.5, name: 'Cuisine, production & qualité', group: 'Exploitation', status: 'socle',
    route: moduleRoute('cuisine-qualite'), existingRoute: '/cuisine',
    connectedTo: ['Stocks & consommations', 'Achats & approvisionnements', 'Points de vente (POS)', 'Groupes & MICE'],
    capabilities: ['Fiches techniques', 'HACCP', 'Températures', 'Allergènes', 'Gaspillage', 'Menu engineering', 'Traçabilité alimentaire'],
  },
  {
    id: 'pos-restauration', order: 11.6, name: 'Points de vente (POS)', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('pos-restauration'), existingRoute: '/pos',
    connectedTo: ['Cuisine, production & qualité', 'Encaissements & trésorerie', 'Comptabilité SCF', 'Stocks & consommations'],
    capabilities: ['Plan de salle', 'Tickets et couverts', 'Partage de note', 'Multi-paiement', 'Transfert au folio', 'KDS'],
  },
  {
    id: 'achats-approvisionnements', order: 12, name: 'Achats & approvisionnements', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('achats-approvisionnements'), existingRoute: '/achats',
    connectedTo: ['Stocks & consommations', 'Comptabilité SCF', 'Budget & prévisions', 'Workflows & validations'],
    capabilities: ['Fournisseurs', 'Demandes d’achat', 'Consultations et devis', 'Bons de commande', 'Réceptions', 'Factures fournisseurs'],
  },
  {
    id: 'appels-offres', order: 12.5, name: 'Appels d\'offres', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('appels-offres'), existingRoute: '/appels-offres',
    connectedTo: ['Achats & approvisionnements'],
    capabilities: ['Dossiers multi-lots', 'Documents et cahier des charges', 'Ouverture des plis', 'Grille d\'évaluation', 'Attribution'],
  },
  {
    id: 'maintenance-interventions', order: 13, name: 'Maintenance & interventions', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('maintenance-interventions'), existingRoute: '/maintenance',
    connectedTo: ['Stocks & consommations', 'Qualité & réclamations clients', 'Achats & approvisionnements', 'Journal des anomalies'],
    capabilities: ['Équipements', 'Ordres de travail', 'Maintenance préventive', 'SLA', 'Pièces détachées', 'Garanties et contrats'],
  },
  {
    id: 'integrations-materielles', order: 13.5, name: 'Intégrations matérielles', group: 'Exploitation', status: 'socle',
    route: moduleRoute('integrations-materielles'), existingRoute: '/integrations-materielles',
    connectedTo: ['Hébergement & occupation', 'Points de vente (POS)', 'Encaissements & trésorerie', 'Journalisation & traçabilité'],
    capabilities: ['Serrures électroniques', 'PBX et IPTV', 'TPE CIB/Edahabia/SATIM', 'Scanners', 'Imprimantes fiscales'],
  },
  {
    id: 'tarifs-conventions', order: 14.5, name: 'Tarifs & conventions', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('tarifs-conventions'), existingRoute: '/tarifs',
    connectedTo: ['Hébergement & occupation', 'Facturation', 'CA journalier (ERP)', 'Commercial & partenariats'],
    capabilities: ['Plans tarifaires', 'Grilles', 'Promotions', 'Conventions clients', 'Yield management'],
  },
  {
    id: 'qualite-reclamations', order: 18, name: 'Qualité & réclamations clients', group: 'Exploitation', status: 'operationnel',
    route: moduleRoute('qualite-reclamations'), existingRoute: '/reclamations',
    connectedTo: ['Hébergement & occupation', 'Maintenance & interventions', 'Journal des anomalies', 'CRM & expérience client'],
    capabilities: ['Réclamations', 'Traitement et délais', 'Analyse des causes'],
  },

  {
    id: 'contrats-conventions', order: 20, name: 'Contrats & conventions', group: 'Juridique & commercial', status: 'operationnel',
    route: moduleRoute('contrats-conventions'), existingRoute: '/contrats',
    connectedTo: ['Facturation', 'Créances & recouvrement', 'Commercial & partenariats', 'Gestion documentaire'],
    capabilities: ['Contrats clients', 'Conventions', 'Allotements', 'Échéances'],
  },
  {
    id: 'commercial-partenariats', order: 20.2, name: 'Commercial & partenariats', group: 'Juridique & commercial', status: 'operationnel',
    route: moduleRoute('commercial-partenariats'), existingRoute: '/commercial',
    connectedTo: ['Contrats & conventions', 'Facturation', 'Créances & recouvrement', 'CRM & expérience client'],
    capabilities: ['Prospection', 'Partenariats', 'Suivi commercial'],
  },

  {
    id: 'rh-productivite', order: 21, name: 'RH & productivité', group: 'Ressources humaines', status: 'operationnel',
    route: moduleRoute('rh-productivite'), existingRoute: '/rh',
    connectedTo: ['Unités hôtelières', 'CA journalier (ERP)', 'Pointeuses & badgeuses', 'Budget & prévisions'],
    capabilities: ['Collaborateurs', 'Temps et présence', 'Pré-paie', 'Talents', 'Formation', 'GPEC'],
  },
  {
    id: 'pointeuses-badgeuses', order: 21.2, name: 'Pointeuses & badgeuses', group: 'Ressources humaines', status: 'operationnel',
    route: moduleRoute('pointeuses-badgeuses'), existingRoute: '/rh/temps/pointeuse',
    connectedTo: ['RH & productivité', 'Intégrations matérielles', 'Journalisation & traçabilité'],
    capabilities: ['Pointeuses', 'Import des pointages', 'Réconciliation'],
  },

  {
    id: 'audit-controle-interne', order: 22, name: 'Audit & contrôle interne', group: 'Contrôle', status: 'operationnel',
    route: moduleRoute('audit-controle-interne'), existingRoute: '/audit/logs',
    connectedTo: ['Journal des anomalies', 'Décisions & instructions', 'Journalisation & traçabilité', 'Rapports automatiques'],
    capabilities: ['Consultation des traces', 'Contrôles internes', 'Piste d’audit'],
  },
  {
    id: 'workflows-validations', order: 22.2, name: 'Workflows & validations', group: 'Contrôle', status: 'operationnel',
    route: moduleRoute('workflows-validations'), existingRoute: '/workflows',
    connectedTo: ['Audit & contrôle interne', 'Décisions & instructions', 'Achats & approvisionnements', 'Alertes & notifications'],
    capabilities: ['Circuits d’approbation', 'Procédures de validation', 'Historique des décisions'],
  },
  {
    id: 'checklists-controle', order: 22.4, name: 'Checklists de contrôle', group: 'Contrôle', status: 'operationnel',
    route: moduleRoute('checklists-controle'), existingRoute: '/controle/checklists',
    connectedTo: ['Audit & contrôle interne', 'Qualité & réclamations clients', 'Journal des anomalies', 'Workflows & validations'],
    capabilities: ['Modèles de contrôle', 'Exécution des checklists', 'Suivi des écarts'],
  },
  {
    id: 'journal-anomalies', order: 22.6, name: 'Journal des anomalies', group: 'Contrôle', status: 'operationnel',
    route: moduleRoute('journal-anomalies'), existingRoute: '/anomalies',
    connectedTo: ['Audit & contrôle interne', 'Maintenance & interventions', 'Encaissements & trésorerie', 'Alertes & notifications'],
    capabilities: ['Déclaration des anomalies', 'Affectation', 'Suivi des corrections'],
  },
  {
    id: 'decisions-instructions', order: 22.8, name: 'Décisions & instructions', group: 'Contrôle', status: 'operationnel',
    route: moduleRoute('decisions-instructions'), existingRoute: '/decisions',
    connectedTo: ['Audit & contrôle interne', 'Journal des anomalies', 'Alertes & notifications', 'Rapports automatiques'],
    capabilities: ['Instructions de direction', 'Échéances', 'Suivi d’exécution'],
  },

  {
    id: 'conformite-hoteliere', order: 23, name: 'Conformité hôtelière', group: 'Conformité & légal', status: 'operationnel',
    route: moduleRoute('conformite-hoteliere'), existingRoute: '/hotel-legal',
    connectedTo: ['Hébergement & occupation', 'Fiscalité DGI & SIFEC', 'Gestion documentaire', 'Audit & contrôle interne'],
    capabilities: ['Fiches police', 'Taxe de séjour', 'Rapports tourisme'],
  },
  {
    id: 'protection-donnees-personnelles', order: 23.2, name: 'Protection des données', group: 'Conformité & légal', status: 'operationnel',
    route: moduleRoute('protection-donnees-personnelles'), existingRoute: '/conformite/donnees-personnelles',
    connectedTo: ['Administration & utilisateurs', 'Clients', 'CRM & expérience client', 'Journalisation & traçabilité'],
    capabilities: ['Registre des traitements', 'Consentements', 'Demandes de droits', 'Incidents', 'Conservation'],
  },
  {
    id: 'modules-legaux', order: 23.4, name: 'Modules légaux', group: 'Conformité & légal', status: 'operationnel',
    route: moduleRoute('modules-legaux'), existingRoute: '/conformite/modules-legaux',
    connectedTo: ['Comptabilité SCF', 'RH & productivité', 'Gestion documentaire', 'Audit & contrôle interne'],
    capabilities: ['Immobilisations', 'CASNOS', 'Inventaire légal'],
  },
  {
    id: 'veille-reglementaire', order: 23.6, name: 'Veille juridique & réglementaire', group: 'Conformité & légal', status: 'operationnel',
    route: moduleRoute('veille-reglementaire'), existingRoute: '/veille-reglementaire',
    connectedTo: ['Conformité hôtelière', 'Appels d\'offres', 'Audit & contrôle interne', 'Gestion documentaire'],
    capabilities: ['Répertoire des textes', 'Suivi de mise en conformité', 'Rappels d\'échéance', 'Documents attachés'],
  },

  {
    id: 'tableaux-bord-directionnels', order: 24, name: 'Tableaux de bord directionnels', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('tableaux-bord-directionnels'), existingRoute: '/dashboard',
    connectedTo: ['CA journalier (ERP)', 'Budget & prévisions', 'Créances & recouvrement', 'Comparatif inter-unités'],
    capabilities: ['Dashboard global', 'Indicateurs consolidés', 'Filtres par période et unité'],
  },
  {
    id: 'dashboard-pdg', order: 24.2, name: 'Dashboard PDG', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('dashboard-pdg'), existingRoute: '/dashboard/pdg',
    connectedTo: ['Tableaux de bord directionnels', 'Comparatif inter-unités', 'Rapports automatiques', 'Cockpit DEC'],
    capabilities: ['Vision groupe', 'Consolidation des unités', 'Alertes de direction'],
  },
  {
    id: 'cockpit-dec', order: 24.4, name: 'Cockpit DEC', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('cockpit-dec'), existingRoute: '/dec/cockpit',
    connectedTo: ['Dashboard PDG', 'CA journalier (ERP)', 'Journal des anomalies', 'Décisions & instructions'],
    capabilities: ['Pilotage exploitation', 'Contrôles quotidiens', 'Actions et alertes'],
  },
  {
    id: 'rapports-automatiques', order: 25, name: 'Rapports automatiques', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('rapports-automatiques'), existingRoute: '/rapports',
    connectedTo: ['Tableaux de bord directionnels', 'Audit & contrôle interne', 'CA journalier (ERP)', 'Créances & recouvrement'],
    capabilities: ['Rapports configurables', 'Exports PDF et Excel', 'Historique des exécutions'],
  },
  {
    id: 'alertes-notifications', order: 25.2, name: 'Alertes & notifications', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('alertes-notifications'), existingRoute: '/settings/notifications',
    connectedTo: ['CA journalier (ERP)', 'Créances & recouvrement', 'Décisions & instructions', 'Sauvegarde & restauration'],
    capabilities: ['Notifications internes', 'Règles d’alerte', 'Préférences utilisateurs'],
  },
  {
    id: 'comparatif-inter-unites', order: 25.4, name: 'Comparatif inter-unités', group: 'Pilotage', status: 'operationnel',
    route: moduleRoute('comparatif-inter-unites'), existingRoute: '/dashboard',
    connectedTo: ['Unités hôtelières', 'CA journalier (ERP)', 'Hébergement & occupation', 'RH & productivité'],
    capabilities: ['Classement des unités', 'Comparaisons N/N-1', 'Écarts aux objectifs'],
  },

  {
    id: 'portmaster', order: 26, name: 'PortMaster', group: 'Spécifique', status: 'operationnel',
    route: moduleRoute('portmaster'), existingRoute: '/portmaster',
    connectedTo: ['Contrats & conventions', 'Facturation', 'Créances & recouvrement', 'Tableaux de bord directionnels'],
    capabilities: ['Bateaux et clients', 'Emplacements', 'Contrats', 'Mouvements', 'Facturation et recouvrement'],
  },

  {
    id: 'gestion-documentaire', order: 27, name: 'Gestion documentaire', group: 'Système documentaire', status: 'operationnel',
    route: moduleRoute('gestion-documentaire'), existingRoute: '/ged',
    connectedTo: ['Contrats & conventions', 'Facturation', 'Audit & contrôle interne', 'Décisions & instructions'],
    capabilities: ['GED', 'Versions', 'OCR et signature', 'Archivage légal'],
  },

  {
    id: 'sauvegarde-restauration', order: 28, name: 'Sauvegarde & restauration', group: 'Système', status: 'operationnel',
    route: moduleRoute('sauvegarde-restauration'), existingRoute: '/settings/backup',
    connectedTo: ['Synchronisation multi-postes', 'Journalisation & traçabilité', 'Administration & utilisateurs'],
    capabilities: ['Sauvegardes locales', 'Restauration', 'Politiques de rétention'],
  },
  {
    id: 'synchronisation-multi-postes', order: 29, name: 'Synchronisation multi-postes', group: 'Système', status: 'operationnel',
    route: moduleRoute('synchronisation-multi-postes'), existingRoute: '/system/sync',
    connectedTo: ['Sauvegarde & restauration', 'Journalisation & traçabilité', 'Unités hôtelières'],
    capabilities: ['File de synchronisation', 'État des postes', 'Résolution des erreurs'],
  },
  {
    id: 'journalisation-tracabilite', order: 30, name: 'Journalisation & traçabilité', group: 'Système', status: 'operationnel',
    route: moduleRoute('journalisation-tracabilite'), existingRoute: '/audit/logs',
    connectedTo: ['Administration & utilisateurs', 'Audit & contrôle interne', 'Sauvegarde & restauration', 'Synchronisation multi-postes'],
    capabilities: ['Journal d’audit', 'Traçabilité des opérations', 'Recherche et export'],
  },
];

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((module) => module.group)));

export function getModuleById(id: string | undefined): ModuleDefinition | undefined {
  return MODULES.find((module) => module.id === id);
}

export function getModulesByGroup(group: string): ModuleDefinition[] {
  return MODULES.filter((module) => module.group === group).sort((a, b) => a.order - b.order);
}
