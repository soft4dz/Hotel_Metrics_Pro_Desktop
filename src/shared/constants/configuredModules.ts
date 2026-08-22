/** IDs des modules gérés dans modules_config (activation / désactivation). */
export const CONFIGURED_MODULE_IDS = [
  'administration-utilisateurs',
  'parametrage-global',
  'unites-hotelieres',
  'recettes-journalieres',
  'cloture-night-audit',
  'encaissements-tresorerie',
  'comptabilite-scf',
  'fiscalite-dgi',
  'budget-previsions',
  'hebergement-occupation',
  'crm-experience-client',
  'groupes-mice',
  'facturation',
  'creances-recouvrement',
  'contrats-conventions',
  'stocks-consommations',
  'cuisine-qualite',
  'pos-restauration',
  'achats-approvisionnements',
  'appels-offres',
  'maintenance-interventions',
  'integrations-materielles',
  'housekeeping-chambres',
  'rh-productivite',
  'pointeuses-badgeuses',
  'tarifs-conventions',
  'audit-controle-interne',
  'workflows-validations',
  'checklists-controle',
  'journal-anomalies',
  'decisions-instructions',
  'qualite-reclamations',
  'conformite-hoteliere',
  'protection-donnees-personnelles',
  'modules-legaux',
  'veille-reglementaire',
  'portmaster',
  'clients',
  'commercial-partenariats',
  'tableaux-bord-directionnels',
  'dashboard-pdg',
  'cockpit-dec',
  'rapports-automatiques',
  'alertes-notifications',
  'comparatif-inter-unites',
  'gestion-documentaire',
  'sauvegarde-restauration',
  'synchronisation-multi-postes',
  'journalisation-tracabilite',
] as const;

export type ConfiguredModuleId = (typeof CONFIGURED_MODULE_IDS)[number];

/** Modules socle non désactivables via l'UI admin. */
export const PROTECTED_MODULE_IDS = new Set<ConfiguredModuleId>([
  'administration-utilisateurs',
  'parametrage-global',
  'journalisation-tracabilite',
]);

export const CONFIGURED_MODULE_ID_SET = new Set<string>(CONFIGURED_MODULE_IDS);

export function isConfiguredModule(moduleId: string): boolean {
  return CONFIGURED_MODULE_ID_SET.has(moduleId);
}
