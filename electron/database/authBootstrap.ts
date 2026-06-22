import { randomUUID } from 'node:crypto';
import { bcrypt } from '../utils/bcrypt';
import { verifyStoredPassword } from '../utils/legacyPassword';
import { getDatabase } from './sqlite';
import { DEFAULT_ADMIN_PASSWORD } from './seed';
import { logger } from '../utils/logger';

/** Comptes garantis après chaque démarrage (mot de passe connu si hash invalide). */
const BOOTSTRAP_ACCOUNTS: Array<{
  email: string;
  password: string;
  fullName: string;
  roleCode: string;
}> = [
  {
    email: 'admin@hotelmetrics.local',
    password: DEFAULT_ADMIN_PASSWORD,
    fullName: 'Super Administrateur',
    roleCode: 'SUPERADMIN',
  },
];

function unlockUser(userId: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL, is_active = 1, updated_at = datetime('now')
    WHERE id = ?
  `,
  ).run(userId);
}

function ensureUserExists(
  spec: (typeof BOOTSTRAP_ACCOUNTS)[0],
  passwordHash: string,
): number {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL`,
    )
    .get(spec.email) as { id: number } | undefined;

  if (existing) return existing.id;

  const role = db.prepare(`SELECT id FROM roles WHERE code = ?`).get(spec.roleCode) as
    | { id: number }
    | undefined;
  if (!role) {
    logger.warn(`Rôle ${spec.roleCode} absent — compte ${spec.email} non créé.`);
    return 0;
  }

  const result = db
    .prepare(
      `
    INSERT INTO users (
      uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      must_change_password, created_by, updated_by
    ) VALUES (
      @uuid, @email, @password_hash, @full_name, @role_id, NULL, 1,
      0, NULL, NULL
    )
  `,
    )
    .run({
      uuid: randomUUID(),
      email: spec.email.toLowerCase(),
      password_hash: passwordHash,
      full_name: spec.fullName,
      role_id: role.id,
    });

  logger.info(`Compte créé au démarrage : ${spec.email}`);
  return Number(result.lastInsertRowid);
}

/**
 * Garantit que les comptes admin/dec existent, sont déverrouillés et acceptent le mot de passe documenté.
 */
export function ensureBootstrapAuthAccounts(): void {
  const db = getDatabase();

  for (const spec of BOOTSTRAP_ACCOUNTS) {
    const targetHash = bcrypt.hashSync(spec.password, 12);
    const userId = ensureUserExists(spec, targetHash);
    if (!userId) continue;

    const row = db
      .prepare(`SELECT password_hash FROM users WHERE id = ?`)
      .get(userId) as { password_hash: string };

    const acceptsKnownPassword = verifyStoredPassword(spec.password, row.password_hash);
    if (!acceptsKnownPassword) {
      db.prepare(
        `
        UPDATE users
        SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
        WHERE id = ?
      `,
      ).run(targetHash, userId);
      logger.info(`Mot de passe réparé pour ${spec.email}`);
    }

    unlockUser(userId);
  }
}
