/** IDs des modules gérés dans modules_config (activation / désactivation). */
export const CONFIGURED_MODULE_IDS = [
  'administration-utilisateurs',
  'parametrage-global',
  'unites-hotelieres',
  'recettes-journalieres',
  'encaissements-tresorerie',
  'budget-previsions',
  'hebergement-occupation',
  'facturation',
  'creances-recouvrement',
  'contrats-conventions',
  'stocks-consommations',
  'pos-restauration',
  'achats-approvisionnements',
  'maintenance-interventions',
  'housekeeping-chambres',
  'rh-productivite',
  'tarifs-conventions',
  'audit-controle-interne',
  'journal-anomalies',
  'decisions-instructions',
  'qualite-reclamations',
  'portmaster',
  'clients',
  'commercial-partenariats',
  'tableaux-bord-directionnels',
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
