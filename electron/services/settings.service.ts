import Electron from '../lib/electronApi';
import path from '../lib/nodePath';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

export interface AppSettingsDto {
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

function writeSetting(key: string, value: string): void {
  getDatabase()
    .prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`)
    .run(key, value);
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
    settings: {
      tauxTvaPort: parseFloat(readSetting('port_taux_tva_default', '19')),
      maxLoginAttempts: parseInt(readSetting('max_login_attempts', '5'), 10),
      lockoutMinutes: parseInt(readSetting('lockout_minutes', '15'), 10),
    },
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

  return getAppInfo(actorUserId).settings;
}
