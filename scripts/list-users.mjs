import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db', { readonly: true });

const users = db
  .prepare(
    `
    SELECT u.id, u.email, u.full_name, u.is_active, u.failed_login_attempts, u.locked_until,
           u.must_change_password, length(u.password_hash) AS hash_len,
           substr(u.password_hash, 1, 7) AS hash_prefix,
           r.code AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.email
  `,
  )
  .all();

console.log('Utilisateurs en base (' + users.length + '):\n');
for (const u of users) {
  console.log(`- ${u.email}`);
  console.log(`  Nom: ${u.full_name} | Rôle: ${u.role} | Actif: ${u.is_active}`);
  console.log(`  Verrouillé: ${u.locked_until ?? 'non'} | Tentatives: ${u.failed_login_attempts}`);
  console.log(`  Hash: ${u.hash_prefix}... (${u.hash_len} chars)`);
}

// Test passwords
const tests = [
  ['admin@raqmi.local', 'Admin@2026!'],
  ['dec@egt-sidifredj.dz', 'Admin@2026!'],
  ['dec@egt-sidifredj.dz', 'password'],
  ['dec@egt-sidifredj.dz', 'Dec@2026!'],
];

console.log('\n--- Tests mot de passe ---');
for (const [email, pwd] of tests) {
  const row = db.prepare(`SELECT password_hash FROM users WHERE email = ? AND deleted_at IS NULL`).get(email);
  if (!row) {
    console.log(`${email} + "${pwd}" => utilisateur absent`);
    continue;
  }
  const ok = bcrypt.compareSync(pwd, row.password_hash);
  console.log(`${email} + "${pwd}" => ${ok ? 'OK' : 'échec'}`);
}

db.close();
