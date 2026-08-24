import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const forbiddenEnvironment = [
  ['VITE_AUTO_LOGIN', 'true'],
  ['HMP_DEV_AUTO_ADMIN', '1'],
];

const problems = [];

for (const [name, unsafeValue] of forbiddenEnvironment) {
  if ((process.env[name] ?? '').trim().toLowerCase() === unsafeValue) {
    problems.push(`${name}=${unsafeValue} est interdit pendant un build de production.`);
  }
}

const sourceChecks = [
  {
    path: 'electron/ipc/ipcHelpers.ts',
    patterns: [/HMP_DEV_AUTO_ADMIN/, /DEV_AUTO_ADMIN_ACTOR/],
  },
  {
    path: 'src/stores/auth.store.ts',
    patterns: [/VITE_AUTO_LOGIN/, /DEV_ADMIN_PASSWORD/, /Admin@2026!/],
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

if (problems.length > 0) {
  console.error('\nBuild bloqué par le contrôle de sécurité:\n');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('Contrôle de sécurité production: OK');
