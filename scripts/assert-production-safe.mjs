import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const forbiddenEnvironment = [
  ['VITE_AUTO_LOGIN', 'true'],
  ['HMP_DEV_AUTO_ADMIN', '1'],
  ['HMP_LICENSE_BYPASS', '1'],
];

const problems = [];

for (const name of ['VITE_DEV_ADMIN_PASSWORD', 'HMP_DEV_ADMIN_PASSWORD']) {
  if ((process.env[name] ?? '').trim()) {
    problems.push(`${name} ne doit pas être présent pendant un build de production.`);
  }
}

for (const [name, unsafeValue] of forbiddenEnvironment) {
  if ((process.env[name] ?? '').trim().toLowerCase() === unsafeValue) {
    problems.push(`${name}=${unsafeValue} est interdit pendant un build de production.`);
  }
}

const sourceChecks = [
  {
    path: 'electron/ipc/ipcHelpers.ts',
    patterns: [
      /process\.env\.NODE_ENV\s*!==\s*['"]production['"]/,
      /process\.env\.HMP_DEV_AUTO_ADMIN\s*!==\s*['"]0['"]/,
    ],
  },
  {
    path: 'electron/services/license.service.ts',
    patterns: [/HMP_LICENSE_BYPASS/, /raqmi-phase3-cert-v1-change-in-prod/],
  },
  {
    path: 'electron/database/seed.ts',
    patterns: [/DEFAULT_ADMIN_PASSWORD/, /Admin@2026!/],
  },
];

for (const check of sourceChecks) {
  const absolutePath = resolve(process.cwd(), check.path);
  const source = readFileSync(absolutePath, 'utf-8');
  for (const pattern of check.patterns) {
    if (pattern.test(source)) {
      problems.push(`${check.path} contient un mécanisme d'authentification de développement interdit: ${pattern}`);
    }
  }
}

const packagedGuardSource = readFileSync(
  resolve(process.cwd(), 'electron/ipc/ipcHelpers.ts'),
  'utf-8',
);
if (!/!Electron\.app\.isPackaged\s*&&\s*process\.env\.HMP_DEV_AUTO_ADMIN\s*===\s*['"]1['"]/.test(packagedGuardSource)) {
  problems.push(
    'electron/ipc/ipcHelpers.ts doit conditionner l’auto-administrateur à un binaire non empaqueté et à HMP_DEV_AUTO_ADMIN=1.',
  );
}

const rendererAuthSource = readFileSync(
  resolve(process.cwd(), 'src/stores/auth.store.ts'),
  'utf-8',
);
if (!/import\.meta\.env\.DEV\s*&&\s*import\.meta\.env\.VITE_AUTO_LOGIN\s*===\s*['"]true['"]/.test(rendererAuthSource)) {
  problems.push('src/stores/auth.store.ts doit limiter l’auto-login au mode Vite DEV.');
}

const desktopSeedSource = readFileSync(
  resolve(process.cwd(), 'electron/database/seed.ts'),
  'utf-8',
);
if (!/randomBytes\(24\)/.test(desktopSeedSource) || !/must_change_password:\s*developmentMode\s*\?\s*0\s*:\s*1/.test(desktopSeedSource)) {
  problems.push('Le seed desktop de production doit générer un mot de passe aléatoire à changement obligatoire.');
}

if (problems.length > 0) {
  console.error('\nBuild bloqué par le contrôle de sécurité:\n');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('Contrôle de sécurité production: OK');
