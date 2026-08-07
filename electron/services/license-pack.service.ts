import { getDatabase } from '../database/sqlite';
import {
  buildLicensePackSummary,
  normalizeLicenseEdition,
  resolveLicensedModuleIds,
  type LicenseEdition,
  type LicensePackSummary,
} from '../../src/shared/constants/licensePackResolver';
import { PROTECTED_MODULE_IDS } from '../../src/shared/constants/configuredModules';
import { getBusinessSectorId } from './business-sector.service';

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function isPackLockedByLicense(): boolean {
  return readSetting('business_sector_locked', '0') === '1';
}

export function getActiveLicenseEdition(): LicenseEdition | null {
  return normalizeLicenseEdition(readSetting('license_edition'));
}

/** En mode dev / trial sans édition commerciale → tous les modules autorisés. */
export function getLicensedModuleIds(): string[] {
  const edition = getActiveLicenseEdition();
  if (!edition) {
    return [];
  }
  const sectorId = getBusinessSectorId();
  return resolveLicensedModuleIds(edition, sectorId);
}

export function isModuleAllowedByLicense(moduleId: string): boolean {
  if (PROTECTED_MODULE_IDS.has(moduleId as never)) return true;
  const edition = getActiveLicenseEdition();
  if (!edition) return true;
  if (!isPackLockedByLicense()) return true;
  return getLicensedModuleIds().includes(moduleId);
}

export function getLicensePackSummary(): LicensePackSummary | null {
  const edition = getActiveLicenseEdition();
  if (!edition) return null;
  return buildLicensePackSummary(edition, getBusinessSectorId());
}
