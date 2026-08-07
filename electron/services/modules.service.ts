import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { isModuleAllowedByLicense, isPackLockedByLicense } from './license-pack.service';
import {
  CONFIGURED_MODULE_IDS,
  CONFIGURED_MODULE_ID_SET,
  PROTECTED_MODULE_IDS,
} from '../../src/shared/constants/configuredModules';
import type { ModuleConfigItem } from '../../src/shared/types/modules';

export function listEnabledModuleIds(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare(`SELECT module_id FROM modules_config WHERE is_enabled = 1`)
    .all() as { module_id: string }[];
  return rows.map((r) => r.module_id);
}

export function listModulesConfig(): ModuleConfigItem[] {
  const db = getDatabase();
  const rows = db
    .prepare(`SELECT module_id, is_enabled, updated_at FROM modules_config`)
    .all() as Array<{ module_id: string; is_enabled: number; updated_at: string }>;
  const byId = new Map(rows.map((row) => [row.module_id, row]));

  return CONFIGURED_MODULE_IDS.map((moduleId) => {
    const row = byId.get(moduleId);
    return {
      moduleId,
      isEnabled: row ? row.is_enabled === 1 : true,
      updatedAt: row?.updated_at ?? null,
    };
  });
}

export function listModulesConfigForUser(actorUserId: number): ModuleConfigItem[] {
  assertPermission(actorUserId, 'users.manage');
  return listModulesConfig();
}

function upsertModuleEnabled(moduleId: string, enabled: boolean): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO modules_config (module_id, is_enabled, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(module_id) DO UPDATE SET is_enabled = excluded.is_enabled, updated_at = excluded.updated_at`,
  ).run(moduleId, enabled ? 1 : 0);
}

/** Usage interne (seeds, tests) — sans contrôle d'accès. */
export function setModuleEnabled(moduleId: string, enabled: boolean): void {
  upsertModuleEnabled(moduleId, enabled);
}

export function setModuleEnabledForUser(
  actorUserId: number,
  moduleId: string,
  enabled: boolean,
): boolean {
  assertPermission(actorUserId, 'users.manage');

  if (!CONFIGURED_MODULE_ID_SET.has(moduleId)) {
    throw new Error('Module inconnu ou non configurable.');
  }
  if (!enabled && PROTECTED_MODULE_IDS.has(moduleId as (typeof CONFIGURED_MODULE_IDS)[number])) {
    throw new Error('Ce module socle ne peut pas être désactivé.');
  }
  if (enabled && isPackLockedByLicense() && !isModuleAllowedByLicense(moduleId)) {
    throw new Error(
      'Ce module n\'est pas inclus dans votre pack licence (édition + secteur). Contactez Raqmi System.',
    );
  }

  upsertModuleEnabled(moduleId, enabled);

  writeAuditLog({
    userId: actorUserId,
    action: enabled ? 'UPDATE' : 'UPDATE',
    module: 'modules',
    page: 'ModulesAdminPage',
    description: `Module « ${moduleId} » ${enabled ? 'activé' : 'désactivé'}`,
  });

  return true;
}
