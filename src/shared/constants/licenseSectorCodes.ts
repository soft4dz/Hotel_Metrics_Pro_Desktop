import type { BusinessSectorId } from './businessSectors';
import { isBusinessSectorId, normalizeBusinessSectorId } from './businessSectors';

/** Codes secteur embarqués dans la clé licence (côté éditeur Raqmi). */
export const LICENSE_SECTOR_CODES: Record<string, BusinessSectorId> = {
  HOTL: 'hotel',
  REST: 'restaurant',
  COMM: 'commerce',
  SERV: 'services',
  INDU: 'industrie',
  PORT: 'port',
  GENR: 'generic',
};

export const BUSINESS_SECTOR_TO_LICENSE_CODE: Record<BusinessSectorId, string> = {
  hotel: 'HOTL',
  restaurant: 'REST',
  commerce: 'COMM',
  services: 'SERV',
  industrie: 'INDU',
  port: 'PORT',
  generic: 'GENR',
};

export function licenseCodeToSectorId(code: string | null | undefined): BusinessSectorId | null {
  if (!code) return null;
  const sector = LICENSE_SECTOR_CODES[code.trim().toUpperCase()];
  return sector ?? null;
}

export function sectorIdToLicenseCode(sectorId: string | null | undefined): string | null {
  if (!sectorId || !isBusinessSectorId(sectorId)) return null;
  return BUSINESS_SECTOR_TO_LICENSE_CODE[sectorId];
}

export function normalizeLicensedSectorId(value: string | null | undefined, fallback: BusinessSectorId = 'hotel'): BusinessSectorId {
  if (value && isBusinessSectorId(value)) return value;
  const fromCode = licenseCodeToSectorId(value);
  if (fromCode) return fromCode;
  return normalizeBusinessSectorId(value ?? fallback);
}

export function listLicenseSectorCodesForEditor(): Array<{ code: string; sectorId: BusinessSectorId; label: string }> {
  return Object.entries(LICENSE_SECTOR_CODES).map(([code, sectorId]) => ({
    code,
    sectorId,
    label: sectorId,
  }));
}
