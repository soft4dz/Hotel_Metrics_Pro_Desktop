import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  assertPermission,
  getUserRoleCode,
  PermissionError,
  userHasPermission,
} from './permissions.service';

export interface RoleListItem {
  id: number;
  uuid: string;
  code: string;
  label: string;
  description: string | null;
  permissionCodes: string[];
  userCount: number;
  editable: boolean;
}

export interface PermissionListItem {
  id: number;
  code: string;
  label: string;
  module: string;
}

const PROTECTED_ROLE_CODES = new Set(['SUPERADMIN', 'ADMIN_DEC']);

function assertCanManageRolePermissions(actorUserId: number): void {
  const roleCode = getUserRoleCode(actorUserId);
  if (roleCode !== 'ADMIN_DEC' && roleCode !== 'SUPERADMIN') {
    throw new PermissionError(
      'Seuls Administrateur et Super Administrateur peuvent modifier les permissions des rôles.',
    );
  }
}

function isRoleEditable(roleCode: string): boolean {
  return !PROTECTED_ROLE_CODES.has(roleCode);
}

export function listRoles(actorUserId: number): RoleListItem[] {
  if (
    !userHasPermission(actorUserId, 'users.manage') &&
    !userHasPermission(actorUserId, 'audit.read')
  ) {
    assertPermission(actorUserId, 'users.manage');
  }

  const db = getDatabase();
  const roles = db
    .prepare(
      `
    SELECT id, uuid, code, label, description
    FROM roles
    WHERE deleted_at IS NULL
    ORDER BY label
  `,
    )
    .all() as Array<{
    id: number;
    uuid: string;
    code: string;
    label: string;
    description: string | null;
  }>;

  const permStmt = db.prepare(
    `
    SELECT p.code
    FROM role_permissions rp
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.code
  `,
  );

  const countStmt = db.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE role_id = ? AND deleted_at IS NULL`,
  );

  const allPermissionCodes = db
    .prepare(`SELECT code FROM permissions WHERE deleted_at IS NULL ORDER BY code`)
    .all()
    .map((p) => (p as { code: string }).code);

  return roles.map((r) => ({
    id: r.id,
    uuid: r.uuid,
    code: r.code,
    label: r.label,
    description: r.description,
    permissionCodes:
      r.code === 'SUPERADMIN' || r.code === 'ADMIN_DEC'
        ? allPermissionCodes
        : permStmt.all(r.id).map((p) => (p as { code: string }).code),
    userCount: (countStmt.get(r.id) as { c: number }).c,
    editable: isRoleEditable(r.code),
  }));
}

export function listPermissions(actorUserId: number): PermissionListItem[] {
  assertCanManageRolePermissions(actorUserId);

  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT id, code, label, module
    FROM permissions
    WHERE deleted_at IS NULL
    ORDER BY module, label
  `,
    )
    .all() as PermissionListItem[];
}

export function updateRolePermissions(
  actorUserId: number,
  roleId: number,
  permissionCodes: string[],
): RoleListItem {
  assertCanManageRolePermissions(actorUserId);

  const db = getDatabase();
  const role = db
    .prepare(`SELECT id, uuid, code, label, description FROM roles WHERE id = ? AND deleted_at IS NULL`)
    .get(roleId) as
    | { id: number; uuid: string; code: string; label: string; description: string | null }
    | undefined;

  if (!role) throw new Error('Rôle introuvable.');
  if (!isRoleEditable(role.code)) {
    throw new Error('Les permissions de ce rôle ne peuvent pas être modifiées.');
  }

  const uniqueCodes = [...new Set(permissionCodes.map((c) => c.trim()).filter(Boolean))];
  if (uniqueCodes.length === 0) {
    throw new Error('Sélectionnez au moins une permission.');
  }

  const permRows = db
    .prepare(
      `SELECT id, code FROM permissions WHERE deleted_at IS NULL AND code IN (${uniqueCodes.map(() => '?').join(',')})`,
    )
    .all(...uniqueCodes) as Array<{ id: number; code: string }>;

  if (permRows.length !== uniqueCodes.length) {
    throw new Error('Une ou plusieurs permissions sont invalides.');
  }

  const oldCodes = (
    db
      .prepare(
        `
      SELECT p.code FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `,
      )
      .all(roleId) as Array<{ code: string }>
  ).map((p) => p.code);

  const deleteLinks = db.prepare(`DELETE FROM role_permissions WHERE role_id = ?`);
  const insertLink = db.prepare(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`);

  const run = db.transaction(() => {
    deleteLinks.run(roleId);
    for (const perm of permRows) {
      insertLink.run(roleId, perm.id);
    }
    db.prepare(`UPDATE roles SET updated_at = datetime('now') WHERE id = ?`).run(roleId);
  });
  run();

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'RolesPage',
    description: `Permissions mises à jour pour le rôle ${role.label}`,
    oldValue: JSON.stringify(oldCodes),
    newValue: JSON.stringify(uniqueCodes.sort()),
  });

  const updated = listRoles(actorUserId).find((r) => r.id === roleId);
  if (!updated) throw new Error('Rôle introuvable après mise à jour.');
  return updated;
}

export function listRolesForSelect(actorUserId: number): Array<{ id: number; code: string; label: string }> {
  assertPermission(actorUserId, 'users.manage');
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, code, label FROM roles WHERE deleted_at IS NULL ORDER BY label`,
    )
    .all() as Array<{ id: number; code: string; label: string }>;
}
