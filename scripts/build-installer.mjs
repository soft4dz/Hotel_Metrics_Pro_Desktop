/**
 * Génère l'installateur Windows NSIS dans installers/
 * Usage : npm run dist:installer
 */
import { spawnSync } from 'node:child_process';

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const result = spawnSync(
  'npx',
  ['electron-builder', '--config', 'electron-builder.yml', '--win', 'nsis'],
  { stdio: 'inherit', shell: true, env: process.env },
);

process.exit(result.status ?? 1);
