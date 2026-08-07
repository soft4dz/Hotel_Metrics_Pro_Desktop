import {
  CONFIGURED_MODULE_IDS,
  PROTECTED_MODULE_IDS,
  type ConfiguredModuleId,
} from './configuredModules';
import {
  BUSINESS_SECTOR_PROFILES,
  type BusinessSectorId,
} from './businessSectors';

export const LICENSE_EDITIONS = ['STANDARD', 'PRO', 'ENTERPRISE'] as const;
export type LicenseEdition = (typeof LICENSE_EDITIONS)[number];

/** Modules inclus par édition (socle toujours ajouté à la résolution). */
const EDITION_MODULE_ALLOWLIST: Record<LicenseEdition, ReadonlySet<ConfiguredModuleId>> = {
  STANDARD: new Set([
    'administration-utilisateurs',
    'parametrage-global',
    'journalisation-tracabilite',
    'unites-hotelieres',
    'facturation',
    'clients',
    'encaissements-tresorerie',
    'audit-controle-interne',
    'alertes-notifications',
    'tableaux-bord-directionnels',
  ]),
  PRO: new Set(
    CONFIGURED_MODULE_IDS.filter(
      (id) =>
        !['synchronisation-multi-postes', 'comparatif-inter-unites', 'sauvegarde-restauration'].includes(
          id,
        ),
    ),
  ),
  ENTERPRISE: new Set(CONFIGURED_MODULE_IDS),
};

export function normalizeLicenseEdition(value: string | null | undefined): LicenseEdition | null {
  const upper = value?.trim().toUpperCase();
  if (upper === 'STANDARD' || upper === 'PRO' || upper === 'ENTERPRISE') return upper;
  return null;
}

/** Modules autorisés pour un secteur (allowlist explicite). */
export function getSectorModuleAllowlist(sectorId: BusinessSectorId): ReadonlySet<ConfiguredModuleId> {
  const profile = BUSINESS_SECTOR_PROFILES[sectorId];
  if (sectorId === 'hotel') {
    return new Set(CONFIGURED_MODULE_IDS);
  }
  return new Set(profile.enabledModules);
}

/**
 * Pack complet = intersection(édition, secteur) ∪ modules socle protégés.
 */
export function resolveLicensedModuleIds(
  edition: LicenseEdition,
  sectorId: BusinessSectorId,
): ConfiguredModuleId[] {
  const sectorAllow = getSectorModuleAllowlist(sectorId);
  const editionAllow = EDITION_MODULE_ALLOWLIST[edition];

  return CONFIGURED_MODULE_IDS.filter(
    (id) => PROTECTED_MODULE_IDS.has(id) || (sectorAllow.has(id) && editionAllow.has(id)),
  );
}

export function resolveDisabledModuleIds(
  edition: LicenseEdition,
  sectorId: BusinessSectorId,
): ConfiguredModuleId[] {
  const licensed = new Set(resolveLicensedModuleIds(edition, sectorId));
  return CONFIGURED_MODULE_IDS.filter((id) => !licensed.has(id));
}

export interface LicensePackSummary {
  edition: LicenseEdition;
  sectorId: BusinessSectorId;
  sectorLabel: string;
  editionLabel: string;
  enabledModuleIds: ConfiguredModuleId[];
  disabledModuleIds: ConfiguredModuleId[];
  totalModules: number;
  enabledCount: number;
}

const EDITION_LABELS: Record<LicenseEdition, string> = {
  STANDARD: 'Standard',
  PRO: 'Professionnel',
  ENTERPRISE: 'Entreprise',
};

export function buildLicensePackSummary(
  edition: LicenseEdition,
  sectorId: BusinessSectorId,
): LicensePackSummary {
  const enabledModuleIds = resolveLicensedModuleIds(edition, sectorId);
  const disabledModuleIds = resolveDisabledModuleIds(edition, sectorId);
  return {
    edition,
    sectorId,
    sectorLabel: BUSINESS_SECTOR_PROFILES[sectorId].label,
    editionLabel: EDITION_LABELS[edition],
    enabledModuleIds,
    disabledModuleIds,
    totalModules: CONFIGURED_MODULE_IDS.length,
    enabledCount: enabledModuleIds.length,
  };
}

export function listEditionOptions(): Array<{ id: LicenseEdition; label: string; description: string }> {
  return [
    {
      id: 'STANDARD',
      label: EDITION_LABELS.STANDARD,
      description: 'Finance de base, clients, trésorerie, tableaux de bord.',
    },
    {
      id: 'PRO',
      label: EDITION_LABELS.PRO,
      description: 'Opérations complètes : stocks, RH, GED, rapports — hors premium multi-sites.',
    },
    {
      id: 'ENTERPRISE',
      label: EDITION_LABELS.ENTERPRISE,
      description: 'Pack complet : sync multi-postes, comparatif inter-unités, modules sectoriels.',
    },
  ];
}

export function getEditionModuleCount(edition: LicenseEdition): number {
  return EDITION_MODULE_ALLOWLIST[edition].size;
}
