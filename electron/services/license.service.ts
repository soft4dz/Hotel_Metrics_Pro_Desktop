import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
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

export class LicenseReadOnlyError extends Error {
  constructor() {
    super(
      'Licence expirée — application en lecture seule. Consultation et exports autorisés. Renouvelez votre abonnement dans Paramètres → Licence.',
    );
    this.name = 'LicenseReadOnlyError';
  }
}

const TRIAL_DAYS = 30;

function readLicensedSectorId(): BusinessSectorId {
  const licensed = readSetting('license_business_sector');
  if (licensed && ['hotel', 'restaurant', 'commerce', 'services', 'industrie', 'port', 'generic'].includes(licensed)) {
    return licensed as BusinessSectorId;
  }
  return 'hotel';
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

function resolveLicenseMode(): LicenseMode {
  const mode = readSetting('license_mode', 'offline');
  return mode === 'remote' ? 'remote' : 'offline';
}

function resolveRemoteServerUrl(): string {
  return (
    readSetting('license_server_url') ||
    process.env.LICENSE_SERVER_URL ||
    process.env.CENTRAL_API_URL ||
    ''
  ).trim();
}

function computeLicenseAlerts(
  state: LicenseState,
  daysRemaining: number | null,
): Pick<LicenseStatusDto, 'readOnlyMode' | 'alertLevel' | 'alertMessage'> {
  if (state === 'development') {
    return { readOnlyMode: false, alertLevel: 'none', alertMessage: null };
  }

  if (state === 'expired' || (daysRemaining !== null && daysRemaining < 0)) {
    return {
      readOnlyMode: true,
      alertLevel: 'expired',
      alertMessage:
        'Licence expirée — mode lecture seule activé. Vous pouvez consulter et exporter vos données. Renouvelez votre abonnement pour reprendre les saisies.',
    };
  }

  if (daysRemaining !== null && daysRemaining <= 7) {
    return {
      readOnlyMode: false,
      alertLevel: 'urgent',
      alertMessage: `Abonnement expire dans ${daysRemaining} jour(s) — renouvelez avant le passage en lecture seule.`,
    };
  }

  if (daysRemaining !== null && daysRemaining <= 30) {
    return {
      readOnlyMode: false,
      alertLevel: 'warning',
      alertMessage: `Abonnement expire dans ${daysRemaining} jour(s) — contactez Raqmi System pour le renouvellement.`,
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
  const licenseSource =
    base.state === 'development'
      ? 'development'
      : sourceSetting === 'remote'
        ? 'remote'
        : 'offline';

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
  const raw = [
    Electron.app.getPath('userData'),
    process.platform,
    process.arch,
    hostname(),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase();
}

export { parseLicenseKey, formatLicenseKey } from './license-remote.service';

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

function readActivatedLicense(): LicenseStatusDto | null {
  const edition = readSetting('license_edition');
  const expiresAt = readSetting('license_expires_at');
  const activatedAt = readSetting('license_activated_at');
  if (!edition || !expiresAt) return null;

  const daysRemaining = daysUntil(expiresAt);
  const holder = readSetting('license_holder') || null;
  const source = readSetting('license_source') === 'remote' ? 'distante' : 'locale';

  if (daysRemaining < 0) {
    return enrichStatus({
      state: 'expired',
      edition: edition as LicenseEdition,
      holder,
      expiresAt,
      daysRemaining,
      machineId: getMachineFingerprint(),
      activatedAt: activatedAt || null,
      message: `Licence ${source} expirée le ${expiresAt}. Contactez Raqmi System.`,
      isPackaged: true,
    });
  }

  return enrichStatus({
    state: 'active',
    edition: edition as LicenseEdition,
    holder,
    expiresAt,
    daysRemaining,
    machineId: getMachineFingerprint(),
    activatedAt: activatedAt || null,
    message:
      daysRemaining <= 30
        ? `Licence ${source} ${edition} — expiration dans ${daysRemaining} jour(s).`
        : `Licence ${source} ${edition} active jusqu'au ${expiresAt}.`,
    isPackaged: true,
  });
}

function readTrialStatus(): LicenseStatusDto {
  const firstRun = readSetting('app_first_run_at') || new Date().toISOString();
  const trialEnd = new Date(firstRun);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const expiresAt = trialEnd.toISOString().slice(0, 10);
  const daysRemaining = daysUntil(expiresAt);

  if (daysRemaining < 0) {
    return enrichStatus({
      state: 'expired',
      edition: 'TRIAL',
      holder: null,
      expiresAt,
      daysRemaining,
      machineId: getMachineFingerprint(),
      activatedAt: null,
      message: `Période d'essai terminée le ${expiresAt}. Activez une licence pour continuer en production.`,
      isPackaged: true,
    });
  }

  return enrichStatus({
    state: 'trial',
    edition: 'TRIAL',
    holder: null,
    expiresAt,
    daysRemaining,
    machineId: getMachineFingerprint(),
    activatedAt: null,
    message: `Période d'essai — ${daysRemaining} jour(s) restant(s).`,
    isPackaged: true,
  });
}

export function getLicenseStatus(): LicenseStatusDto {
  if (!Electron.app.isPackaged || process.env.HMP_LICENSE_BYPASS === '1') {
    return buildDevelopmentStatus();
  }

  ensureLicenseBootstrap();
  return readActivatedLicense() ?? readTrialStatus();
}

export function isLicenseReadOnly(): boolean {
  return getLicenseStatus().readOnlyMode;
}

export function assertLicenseWritable(): void {
  if (isLicenseReadOnly()) {
    throw new LicenseReadOnlyError();
  }
}

export function isLicenseOperational(): boolean {
  const status = getLicenseStatus();
  return status.state === 'active' || status.state === 'trial' || status.state === 'development' || status.readOnlyMode;
}

export async function getLicenseConfig(actorUserId: number): Promise<LicenseConfigDto> {
  assertLicenseAdmin(actorUserId);
  const remoteServerUrl = resolveRemoteServerUrl();
  let remoteServerReachable: boolean | null = null;
  if (remoteServerUrl) {
    remoteServerReachable = await probeLicenseServer(remoteServerUrl);
  }
  return {
    licenseMode: resolveLicenseMode(),
    remoteServerUrl,
    organizationCode: readSetting('license_org_code'),
    remoteServerReachable,
  };
}

export function updateLicenseConfig(
  actorUserId: number,
  input: Partial<LicenseConfigDto>,
): LicenseConfigDto {
  assertLicenseAdmin(actorUserId);

  if (input.licenseMode !== undefined) {
    if (input.licenseMode !== 'offline' && input.licenseMode !== 'remote') {
      throw new Error('Mode de licence invalide.');
    }
    writeSetting('license_mode', input.licenseMode);
  }
  if (input.remoteServerUrl !== undefined) {
    writeSetting('license_server_url', input.remoteServerUrl.trim());
  }
  if (input.organizationCode !== undefined) {
    writeSetting('license_org_code', input.organizationCode.trim().toUpperCase());
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
  parsed: { edition: string; expiresAt: string },
  key: string,
  holder: string,
  machineId: string,
  source: 'offline' | 'remote',
  organizationCode?: string | null,
): void {
  writeSetting('license_edition', parsed.edition);
  writeSetting('license_expires_at', parsed.expiresAt);
  writeSetting('license_holder', holder);
  writeSetting('license_activated_at', new Date().toISOString());
  writeSetting('license_machine_id', machineId);
  writeSetting('license_key_hint', key.trim().slice(-8));
  writeSetting('license_key_value', key.trim().toUpperCase());
  writeSetting('license_source', source);
  if (organizationCode?.trim()) {
    writeSetting('license_org_code', organizationCode.trim().toUpperCase());
  }
  writeSetting('license_last_remote_sync', source === 'remote' ? new Date().toISOString() : '');
}

export async function activateLicense(actorUserId: number, key: string): Promise<LicenseStatusDto> {
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
  const mode = resolveLicenseMode();
  const serverUrl = resolveRemoteServerUrl();

  if (mode === 'remote' && serverUrl) {
    const remote = await remoteActivateLicense(serverUrl, {
      key: key.trim().toUpperCase(),
      machineId,
      organizationCode: readSetting('license_org_code') || null,
      holder,
    });
    persistLocalActivation(
      { edition: remote.edition, expiresAt: remote.expiresAt },
      key,
      remote.holder || holder,
      machineId,
      'remote',
      remote.organizationCode,
    );
    applyBusinessSectorFromLicense(remote.businessSector, remote.edition, actorUserId, true);
  } else {
    persistLocalActivation(parsed, key, holder, machineId, 'offline');
    applyBusinessSectorFromLicense(parsed.businessSector ?? 'hotel', parsed.edition, actorUserId, true);
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    description: `Activation licence ${parsed.edition} — expiration ${parsed.expiresAt}`,
  });

  return getLicenseStatus();
}

export async function syncRemoteLicense(actorUserId: number): Promise<LicenseStatusDto> {
  assertLicenseAdmin(actorUserId);

  const serverUrl = resolveRemoteServerUrl();
  if (!serverUrl) {
    throw new Error('URL du serveur de licences non configurée.');
  }

  const key = readSetting('license_key_value');
  if (!key) {
    throw new Error('Aucune licence enregistrée sur ce poste — activez une clé d\'abord.');
  }

  const machineId = getMachineFingerprint();
  const result = await remoteValidateLicense(serverUrl, {
    key,
    machineId,
    organizationCode: readSetting('license_org_code') || null,
  });

  writeSetting('license_last_remote_sync', new Date().toISOString());

  if (result.ok && result.state === 'active' && result.edition && result.expiresAt) {
    writeSetting('license_edition', result.edition);
    writeSetting('license_expires_at', result.expiresAt);
    writeSetting('license_source', 'remote');
    if (result.holder) writeSetting('license_holder', result.holder);
    if (result.organizationCode) writeSetting('license_org_code', result.organizationCode);
    if (result.businessSector && result.edition) {
      applyBusinessSectorFromLicense(result.businessSector, result.edition, actorUserId, true);
    }
  } else if (result.state === 'revoked' || result.state === 'invalid') {
    throw new Error(result.message || 'Licence révoquée ou invalide côté serveur.');
  } else if (result.state === 'expired') {
    writeSetting('license_expires_at', result.expiresAt ?? readSetting('license_expires_at'));
    throw new Error(result.message || 'Licence expirée côté serveur.');
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'license',
    description: 'Synchronisation licence distante',
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
    'license_key_value',
    'license_source',
    'license_last_remote_sync',
    'license_business_sector',
    'business_sector_locked',
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
