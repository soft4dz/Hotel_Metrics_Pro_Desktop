import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';

const defaultPaths = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

const dbArgIndex = process.argv.indexOf('--db');
const requestedPath = dbArgIndex >= 0 ? process.argv[dbArgIndex + 1] : undefined;
const dbPath = requestedPath
  ? path.resolve(requestedPath)
  : defaultPaths.find((candidate) => existsSync(candidate));

if (!dbPath || !existsSync(dbPath)) {
  console.error('Base introuvable. Utilisez --db "C:\\chemin\\hotel_metrics_local.db".');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
try {
  const users = db
    .prepare(
      `
      SELECT u.id, u.email, u.full_name, u.is_active, u.failed_login_attempts,
             u.locked_until, u.must_change_password, r.code AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.email
    `,
    )
    .all();

  console.log(`Utilisateurs en base (${users.length}) :\n`);
  for (const user of users) {
    console.log(`- ${user.email}`);
    console.log(`  Nom: ${user.full_name} | Rôle: ${user.role} | Actif: ${Boolean(user.is_active)}`);
    console.log(
      `  Verrouillé jusqu'au: ${user.locked_until ?? 'non'} | Tentatives: ${user.failed_login_attempts}`,
    );
    console.log(`  Changement de mot de passe requis: ${Boolean(user.must_change_password)}`);
  }
} finally {
  db.close();
}
