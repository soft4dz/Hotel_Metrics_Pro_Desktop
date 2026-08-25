import {
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign,
  verify,
  type KeyObject,
} from 'crypto';

export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE';
export type BusinessSectorId =
  | 'hotel'
  | 'restaurant'
  | 'commerce'
  | 'services'
  | 'industrie'
  | 'port'
  | 'generic';
export type LicenseDeliveryMode = 'offline' | 'remote';

export interface LicenseV2Payload {
  v: 2;
  licenseId: string;
  product: 'raqmi-system';
  organizationCode: string;
  edition: LicenseEdition;
  businessSector: BusinessSectorId;
  issuedAt: string;
  expiresAt: string;
  maxActivations: number;
  mode: LicenseDeliveryMode;
  machineId?: string;
  keyId: string;
}

export interface ParsedLicenseKey extends LicenseV2Payload {
  licenseKey: string;
}

const EDITIONS = new Set<LicenseEdition>(['STANDARD', 'PRO', 'ENTERPRISE']);
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
const MACHINE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{7,127}$/i;
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;

function normalizePem(value: string): string {
  return value.trim().replace(/\\n/g, '\n');
}

function isExactIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parsePublicKeyMap(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([keyId, pem]) => [keyId, normalizePem(String(pem))]),
    );
  } catch {
    throw new Error('HMP_LICENSE_PUBLIC_KEYS doit être un objet JSON { keyId: publicKeyPem }.');
  }
}

function privateKeyFromPem(pem: string): KeyObject {
  try {
    const key = createPrivateKey(normalizePem(pem));
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('type incorrect');
    return key;
  } catch {
    throw new Error('Clé privée Ed25519 de licence invalide.');
  }
}

function resolvePrivateKey(explicit?: string): KeyObject {
  const pem = explicit?.trim() || process.env.HMP_LICENSE_PRIVATE_KEY?.trim();
  if (!pem) throw new Error('HMP_LICENSE_PRIVATE_KEY est requis pour émettre une licence.');
  return privateKeyFromPem(pem);
}

function resolvePublicKey(
  keyId: string,
  options?: { publicKeys?: Record<string, string>; privateKeyPem?: string },
): KeyObject | null {
  const configured = {
    ...parsePublicKeyMap(process.env.HMP_LICENSE_PUBLIC_KEYS),
    ...(options?.publicKeys ?? {}),
  };
  const pem = configured[keyId];
  if (pem) {
    try {
      const key = createPublicKey(normalizePem(pem));
      return key.asymmetricKeyType === 'ed25519' ? key : null;
    } catch {
      return null;
    }
  }

  const privatePem = options?.privateKeyPem?.trim() || process.env.HMP_LICENSE_PRIVATE_KEY?.trim();
  if (!privatePem) return null;
  try {
    return createPublicKey(privateKeyFromPem(privatePem));
  } catch {
    return null;
  }
}

function validatePayload(value: unknown): LicenseV2Payload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Partial<LicenseV2Payload>;
  if (
    p.v !== 2 ||
    p.product !== 'raqmi-system' ||
    typeof p.licenseId !== 'string' ||
    !UUID_PATTERN.test(p.licenseId) ||
    typeof p.organizationCode !== 'string' ||
    !ORG_PATTERN.test(p.organizationCode) ||
    !EDITIONS.has(p.edition as LicenseEdition) ||
    !SECTORS.has(p.businessSector as BusinessSectorId) ||
    typeof p.issuedAt !== 'string' ||
    Number.isNaN(new Date(p.issuedAt).getTime()) ||
    !isExactIsoDate(p.expiresAt) ||
    !Number.isInteger(p.maxActivations) ||
    Number(p.maxActivations) < 1 ||
    Number(p.maxActivations) > 999 ||
    (p.mode !== 'offline' && p.mode !== 'remote') ||
    typeof p.keyId !== 'string' ||
    !KEY_ID_PATTERN.test(p.keyId)
  ) {
    return null;
  }
  if (p.mode === 'offline' && (typeof p.machineId !== 'string' || !MACHINE_PATTERN.test(p.machineId))) {
    return null;
  }
  if (p.mode === 'remote' && p.machineId !== undefined) return null;

  return {
    v: 2,
    licenseId: p.licenseId,
    product: 'raqmi-system',
    organizationCode: p.organizationCode,
    edition: p.edition as LicenseEdition,
    businessSector: p.businessSector as BusinessSectorId,
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
    maxActivations: Number(p.maxActivations),
    mode: p.mode,
    ...(p.machineId ? { machineId: p.machineId } : {}),
    keyId: p.keyId,
  };
}

function canonicalPayload(payload: LicenseV2Payload): LicenseV2Payload {
  return {
    v: 2,
    licenseId: payload.licenseId,
    product: 'raqmi-system',
    organizationCode: payload.organizationCode.trim().toUpperCase(),
    edition: payload.edition,
    businessSector: payload.businessSector,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    maxActivations: payload.maxActivations,
    mode: payload.mode,
    ...(payload.machineId ? { machineId: payload.machineId.trim().toUpperCase() } : {}),
    keyId: payload.keyId,
  };
}

export function issueLicenseKey(
  input: Omit<LicenseV2Payload, 'v' | 'licenseId' | 'product' | 'issuedAt' | 'keyId'> & {
    licenseId?: string;
    issuedAt?: string;
    keyId?: string;
  },
  options?: { privateKeyPem?: string },
): { licenseKey: string; payload: LicenseV2Payload } {
  const payload = canonicalPayload({
    v: 2,
    licenseId: input.licenseId ?? randomUUID(),
    product: 'raqmi-system',
    organizationCode: input.organizationCode,
    edition: input.edition,
    businessSector: input.businessSector,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt,
    maxActivations: input.maxActivations,
    mode: input.mode,
    ...(input.machineId ? { machineId: input.machineId } : {}),
    keyId: input.keyId ?? process.env.HMP_LICENSE_KEY_ID ?? 'raqmi-root-2026',
  });
  if (!validatePayload(payload)) throw new Error('Données de licence invalides.');

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const encodedBytes = Buffer.from(encodedPayload, 'ascii');
  const signature = sign(null, encodedBytes, resolvePrivateKey(options?.privateKeyPem));
  const configuredPublicKey = resolvePublicKey(payload.keyId, options);
  if (!configuredPublicKey || !verify(null, encodedBytes, configuredPublicKey, signature)) {
    throw new Error(`La clé privée ne correspond pas à la clé publique configurée « ${payload.keyId} ».`);
  }
  return {
    licenseKey: `RS2.${encodedPayload}.${signature.toString('base64url')}`,
    payload,
  };
}

export function parseLicenseKey(
  key: string,
  options?: { publicKeys?: Record<string, string>; privateKeyPem?: string },
): ParsedLicenseKey | null {
  const normalized = key.trim();
  const parts = normalized.split('.');
  if (parts.length !== 3 || parts[0] !== 'RS2') return null;

  try {
    const payload = validatePayload(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')));
    if (!payload) return null;
    const publicKey = resolvePublicKey(payload.keyId, options);
    if (!publicKey) return null;
    const signature = Buffer.from(parts[2], 'base64url');
    if (signature.length !== 64) return null;
    const valid = verify(null, Buffer.from(parts[1], 'ascii'), publicKey, signature);
    return valid ? { ...payload, licenseKey: normalized } : null;
  } catch {
    return null;
  }
}

export function assertFutureExpiry(expiresAt: string): void {
  if (!isExactIsoDate(expiresAt)) throw new Error('Date d\'expiration invalide.');
  if (new Date(`${expiresAt}T23:59:59.999Z`).getTime() < Date.now()) {
    throw new Error('La date d\'expiration doit être dans le futur.');
  }
}
