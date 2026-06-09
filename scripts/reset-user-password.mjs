/**
 * Réinitialise le mot de passe d'un utilisateur (maintenance).
 * Usage: npx electron scripts/reset-user-password.mjs email@domaine.dz "NouveauMotDePasse"
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DB_PATH = 'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db';
const email = (process.argv[2] || '').trim().toLowerCase();
const newPassword = process.argv[3] || 'Admin@2026!';

if (!email) {
  console.error('Usage: npx electron scripts/reset-user-password.mjs <email> [mot_de_passe]');
  process.exit(1);
}

const db = new Database(DB_PATH);
const row = db
  .prepare(`SELECT id, email FROM users WHERE email = ? AND deleted_at IS NULL`)
  .get(email);

if (!row) {
  console.error('Utilisateur introuvable:', email);
  db.close();
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 12);
db.prepare(
  `
  UPDATE users
  SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL,
      must_change_password = 0, updated_at = datetime('now')
  WHERE id = ?
`,
).run(hash, row.id);

console.log(`OK — mot de passe réinitialisé pour ${row.email}`);
console.log(`Nouveau mot de passe : ${newPassword}`);
db.close();
