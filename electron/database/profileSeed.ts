import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from '../lib/nodePath';
import { bcrypt } from '../utils/bcrypt';
import { getDatabase, getDataDirectory } from './sqlite';
import { logger } from '../utils/logger';
import { USER_ROLE_PROFILES } from '../../src/shared/constants/userRoleProfiles';
import { ROLE_PERMISSIONS_MAP } from '../../src/shared/constants/rolePermissionsMap';
import {
  DEMO_PROFILE_ACCOUNTS,
  DEMO_PROFILE_PASSWORD,
} from '../../src/shared/constants/demoProfileAccounts';

function isDemoSeedsDisabled(): boolean {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = 'demo_seeds_disabled'`)
    .get() as { value: string } | undefined;
  return row?.value === '1';
}

/** Crée les rôles manquants et synchronise role_permissions depuis le registre. */
export function ensureRoleProfilesInDatabase(): void {
  const db = getDatabase();

  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (uuid, code, label, description)
    VALUES (?, ?, ?, ?)
  `);

  for (const profile of USER_ROLE_PROFILES) {
    insertRole.run(randomUUID(), profile.code, profile.label, profile.description);
  }

  const linkPerm = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code = ? AND p.code = ? AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  `);

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS_MAP)) {
    for (const permCode of permCodes) {
      linkPerm.run(roleCode, permCode);
    }
  }

  db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code IN ('ADMIN_DEC', 'SUPERADMIN') AND p.deleted_at IS NULL
  `).run();
}

function resolveDemoHotelId(): number | null {
  const row = getDatabase().prepare(`
    SELECT id FROM hotels WHERE deleted_at IS NULL AND code != 'SIEGE' ORDER BY id LIMIT 1
  `).get() as { id: number } | undefined;
  return row?.id ?? null;
}

/** Comptes démo — idempotent, un e-mail par profil. */
export function ensureDemoProfileUsers(): void {
  if (isDemoSeedsDisabled()) {
    logger.debug('Seed profils démo ignoré (demo_seeds_disabled).');
    return;
  }

  ensureRoleProfilesInDatabase();

  const db = getDatabase();
  const hotelId = resolveDemoHotelId();
  const passwordHash = bcrypt.hashSync(DEMO_PROFILE_PASSWORD, 12);

  const findRole = db.prepare(`SELECT id FROM roles WHERE code = ? AND deleted_at IS NULL`);
  const findUser = db.prepare(`
    SELECT id FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL
  `);
  const insertUser = db.prepare(`
    INSERT INTO users (
      uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      must_change_password, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL)
  `);

  let created = 0;
  for (const spec of DEMO_PROFILE_ACCOUNTS) {
    if (findUser.get(spec.email)) continue;

    const role = findRole.get(spec.roleCode) as { id: number } | undefined;
    if (!role) {
      logger.warn(`Rôle ${spec.roleCode} absent — compte démo ${spec.email} ignoré.`);
      continue;
    }

    insertUser.run(
      randomUUID(),
      spec.email.toLowerCase(),
      passwordHash,
      spec.fullName,
      role.id,
      spec.assignHotel ? hotelId : null,
    );
    created += 1;
  }

  if (created > 0) {
    logger.info(`${created} compte(s) démo profil créé(s).`);
  }

  writeDemoCredentialsFile();
  db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value) VALUES ('profile_demo_users_seeded', '1')
  `).run();
}

function writeDemoCredentialsFile(): void {
  const lines = [
    'Raqmi System — comptes démo par profil',
    '========================================',
    '',
    `Mot de passe commun : ${DEMO_PROFILE_PASSWORD}`,
    '',
    'Compte admin initial : admin@raqmi.local (voir INITIAL_ADMIN_CREDENTIALS.txt)',
    '',
    'Profils métier :',
    ...DEMO_PROFILE_ACCOUNTS.map((a) => `  ${a.email.padEnd(36)} ${a.roleCode}`),
    '',
    'Changez ces mots de passe en production.',
  ];

  try {
    writeFileSync(path.join(getDataDirectory(), 'DEMO_PROFILE_CREDENTIALS.txt'), lines.join('\n'), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch {
    /* ignore */
  }
}

export function runProfileSeedIfNeeded(): void {
  ensureRoleProfilesInDatabase();
  ensureDemoProfileUsers();
}

export function listDemoAccountsForLogin(): Array<{
  email: string;
  fullName: string;
  roleCode: string;
  roleLabel: string;
}> {
  const db = getDatabase();
  return DEMO_PROFILE_ACCOUNTS.map((spec) => {
    const role = db.prepare(`SELECT label FROM roles WHERE code = ?`).get(spec.roleCode) as
      | { label: string }
      | undefined;
    const profile = USER_ROLE_PROFILES.find((p) => p.code === spec.roleCode);
    return {
      email: spec.email,
      fullName: spec.fullName,
      roleCode: spec.roleCode,
      roleLabel: profile?.label ?? role?.label ?? spec.roleCode,
    };
  });
}
