import { randomUUID } from 'node:crypto';
import { bcrypt } from '../utils/bcrypt';
import { verifyStoredPassword } from '../utils/legacyPassword';
import { getDatabase } from './sqlite';
import { generateInitialAdminPassword, writeInitialAdminCredentials } from './seed';
import { logger } from '../utils/logger';

const INITIAL_ADMIN_EMAIL = 'admin@hotelmetrics.local';
const LEGACY_COMPROMISED_PASSWORD = 'Admin@2026!';

interface AdminRow {
  id: number;
  email: string;
  password_hash: string;
  is_active: number;
  role_code: string;
}

function loadInitialAdmin(): AdminRow | undefined {
  return getDatabase()
    .prepare(
      `
      SELECT u.id, u.email, u.password_hash, u.is_active, r.code AS role_code
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.email = ? COLLATE NOCASE AND u.deleted_at IS NULL
      LIMIT 1
    `,
    )
    .get(INITIAL_ADMIN_EMAIL) as AdminRow | undefined;
}

function hasActiveSuperadmin(): boolean {
  const row = getDatabase()
    .prepare(
      `
      SELECT 1
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'SUPERADMIN'
        AND u.deleted_at IS NULL
        AND u.is_active = 1
      LIMIT 1
    `,
    )
    .get();
  return Boolean(row);
}

function hasAnySuperadmin(): boolean {
  const row = getDatabase()
    .prepare(
      `
      SELECT 1
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'SUPERADMIN' AND u.deleted_at IS NULL
      LIMIT 1
    `,
    )
    .get();
  return Boolean(row);
}

function rotateLegacyPasswordIfNeeded(row: AdminRow): void {
  if (!verifyStoredPassword(LEGACY_COMPROMISED_PASSWORD, row.password_hash)) return;

  const password = generateInitialAdminPassword();
  getDatabase()
    .prepare(
      `
      UPDATE users
      SET password_hash = ?, must_change_password = 1, updated_at = datetime('now')
      WHERE id = ?
    `,
    )
    .run(bcrypt.hashSync(password, 12), row.id);

  const credFile = writeInitialAdminCredentials(password);
  logger.warn(
    `Le mot de passe administrateur historique a été remplacé. Identifiants temporaires : ${credFile}`,
  );
}

function promoteInitialAdminToSuperadmin(row: AdminRow): void {
  if (row.role_code === 'SUPERADMIN') return;

  const role = getDatabase()
    .prepare(`SELECT id FROM roles WHERE code = 'SUPERADMIN'`)
    .get() as { id: number } | undefined;
  if (!role) throw new Error('Rôle SUPERADMIN absent. Migration de sécurité impossible.');

  getDatabase()
    .prepare(`UPDATE users SET role_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(role.id, row.id);
  logger.warn(`Compte ${row.email} promu vers le rôle SUPERADMIN pour la migration de sécurité.`);
}

function createRecoverySuperadmin(): void {
  const role = getDatabase()
    .prepare(`SELECT id FROM roles WHERE code = 'SUPERADMIN'`)
    .get() as { id: number } | undefined;
  if (!role) throw new Error('Rôle SUPERADMIN absent. Compte initial impossible à créer.');

  const password = generateInitialAdminPassword();
  getDatabase()
    .prepare(
      `
      INSERT INTO users (
        uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
        must_change_password, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, NULL, 1, 1, NULL, NULL)
    `,
    )
    .run(
      randomUUID(),
      INITIAL_ADMIN_EMAIL,
      bcrypt.hashSync(password, 12),
      'Administrateur système',
      role.id,
    );

  const credFile = writeInitialAdminCredentials(password);
  logger.warn(`Compte SUPERADMIN de récupération créé. Identifiants temporaires : ${credFile}`);
}

/**
 * Garantit uniquement l'existence d'un SUPERADMIN lors d'une installation ou
 * migration. Cette fonction ne déverrouille jamais un compte, ne le réactive
 * jamais et ne rétablit aucun mot de passe fixe.
 */
export function ensureBootstrapAuthAccounts(): void {
  const initialAdmin = loadInitialAdmin();

  if (hasActiveSuperadmin()) {
    if (initialAdmin?.is_active) rotateLegacyPasswordIfNeeded(initialAdmin);
    return;
  }

  if (hasAnySuperadmin()) {
    throw new Error(
      'Un compte SUPERADMIN existe mais il est inactif. Utilisez la procédure de récupération administrateur.',
    );
  }

  if (initialAdmin) {
    if (!initialAdmin.is_active) {
      throw new Error(
        `Le compte ${INITIAL_ADMIN_EMAIL} est inactif. Aucune réactivation automatique n'est autorisée.`,
      );
    }
    promoteInitialAdminToSuperadmin(initialAdmin);
    rotateLegacyPasswordIfNeeded(initialAdmin);
    return;
  }

  createRecoverySuperadmin();
}
