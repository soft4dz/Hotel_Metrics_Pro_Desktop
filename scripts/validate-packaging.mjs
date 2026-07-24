#!/usr/bin/env node
/**
 * Contrôles pré-release packaging Phase 3.
 * node scripts/validate-packaging.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'electron-builder.yml',
  'scripts/build-installer.mjs',
  'scripts/generate-license-key.mjs',
  'electron/services/license.service.ts',
  'electron/ipc/license.ipc.ts',
  'assets/LICENSE-EULA.txt',
  'docs/erp/phase3-certification.md',
];

const PHASE3_MIGRATIONS = [
  '059_phase3_rgpd_loi1807.sql',
  '060_phase3_fiscalite_sifec.sql',
  '061_phase3_modules_legaux.sql',
];

let failed = 0;

function fail(msg) {
  console.error('ÉCHEC —', msg);
  failed += 1;
}

function ok(msg) {
  console.log('OK   —', msg);
}

for (const rel of REQUIRED_FILES) {
  const full = path.join(root, rel);
  if (existsSync(full)) ok(rel);
  else fail(`fichier manquant : ${rel}`);
}

const migrationsDir = path.join(root, 'electron', 'database', 'migrations');
for (const name of PHASE3_MIGRATIONS) {
  const full = path.join(migrationsDir, name);
  if (existsSync(full)) ok(`migration ${name}`);
  else fail(`migration manquante : ${name}`);
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'));
if (pkg.version && /^\d+\.\d+\.\d+$/.test(pkg.version)) {
  ok(`version package.json : ${pkg.version}`);
} else {
  fail('version package.json invalide');
}

if (pkg.scripts?.['dist:installer']) ok('script dist:installer');
else fail('script dist:installer manquant');

if (pkg.scripts?.['validate:certification']) ok('script validate:certification');
else fail('script validate:certification manquant');

const builderPath = path.join(root, 'electron-builder.yml');
if (existsSync(builderPath)) {
  const yml = readFileSync(builderPath, 'utf-8');
  if (yml.includes('nsis:')) ok('cible NSIS configurée');
  else fail('electron-builder.yml sans section nsis');
  if (yml.includes('migrations')) ok('migrations SQL embarquées (extraResources)');
  else fail('migrations non embarquées dans electron-builder.yml');
}

const ipcFiles = readdirSync(path.join(root, 'electron', 'ipc')).filter((f) => f.endsWith('.ipc.ts'));
if (ipcFiles.includes('license.ipc.ts')) ok('IPC licence enregistré (fichier présent)');
else fail('license.ipc.ts absent');

console.log('\n=== Validation packaging ===');
if (failed) {
  console.error(`${failed} contrôle(s) en échec.`);
  process.exit(1);
}
console.log('OK — packaging prêt pour release.');
