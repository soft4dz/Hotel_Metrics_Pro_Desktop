import type { BusinessSectorId, LicenseEdition } from './sectors';
import { sectorCodeFor } from './sectors';

const DEFAULT_SECRET = 'raqmi-phase3-cert-v1-change-in-prod';

export function getLicenseSecret(): string {
  return import.meta.env.VITE_HMP_LICENSE_SECRET ?? DEFAULT_SECRET;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8)
    .toUpperCase();
}

export async function signLicensePayload(
  edition: LicenseEdition,
  expiryRaw: string,
  sectorCode: string,
  secret = getLicenseSecret(),
): Promise<string> {
  const payload = `${edition}|${expiryRaw}|${sectorCode.trim().toUpperCase()}`;
  return hmacSign(payload, secret);
}

export async function formatLicenseKey(
  edition: LicenseEdition,
  expiresAt: string,
  sectorId: BusinessSectorId,
  secret = getLicenseSecret(),
): Promise<string> {
  const expiryRaw = expiresAt.replace(/-/g, '');
  const sectorCode = sectorCodeFor(sectorId);
  const signature = await signLicensePayload(edition, expiryRaw, sectorCode, secret);
  return `RS-${edition}-${expiryRaw}-${sectorCode}-${signature}`;
}

export interface IssuedLicenseRecord {
  id: string;
  createdAt: string;
  licenseKey: string;
  edition: LicenseEdition;
  expiresAt: string;
  businessSector: BusinessSectorId;
  organizationCode: string;
  legalName: string;
  mode: 'offline' | 'remote';
}

const STORAGE_KEY = 'raqmi-license-history-v1';

export function loadHistory(): IssuedLicenseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
