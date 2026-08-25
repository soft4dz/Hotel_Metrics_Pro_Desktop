import { bcrypt } from '../utils/bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from '../lib/nodePath';
import { getDatabase, getDataDirectory } from './sqlite';
import { logger } from '../utils/logger';

const ROLES = [
  { code: 'SUPERADMIN', label: 'Super Administrateur', description: 'Accès total — priorité absolue' },
  { code: 'ADMIN_DEC', label: 'Administrateur décisionnel', description: 'Accès total' },
  { code: 'PDG', label: 'PDG', description: 'Consultation globale' },
  { code: 'DIRECTEUR_UNITE', label: 'Directeur unité', description: 'Accès à son hôtel' },
  { code: 'CONTROLEUR_UNITE', label: 'Contrôleur unité', description: 'Saisie recettes' },
  { code: 'RESPONSABLE_PORT', label: 'Responsable port', description: 'Module PortMaster' },
  { code: 'COMPTABILITE', label: 'Comptabilité', description: 'Facturation et encaissements' },
  { code: 'AUDIT_INTERNE', label: 'Audit interne', description: 'Consultation et audit' },
  { code: 'LECTURE_SEULE', label: 'Lecture seule', description: 'Consultation limitée' },
] as const;

const RUBRIQUES = [
  { code: 'HEBERGEMENT', label: 'Hébergement', sort_order: 1 },
  { code: 'RESTAURATION', label: 'Restauration', sort_order: 2 },
  { code: 'BOISSONS', label: 'Boissons', sort_order: 3 },
  { code: 'AUTRES', label: 'Autres prestations', sort_order: 4 },
  { code: 'PORT', label: 'Port', sort_order: 5 },
  { code: 'LOCATIONS', label: 'Locations', sort_order: 6 },
  { code: 'DIVERS', label: 'Divers', sort_order: 7 },
] as const;

const PERMISSIONS = [
  { code: 'users.manage', label: 'Gérer les utilisateurs', module: 'administration' },
  { code: 'hotels.manage', label: 'Gérer les hôtels', module: 'administration' },
  { code: 'recettes.validate', label: 'Valider les recettes', module: 'recettes' },
  { code: 'recettes.saisie', label: 'Saisir les recettes', module: 'recettes' },
  { code: 'portmaster.full', label: 'PortMaster complet', module: 'portmaster' },
  { code: 'audit.read', label: 'Consulter audit', module: 'audit' },
  { code: 'sync.full', label: 'Synchronisation complète', module: 'sync' },
  { code: 'reports.export', label: 'Exporter rapports', module: 'rapports' },
] as const;

export function runSeedIfNeeded(developmentMode: boolean): void {
  const db = getDatabase();

  const userCount = db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
  if (userCount.c > 0) {
    logger.debug('Seed ignoré : utilisateurs déjà présents.');
    return;
  }

  logger.info('Exécution du seed initial...');

  const insertRole = db.prepare(`
    INSERT INTO roles (uuid, code, label, description)
    VALUES (@uuid, @code, @label, @description)
  `);

  const roleIds = new Map<string, number>();
  for (const role of ROLES) {
    const result = insertRole.run({
      uuid: randomUUID(),
      code: role.code,
      label: role.label,
      description: role.description,
    });
    roleIds.set(role.code, Number(result.lastInsertRowid));
  }

  const insertPermission = db.prepare(`
    INSERT INTO permissions (uuid, code, label, module)
    VALUES (@uuid, @code, @label, @module)
  `);

  const permissionIds = new Map<string, number>();
  for (const perm of PERMISSIONS) {
    const result = insertPermission.run({
      uuid: randomUUID(),
      code: perm.code,
      label: perm.label,
      module: perm.module,
    });
    permissionIds.set(perm.code, Number(result.lastInsertRowid));
  }

  const linkRolePerm = db.prepare(`
    INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
  `);

  for (const adminCode of ['ADMIN_DEC', 'SUPERADMIN'] as const) {
    const roleId = roleIds.get(adminCode);
    if (!roleId) continue;
    for (const perm of PERMISSIONS) {
      const permId = permissionIds.get(perm.code);
      if (permId) linkRolePerm.run(roleId, permId);
    }
  }

  const insertHotel = db.prepare(`
    INSERT INTO hotels (uuid, code, name, city, created_by, updated_by)
    VALUES (@uuid, @code, @name, @city, NULL, NULL)
  `);

  insertHotel.run({
    uuid: randomUUID(),
    code: 'SIEGE',
    name: 'Siège — Consolidation',
    city: '—',
  });

  const insertRubrique = db.prepare(`
    INSERT INTO rubriques (uuid, code, label, sort_order)
    VALUES (@uuid, @code, @label, @sort_order)
  `);

  for (const r of RUBRIQUES) {
    insertRubrique.run({
      uuid: randomUUID(),
      code: r.code,
      label: r.label,
      sort_order: r.sort_order,
    });
  }

  const developmentPassword = process.env.HMP_DEV_ADMIN_PASSWORD?.trim();
  const initialAdminPassword = developmentMode && developmentPassword
    ? developmentPassword
    : randomBytes(24).toString('base64url');
  const passwordHash = bcrypt.hashSync(initialAdminPassword, 12);
  const adminRoleIdFinal = roleIds.get('SUPERADMIN')!;

  db.prepare(`
    INSERT INTO users (
      uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      must_change_password, created_by, updated_by
    ) VALUES (
      @uuid, @email, @password_hash, @full_name, @role_id, NULL, 1,
      @must_change_password, NULL, NULL
    )
  `).run({
    uuid: randomUUID(),
    email: 'admin@raqmi.local',
    password_hash: passwordHash,
    full_name: 'Administrateur système',
    role_id: adminRoleIdFinal,
    must_change_password: developmentMode ? 0 : 1,
  });

  const credFile = path.join(getDataDirectory(), 'INITIAL_ADMIN_CREDENTIALS.txt');
  writeFileSync(
    credFile,
    [
      'Raqmi System — identifiants administrateur initial',
      '======================================================',
      '',
      'E-mail    : admin@raqmi.local',
      `Mot de passe : ${initialAdminPassword}`,
      '',
      'IMPORTANT : changez ce mot de passe à la première connexion.',
      'Supprimez ce fichier après utilisation.',
      '',
    ].join('\n'),
    { encoding: 'utf-8', mode: 0o600 },
  );

  db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value) VALUES ('seed_completed', '1')
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value) VALUES ('max_login_attempts', '5')
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value) VALUES ('lockout_minutes', '15')
  `).run();

  logger.info(`Seed terminé — admin@raqmi.local créé. Identifiants : ${credFile}`);
}
