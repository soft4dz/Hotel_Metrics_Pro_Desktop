import { app } from 'electron';

await app.whenReady();

const sqlite = await import('../dist-electron/main2.mjs');
const authBootstrap = await import('../dist-electron/main4.mjs');
const authService = await import('../dist-electron/main34.mjs');

sqlite.initDatabase();
authBootstrap.ensureBootstrapAuthAccounts();

for (const [email, pwd] of [
  ['admin@raqmi.local', 'Admin@2026!'],
  ['dec@egt-sidifredj.dz', 'Admin@2026!'],
]) {
  const r = authService.login(email, pwd);
  console.log(`${email} => ${r.success ? 'OK' : 'FAIL'} ${r.error ?? ''}`);
}

sqlite.closeDatabase();
app.exit(0);
