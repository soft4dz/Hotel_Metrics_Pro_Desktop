import { getDatabase } from '../database/sqlite';
import { isFullAccessRole } from '../database/adminPermissions';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export function userHasPermission(userId: number, permissionCode: string): boolean {
  const roleCode = getUserRoleCode(userId);
  if (isFullAccessRole(roleCode)) return true;

  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT 1
    FROM users u
    INNER JOIN role_permissions rp ON rp.role_id = u.role_id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ?
      AND u.deleted_at IS NULL
      AND u.is_active = 1
      AND p.code = ?
      AND p.deleted_at IS NULL
  `,
    )
    .get(userId, permissionCode);
  return !!row;
}

export function assertPermission(userId: number, permissionCode: string): void {
  if (!userHasPermission(userId, permissionCode)) {
    throw new PermissionError(`Permission refusée : ${permissionCode}`);
  }
}

export function getUserRoleCode(userId: number): string | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL
  `,
    )
    .get(userId) as { role_code: string } | undefined;
  return row?.role_code ?? null;
}
