import { isConfiguredModule } from '@/shared/constants/configuredModules';
import { MODULES } from '@/modules/moduleCatalog';

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

export function isConfiguredModuleId(moduleId: string): boolean {
  return isConfiguredModule(moduleId);
}
