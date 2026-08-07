import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  getBusinessSectorProfile,
  isBusinessSectorId,
  normalizeBusinessSectorId,
  type BusinessSectorId,
} from '../../src/shared/constants/businessSectors';
import {
  normalizeLicenseEdition,
  resolveLicensedModuleIds,
  type LicenseEdition,
} from '../../src/shared/constants/licensePackResolver';
import { CONFIGURED_MODULE_IDS } from '../../src/shared/constants/configuredModules';
import { setModuleEnabled } from './modules.service';

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function writeSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
    )
    .run(key, value);
}

function isSectorLockedByLicense(): boolean {
  return readSetting('business_sector_locked', '0') === '1';
}

/** Secteur actif (terminologie UI) — aligné sur la licence si verrouillé. */
export function getBusinessSectorId(): BusinessSectorId {
  const licensed = readSetting('license_business_sector');
  if (licensed && isBusinessSectorId(licensed)) {
    return licensed;
  }
  return normalizeBusinessSectorId(readSetting('business_sector'));
}

export function getBusinessSectorPublicInfo(): {
  sectorId: BusinessSectorId;
  label: string;
  terminology: ReturnType<typeof getBusinessSectorProfile>['terminology'];
  lockedByLicense: boolean;
} {
  const sectorId = getBusinessSectorId();
  const profile = getBusinessSectorProfile(sectorId);
  return {
    sectorId,
    label: profile.label,
    terminology: profile.terminology,
    lockedByLicense: isSectorLockedByLicense(),
  };
}

/** Application interne lors de l'activation licence (côté éditeur Raqmi). */
export function applyBusinessSectorFromLicense(
  sectorId: BusinessSectorId,
  edition: LicenseEdition,
  actorUserId: number | null,
  applyModulePack = true,
): { sectorId: BusinessSectorId; edition: LicenseEdition; modulesUpdated: number } {
  if (!isBusinessSectorId(sectorId)) {
    throw new Error('Secteur licence invalide.');
  }
  const normalizedEdition = normalizeLicenseEdition(edition);
  if (!normalizedEdition) {
    throw new Error('Édition licence invalide.');
  }

  writeSetting('license_business_sector', sectorId);
  writeSetting('business_sector', sectorId);
  writeSetting('business_sector_locked', '1');
  writeSetting('license_edition', normalizedEdition);

  let modulesUpdated = 0;
  if (applyModulePack) {
    const licensed = new Set(resolveLicensedModuleIds(normalizedEdition, sectorId));

    for (const moduleId of CONFIGURED_MODULE_IDS) {
      const shouldEnable = licensed.has(moduleId);
      setModuleEnabled(moduleId, shouldEnable);
      modulesUpdated++;
    }
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    page: 'LicenseActivation',
    description: `Pack licence ${normalizedEdition} · ${profileLabel(sectorId)} appliqué (${modulesUpdated} modules)`,
  });

  return { sectorId, edition: normalizedEdition, modulesUpdated };
}

function profileLabel(sectorId: BusinessSectorId): string {
  return getBusinessSectorProfile(sectorId).label;
}
