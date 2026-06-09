/**
 * Télécharge le binaire natif better-sqlite3 pour la version Electron du projet.
 * Ne nécessite pas Python si un prebuild GitHub existe pour cette version.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const electronVersion =
  (pkg.devDependencies?.electron ?? '').replace(/^[^\d]*/, '') ||
  process.env.npm_package_devDependencies_electron?.replace(/^[^\d]*/, '');

if (!electronVersion) {
  console.error('[rebuild-native] Version Electron introuvable dans package.json');
  process.exit(1);
}

const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
const moduleDir = path.join(root, 'node_modules', 'better-sqlite3');
const binaryPath = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node');
const cacheDir = path.join(root, 'node_modules', '.cache');
const markerPath = path.join(cacheDir, `better-sqlite3-electron-${electronVersion}-${arch}.ok`);

function isBusyError(result) {
  const stderr = result.stderr?.toString() ?? '';
  const stdout = result.stdout?.toString() ?? '';
  return /EBUSY|resource busy or locked/i.test(`${stderr}\n${stdout}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function markOk() {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(markerPath, `${electronVersion}\n${arch}\n${Date.now()}\n`, 'utf8');
}

if (
  !process.env.FORCE_REBUILD_NATIVE &&
  existsSync(markerPath) &&
  existsSync(binaryPath)
) {
  console.log(
    `[rebuild-native] OK — déjà compilé pour Electron ${electronVersion} (${process.platform}-${arch})`,
  );
  process.exit(0);
}

console.log(
  `[rebuild-native] better-sqlite3 pour Electron ${electronVersion} (${process.platform}-${arch})…`,
);

const maxAttempts = 3;
let result = null;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      'prebuild-install',
      '--runtime',
      'electron',
      '--target',
      electronVersion,
      '--arch',
      arch,
    ],
    { cwd: moduleDir, stdio: 'pipe', shell: process.platform === 'win32', encoding: 'utf8' },
  );

  if (result.status === 0) {
    markOk();
    console.log('[rebuild-native] OK');
    process.exit(0);
  }

  if (isBusyError(result) && existsSync(binaryPath)) {
    console.warn(
      '[rebuild-native] Fichier verrouillé (application en cours) — binaire existant conservé.',
    );
    markOk();
    process.exit(0);
  }

  if (isBusyError(result) && attempt < maxAttempts) {
    console.warn(`[rebuild-native] Fichier verrouillé — nouvelle tentative (${attempt}/${maxAttempts})…`);
    sleep(800);
    continue;
  }

  break;
}

if (existsSync(binaryPath)) {
  console.warn(
    '[rebuild-native] Échec du téléchargement, mais un binaire local existe — démarrage autorisé.',
  );
  markOk();
  process.exit(0);
}

if (result?.stdout) process.stdout.write(result.stdout);
if (result?.stderr) process.stderr.write(result.stderr);

console.error(`
[rebuild-native] Échec — aucun binaire précompilé pour Electron ${electronVersion}.

Solutions :
  1) Fermez l'application Electron puis relancez dev.bat
  2) Utiliser Electron 36.x (dernière version avec prebuild, voir package.json)
  3) Installer Python 3 + Visual Studio Build Tools, puis :
     npx electron-builder install-app-deps

Voir : https://github.com/WiseLibs/better-sqlite3/releases
`);
process.exit(result?.status ?? 1);
