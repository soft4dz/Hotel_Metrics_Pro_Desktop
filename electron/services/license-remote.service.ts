import { createPublicKey, verify } from 'node:crypto';
import type { BusinessSectorId } from '../../src/shared/constants/businessSectors';

declare const __RAQMI_LICENSE_PUBLIC_KEYS__: string;

export type RemoteLicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE';
export type LicenseDeliveryMode = 'offline' | 'remote';

export interface ParsedLicenseKey {
  v: 2;
  licenseId: string;
  product: 'raqmi-system';
  organizationCode: string;
  edition: RemoteLicenseEdition;
  businessSector: BusinessSectorId;
  issuedAt: string;
  expiresAt: string;
  maxActivations: number;
  mode: LicenseDeliveryMode;
  machineId?: string;
  keyId: string;
}

const EDITIONS = new Set<RemoteLicenseEdition>(['STANDARD', 'PRO', 'ENTERPRISE']);
const SECTORS = new Set<BusinessSectorId>([
  'hotel',
  'restaurant',
  'commerce',
  'services',
  'industrie',
  'port',
  'generic',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORG_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;

function isExactIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validatePayload(value: unknown): ParsedLicenseKey | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Partial<ParsedLicenseKey>;
  if (
    p.v !== 2 ||
    p.product !== 'raqmi-system' ||
    typeof p.licenseId !== 'string' ||
    !UUID_PATTERN.test(p.licenseId) ||
    typeof p.organizationCode !== 'string' ||
    !ORG_PATTERN.test(p.organizationCode) ||
    !EDITIONS.has(p.edition as RemoteLicenseEdition) ||
    !SECTORS.has(p.businessSector as BusinessSectorId) ||
    typeof p.issuedAt !== 'string' ||
    Number.isNaN(new Date(p.issuedAt).getTime()) ||
    !isExactIsoDate(p.expiresAt) ||
    !Number.isInteger(p.maxActivations) ||
    Number(p.maxActivations) < 1 ||
    Number(p.maxActivations) > 999 ||
    (p.mode !== 'offline' && p.mode !== 'remote') ||
    typeof p.keyId !== 'string' ||
    !/^[A-Za-z0-9._-]{3,64}$/.test(p.keyId)
  ) {
    return null;
  }
  if (p.mode === 'offline' && (!p.machineId || !/^[A-Z0-9][A-Z0-9_-]{7,127}$/i.test(p.machineId))) {
    return null;
  }
  if (p.mode === 'remote' && p.machineId !== undefined) return null;
  return p as ParsedLicenseKey;
}

function trustedPublicKeys(): Record<string, string> {
  const embedded = typeof __RAQMI_LICENSE_PUBLIC_KEYS__ === 'string'
    ? __RAQMI_LICENSE_PUBLIC_KEYS__
    : '{}';
  const raw = process.env.NODE_ENV === 'test' && process.env.HMP_LICENSE_TEST_PUBLIC_KEYS
    ? process.env.HMP_LICENSE_TEST_PUBLIC_KEYS
    : embedded;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, pem]) => typeof pem === 'string' && pem.trim()),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

export function parseLicenseKey(key: string): ParsedLicenseKey | null {
  const normalized = key.trim();
  const parts = normalized.split('.');
  if (parts.length !== 3 || parts[0] !== 'RS2') return null;
  try {
    const payload = validatePayload(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')));
    if (!payload) return null;
    const publicPem = trustedPublicKeys()[payload.keyId];
    if (!publicPem) return null;
    const publicKey = createPublicKey(publicPem.replace(/\\n/g, '\n'));
    if (publicKey.asymmetricKeyType !== 'ed25519') return null;
    const signature = Buffer.from(parts[2], 'base64url');
    if (signature.length !== 64) return null;
    return verify(null, Buffer.from(parts[1], 'ascii'), publicKey, signature) ? payload : null;
  } catch {
    return null;
  }
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
  licenseId: string;
  edition: RemoteLicenseEdition;
  expiresAt: string;
  holder: string;
  organizationCode: string;
  businessSector: BusinessSectorId;
  message: string;
}

export interface RemoteValidateResponse {
  ok: boolean;
  state: 'active' | 'expired' | 'revoked' | 'invalid';
  licenseId: string | null;
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
  if (!res.ok || !body.ok) {
    throw new Error(body.message ?? `Activation distante refusée (${res.status}).`);
  }
  return body;
}

export async function remoteValidateLicense(
  serverUrl: string,
  payload: { key: string; machineId: string; organizationCode?: string | null },
): Promise<RemoteValidateResponse> {
  const base = normalizeBaseUrl(serverUrl);
  const res = await fetch(`${base}/licenses/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as RemoteValidateResponse;
  if (!res.ok) throw new Error(body.message ?? `Validation distante impossible (${res.status}).`);
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
