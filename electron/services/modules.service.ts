import { getDatabase } from '../database/sqlite';

export function listEnabledModuleIds(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare(`SELECT module_id FROM modules_config WHERE is_enabled = 1`)
    .all() as { module_id: string }[];
  return rows.map((r) => r.module_id);
}

export function setModuleEnabled(moduleId: string, enabled: boolean): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO modules_config (module_id, is_enabled, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(module_id) DO UPDATE SET is_enabled = excluded.is_enabled, updated_at = excluded.updated_at`,
  ).run(moduleId, enabled ? 1 : 0);
}
