/**
 * Réinitialise la base SQLite : schéma à jour, aucune donnée métier, un seul compte SUPERADMIN.
 *
 * Usage : npm run reset:db
 *         npm run reset:db -- --db "C:\\chemin\\hotel_metrics_local.db"
 *
 * Fermez l'application Electron avant d'exécuter ce script.
 */
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SUPERADMIN_EMAIL = 'admin@hotelmetrics.local';

const DB_CANDIDATES = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

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
  { code: 'RH_MANAGER', label: 'Responsable RH', description: 'Gestion RH' },
  { code: 'CHEF_DEPARTEMENT', label: 'Chef de département', description: 'Validation équipe' },
  { code: 'RECEPTIONNISTE', label: 'Réceptionniste', description: 'Self-service RH' },
];

const PERMISSIONS = [
  { code: 'users.manage', label: 'Gérer les utilisateurs', module: 'administration' },
  { code: 'hotels.manage', label: 'Gérer les hôtels', module: 'administration' },
  { code: 'recettes.validate', label: 'Valider les recettes', module: 'recettes' },
  { code: 'recettes.saisie', label: 'Saisir les recettes', module: 'recettes' },
  { code: 'portmaster.full', label: 'PortMaster complet', module: 'portmaster' },
  { code: 'audit.read', label: 'Consulter audit', module: 'audit' },
  { code: 'sync.full', label: 'Synchronisation complète', module: 'sync' },
  { code: 'reports.export', label: 'Exporter rapports', module: 'rapports' },
  { code: 'reports.create', label: 'Créer rapports', module: 'rapports' },
  { code: 'rh.manage', label: 'Gérer RH', module: 'rh' },
  { code: 'rh.team', label: 'Validation équipe RH', module: 'rh' },
  { code: 'rh.self', label: 'Espace RH personnel', module: 'rh' },
];

const MODULE_IDS = [
  'administration-utilisateurs', 'parametrage-global', 'unites-hotelieres',
  'recettes-journalieres', 'encaissements-tresorerie', 'budget-previsions',
  'hebergement-occupation', 'facturation', 'creances-recouvrement', 'contrats-conventions',
  'stocks-consommations', 'achats-approvisionnements', 'maintenance-interventions',
  'rh-productivite', 'tarifs-conventions', 'audit-controle-interne', 'journal-anomalies',
  'decisions-instructions', 'qualite-reclamations', 'plage-piscine', 'parking', 'portmaster',
  'clients', 'commercial-partenariats', 'tableaux-bord-directionnels', 'rapports-automatiques',
  'alertes-notifications', 'comparatif-inter-unites', 'gestion-documentaire',
  'sauvegarde-restauration', 'synchronisation-multi-postes', 'journalisation-tracabilite',
];

function generatePassword() {
  return `A9!${randomBytes(18).toString('base64url')}`;
}

function resolveDbPaths() {
  const argIdx = process.argv.indexOf('--db');
  if (argIdx >= 0 && process.argv[argIdx + 1]) {
    return [path.resolve(process.argv[argIdx + 1])];
  }
  return DB_CANDIDATES;
}

function resetOneDatabase(dbPath) {
  const dataDir = path.dirname(dbPath);
  console.log('\n--- Base cible :', dbPath, '---');

  if (!existsSync(dbPath) && !existsSync(`${dbPath}-wal`)) {
    console.log('(fichier absent — création)');
  }

  removeDbFiles(dbPath);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  applyMigrations(db);
  wipeAllData(db);
  const credentials = seedSuperAdminOnly(db);
  writeCredentialsFile(dataDir, credentials.password);
  printSummary(db, dbPath);
  db.close();
}

function main() {
  for (const dbPath of resolveDbPaths()) resetOneDatabase(dbPath);
  process.exit(0);
}

function removeDbFiles(dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${dbPath}${suffix}`;
    if (existsSync(file)) {
      unlinkSync(file);
      console.log('Supprimé :', file);
    }
  }
}

function applyMigrations(db) {
  const dir = path.join(root, 'electron', 'database', 'migrations');
  const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const hasMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?');
  const insertMigration = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

  for (const file of files) {
    if (hasMigration.get(file)) continue;
    const sql = readFileSync(path.join(dir, file), 'utf-8');
    db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file);
    })();
    console.log('Migration :', file);
  }
}

function wipeAllData(db) {
  db.pragma('foreign_keys = OFF');
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name != 'schema_migrations'`,
    )
    .all()
    .map((row) => row.name);

  for (const table of tables) db.exec(`DELETE FROM "${table}"`);
  db.exec('DELETE FROM sqlite_sequence');
  db.pragma('foreign_keys = ON');
  console.log(`Données effacées (${tables.length} tables).`);
}

function seedSuperAdminOnly(db) {
  const insertRole = db.prepare(`
    INSERT INTO roles (uuid, code, label, description)
    VALUES (@uuid, @code, @label, @description)
  `);
  const roleIds = new Map();
  for (const role of ROLES) {
    const result = insertRole.run({ uuid: randomUUID(), ...role });
    roleIds.set(role.code, Number(result.lastInsertRowid));
  }

  const insertPermission = db.prepare(`
    INSERT INTO permissions (uuid, code, label, module)
    VALUES (@uuid, @code, @label, @module)
  `);
  const permissionIds = new Map();
  for (const permission of PERMISSIONS) {
    const result = insertPermission.run({ uuid: randomUUID(), ...permission });
    permissionIds.set(permission.code, Number(result.lastInsertRowid));
  }

  const superAdminRoleId = roleIds.get('SUPERADMIN');
  const linkRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  for (const permission of PERMISSIONS) {
    const permissionId = permissionIds.get(permission.code);
    if (permissionId && superAdminRoleId) linkRolePerm.run(superAdminRoleId, permissionId);
  }

  const password = generatePassword();
  db.prepare(`
    INSERT INTO users (
      uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      must_change_password, created_by, updated_by
    ) VALUES (
      @uuid, @email, @password_hash, @full_name, @role_id, NULL, 1,
      1, NULL, NULL
    )
  `).run({
    uuid: randomUUID(),
    email: SUPERADMIN_EMAIL,
    password_hash: bcrypt.hashSync(password, 12),
    full_name: 'Super Administrateur',
    role_id: superAdminRoleId,
  });

  const insertModule = db.prepare(
    'INSERT INTO modules_config (module_id, is_enabled) VALUES (?, 1)',
  );
  for (const moduleId of MODULE_IDS) insertModule.run(moduleId);

  const settings = [
    ['seed_completed', '1'],
    ['demo_seeds_disabled', '1'],
    ['port_seed_completed', '1'],
    ['max_login_attempts', '5'],
    ['lockout_minutes', '15'],
  ];
  const upsertSetting = db.prepare(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
  );
  for (const [key, value] of settings) upsertSetting.run(key, value);

  db.prepare(`
    INSERT OR REPLACE INTO sync_config (id, api_base_url, device_id, auto_sync)
    VALUES (1, 'http://127.0.0.1:3847', ?, 0)
  `).run(randomUUID());

  return { password };
}

function writeCredentialsFile(dataDir, password) {
  const filePath = path.join(dataDir, 'INITIAL_ADMIN_CREDENTIALS.txt');
  writeFileSync(
    filePath,
    [
      'Raqmi System — identifiants après réinitialisation',
      '===============================================',
      '',
      `E-mail       : ${SUPERADMIN_EMAIL}`,
      `Mot de passe : ${password}`,
      '',
      'Le changement est obligatoire à la première connexion.',
      'Supprimez ce fichier après utilisation.',
      '',
    ].join('\n'),
    { encoding: 'utf-8', mode: 0o600 },
  );
  console.log('Identifiants temporaires enregistrés dans :', filePath);
}

function printSummary(db, dbPath) {
  const users = db.prepare('SELECT email, full_name FROM users').all();
  const hotels = db.prepare('SELECT COUNT(*) AS c FROM hotels').get().c;
  const rh = db.prepare('SELECT COUNT(*) AS c FROM rh_employes').get().c;

  console.log('\n=== Base réinitialisée ===');
  console.log('Fichier   :', dbPath);
  console.log('Utilisateurs :', users.length);
  for (const user of users) console.log(`  - ${user.email} (${user.full_name})`);
  console.log('Hôtels    :', hotels);
  console.log('Employés RH :', rh);
  console.log('\nRelancez l\'application. Le mot de passe n\'est jamais affiché dans la console.');
}

main();
