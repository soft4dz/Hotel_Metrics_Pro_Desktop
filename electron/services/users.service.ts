import { bcrypt } from '../utils/bcrypt';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, getUserRoleCode } from './permissions.service';
import { validatePasswordStrength } from '../utils/passwordPolicy';
import { isValidEmail, normalizeEmail } from '../utils/validators';

import {
  formatUserHotelsLabel,
  loadUserHotelIds,
  syncUserHotelAccess,
  userHasAllHotelsAccess,
} from './userHotels.service';

export interface UserListItem {
  id: number;
  uuid: string;
  email: string;
  fullName: string;
  roleId: number;
  roleCode: string;
  roleLabel: string;
  hotelId: number | null;
  hotelName: string | null;
  hotelIds: number[];
  allHotelsAccess: boolean;
  hotelsLabel: string;
  isActive: boolean;
  accountStatus: 'actif' | 'en_attente' | 'inactif';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserDetail extends UserListItem {}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  roleId: number;
  hotelId?: number | null;
  hotelIds?: number[];
  allHotelsAccess?: boolean;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  roleId?: number;
  hotelId?: number | null;
  hotelIds?: number[];
  allHotelsAccess?: boolean;
  isActive?: boolean;
  password?: string;
}

function mapRow(row: Record<string, unknown>): UserListItem {
  const hotelIds = loadUserHotelIds(row.id as number);
  const allHotelsAccess = userHasAllHotelsAccess(
    row.id as number,
    row.role_code as string,
    (row.hotel_scope as string) ?? 'assigned',
  );
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    email: row.email as string,
    fullName: row.full_name as string,
    roleId: row.role_id as number,
    roleCode: row.role_code as string,
    roleLabel: row.role_label as string,
    hotelId: (row.hotel_id as number | null) ?? null,
    hotelName: (row.hotel_name as string | null) ?? null,
    hotelIds,
    allHotelsAccess,
    hotelsLabel: formatUserHotelsLabel(hotelIds, allHotelsAccess),
    isActive: Boolean(row.is_active),
    accountStatus: (row.account_status as UserListItem['accountStatus']) ?? (row.is_active ? 'actif' : 'inactif'),
    lastLoginAt: (row.last_login_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const listSql = `
  SELECT
    u.id, u.uuid, u.email, u.full_name, u.role_id, u.hotel_id, u.hotel_scope, u.is_active,
    COALESCE(u.account_status, CASE WHEN u.is_active = 1 THEN 'actif' ELSE 'inactif' END) AS account_status,
    u.last_login_at, u.created_at,
    r.code AS role_code, r.label AS role_label,
    h.name AS hotel_name
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
  LEFT JOIN hotels h ON h.id = u.hotel_id
  WHERE u.deleted_at IS NULL
`;

export function listUsers(actorUserId: number, search?: string): UserListItem[] {
  assertPermission(actorUserId, 'users.manage');

  const db = getDatabase();
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    return db
      .prepare(
        `${listSql} AND (u.email LIKE ? OR u.full_name LIKE ?) ORDER BY u.full_name`,
      )
      .all(q, q)
      .map((r) => mapRow(r as Record<string, unknown>));
  }

  return db
    .prepare(`${listSql} ORDER BY u.full_name`)
    .all()
    .map((r) => mapRow(r as Record<string, unknown>));
}

export function getUser(actorUserId: number, id: number): UserDetail | null {
  assertPermission(actorUserId, 'users.manage');

  const db = getDatabase();
  const row = db.prepare(`${listSql} AND u.id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapRow(row) : null;
}

export function createUser(actorUserId: number, input: CreateUserInput): UserDetail {
  assertPermission(actorUserId, 'users.manage');

  // Only SUPERADMIN can create another SUPERADMIN
  const db0 = getDatabase();
  const targetRole0 = db0
    .prepare(`SELECT code FROM roles WHERE id = ?`)
    .get(input.roleId) as { code: string } | undefined;
  if (targetRole0?.code === 'SUPERADMIN' && getUserRoleCode(actorUserId) !== 'SUPERADMIN') {
    throw new Error('Seul un super-administrateur peut créer un compte avec ce rôle.');
  }

  if (!isValidEmail(input.email)) {
    throw new Error('Adresse e-mail invalide.');
  }
  if (!input.fullName.trim()) {
    throw new Error('Nom complet requis.');
  }
  if (!input.password || input.password.length < 8) {
    throw new Error('Mot de passe : 8 caractères minimum.');
  }
  const policyError = validatePasswordStrength(input.password);
  if (policyError) throw new Error(policyError);

  const db = getDatabase();
  const email = normalizeEmail(input.email);

  const exists = db
    .prepare(`SELECT 1 FROM users WHERE email = ? AND deleted_at IS NULL`)
    .get(email);
  if (exists) throw new Error('Cet e-mail est déjà utilisé.');

  const passwordHash = bcrypt.hashSync(input.password, 12);
  const uuid = randomUUID();

  const result = db
    .prepare(
      `
    INSERT INTO users (
      uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      created_by, updated_by, sync_status
    ) VALUES (
      @uuid, @email, @password_hash, @full_name, @role_id, @hotel_id, @is_active,
      @created_by, @updated_by, 'pending_create'
    )
  `,
    )
    .run({
      uuid,
      email,
      password_hash: passwordHash,
      full_name: input.fullName.trim(),
      role_id: input.roleId,
      hotel_id: input.hotelId ?? null,
      is_active: input.isActive === false ? 0 : 1,
      created_by: actorUserId,
      updated_by: actorUserId,
    });

  const id = Number(result.lastInsertRowid);

  const hotelIds = input.hotelIds ?? (input.hotelId ? [input.hotelId] : []);
  const roleCode = targetRole0?.code ?? '';
  const allHotelsAccess =
    input.allHotelsAccess ??
    ['SUPERADMIN', 'ADMIN_DEC', 'PDG', 'AUDIT_INTERNE', 'COMPTABILITE'].includes(roleCode);
  syncUserHotelAccess(id, hotelIds, allHotelsAccess);

  const user = getUser(actorUserId, id)!;

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'administration',
    page: 'UserFormPage',
    description: `Création utilisateur ${user.email}`,
    newValue: JSON.stringify({ email: user.email, role: user.roleCode }),
  });

  return user;
}

export function updateUser(
  actorUserId: number,
  id: number,
  input: UpdateUserInput,
): UserDetail {
  assertPermission(actorUserId, 'users.manage');

  const existing = getUser(actorUserId, id);
  if (!existing) throw new Error('Utilisateur introuvable.');

  const actorRole = getUserRoleCode(actorUserId);

  // Only SUPERADMIN can modify another SUPERADMIN
  if (existing.roleCode === 'SUPERADMIN' && actorRole !== 'SUPERADMIN') {
    throw new Error('Seul un super-administrateur peut modifier ce compte.');
  }

  // Only SUPERADMIN can assign the SUPERADMIN role
  if (input.roleId !== undefined) {
    const db = getDatabase();
    const targetRole = db
      .prepare(`SELECT code FROM roles WHERE id = ?`)
      .get(input.roleId) as { code: string } | undefined;
    if (targetRole?.code === 'SUPERADMIN' && actorRole !== 'SUPERADMIN') {
      throw new Error('Seul un super-administrateur peut attribuer ce rôle.');
    }
  }

  const db = getDatabase();
  const updates: string[] = [];
  const params: Record<string, unknown> = { id, updated_by: actorUserId };

  if (input.email !== undefined) {
    if (!isValidEmail(input.email)) throw new Error('Adresse e-mail invalide.');
    const email = normalizeEmail(input.email);
    const dup = db
      .prepare(`SELECT 1 FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL`)
      .get(email, id);
    if (dup) throw new Error('Cet e-mail est déjà utilisé.');
    updates.push('email = @email');
    params.email = email;
  }

  if (input.fullName !== undefined) {
    updates.push('full_name = @full_name');
    params.full_name = input.fullName.trim();
  }
  if (input.roleId !== undefined) {
    updates.push('role_id = @role_id');
    params.role_id = input.roleId;
  }
  if (input.hotelId !== undefined) {
    updates.push('hotel_id = @hotel_id');
    params.hotel_id = input.hotelId;
  }
  if (input.isActive !== undefined) {
    updates.push('is_active = @is_active');
    params.is_active = input.isActive ? 1 : 0;
  }
  if (input.password?.trim()) {
    const policyError = validatePasswordStrength(input.password);
    if (policyError) throw new Error(policyError);
    updates.push('password_hash = @password_hash');
    params.password_hash = bcrypt.hashSync(input.password, 12);
    updates.push('must_change_password = 0');
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')", 'sync_status = @sync_status');
  params.sync_status = 'pending_update';

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);

  if (input.hotelIds !== undefined || input.allHotelsAccess !== undefined) {
    const hotelIds = input.hotelIds ?? loadUserHotelIds(id);
    const allHotelsAccess = input.allHotelsAccess ?? existing.allHotelsAccess;
    syncUserHotelAccess(id, hotelIds, allHotelsAccess);
  }

  const user = getUser(actorUserId, id)!;

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'UserFormPage',
    description: `Modification utilisateur ${user.email}`,
    oldValue: JSON.stringify({ email: existing.email, role: existing.roleCode }),
    newValue: JSON.stringify({ email: user.email, role: user.roleCode }),
  });

  return user;
}

export function countPendingAccounts(actorUserId: number): number {
  assertPermission(actorUserId, 'users.manage');
  const row = getDatabase()
    .prepare(`SELECT COUNT(*) AS c FROM users WHERE account_status = 'en_attente' AND deleted_at IS NULL`)
    .get() as { c: number };
  return row.c;
}

export function activatePendingUser(actorUserId: number, id: number): UserDetail {
  assertPermission(actorUserId, 'users.manage');

  const existing = getUser(actorUserId, id);
  if (!existing) throw new Error('Utilisateur introuvable.');
  if (existing.accountStatus !== 'en_attente') {
    throw new Error('Ce compte n\'est pas en attente d\'activation.');
  }

  const db = getDatabase();
  db.prepare(`
    UPDATE users
    SET is_active = 1, account_status = 'actif', updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
    WHERE id = ?
  `).run(actorUserId, id);

  const user = getUser(actorUserId, id)!;
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'UsersPage',
    description: `Activation compte en attente : ${user.email}`,
    newValue: JSON.stringify({ accountStatus: 'actif' }),
  });
  return user;
}

export function deactivateUser(actorUserId: number, id: number, reason: string): void {
  assertPermission(actorUserId, 'users.manage');

  if (actorUserId === id) {
    throw new Error('Vous ne pouvez pas désactiver votre propre compte.');
  }

  const existing = getUser(actorUserId, id);
  if (!existing) throw new Error('Utilisateur introuvable.');

  if (existing.email === 'admin@raqmi.local') {
    throw new Error('Le compte administrateur système ne peut pas être désactivé.');
  }

  const actorRole = getUserRoleCode(actorUserId);
  if (existing.roleCode === 'SUPERADMIN' && actorRole !== 'SUPERADMIN') {
    throw new Error('Seul un super-administrateur peut désactiver ce compte.');
  }

  const db = getDatabase();
  db.prepare(
    `
    UPDATE users
    SET deleted_at = datetime('now'), is_active = 0, updated_by = ?, sync_status = 'pending_delete'
    WHERE id = ?
  `,
  ).run(actorUserId, id);

  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'administration',
    page: 'UsersPage',
    description: `Désactivation utilisateur ${existing.email} — ${reason}`,
    oldValue: JSON.stringify(existing),
  });
}
