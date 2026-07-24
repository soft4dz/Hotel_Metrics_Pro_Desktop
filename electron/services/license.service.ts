import { createHash, createHmac } from 'node:crypto';
import { hostname } from 'node:os';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

/** Secret embarqué — remplacer via HMP_LICENSE_SECRET au build release. */
const LICENSE_SECRET = process.env.HMP_LICENSE_SECRET ?? 'raqmi-phase3-cert-v1-change-in-prod';
const TRIAL_DAYS = 30;
const KEY_PATTERN = /^RS-(STANDARD|PRO|ENTERPRISE)-(\d{8})-([A-F0-9]{8})$/i;

export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE' | 'TRIAL' | 'DEVELOPMENT';
export type LicenseState = 'active' | 'trial' | 'expired' | 'invalid' | 'development';

export interface LicenseStatusDto {
  state: LicenseState;
  edition: LicenseEdition | null;
  holder: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  machineId: string;
  activatedAt: string | null;
  message: string;
  isPackaged: boolean;
}

export interface ParsedLicenseKey {
  edition: Exclude<LicenseEdition, 'TRIAL' | 'DEVELOPMENT'>;
  expiresAt: string;
  signature: string;
}

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function writeSetting(key: string, value: string): void {
  getDatabase()
    .prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`)
    .run(key, value);
}

export function getMachineFingerprint(): string {
  const raw = [
    Electron.app.getPath('userData'),
    process.platform,
    process.arch,
    hostname(),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase();
}

export function parseLicenseKey(key: string): ParsedLicenseKey | null {
  const trimmed = key.trim().toUpperCase();
  const match = trimmed.match(KEY_PATTERN);
  if (!match) return null;

  const edition = match[1] as ParsedLicenseKey['edition'];
  const expiryRaw = match[2];
  const signature = match[3];
  const expiresAt = `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`;
  const expiryDate = new Date(`${expiresAt}T23:59:59`);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const expected = signLicensePayload(edition, expiryRaw);
  if (signature !== expected) return null;

  return { edition, expiresAt, signature };
}

export function signLicensePayload(
  edition: ParsedLicenseKey['edition'],
  expiryRaw: string,
): string {
  return createHmac('sha256', LICENSE_SECRET)
    .update(`${edition}|${expiryRaw}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

export function formatLicenseKey(edition: ParsedLicenseKey['edition'], expiresAt: string): string {
  const expiryRaw = expiresAt.replace(/-/g, '');
  return `RS-${edition}-${expiryRaw}-${signLicensePayload(edition, expiryRaw)}`;
}

function daysUntil(isoDate: string): number {
  const end = new Date(`${isoDate}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function assertLicenseAdmin(actorUserId: number): void {
  const actor = getActorContext(actorUserId);
  if (!userHasPermission(actorUserId, 'users.manage') && !isGlobalAdminRole(actor.roleCode)) {
    assertPermission(actorUserId, 'users.manage');
  }
}

export function ensureLicenseBootstrap(): void {
  if (!readSetting('app_first_run_at')) {
    writeSetting('app_first_run_at', new Date().toISOString());
  }
}

function buildDevelopmentStatus(): LicenseStatusDto {
  return {
    state: 'development',
    edition: 'DEVELOPMENT',
    holder: null,
    expiresAt: null,
    daysRemaining: null,
    machineId: getMachineFingerprint(),
    activatedAt: null,
    message: 'Mode développement — licence non requise.',
    isPackaged: false,
  };
}

function readActivatedLicense(): LicenseStatusDto | null {
  const edition = readSetting('license_edition');
  const expiresAt = readSetting('license_expires_at');
  const activatedAt = readSetting('license_activated_at');
  if (!edition || !expiresAt) return null;

  const daysRemaining = daysUntil(expiresAt);
  const holder = readSetting('license_holder') || null;
  if (daysRemaining < 0) {
    return {
      state: 'expired',
      edition: edition as LicenseEdition,
      holder,
      expiresAt,
      daysRemaining,
      machineId: getMachineFingerprint(),
      activatedAt: activatedAt || null,
      message: `Licence expirée le ${expiresAt}. Renouvelez la clé auprès de Raqmi System.`,
      isPackaged: true,
    };
  }

  return {
    state: 'active',
    edition: edition as LicenseEdition,
    holder,
    expiresAt,
    daysRemaining,
    machineId: getMachineFingerprint(),
    activatedAt: activatedAt || null,
    message:
      daysRemaining <= 30
        ? `Licence ${edition} — expiration dans ${daysRemaining} jour(s).`
        : `Licence ${edition} active jusqu'au ${expiresAt}.`,
    isPackaged: true,
  };
}

function readTrialStatus(): LicenseStatusDto {
  const firstRun = readSetting('app_first_run_at') || new Date().toISOString();
  const trialEnd = new Date(firstRun);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const expiresAt = trialEnd.toISOString().slice(0, 10);
  const daysRemaining = daysUntil(expiresAt);

  if (daysRemaining < 0) {
    return {
      state: 'expired',
      edition: 'TRIAL',
      holder: null,
      expiresAt,
      daysRemaining,
      machineId: getMachineFingerprint(),
      activatedAt: null,
      message: `Période d'essai terminée le ${expiresAt}. Activez une licence pour continuer en production.`,
      isPackaged: true,
    };
  }

  return {
    state: 'trial',
    edition: 'TRIAL',
    holder: null,
    expiresAt,
    daysRemaining,
    machineId: getMachineFingerprint(),
    activatedAt: null,
    message: `Période d'essai — ${daysRemaining} jour(s) restant(s).`,
    isPackaged: true,
  };
}

export function getLicenseStatus(): LicenseStatusDto {
  if (!Electron.app.isPackaged || process.env.HMP_LICENSE_BYPASS === '1') {
    return buildDevelopmentStatus();
  }

  ensureLicenseBootstrap();
  return readActivatedLicense() ?? readTrialStatus();
}

export function isLicenseOperational(): boolean {
  const status = getLicenseStatus();
  return status.state === 'active' || status.state === 'trial' || status.state === 'development';
}

export function activateLicense(actorUserId: number, key: string): LicenseStatusDto {
  assertLicenseAdmin(actorUserId);

  const parsed = parseLicenseKey(key);
  if (!parsed) {
    throw new Error('Clé de licence invalide ou signature incorrecte.');
  }

  const daysRemaining = daysUntil(parsed.expiresAt);
  if (daysRemaining < 0) {
    throw new Error(`Cette clé a expiré le ${parsed.expiresAt}.`);
  }

  const holder = readSetting('company_legal_name') || readSetting('company_name') || 'Client Raqmi';
  const machineId = getMachineFingerprint();

  writeSetting('license_edition', parsed.edition);
  writeSetting('license_expires_at', parsed.expiresAt);
  writeSetting('license_holder', holder);
  writeSetting('license_activated_at', new Date().toISOString());
  writeSetting('license_machine_id', machineId);
  writeSetting('license_key_hint', key.trim().slice(-8));

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    description: `Activation licence ${parsed.edition} — expiration ${parsed.expiresAt}`,
  });

  return getLicenseStatus();
}

export function clearLicense(actorUserId: number): LicenseStatusDto {
  assertLicenseAdmin(actorUserId);
  for (const key of [
    'license_edition',
    'license_expires_at',
    'license_holder',
    'license_activated_at',
    'license_machine_id',
    'license_key_hint',
  ]) {
    writeSetting(key, '');
  }
  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'license',
    description: 'Réinitialisation licence locale',
  });
  return getLicenseStatus();
}
