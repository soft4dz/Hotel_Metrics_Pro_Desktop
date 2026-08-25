import { createHash } from 'node:crypto';
import { cpus, hostname, networkInterfaces, platform, arch, totalmem } from 'node:os';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import {
  parseLicenseKey,
  probeLicenseServer,
  remoteActivateLicense,
  remoteValidateLicense,
} from './license-remote.service';
import { assertPermission, userHasPermission } from './permissions.service';
import { applyBusinessSectorFromLicense } from './business-sector.service';
import { getLicensePackSummary } from './license-pack.service';
import type { BusinessSectorId } from '../../src/shared/constants/businessSectors';
import { getBusinessSectorProfile } from '../../src/shared/constants/businessSectors';
import type {
  LicenseAlertLevel,
  LicenseConfigDto,
  LicenseEdition,
  LicenseMode,
  LicenseState,
  LicenseStatusDto,
} from '../../src/shared/types/license';

export type { LicenseEdition, LicenseState, LicenseStatusDto, LicenseConfigDto };
export { parseLicenseKey } from './license-remote.service';

export class LicenseReadOnlyError extends Error {
  constructor() {
    super(
      'Licence expirée, révoquée ou non validée — application en lecture seule. Consultation et exports autorisés.',
    );
    this.name = 'LicenseReadOnlyError';
  }
}

const TRIAL_DAYS = 30;
const REMOTE_GRACE_MS = 7 * 86_400_000;
const REMOTE_SYNC_INTERVAL_MS = 12 * 60 * 60_000;
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60_000;

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

function protectValue(value: string): string {
  if (Electron.safeStorage?.isEncryptionAvailable()) {
    return `safe:${Electron.safeStorage.encryptString(value).toString('base64')}`;
  }
  if (!Electron.app.isPackaged || process.env.NODE_ENV === 'test') return `dev:${value}`;
  throw new Error('Stockage sécurisé du système indisponible. Activation annulée.');
}

function unprotectValue(value: string): string | null {
  try {
    if (value.startsWith('safe:') && Electron.safeStorage?.isEncryptionAvailable()) {
      return Electron.safeStorage.decryptString(Buffer.from(value.slice(5), 'base64'));
    }
    if (value.startsWith('dev:') && (!Electron.app.isPackaged || process.env.NODE_ENV === 'test')) {
      return value.slice(4);
    }
    return null;
  } catch {
    return null;
  }
}

function readProtectedSetting(key: string): string | null {
  const value = readSetting(key);
  return value ? unprotectValue(value) : null;
}

function writeProtectedSetting(key: string, value: string): void {
  writeSetting(key, protectValue(value));
}

function resolveLicenseMode(): LicenseMode {
  return readSetting('license_mode', 'offline') === 'remote' ? 'remote' : 'offline';
}

function resolveRemoteServerUrl(): string {
  return (
    readSetting('license_server_url') ||
    process.env.LICENSE_SERVER_URL ||
    process.env.CENTRAL_API_URL ||
    ''
  ).trim();
}

function isAllowedServerUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname));
  } catch {
    return false;
  }
}

function readLicensedSectorId(): BusinessSectorId {
  const licensed = readSetting('license_business_sector');
  if (['hotel', 'restaurant', 'commerce', 'services', 'industrie', 'port', 'generic'].includes(licensed)) {
    return licensed as BusinessSectorId;
  }
  return 'hotel';
}

function computeLicenseAlerts(
  state: LicenseState,
  daysRemaining: number | null,
): Pick<LicenseStatusDto, 'readOnlyMode' | 'alertLevel' | 'alertMessage'> {
  if (state === 'development') return { readOnlyMode: false, alertLevel: 'none', alertMessage: null };
  if (state === 'revoked' || state === 'invalid') {
    return {
      readOnlyMode: true,
      alertLevel: 'expired',
      alertMessage: state === 'revoked'
        ? 'Licence révoquée par Raqmi — mode lecture seule activé.'
        : 'Licence non valide ou contrôle distant requis — mode lecture seule activé.',
    };
  }
  if (state === 'expired' || (daysRemaining !== null && daysRemaining < 0)) {
    return {
      readOnlyMode: true,
      alertLevel: 'expired',
      alertMessage: 'Licence expirée — mode lecture seule activé. Renouvelez votre abonnement pour reprendre les saisies.',
    };
  }
  if (daysRemaining !== null && daysRemaining <= 7) {
    return {
      readOnlyMode: false,
      alertLevel: 'urgent',
      alertMessage: `Abonnement expire dans ${daysRemaining} jour(s) — renouvellement urgent.`,
    };
  }
  if (daysRemaining !== null && daysRemaining <= 30) {
    return {
      readOnlyMode: false,
      alertLevel: 'warning',
      alertMessage: `Abonnement expire dans ${daysRemaining} jour(s) — contactez Raqmi System.`,
    };
  }
  return { readOnlyMode: false, alertLevel: 'none' as LicenseAlertLevel, alertMessage: null };
}

function enrichStatus(
  base: Omit<
    LicenseStatusDto,
    | 'licenseSource'
    | 'licenseMode'
    | 'remoteServerUrl'
    | 'organizationCode'
    | 'lastRemoteSyncAt'
    | 'remoteServerReachable'
    | 'readOnlyMode'
    | 'alertLevel'
    | 'alertMessage'
    | 'businessSector'
    | 'businessSectorLabel'
    | 'packLabel'
    | 'licensedModuleCount'
  >,
): LicenseStatusDto {
  const sourceSetting = readSetting('license_source');
  const licenseSource = base.state === 'development'
    ? 'development'
    : sourceSetting === 'remote' ? 'remote' : 'offline';
  const alerts = computeLicenseAlerts(base.state, base.daysRemaining);
  const sectorId = readLicensedSectorId();
  const pack = getLicensePackSummary();
  return {
    ...base,
    ...alerts,
    businessSector: sectorId,
    businessSectorLabel: getBusinessSectorProfile(sectorId).label,
    packLabel: pack ? `${pack.editionLabel} · ${pack.sectorLabel}` : null,
    licensedModuleCount: pack?.enabledCount ?? null,
    licenseSource,
    licenseMode: resolveLicenseMode(),
    remoteServerUrl: resolveRemoteServerUrl() || null,
    organizationCode: readSetting('license_org_code') || null,
    lastRemoteSyncAt: readSetting('license_last_remote_sync') || null,
    remoteServerReachable: null,
  };
}

export function getMachineFingerprint(): string {
  let macs: string[] = [];
  try {
    macs = Object.values(networkInterfaces())
      .flatMap((entries) => entries ?? [])
      .filter((entry) => !entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00')
      .map((entry) => entry.mac.toLowerCase())
      .sort();
  } catch {
    // Certains environnements Windows restreints ne permettent pas l'énumération réseau.
  }
  const raw = [platform(), arch(), hostname(), cpus()[0]?.model ?? '', String(totalmem()), ...macs].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 20).toUpperCase();
}

function daysUntil(isoDate: string): number {
  const end = new Date(`${isoDate}T23:59:59.999Z`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function assertLicenseAdmin(actorUserId: number): void {
  const actor = getActorContext(actorUserId);
  if (!userHasPermission(actorUserId, 'users.manage') && !isGlobalAdminRole(actor.roleCode)) {
    assertPermission(actorUserId, 'users.manage');
  }
}

export function ensureLicenseBootstrap(): void {
  if (!readProtectedSetting('app_first_run_secure')) {
    const existing = readSetting('app_first_run_at') || new Date().toISOString();
    writeSetting('app_first_run_at', existing);
    writeProtectedSetting('app_first_run_secure', existing);
  }
}

function buildDevelopmentStatus(): LicenseStatusDto {
  return enrichStatus({
    state: 'development',
    edition: 'DEVELOPMENT',
    holder: null,
    expiresAt: null,
    daysRemaining: null,
    machineId: getMachineFingerprint(),
    activatedAt: null,
    message: 'Mode développement — licence non requise.',
    isPackaged: false,
  });
}

function invalidActivatedStatus(message: string): LicenseStatusDto {
  return enrichStatus({
    state: 'invalid',
    edition: null,
    holder: readSetting('license_holder') || null,
    expiresAt: null,
    daysRemaining: null,
    machineId: getMachineFingerprint(),
    activatedAt: readSetting('license_activated_at') || null,
    message,
    isPackaged: true,
  });
}

function invalidSignedLicenseStatus(
  parsed: NonNullable<ReturnType<typeof parseLicenseKey>>,
  message: string,
): LicenseStatusDto {
  return enrichStatus({
    state: 'invalid',
    edition: parsed.edition,
    holder: readSetting('license_holder') || null,
    expiresAt: parsed.expiresAt,
    daysRemaining: daysUntil(parsed.expiresAt),
    machineId: getMachineFingerprint(),
    activatedAt: readSetting('license_activated_at') || null,
    message,
    isPackaged: true,
  });
}

function clockRollbackDetected(): boolean {
  const previousRaw = readProtectedSetting('license_clock_anchor');
  const previous = previousRaw ? Number(previousRaw) : 0;
  const now = Date.now();
  if (previous && now + CLOCK_ROLLBACK_TOLERANCE_MS < previous) return true;
  if (!previous || now - previous > 60 * 60_000) writeProtectedSetting('license_clock_anchor', String(now));
  return false;
}

function readActivatedLicense(): LicenseStatusDto | null {
  const protectedKey = readSetting('license_key_value');
  if (!protectedKey) return null;
  const key = unprotectValue(protectedKey);
  if (!key) return invalidActivatedStatus('Licence locale illisible ou stockage sécurisé altéré.');
  const parsed = parseLicenseKey(key);
  if (!parsed) return invalidActivatedStatus('Signature de licence invalide ou clé publique Raqmi absente.');

  const machineId = getMachineFingerprint();
  if (readSetting('license_machine_id') !== machineId) {
    return invalidActivatedStatus('Cette activation appartient à un autre poste.');
  }
  if (parsed.mode === 'offline' && parsed.machineId !== machineId) {
    return invalidActivatedStatus('La licence offline a été émise pour un autre poste.');
  }
  const configuredOrg = readSetting('license_org_code');
  if (configuredOrg && configuredOrg !== parsed.organizationCode) {
    return invalidActivatedStatus('Le code organisation ne correspond pas à la licence signée.');
  }

  writeSetting('license_edition', parsed.edition);
  writeSetting('license_expires_at', parsed.expiresAt);
  writeSetting('license_business_sector', parsed.businessSector);
  writeSetting('business_sector_locked', '1');
  writeSetting('license_org_code', parsed.organizationCode);
  if (clockRollbackDetected()) {
    return invalidSignedLicenseStatus(parsed, 'Retour anormal de l’horloge système détecté.');
  }

  const remoteState = readSetting('license_remote_state', 'active');
  if (parsed.mode === 'remote' && ['revoked', 'invalid', 'expired'].includes(remoteState)) {
    const state = remoteState as 'revoked' | 'invalid' | 'expired';
    return enrichStatus({
      state,
      edition: parsed.edition,
      holder: readSetting('license_holder') || null,
      expiresAt: parsed.expiresAt,
      daysRemaining: daysUntil(parsed.expiresAt),
      machineId,
      activatedAt: readSetting('license_activated_at') || null,
      message: state === 'revoked' ? 'Licence révoquée par le serveur Raqmi.' : 'Licence distante non valide.',
      isPackaged: true,
    });
  }

  if (parsed.mode === 'remote') {
    const lastSync = Date.parse(readSetting('license_last_remote_sync'));
    if (!Number.isFinite(lastSync) || Date.now() - lastSync > REMOTE_GRACE_MS) {
      return invalidSignedLicenseStatus(parsed, 'Contrôle serveur requis : délai de grâce de 7 jours dépassé.');
    }
  }

  const daysRemaining = daysUntil(parsed.expiresAt);
  const state: LicenseState = daysRemaining < 0 ? 'expired' : 'active';
  const source = parsed.mode === 'remote' ? 'distante' : 'offline';
  return enrichStatus({
    state,
    edition: parsed.edition,
    holder: readSetting('license_holder') || null,
    expiresAt: parsed.expiresAt,
    daysRemaining,
    machineId,
    activatedAt: readSetting('license_activated_at') || null,
    message: state === 'expired'
      ? `Licence ${source} expirée le ${parsed.expiresAt}.`
      : `Licence ${source} ${parsed.edition} active jusqu'au ${parsed.expiresAt}.`,
    isPackaged: true,
  });
}

function readTrialStatus(): LicenseStatusDto {
  const protectedFirstRun = readProtectedSetting('app_first_run_secure');
  if (!protectedFirstRun) return invalidActivatedStatus('État de la période d’essai altéré.');
  const trialEnd = new Date(protectedFirstRun);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const expiresAt = trialEnd.toISOString().slice(0, 10);
  const daysRemaining = daysUntil(expiresAt);
  return enrichStatus({
    state: daysRemaining < 0 ? 'expired' : 'trial',
    edition: 'TRIAL',
    holder: null,
    expiresAt,
    daysRemaining,
    machineId: getMachineFingerprint(),
    activatedAt: null,
    message: daysRemaining < 0
      ? `Période d'essai terminée le ${expiresAt}.`
      : `Période d'essai — ${daysRemaining} jour(s) restant(s).`,
    isPackaged: true,
  });
}

export function getLicenseStatus(): LicenseStatusDto {
  if (!Electron.app.isPackaged) return buildDevelopmentStatus();
  ensureLicenseBootstrap();
  return readActivatedLicense() ?? readTrialStatus();
}

export function isLicenseReadOnly(): boolean {
  return getLicenseStatus().readOnlyMode;
}

export function assertLicenseWritable(): void {
  if (isLicenseReadOnly()) throw new LicenseReadOnlyError();
}

export function isLicenseOperational(): boolean {
  const status = getLicenseStatus();
  return status.state === 'active' || status.state === 'trial' || status.state === 'development' || status.readOnlyMode;
}

export async function getLicenseConfig(actorUserId: number): Promise<LicenseConfigDto> {
  assertLicenseAdmin(actorUserId);
  const remoteServerUrl = resolveRemoteServerUrl();
  return {
    licenseMode: resolveLicenseMode(),
    remoteServerUrl,
    organizationCode: readSetting('license_org_code'),
    remoteServerReachable: remoteServerUrl ? await probeLicenseServer(remoteServerUrl) : null,
  };
}

export function updateLicenseConfig(actorUserId: number, input: Partial<LicenseConfigDto>): LicenseConfigDto {
  assertLicenseAdmin(actorUserId);
  if (input.licenseMode !== undefined) {
    if (input.licenseMode !== 'offline' && input.licenseMode !== 'remote') throw new Error('Mode de licence invalide.');
    writeSetting('license_mode', input.licenseMode);
  }
  if (input.remoteServerUrl !== undefined) {
    const url = input.remoteServerUrl.trim();
    if (url && !isAllowedServerUrl(url)) throw new Error('URL HTTPS requise, sauf localhost en développement.');
    writeSetting('license_server_url', url);
  }
  if (input.organizationCode !== undefined) {
    const org = input.organizationCode.trim().toUpperCase();
    if (org && !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(org)) throw new Error('Code organisation invalide.');
    writeSetting('license_org_code', org);
  }
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    description: 'Mise à jour configuration licence distante',
  });
  return {
    licenseMode: resolveLicenseMode(),
    remoteServerUrl: resolveRemoteServerUrl(),
    organizationCode: readSetting('license_org_code'),
    remoteServerReachable: null,
  };
}

function persistLocalActivation(
  parsed: { licenseId: string; edition: string; expiresAt: string; organizationCode: string },
  key: string,
  holder: string,
  machineId: string,
  source: 'offline' | 'remote',
): void {
  writeSetting('license_id', parsed.licenseId);
  writeSetting('license_edition', parsed.edition);
  writeSetting('license_expires_at', parsed.expiresAt);
  writeSetting('license_holder', holder);
  writeSetting('license_activated_at', new Date().toISOString());
  writeSetting('license_machine_id', machineId);
  writeSetting('license_key_hint', key.trim().slice(-8));
  writeProtectedSetting('license_key_value', key.trim());
  writeSetting('license_source', source);
  writeSetting('license_org_code', parsed.organizationCode);
  writeSetting('license_remote_state', 'active');
  writeSetting('license_last_remote_sync', source === 'remote' ? new Date().toISOString() : '');
  writeProtectedSetting('license_clock_anchor', String(Date.now()));
}

function remoteClaimsMatchSignedToken(
  parsed: NonNullable<ReturnType<typeof parseLicenseKey>>,
  response: {
    licenseId: string | null;
    edition: string | null;
    expiresAt: string | null;
    organizationCode: string | null;
    businessSector: string | null;
  },
): boolean {
  return response.licenseId === parsed.licenseId &&
    response.edition === parsed.edition &&
    response.expiresAt === parsed.expiresAt &&
    response.organizationCode === parsed.organizationCode &&
    response.businessSector === parsed.businessSector;
}

export async function activateLicense(actorUserId: number, key: string): Promise<LicenseStatusDto> {
  assertLicenseAdmin(actorUserId);
  const parsed = parseLicenseKey(key);
  if (!parsed) throw new Error('Clé V2 invalide, signature incorrecte ou clé publique Raqmi absente.');
  if (daysUntil(parsed.expiresAt) < 0) throw new Error(`Cette clé a expiré le ${parsed.expiresAt}.`);

  const holder = readSetting('company_legal_name') || readSetting('company_name') || parsed.organizationCode;
  const machineId = getMachineFingerprint();
  const mode = resolveLicenseMode();
  const configuredOrg = readSetting('license_org_code');
  if (configuredOrg && configuredOrg !== parsed.organizationCode) {
    throw new Error('Cette licence appartient à une autre organisation.');
  }
  if (mode !== parsed.mode) {
    throw new Error(`Cette clé est de type ${parsed.mode}; configurez le même mode dans Paramètres → Licence.`);
  }

  if (mode === 'remote') {
    const serverUrl = resolveRemoteServerUrl();
    if (!serverUrl || !isAllowedServerUrl(serverUrl)) throw new Error('Serveur de licences HTTPS requis en mode remote.');
    const remote = await remoteActivateLicense(serverUrl, {
      key: key.trim(),
      machineId,
      organizationCode: parsed.organizationCode,
      holder,
    });
    if (!remoteClaimsMatchSignedToken(parsed, remote)) {
      throw new Error('Réponse du serveur incohérente avec la licence signée.');
    }
    persistLocalActivation(
      parsed,
      key,
      remote.holder || holder,
      machineId,
      'remote',
    );
    applyBusinessSectorFromLicense(parsed.businessSector, parsed.edition, actorUserId, true);
  } else {
    if (parsed.machineId !== machineId) throw new Error('Cette licence offline a été émise pour un autre poste.');
    persistLocalActivation(parsed, key, holder, machineId, 'offline');
    applyBusinessSectorFromLicense(parsed.businessSector, parsed.edition, actorUserId, true);
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    description: `Activation licence V2 ${parsed.licenseId} — ${parsed.organizationCode}`,
  });
  return getLicenseStatus();
}

async function performRemoteSync(actorUserId: number | null, throwOnInvalid: boolean): Promise<LicenseStatusDto> {
  const serverUrl = resolveRemoteServerUrl();
  if (!serverUrl || !isAllowedServerUrl(serverUrl)) throw new Error('URL HTTPS du serveur de licences non configurée.');
  const key = readProtectedSetting('license_key_value');
  if (!key) throw new Error('Aucune licence distante lisible sur ce poste.');
  const parsed = parseLicenseKey(key);
  if (!parsed || parsed.mode !== 'remote') throw new Error('Licence distante locale invalide.');

  const result = await remoteValidateLicense(serverUrl, {
    key,
    machineId: getMachineFingerprint(),
    organizationCode: readSetting('license_org_code') || null,
  });
  writeSetting('license_last_remote_sync', new Date().toISOString());
  writeSetting('license_remote_state', result.state);

  if (result.ok && result.state === 'active' && result.edition && result.expiresAt && result.businessSector) {
    if (!remoteClaimsMatchSignedToken(parsed, result)) {
      writeSetting('license_remote_state', 'invalid');
      if (throwOnInvalid) throw new Error('Réponse du serveur incohérente avec la licence signée.');
      return getLicenseStatus();
    }
    writeSetting('license_edition', parsed.edition);
    writeSetting('license_expires_at', parsed.expiresAt);
    writeSetting('license_source', 'remote');
    if (result.holder) writeSetting('license_holder', result.holder);
    writeSetting('license_org_code', parsed.organizationCode);
    applyBusinessSectorFromLicense(parsed.businessSector, parsed.edition, actorUserId, true);
  } else if (throwOnInvalid) {
    throw new Error(result.message || 'Licence distante révoquée, expirée ou invalide.');
  }

  if (actorUserId !== null) {
    writeAuditLog({
      userId: actorUserId,
      action: 'UPDATE',
      module: 'license',
      description: `Synchronisation licence distante — ${result.state}`,
    });
  }
  return getLicenseStatus();
}

export async function syncRemoteLicense(actorUserId: number): Promise<LicenseStatusDto> {
  assertLicenseAdmin(actorUserId);
  return performRemoteSync(actorUserId, true);
}

export async function autoSyncRemoteLicense(): Promise<void> {
  if (!Electron.app.isPackaged || resolveLicenseMode() !== 'remote') return;
  if (!readSetting('license_key_value')) return;
  try {
    await performRemoteSync(null, false);
  } catch {
    // Une panne réseau conserve la dernière validation uniquement pendant le délai de grâce.
  }
}

export function startLicenseBackgroundSync(): () => void {
  void autoSyncRemoteLicense();
  const timer = setInterval(() => void autoSyncRemoteLicense(), REMOTE_SYNC_INTERVAL_MS);
  return () => clearInterval(timer);
}

export function clearLicense(actorUserId: number): LicenseStatusDto {
  assertLicenseAdmin(actorUserId);
  for (const key of [
    'license_id',
    'license_edition',
    'license_expires_at',
    'license_holder',
    'license_activated_at',
    'license_machine_id',
    'license_key_hint',
    'license_key_value',
    'license_source',
    'license_last_remote_sync',
    'license_remote_state',
    'license_business_sector',
    'business_sector_locked',
  ]) writeSetting(key, '');
  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'license',
    description: 'Réinitialisation licence locale',
  });
  return getLicenseStatus();
}
