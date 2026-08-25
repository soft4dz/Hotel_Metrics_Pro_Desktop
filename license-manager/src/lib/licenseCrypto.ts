import type { BusinessSectorId, LicenseEdition } from './sectors';

export interface OfflineLicenseInput {
  organizationCode: string;
  edition: LicenseEdition;
  expiresAt: string;
  businessSector: BusinessSectorId;
  maxActivations: number;
  machineId: string;
  keyId: string;
}

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
  mode: 'offline';
  machineId: string;
  keyId: string;
}

function pemToDer(pem: string): ArrayBuffer {
  const normalized = pem.trim().replace(/\\n/g, '\n');
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!base64) throw new Error('Clé privée Ed25519 requise pour une émission offline.');
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return bytes.buffer;
  } catch {
    throw new Error('Format PEM de la clé privée invalide.');
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

export async function formatLicenseKey(
  input: OfflineLicenseInput,
  privateKeyPem: string,
): Promise<{ licenseKey: string; payload: LicenseV2Payload }> {
  const expiry = new Date(`${input.expiresAt}T23:59:59.999Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt) ||
    Number.isNaN(expiry.getTime()) ||
    expiry.toISOString().slice(0, 10) !== input.expiresAt ||
    expiry.getTime() < Date.now()
  ) {
    throw new Error('La date d’expiration doit être une date future valide.');
  }
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(input.organizationCode)) {
    throw new Error('Code organisation invalide.');
  }
  if (!/^[A-Z0-9][A-Z0-9_-]{7,127}$/i.test(input.machineId)) {
    throw new Error('Identifiant poste invalide.');
  }
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(input.keyId)) throw new Error('Identifiant de clé invalide.');
  if (input.maxActivations !== 1) throw new Error('Une licence offline doit être liée à un seul poste.');

  const payload: LicenseV2Payload = {
    v: 2,
    licenseId: crypto.randomUUID(),
    product: 'raqmi-system',
    organizationCode: input.organizationCode.trim().toUpperCase(),
    edition: input.edition,
    businessSector: input.businessSector,
    issuedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    maxActivations: input.maxActivations,
    mode: 'offline',
    machineId: input.machineId.trim().toUpperCase(),
    keyId: input.keyId,
  };
  const encodedPayload = textToBase64Url(JSON.stringify(payload));

  let privateKey: CryptoKey;
  try {
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(privateKeyPem),
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
  } catch {
    throw new Error('Clé privée Ed25519 invalide ou non prise en charge par ce navigateur.');
  }
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(encodedPayload),
  );
  return {
    licenseKey: `RS2.${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`,
    payload,
  };
}

export interface IssuedLicenseRecord {
  id: string;
  licenseId: string;
  createdAt: string;
  licenseKey: string;
  edition: LicenseEdition;
  expiresAt: string;
  businessSector: BusinessSectorId;
  organizationCode: string;
  legalName: string;
  mode: 'offline' | 'remote';
  machineId?: string;
}

const STORAGE_KEY = 'raqmi-license-history-v2';

export function loadHistory(): IssuedLicenseRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IssuedLicenseRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(record: Omit<IssuedLicenseRecord, 'id' | 'createdAt'>): IssuedLicenseRecord {
  const entry: IssuedLicenseRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const history = [entry, ...loadHistory()].slice(0, 200);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function clearHistory(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
