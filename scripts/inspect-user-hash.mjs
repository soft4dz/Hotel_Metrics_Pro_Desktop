import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const email = process.argv[2] || 'dec@egt-sidifredj.dz';
const db = new Database('C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db', { readonly: true });
const row = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get(email);
if (!row) {
  console.log('User not found:', email);
  process.exit(1);
}
console.log('email:', row.email);
console.log('hash:', row.password_hash);
console.log('prefix:', row.password_hash.slice(0, 7));

// Try $2y$ -> $2a$ swap for bcryptjs
const swapped = row.password_hash.replace(/^\$2y\$/, '$2a$');
const testPwds = ['Admin@2026!', 'admin123', 'password', '123456', 'Dec@2026!', 'dec2026', 'Sidifredj@2026'];
for (const pwd of testPwds) {
  const ok1 = bcrypt.compareSync(pwd, row.password_hash);
  const ok2 = bcrypt.compareSync(pwd, swapped);
  if (ok1 || ok2) console.log('MATCH:', pwd, ok1 ? 'direct' : '2y->2a');
}
db.close();
