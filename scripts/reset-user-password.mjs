/**
 * Réinitialise le mot de passe d'un utilisateur (maintenance locale explicite).
 *
 * Usage:
 *   npx electron scripts/reset-user-password.mjs email@domaine.dz
 *   npx electron scripts/reset-user-password.mjs email@domaine.dz "MotDePasseFort!9"
 *   npx electron scripts/reset-user-password.mjs email@domaine.dz --db "C:\\chemin\\base.db"
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_DB_PATHS = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

function generatePassword() {
  return `A9!${randomBytes(18).toString('base64url')}`;
}

function validatePassword(password) {
  if (password.length < 8) return '8 caractères minimum';
  if (!/[A-Z]/.test(password)) return 'au moins une majuscule';
  if (!/[0-9]/.test(password)) return 'au moins un chiffre';
  if (!/[^A-Za-z0-9]/.test(password)) return 'au moins un caractère spécial';
  return null;
}

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email || email.startsWith('--')) {
  console.error('Usage: npx electron scripts/reset-user-password.mjs <email> [mot_de_passe] [--db chemin]');
  process.exit(1);
}

const explicitPassword = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3]
  : undefined;
const newPassword = explicitPassword ?? generatePassword();
const passwordError = validatePassword(newPassword);
if (passwordError) {
  console.error(`Mot de passe refusé : ${passwordError}.`);
  process.exit(1);
}

const requestedDb = readArgValue('--db');
const dbPath = requestedDb
  ? path.resolve(requestedDb)
  : DEFAULT_DB_PATHS.find((candidate) => existsSync(candidate));

if (!dbPath || !existsSync(dbPath)) {
  console.error('Base de données introuvable. Utilisez --db "C:\\chemin\\hotel_metrics_local.db".');
  process.exit(1);
}

const db = new Database(dbPath);
try {
  const row = db
    .prepare(`SELECT id, email FROM users WHERE email = ? AND deleted_at IS NULL`)
    .get(email);

  if (!row) {
    console.error('Utilisateur introuvable:', email);
    process.exitCode = 1;
  } else {
    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL,
          must_change_password = 1, updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(bcrypt.hashSync(newPassword, 12), row.id);

    const safeEmail = row.email.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const outputPath = path.join(path.dirname(dbPath), `PASSWORD_RESET_${safeEmail}.txt`);
    writeFileSync(
      outputPath,
      [
        'Raqmi System — réinitialisation de mot de passe',
        '==============================================',
        '',
        `Utilisateur   : ${row.email}`,
        `Mot de passe  : ${newPassword}`,
        '',
        'Le changement est obligatoire à la prochaine connexion.',
        'Supprimez ce fichier après transmission sécurisée.',
        '',
      ].join('\n'),
      { encoding: 'utf-8', mode: 0o600 },
    );

    console.log(`Mot de passe réinitialisé pour ${row.email}.`);
    console.log(`Identifiants temporaires enregistrés dans : ${outputPath}`);
  }
} finally {
  db.close();
}
