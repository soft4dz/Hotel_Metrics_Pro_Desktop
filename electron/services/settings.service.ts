import Electron from '../lib/electronApi';
import path from '../lib/nodePath';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

export interface AppSettingsDto {
  companyName: string;
  companyLegalName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultHomePage: string;
  defaultCurrency: string;
  amountDecimals: number;
  dailyRevenueDeadline: string;
  validationRequired: boolean;
  correctionRequiresReason: boolean;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  backupRetentionCount: number;
  auditEnabled: boolean;
  reportHeader: string;
  reportFooter: string;
  tauxTvaPort: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
}

export interface AppInfoDto {
  version: string;
  dataDirectory: string;
  databaseFile: string;
  settings: AppSettingsDto;
}

function getDataDirectory(): string {
  return path.join(Electron.app.getPath('userData'), 'data');
}

function readSetting(key: string, fallback: string): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function readBoolSetting(key: string, fallback: boolean): boolean {
  const value = readSetting(key, fallback ? '1' : '0').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function writeSetting(key: string, value: string): void {
  getDatabase()
    .prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`)
    .run(key, value);
}

function writeBoolSetting(key: string, value: boolean): void {
  writeSetting(key, value ? '1' : '0');
}

function normalizeNonEmpty(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function readAppSettings(): AppSettingsDto {
  return {
    companyName: readSetting('company_name', 'EGT Sidi Fredj'),
    companyLegalName: readSetting('company_legal_name', 'Entreprise de Gestion Touristique de Sidi Fredj'),
    companyAddress: readSetting('company_address', 'Sidi Fredj, Staoueli, Alger'),
    companyPhone: readSetting('company_phone', ''),
    companyEmail: readSetting('company_email', ''),
    defaultHomePage: readSetting('default_home_page', '/modules'),
    defaultCurrency: readSetting('default_currency', 'DZD'),
    amountDecimals: parseInt(readSetting('amount_decimals', '2'), 10),
    dailyRevenueDeadline: readSetting('daily_revenue_deadline', '09:30'),
    validationRequired: readBoolSetting('validation_required', true),
    correctionRequiresReason: readBoolSetting('correction_requires_reason', true),
    autoBackupEnabled: readBoolSetting('auto_backup_enabled', true),
    autoBackupTime: readSetting('auto_backup_time', '18:00'),
    backupRetentionCount: parseInt(readSetting('backup_retention_count', '30'), 10),
    auditEnabled: readBoolSetting('audit_enabled', true),
    reportHeader: readSetting('report_header', 'Hotel Metrics Pro - Rapport interne'),
    reportFooter: readSetting('report_footer', 'Document généré automatiquement'),
    tauxTvaPort: parseFloat(readSetting('port_taux_tva_default', '19')),
    maxLoginAttempts: parseInt(readSetting('max_login_attempts', '5'), 10),
    lockoutMinutes: parseInt(readSetting('lockout_minutes', '15'), 10),
  };
}

export function getAppInfo(actorUserId: number): AppInfoDto {
  const actor = getActorContext(actorUserId);
  if (!userHasPermission(actorUserId, 'users.manage') && !isGlobalAdminRole(actor.roleCode)) {
    assertPermission(actorUserId, 'users.manage');
  }
  const dataDir = getDataDirectory();
  return {
    version: Electron.app.getVersion(),
    dataDirectory: dataDir,
    databaseFile: path.join(dataDir, 'hotel_metrics_local.db'),
    settings: readAppSettings(),
  };
}

export function updateAppSettings(
  actorUserId: number,
  input: Partial<AppSettingsDto>,
): AppSettingsDto {
  const actor = getActorContext(actorUserId);
  if (!userHasPermission(actorUserId, 'users.manage') && !isGlobalAdminRole(actor.roleCode)) {
    assertPermission(actorUserId, 'users.manage');
  }

  if (input.companyName !== undefined) writeSetting('company_name', input.companyName.trim());
  if (input.companyLegalName !== undefined) {
    writeSetting('company_legal_name', input.companyLegalName.trim());
  }
  if (input.companyAddress !== undefined) writeSetting('company_address', input.companyAddress.trim());
  if (input.companyPhone !== undefined) writeSetting('company_phone', input.companyPhone.trim());
  if (input.companyEmail !== undefined) writeSetting('company_email', input.companyEmail.trim());

  if (input.defaultHomePage !== undefined) {
    writeSetting('default_home_page', normalizeNonEmpty(input.defaultHomePage, '/modules'));
  }
  if (input.defaultCurrency !== undefined) {
    writeSetting('default_currency', normalizeNonEmpty(input.defaultCurrency, 'DZD'));
  }
  if (input.amountDecimals !== undefined) {
    const v = Math.round(input.amountDecimals);
    if (Number.isNaN(v) || v < 0 || v > 4) {
      throw new Error('Décimales : entre 0 et 4.');
    }
    writeSetting('amount_decimals', String(v));
  }
  if (input.dailyRevenueDeadline !== undefined) {
    writeSetting(
      'daily_revenue_deadline',
      normalizeNonEmpty(input.dailyRevenueDeadline, '09:30'),
    );
  }

  if (input.validationRequired !== undefined) {
    writeBoolSetting('validation_required', input.validationRequired);
  }
  if (input.correctionRequiresReason !== undefined) {
    writeBoolSetting('correction_requires_reason', input.correctionRequiresReason);
  }

  if (input.autoBackupEnabled !== undefined) {
    writeBoolSetting('auto_backup_enabled', input.autoBackupEnabled);
  }
  if (input.autoBackupTime !== undefined) {
    writeSetting('auto_backup_time', normalizeNonEmpty(input.autoBackupTime, '18:00'));
  }
  if (input.backupRetentionCount !== undefined) {
    const v = Math.round(input.backupRetentionCount);
    if (Number.isNaN(v) || v < 1 || v > 365) {
      throw new Error('Conservation sauvegardes : entre 1 et 365.');
    }
    writeSetting('backup_retention_count', String(v));
  }

  if (input.auditEnabled !== undefined) writeBoolSetting('audit_enabled', input.auditEnabled);
  if (input.reportHeader !== undefined) writeSetting('report_header', input.reportHeader.trim());
  if (input.reportFooter !== undefined) writeSetting('report_footer', input.reportFooter.trim());

  if (input.tauxTvaPort !== undefined) {
    const v = input.tauxTvaPort;
    if (Number.isNaN(v) || v < 0 || v > 100) {
      throw new Error('Taux TVA invalide (0–100).');
    }
    writeSetting('port_taux_tva_default', String(v));
  }
  if (input.maxLoginAttempts !== undefined) {
    const v = Math.round(input.maxLoginAttempts);
    if (v < 3 || v > 20) throw new Error('Tentatives max : entre 3 et 20.');
    writeSetting('max_login_attempts', String(v));
  }
  if (input.lockoutMinutes !== undefined) {
    const v = Math.round(input.lockoutMinutes);
    if (v < 5 || v > 120) throw new Error('Verrouillage : entre 5 et 120 minutes.');
    writeSetting('lockout_minutes', String(v));
  }

  return readAppSettings();
}
