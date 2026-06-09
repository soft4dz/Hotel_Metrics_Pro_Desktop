import { bcrypt } from '../utils/bcrypt';
import { verifyStoredPassword } from '../utils/legacyPassword';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { isValidEmail, normalizeEmail } from '../utils/validators';
import { validatePasswordStrength } from '../utils/passwordPolicy';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import { loadUserHotelIds, userHasAllHotelsAccess } from './userHotels.service';

export interface AuthUserDto {
  id: number;
  uuid: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  hotelId: number | null;
  hotelIds: number[];
  allHotelsAccess: boolean;
  mustChangePassword: boolean;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: AuthUserDto;
  remainingAttempts?: number;
}

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

interface UserRow {
  id: number;
  uuid: string;
  email: string;
  password_hash: string;
  full_name: string;
  role_id: number;
  hotel_id: number | null;
  hotel_scope: string;
  is_active: number;
  failed_login_attempts: number;
  locked_until: string | null;
  must_change_password: number;
  role_code: string;
  role_label: string;
}

const GENERIC_LOGIN_ERROR = 'Identifiants incorrects ou compte indisponible.';

function getMachineId(): string {
  return hostname();
}

function getSetting(key: string, fallback: string): string {
  const db = getDatabase();
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

function getMaxAttempts(): number {
  return parseInt(getSetting('max_login_attempts', '5'), 10);
}

function getLockoutMinutes(): number {
  return parseInt(getSetting('lockout_minutes', '15'), 10);
}

function logConnection(
  email: string,
  success: boolean,
  userId: number | null,
  failureReason: string | null,
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO logs_connexions (
      uuid, user_id, email, success, failure_reason, machine_id
    ) VALUES (@uuid, @user_id, @email, @success, @failure_reason, @machine_id)
  `).run({
    uuid: randomUUID(),
    user_id: userId,
    email,
    success: success ? 1 : 0,
    failure_reason: failureReason,
    machine_id: getMachineId(),
  });
}

function mapUser(row: UserRow): AuthUserDto {
  const hotelIds = loadUserHotelIds(row.id);
  const allHotelsAccess = userHasAllHotelsAccess(row.id, row.role_code, row.hotel_scope ?? 'assigned');
  return {
    id: row.id,
    uuid: row.uuid,
    email: row.email,
    fullName: row.full_name,
    role: row.role_code,
    roleLabel: row.role_label,
    hotelId: row.hotel_id ?? hotelIds[0] ?? null,
    hotelIds,
    allHotelsAccess,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

function findUserByEmail(email: string): UserRow | undefined {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT
      u.id, u.uuid, u.email, u.password_hash, u.full_name, u.role_id, u.hotel_id, u.hotel_scope,
      u.is_active, u.failed_login_attempts, u.locked_until, u.must_change_password,
      r.code AS role_code, r.label AS role_label
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.email = ? COLLATE NOCASE AND u.deleted_at IS NULL
  `,
    )
    .get(email) as UserRow | undefined;
}

function isAccountLocked(row: UserRow): boolean {
  if (!row.locked_until) return false;
  const lockedUntil = new Date(row.locked_until).getTime();
  return Date.now() < lockedUntil;
}

function registerFailedAttempt(row: UserRow): number {
  const db = getDatabase();
  const maxAttempts = getMaxAttempts();
  const attempts = row.failed_login_attempts + 1;
  let lockedUntil: string | null = null;

  if (attempts >= maxAttempts) {
    const lockMs = getLockoutMinutes() * 60 * 1000;
    lockedUntil = new Date(Date.now() + lockMs).toISOString();
  }

  db.prepare(`
    UPDATE users
    SET failed_login_attempts = ?, locked_until = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(attempts, lockedUntil, row.id);

  return Math.max(0, maxAttempts - attempts);
}

function resetFailedAttempts(userId: number): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(userId);
}

export function login(email: string, password: string): LoginResult {
  const trimmedEmail = email?.trim() ?? '';
  const trimmedPassword = password?.trim() ?? '';

  if (!isValidEmail(trimmedEmail)) {
    logConnection(trimmedEmail || '(vide)', false, null, 'E-mail invalide');
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!trimmedPassword) {
    logConnection(normalizeEmail(trimmedEmail), false, null, 'Mot de passe vide');
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  const normalizedEmail = normalizeEmail(trimmedEmail);
  const row = findUserByEmail(normalizedEmail);

  if (!row) {
    logConnection(normalizedEmail, false, null, 'Utilisateur inconnu');
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!row.is_active) {
    logConnection(normalizedEmail, false, row.id, 'Compte désactivé');
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  if (isAccountLocked(row)) {
    logConnection(normalizedEmail, false, row.id, 'Compte verrouillé');
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  const passwordOk = verifyStoredPassword(trimmedPassword, row.password_hash);

  if (!passwordOk) {
    const remaining = registerFailedAttempt(row);
    logConnection(normalizedEmail, false, row.id, 'Mot de passe incorrect');

    if (remaining <= 0) {
      return {
        success: false,
        error: GENERIC_LOGIN_ERROR,
        remainingAttempts: 0,
      };
    }

    return {
      success: false,
      error: GENERIC_LOGIN_ERROR,
      remainingAttempts: remaining,
    };
  }

  resetFailedAttempts(row.id);
  logConnection(normalizedEmail, true, row.id, null);

  const user = mapUser(row);

  writeAuditLog({
    userId: user.id,
    userEmail: user.email,
    roleCode: user.role,
    action: 'LOGIN',
    module: 'auth',
    page: 'LoginPage',
    description: 'Connexion réussie',
  });

  return { success: true, user };
}

export function logout(user: AuthUserDto): void {
  writeAuditLog({
    userId: user.id,
    userEmail: user.email,
    roleCode: user.role,
    action: 'LOGOUT',
    module: 'auth',
    page: 'Header',
    description: 'Déconnexion',
  });
}

export function getUserById(id: number): AuthUserDto | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT
      u.id, u.uuid, u.email, u.password_hash, u.full_name, u.role_id, u.hotel_id, u.hotel_scope,
      u.is_active, u.failed_login_attempts, u.locked_until, u.must_change_password,
      r.code AS role_code, r.label AS role_label
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL AND u.is_active = 1
  `,
    )
    .get(id) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): ChangePasswordResult {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, email, password_hash, must_change_password FROM users WHERE id = ? AND deleted_at IS NULL AND is_active = 1`,
    )
    .get(userId) as
    | { id: number; email: string; password_hash: string; must_change_password: number }
    | undefined;

  if (!row) {
    return { success: false, error: 'Utilisateur introuvable.' };
  }

  if (!verifyStoredPassword(currentPassword, row.password_hash)) {
    return { success: false, error: 'Mot de passe actuel incorrect.' };
  }

  const policyError = validatePasswordStrength(newPassword);
  if (policyError) {
    return { success: false, error: policyError };
  }

  if (bcrypt.compareSync(newPassword, row.password_hash)) {
    return { success: false, error: 'Le nouveau mot de passe doit être différent.' };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0, updated_at = datetime('now'), sync_status = 'pending_update'
    WHERE id = ?
  `).run(passwordHash, userId);

  writeAuditLog({
    userId,
    userEmail: row.email,
    action: 'UPDATE',
    module: 'auth',
    page: 'SecuriteAccesPage',
    description: 'Mot de passe modifié',
  });

  return { success: true };
}

export function getUserProfile(userId: number): {
  id: number;
  email: string;
  fullName: string;
  roleCode: string;
  roleLabel: string;
  hotelId: number | null;
  lastLoginAt: string | null;
} | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT u.id, u.email, u.full_name, u.hotel_id, u.last_login_at,
           r.code AS role_code, r.label AS role_label
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL AND u.is_active = 1
  `,
    )
    .get(userId) as
    | {
        id: number;
        email: string;
        full_name: string;
        hotel_id: number | null;
        last_login_at: string | null;
        role_code: string;
        role_label: string;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roleCode: row.role_code,
    roleLabel: row.role_label,
    hotelId: row.hotel_id,
    lastLoginAt: row.last_login_at,
  };
}
