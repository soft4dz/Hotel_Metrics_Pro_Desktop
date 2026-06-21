import { MODULES } from '@/modules/moduleCatalog';

/** Modules présents dans modules_config (configurables). */
export const CONFIGURED_MODULE_IDS = new Set([
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
  'achats-approvisionnements',
  'maintenance-interventions',
  'rh-productivite',
  'tarifs-conventions',
  'audit-controle-interne',
  'journal-anomalies',
  'decisions-instructions',
  'qualite-reclamations',
  'plage-piscine',
  'parking',
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
]);

const ROUTE_MODULE_PAIRS = MODULES.filter((m) => m.existingRoute)
  .map((m) => ({ route: m.existingRoute!, moduleId: m.id }))
  .sort((a, b) => b.route.length - a.route.length);

/** Résout l'ID module catalogue pour un chemin applicatif. */
export function resolveModuleIdForPath(pathname: string): string | null {
  for (const { route, moduleId } of ROUTE_MODULE_PAIRS) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return moduleId;
    }
  }
  return null;
}

export function isConfiguredModule(moduleId: string): boolean {
  return CONFIGURED_MODULE_IDS.has(moduleId);
}
