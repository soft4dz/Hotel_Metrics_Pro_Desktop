import { app } from 'electron';

const email = process.env.HMP_TEST_LOGIN_EMAIL?.trim();
const password = process.env.HMP_TEST_LOGIN_PASSWORD ?? '';

if (!email || !password) {
  console.error(
    'Définissez HMP_TEST_LOGIN_EMAIL et HMP_TEST_LOGIN_PASSWORD pour exécuter ce test.',
  );
  process.exit(2);
}

await app.whenReady();

const sqlite = await import('../dist-electron/main2.mjs');
const authBootstrap = await import('../dist-electron/main4.mjs');
const authService = await import('../dist-electron/main34.mjs');

try {
  sqlite.initDatabase();
  authBootstrap.ensureBootstrapAuthAccounts();

  const result = authService.login(email, password);
  console.log(`${email} => ${result.success ? 'OK' : 'FAIL'} ${result.error ?? ''}`);
  process.exitCode = result.success ? 0 : 1;
} finally {
  sqlite.closeDatabase();
  app.exit(process.exitCode ?? 0);
}
