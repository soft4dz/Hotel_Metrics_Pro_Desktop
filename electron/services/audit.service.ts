import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { getDatabase } from '../database/sqlite';
import { assertPermission } from './permissions.service';

export interface AuditEntryInput {
  userId?: number | null;
  userEmail?: string | null;
  roleCode?: string | null;
  action: string;
  module: string;
  page?: string | null;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
}

function getMachineId(): string {
  return hostname();
}

export function writeAuditLog(entry: AuditEntryInput): void {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO audit_log (
      uuid, user_id, user_email, role_code, action, module, page,
      description, old_value, new_value, ip_address, machine_id, sync_status
    ) VALUES (
      @uuid, @user_id, @user_email, @role_code, @action, @module, @page,
      @description, @old_value, @new_value, @ip_address, @machine_id, 'pending_create'
    )
  `).run({
    uuid: randomUUID(),
    user_id: entry.userId ?? null,
    user_email: entry.userEmail ?? null,
    role_code: entry.roleCode ?? null,
    action: entry.action,
    module: entry.module,
    page: entry.page ?? null,
    description: entry.description,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    ip_address: entry.ipAddress ?? null,
    machine_id: getMachineId(),
  });
}

export interface AuditLogItem {
  id: number;
  uuid: string;
  userEmail: string | null;
  roleCode: string | null;
  action: string;
  module: string;
  page: string | null;
  description: string;
  createdAt: string;
}

export interface AuditListFilters {
  search?: string;
  module?: string;
  action?: string;
  limit?: number;
}

export function listAuditLogs(
  actorUserId: number,
  filters: AuditListFilters = {},
): AuditLogItem[] {
  assertPermission(actorUserId, 'audit.read');

  const db = getDatabase();
  const limit = Math.min(filters.limit ?? 200, 500);
  const conditions = ['1=1'];
  const params: unknown[] = [];

  if (filters.module?.trim()) {
    conditions.push('module = ?');
    params.push(filters.module.trim());
  }
  if (filters.action?.trim()) {
    conditions.push('action = ?');
    params.push(filters.action.trim());
  }
  if (filters.search?.trim()) {
    conditions.push('(description LIKE ? OR user_email LIKE ? OR action LIKE ?)');
    const q = `%${filters.search.trim()}%`;
    params.push(q, q, q);
  }

  params.push(limit);

  return db
    .prepare(
      `
    SELECT id, uuid, user_email, role_code, action, module, page, description, created_at
    FROM audit_log
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ?
  `,
    )
    .all(...params)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as number,
        uuid: r.uuid as string,
        userEmail: (r.user_email as string | null) ?? null,
        roleCode: (r.role_code as string | null) ?? null,
        action: r.action as string,
        module: r.module as string,
        page: (r.page as string | null) ?? null,
        description: r.description as string,
        createdAt: r.created_at as string,
      };
    });
}
