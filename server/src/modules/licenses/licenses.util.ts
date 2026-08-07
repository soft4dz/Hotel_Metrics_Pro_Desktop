import { createHmac } from 'crypto';

const LICENSE_SECRET = process.env.HMP_LICENSE_SECRET ?? 'raqmi-phase3-cert-v1-change-in-prod';

const KEY_WITH_SECTOR =
  /^RS-(STANDARD|PRO|ENTERPRISE)-(\d{8})-([A-Z]{4})-([A-F0-9]{8})$/i;
const KEY_LEGACY = /^RS-(STANDARD|PRO|ENTERPRISE)-(\d{8})-([A-F0-9]{8})$/i;

export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE';
export type BusinessSectorId =
  | 'hotel'
  | 'restaurant'
  | 'commerce'
  | 'services'
  | 'industrie'
  | 'port'
  | 'generic';

const LICENSE_SECTOR_CODES: Record<string, BusinessSectorId> = {
  HOTL: 'hotel',
  REST: 'restaurant',
  COMM: 'commerce',
  SERV: 'services',
  INDU: 'industrie',
  PORT: 'port',
  GENR: 'generic',
};

const BUSINESS_SECTOR_TO_LICENSE_CODE: Record<BusinessSectorId, string> = {
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
  return LICENSE_SECTOR_CODES[code.trim().toUpperCase()] ?? null;
}

export function sectorIdToLicenseCode(sectorId: string | null | undefined): string | null {
  if (!sectorId) return null;
  const normalized = sectorId.trim().toLowerCase() as BusinessSectorId;
  return BUSINESS_SECTOR_TO_LICENSE_CODE[normalized] ?? null;
}

export function signLicensePayload(
  edition: LicenseEdition,
  expiryRaw: string,
  sectorCode?: string | null,
): string {
  const payload = sectorCode?.trim()
    ? `${edition}|${expiryRaw}|${sectorCode.trim().toUpperCase()}`
    : `${edition}|${expiryRaw}`;
  return createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

export function parseLicenseKey(key: string) {
  const trimmed = key.trim().toUpperCase();

  const withSector = trimmed.match(KEY_WITH_SECTOR);
  if (withSector) {
    const edition = withSector[1] as LicenseEdition;
    const expiryRaw = withSector[2];
    const sectorCode = withSector[3];
    const signature = withSector[4];
    const businessSector = licenseCodeToSectorId(sectorCode);
    if (!businessSector) return null;

    const expiresAt = `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`;
    if (Number.isNaN(new Date(`${expiresAt}T23:59:59`).getTime())) return null;

    const expected = signLicensePayload(edition, expiryRaw, sectorCode);
    if (signature !== expected) return null;

    return {
      edition,
      expiresAt,
      expiryRaw,
      licenseKey: trimmed,
      businessSector,
      sectorCode,
    };
  }

  const legacy = trimmed.match(KEY_LEGACY);
  if (!legacy) return null;

  const edition = legacy[1] as LicenseEdition;
  const expiryRaw = legacy[2];
  const signature = legacy[3];
  const expiresAt = `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`;
  if (Number.isNaN(new Date(`${expiresAt}T23:59:59`).getTime())) return null;

  const expected = signLicensePayload(edition, expiryRaw);
  if (signature !== expected) return null;

  return {
    edition,
    expiresAt,
    expiryRaw,
    licenseKey: trimmed,
    businessSector: 'hotel' as BusinessSectorId,
    sectorCode: 'HOTL',
  };
}

export function formatLicenseKey(
  edition: LicenseEdition,
  expiresAt: string,
  sectorId: BusinessSectorId = 'hotel',
): string {
  const expiryRaw = expiresAt.replace(/-/g, '');
  const sectorCode = sectorIdToLicenseCode(sectorId) ?? 'HOTL';
  return `RS-${edition}-${expiryRaw}-${sectorCode}-${signLicensePayload(edition, expiryRaw, sectorCode)}`;
}
