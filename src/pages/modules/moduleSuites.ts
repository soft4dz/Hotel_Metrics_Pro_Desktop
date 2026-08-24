export type ModuleSuiteTone = 'navy' | 'blue' | 'teal' | 'sand' | 'slate';

export interface ModuleSuiteDefinition {
  id: string;
  title: string;
  description: string;
  tone: ModuleSuiteTone;
  moduleIds: string[];
}

/**
 * Les 49 modules restent autonomes, mais le poste de travail les présente
 * comme huit suites métier stables. Cette couche évite le « mur d'icônes »
 * tout en conservant un accès direct à chaque fonction.
 */
export const MODULE_SUITES: ModuleSuiteDefinition[] = [
  {
    id: 'pilotage',
    title: 'Pilotage & décision',
    description: 'Indicateurs, alertes, rapports et comparaison des unités',
    tone: 'navy',
    moduleIds: [
      'tableaux-bord-directionnels',
      'dashboard-pdg',
      'cockpit-dec',
      'rapports-automatiques',
      'alertes-notifications',
      'comparatif-inter-unites',
    ],
  },
  {
    id: 'finance',
    title: 'Finance & comptabilité',
    description: 'Recettes, trésorerie, SCF, fiscalité et recouvrement',
    tone: 'blue',
    moduleIds: [
      'recettes-journalieres',
      'cloture-night-audit',
      'encaissements-tresorerie',
      'comptabilite-scf',
      'fiscalite-dgi',
      'budget-previsions',
      'facturation',
      'creances-recouvrement',
    ],
  },
  {
    id: 'hotel-commercial',
    title: 'Hôtel & relation client',
    description: 'PMS, clients, tarifs, qualité et développement commercial',
    tone: 'teal',
    moduleIds: [
      'unites-hotelieres',
      'hebergement-occupation',
      'housekeeping-chambres',
      'crm-experience-client',
      'tarifs-conventions',
      'qualite-reclamations',
      'contrats-conventions',
      'commercial-partenariats',
      'clients',
    ],
  },
  {
    id: 'restauration-evenements',
    title: 'Restauration & événements',
    description: 'Production, points de vente, groupes et manifestations',
    tone: 'sand',
    moduleIds: ['groupes-mice', 'cuisine-qualite', 'pos-restauration'],
  },
  {
    id: 'achats-patrimoine',
    title: 'Achats & patrimoine',
    description: 'Approvisionnements, stocks, équipements et maintenance',
    tone: 'slate',
    moduleIds: [
      'stocks-consommations',
      'achats-approvisionnements',
      'appels-offres',
      'maintenance-interventions',
      'integrations-materielles',
    ],
  },
  {
    id: 'ressources-humaines',
    title: 'Ressources humaines',
    description: 'Collaborateurs, présence, paie et développement des talents',
    tone: 'blue',
    moduleIds: ['rh-productivite', 'pointeuses-badgeuses'],
  },
  {
    id: 'controle-conformite',
    title: 'Contrôle & conformité',
    description: 'Audit, workflows, conformité et suivi des décisions',
    tone: 'navy',
    moduleIds: [
      'audit-controle-interne',
      'workflows-validations',
      'checklists-controle',
      'journal-anomalies',
      'decisions-instructions',
      'conformite-hoteliere',
      'protection-donnees-personnelles',
      'modules-legaux',
      'veille-reglementaire',
    ],
  },
  {
    id: 'port-administration',
    title: 'PortMaster & administration',
    description: 'Marina, utilisateurs, documents, sécurité et continuité',
    tone: 'teal',
    moduleIds: [
      'administration-utilisateurs',
      'parametrage-global',
      'portmaster',
      'gestion-documentaire',
      'sauvegarde-restauration',
      'synchronisation-multi-postes',
      'journalisation-tracabilite',
    ],
  },
];

const SUITE_BY_MODULE_ID = new Map(
  MODULE_SUITES.flatMap((suite) => suite.moduleIds.map((moduleId) => [moduleId, suite] as const)),
);

export function getModuleSuite(moduleId: string): ModuleSuiteDefinition | undefined {
  return SUITE_BY_MODULE_ID.get(moduleId);
}
