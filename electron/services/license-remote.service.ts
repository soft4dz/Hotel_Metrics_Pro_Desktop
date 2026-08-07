import { createHmac } from 'node:crypto';
import {
  licenseCodeToSectorId,
  sectorIdToLicenseCode,
} from '../../src/shared/constants/licenseSectorCodes';
import type { BusinessSectorId } from '../../src/shared/constants/businessSectors';

const LICENSE_SECRET = process.env.HMP_LICENSE_SECRET ?? 'raqmi-phase3-cert-v1-change-in-prod';

const KEY_WITH_SECTOR =
  /^RS-(STANDARD|PRO|ENTERPRISE)-(\d{8})-([A-Z]{4})-([A-F0-9]{8})$/i;
const KEY_LEGACY = /^RS-(STANDARD|PRO|ENTERPRISE)-(\d{8})-([A-F0-9]{8})$/i;

export type RemoteLicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE';

export interface ParsedLicenseKey {
  edition: RemoteLicenseEdition;
  expiresAt: string;
  signature: string;
  /** Secteur métier lié à la licence (null = clé legacy sans secteur → hôtel) */
  businessSector: BusinessSectorId | null;
  sectorCode: string | null;
}

export function signLicensePayload(
  edition: RemoteLicenseEdition,
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

export function parseLicenseKey(key: string): ParsedLicenseKey | null {
  const trimmed = key.trim().toUpperCase();

  const withSector = trimmed.match(KEY_WITH_SECTOR);
  if (withSector) {
    const edition = withSector[1] as RemoteLicenseEdition;
    const expiryRaw = withSector[2];
    const sectorCode = withSector[3];
    const signature = withSector[4];
    const businessSector = licenseCodeToSectorId(sectorCode);
    if (!businessSector) return null;

    const expiresAt = `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`;
    if (Number.isNaN(new Date(`${expiresAt}T23:59:59`).getTime())) return null;

    const expected = signLicensePayload(edition, expiryRaw, sectorCode);
    if (signature !== expected) return null;

    return { edition, expiresAt, signature, businessSector, sectorCode };
  }

  const legacy = trimmed.match(KEY_LEGACY);
  if (!legacy) return null;

  const edition = legacy[1] as RemoteLicenseEdition;
  const expiryRaw = legacy[2];
  const signature = legacy[3];
  const expiresAt = `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`;
  if (Number.isNaN(new Date(`${expiresAt}T23:59:59`).getTime())) return null;

  const expected = signLicensePayload(edition, expiryRaw);
  if (signature !== expected) return null;

  return { edition, expiresAt, signature, businessSector: 'hotel', sectorCode: 'HOTL' };
}

export function formatLicenseKey(
  edition: RemoteLicenseEdition,
  expiresAt: string,
  sectorId: BusinessSectorId = 'hotel',
): string {
  const expiryRaw = expiresAt.replace(/-/g, '');
  const sectorCode = sectorIdToLicenseCode(sectorId) ?? 'HOTL';
  return `RS-${edition}-${expiryRaw}-${sectorCode}-${signLicensePayload(edition, expiryRaw, sectorCode)}`;
}

export interface RemoteActivateRequest {
  key: string;
  machineId: string;
  organizationCode?: string | null;
  holder?: string | null;
  deviceLabel?: string | null;
}

export interface RemoteActivateResponse {
  ok: boolean;
  edition: RemoteLicenseEdition;
  expiresAt: string;
  holder: string;
  organizationCode: string | null;
  businessSector: BusinessSectorId;
  message: string;
}

export interface RemoteValidateResponse {
  ok: boolean;
  state: 'active' | 'expired' | 'revoked' | 'invalid';
  edition: RemoteLicenseEdition | null;
  expiresAt: string | null;
  holder: string | null;
  organizationCode: string | null;
  businessSector: BusinessSectorId | null;
  message: string;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function remoteActivateLicense(
  serverUrl: string,
  payload: RemoteActivateRequest,
): Promise<RemoteActivateResponse> {
  const base = normalizeBaseUrl(serverUrl);
  const res = await fetch(`${base}/licenses/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as RemoteActivateResponse & { message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? `Activation distante refusée (${res.status}).`);
  }
  if (!body.ok) {
    throw new Error(body.message ?? 'Activation distante refusée.');
  }
  return body;
}

export async function remoteValidateLicense(
  serverUrl: string,
  params: { key: string; machineId: string; organizationCode?: string | null },
): Promise<RemoteValidateResponse> {
  const base = normalizeBaseUrl(serverUrl);
  const qs = new URLSearchParams({
    key: params.key,
    machineId: params.machineId,
  });
  if (params.organizationCode?.trim()) {
    qs.set('organizationCode', params.organizationCode.trim());
  }

  const res = await fetch(`${base}/licenses/validate?${qs.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const body = (await res.json()) as RemoteValidateResponse;
  if (!res.ok) {
    throw new Error(body.message ?? `Validation distante impossible (${res.status}).`);
  }
  return body;
}

export async function probeLicenseServer(serverUrl: string): Promise<boolean> {
  try {
    const base = normalizeBaseUrl(serverUrl);
    const res = await fetch(`${base}/licenses/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
