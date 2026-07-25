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
}

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  operationnel: 'Opérationnel',
  socle: 'Socle prêt',
  'a-developper': 'À développer',
};

const moduleRoute = (id: string) => `/modules/${id}`;

export const MODULES: ModuleDefinition[] = [
  { id: 'administration-utilisateurs', order: 1, name: 'Administration & utilisateurs', group: 'Socle', status: 'operationnel', route: moduleRoute('administration-utilisateurs'), existingRoute: '/admin/users', connectedTo: ['Paramétrage global', 'Journalisation & traçabilité', 'Tableaux de bord directionnels'] },
  { id: 'parametrage-global', order: 2, name: 'Paramétrage global', group: 'Socle', status: 'operationnel', route: moduleRoute('parametrage-global'), existingRoute: '/settings', connectedTo: ['Administration & utilisateurs', 'Recettes journalières', 'Budget & prévisions', 'Alertes & notifications'] },
  { id: 'unites-hotelieres', order: 3, name: 'Unités hôtelières', group: 'Socle', status: 'operationnel', route: moduleRoute('unites-hotelieres'), existingRoute: '/admin/hotels', connectedTo: ['Recettes journalières', 'Hébergement & occupation', 'Stocks & consommations', 'Comparatif inter-unités'] },
  { id: 'recettes-journalieres', order: 4, name: 'CA journalier (ERP)', group: 'Finance', status: 'operationnel', route: moduleRoute('recettes-journalieres'), existingRoute: '/recettes/journalieres', connectedTo: ['Encaissements & trésorerie', 'Budget & prévisions', 'Tableaux de bord directionnels', 'Rapports automatiques'] },
  { id: 'encaissements-tresorerie', order: 5, name: 'Encaissements & trésorerie', group: 'Finance', status: 'operationnel', route: moduleRoute('encaissements-tresorerie'), existingRoute: '/encaissements', connectedTo: ['Recettes journalières', 'Facturation', 'Créances & recouvrement', 'Audit & contrôle interne'] },
  { id: 'budget-previsions', order: 6, name: 'Budget & prévisions', group: 'Finance', status: 'operationnel', route: moduleRoute('budget-previsions'), existingRoute: '/objectifs', connectedTo: ['Recettes journalières', 'Hébergement & occupation', 'Achats & approvisionnements', 'Tableaux de bord directionnels'] },
  { id: 'hebergement-occupation', order: 7, name: 'Hébergement & occupation', group: 'Exploitation', status: 'operationnel', route: moduleRoute('hebergement-occupation'), existingRoute: '/hebergement', connectedTo: ['Recettes journalières', 'Housekeeping & chambres', 'Qualité & réclamations clients', 'Commercial & partenariats'] },
  { id: 'housekeeping-chambres', order: 7.5, name: 'Housekeeping & chambres', group: 'Exploitation', status: 'operationnel', route: moduleRoute('housekeeping-chambres'), existingRoute: '/housekeeping', connectedTo: ['Hébergement & occupation', 'Qualité & réclamations clients', 'Maintenance & interventions', 'Journal des anomalies'] },
  { id: 'facturation', order: 8, name: 'Facturation', group: 'Finance', status: 'operationnel', route: moduleRoute('facturation'), existingRoute: '/facturation', connectedTo: ['Contrats & conventions', 'Encaissements & trésorerie', 'Créances & recouvrement', 'Gestion documentaire'] },
  { id: 'creances-recouvrement', order: 9, name: 'Créances & recouvrement', group: 'Finance', status: 'operationnel', route: moduleRoute('creances-recouvrement'), existingRoute: '/creances', connectedTo: ['Facturation', 'Encaissements & trésorerie', 'Commercial & partenariats', 'Alertes & notifications'] },
  { id: 'contrats-conventions', order: 10, name: 'Contrats & conventions', group: 'Juridique & commercial', status: 'operationnel', route: moduleRoute('contrats-conventions'), existingRoute: '/contrats', connectedTo: ['Facturation', 'Créances & recouvrement', 'Commercial & partenariats', 'Gestion documentaire'] },
  { id: 'stocks-consommations', order: 11, name: 'Stocks & consommations', group: 'Exploitation', status: 'operationnel', route: moduleRoute('stocks-consommations'), existingRoute: '/stocks', connectedTo: ['Achats & approvisionnements', 'Production & fiches techniques', 'Maintenance & interventions', 'Budget & prévisions'] },
  { id: 'production-fiches-techniques', order: 11.5, name: 'Production & fiches techniques', group: 'Exploitation', status: 'operationnel', route: moduleRoute('production-fiches-techniques'), existingRoute: '/cuisine', connectedTo: ['Stocks & consommations', 'Achats & approvisionnements', 'Recettes journalières', 'Budget & prévisions'] },
  { id: 'pos-restauration', order: 11.6, name: 'Points de vente (POS)', group: 'Exploitation', status: 'operationnel', route: moduleRoute('pos-restauration'), existingRoute: '/pos', connectedTo: ['Production & fiches techniques', 'Encaissements & trésorerie', 'Comptabilité SCF', 'Stocks & consommations'] },
  { id: 'achats-approvisionnements', order: 12, name: 'Achats & approvisionnements', group: 'Exploitation', status: 'operationnel', route: moduleRoute('achats-approvisionnements'), existingRoute: '/achats', connectedTo: ['Stocks & consommations', 'Fournisseurs', 'Budget & prévisions', 'Audit & contrôle interne'] },
  { id: 'maintenance-interventions', order: 13, name: 'Maintenance & interventions', group: 'Exploitation', status: 'operationnel', route: moduleRoute('maintenance-interventions'), existingRoute: '/maintenance', connectedTo: ['Stocks & consommations', 'Qualité & réclamations clients', 'Achats & approvisionnements', 'Journal des anomalies'] },
  { id: 'rh-productivite', order: 14, name: 'RH & productivité', group: 'Ressources humaines', status: 'operationnel', route: moduleRoute('rh-productivite'), existingRoute: '/rh', connectedTo: ['Unités hôtelières', 'Recettes journalières', 'Pointeuses & badgeuses', 'Budget & prévisions'] },
  { id: 'pointeuses-badgeuses', order: 14.2, name: 'Pointeuses & badgeuses', group: 'Ressources humaines', status: 'operationnel', route: moduleRoute('pointeuses-badgeuses'), existingRoute: '/rh/temps/pointeuse', connectedTo: ['RH & productivité', 'Paie & légal DZ', 'Journalisation & traçabilité'] },
  { id: 'tarifs-conventions', order: 14.5, name: 'Tarifs & conventions', group: 'Exploitation', status: 'operationnel', route: moduleRoute('tarifs-conventions'), existingRoute: '/tarifs', connectedTo: ['Hébergement & occupation', 'Facturation', 'Recettes journalières', 'Commercial & partenariats'] },
  { id: 'audit-controle-interne', order: 15, name: 'Audit & contrôle interne', group: 'Contrôle', status: 'operationnel', route: moduleRoute('audit-controle-interne'), existingRoute: '/audit/logs', connectedTo: ['Journal des anomalies', 'Décisions & instructions', 'Journalisation & traçabilité', 'Rapports automatiques'] },
  { id: 'journal-anomalies', order: 16, name: 'Journal des anomalies', group: 'Contrôle', status: 'operationnel', route: moduleRoute('journal-anomalies'), existingRoute: '/anomalies', connectedTo: ['Audit & contrôle interne', 'Maintenance & interventions', 'Encaissements & trésorerie', 'Alertes & notifications'] },
  { id: 'decisions-instructions', order: 17, name: 'Décisions & instructions', group: 'Contrôle', status: 'operationnel', route: moduleRoute('decisions-instructions'), existingRoute: '/decisions', connectedTo: ['Audit & contrôle interne', 'Journal des anomalies', 'Alertes & notifications', 'Rapports automatiques'] },
  { id: 'qualite-reclamations', order: 18, name: 'Qualité & réclamations clients', group: 'Exploitation', status: 'operationnel', route: moduleRoute('qualite-reclamations'), existingRoute: '/reclamations', connectedTo: ['Hébergement & occupation', 'Maintenance & interventions', 'Journal des anomalies', 'Tableaux de bord directionnels'] },
  { id: 'plage-piscine', order: 19, name: 'Plage & piscine', group: 'Exploitation', status: 'operationnel', route: moduleRoute('plage-piscine'), existingRoute: '/plage', connectedTo: ['Recettes journalières', 'Encaissements & trésorerie', 'Stocks & consommations', 'Maintenance & interventions'] },
  { id: 'parking', order: 20, name: 'Parking', group: 'Exploitation', status: 'operationnel', route: moduleRoute('parking'), existingRoute: '/parking', connectedTo: ['Recettes journalières', 'Encaissements & trésorerie', 'Facturation', 'Rapports automatiques'] },
  { id: 'portmaster', order: 21, name: 'PortMaster', group: 'Spécifique', status: 'operationnel', route: moduleRoute('portmaster'), existingRoute: '/portmaster', connectedTo: ['Contrats & conventions', 'Facturation', 'Créances & recouvrement', 'Tableaux de bord directionnels'] },
  { id: 'clients', order: 22, name: 'Clients', group: 'Finance', status: 'operationnel', route: moduleRoute('clients'), existingRoute: '/clients', connectedTo: ['Facturation', 'Créances & recouvrement', 'Commercial & partenariats', 'Audit & contrôle interne'] },
  { id: 'commercial-partenariats', order: 23, name: 'Commercial & partenariats', group: 'Juridique & commercial', status: 'operationnel', route: moduleRoute('commercial-partenariats'), existingRoute: '/commercial', connectedTo: ['Contrats & conventions', 'Facturation', 'Créances & recouvrement', 'Hébergement & occupation'] },
  { id: 'tableaux-bord-directionnels', order: 23, name: 'Tableaux de bord directionnels', group: 'Pilotage', status: 'operationnel', route: moduleRoute('tableaux-bord-directionnels'), existingRoute: '/dashboard', connectedTo: ['Recettes journalières', 'Budget & prévisions', 'Créances & recouvrement', 'Comparatif inter-unités'] },
  { id: 'rapports-automatiques', order: 24, name: 'Rapports automatiques', group: 'Pilotage', status: 'operationnel', route: moduleRoute('rapports-automatiques'), existingRoute: '/rapports', connectedTo: ['Tableaux de bord directionnels', 'Audit & contrôle interne', 'Recettes journalières', 'Créances & recouvrement'] },
  { id: 'alertes-notifications', order: 25, name: 'Alertes & notifications', group: 'Pilotage', status: 'operationnel', route: moduleRoute('alertes-notifications'), existingRoute: '/settings/notifications', connectedTo: ['Recettes journalières', 'Créances & recouvrement', 'Décisions & instructions', 'Sauvegarde & restauration'] },
  { id: 'comparatif-inter-unites', order: 26, name: 'Comparatif inter-unités', group: 'Pilotage', status: 'operationnel', route: moduleRoute('comparatif-inter-unites'), existingRoute: '/dashboard', connectedTo: ['Unités hôtelières', 'Recettes journalières', 'Hébergement & occupation', 'RH & productivité'] },
  { id: 'gestion-documentaire', order: 27, name: 'Gestion documentaire', group: 'Système documentaire', status: 'operationnel', route: moduleRoute('gestion-documentaire'), existingRoute: '/ged', connectedTo: ['Contrats & conventions', 'Facturation', 'Audit & contrôle interne', 'Décisions & instructions'] },
  { id: 'sauvegarde-restauration', order: 28, name: 'Sauvegarde & restauration', group: 'Système', status: 'operationnel', route: moduleRoute('sauvegarde-restauration'), existingRoute: '/settings/backup', connectedTo: ['Synchronisation multi-postes', 'Journalisation & traçabilité', 'Administration & utilisateurs'] },
  { id: 'synchronisation-multi-postes', order: 29, name: 'Synchronisation multi-postes', group: 'Système', status: 'operationnel', route: moduleRoute('synchronisation-multi-postes'), existingRoute: '/system/sync', connectedTo: ['Sauvegarde & restauration', 'Journalisation & traçabilité', 'Unités hôtelières'] },
  { id: 'journalisation-tracabilite', order: 30, name: 'Journalisation & traçabilité', group: 'Système', status: 'operationnel', route: moduleRoute('journalisation-tracabilite'), existingRoute: '/audit/logs', connectedTo: ['Administration & utilisateurs', 'Audit & contrôle interne', 'Sauvegarde & restauration', 'Synchronisation multi-postes'] },
];

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((module) => module.group)));

export function getModuleById(id: string | undefined): ModuleDefinition | undefined {
  return MODULES.find((module) => module.id === id);
}

export function getModulesByGroup(group: string): ModuleDefinition[] {
  return MODULES.filter((module) => module.group === group).sort((a, b) => a.order - b.order);
}
