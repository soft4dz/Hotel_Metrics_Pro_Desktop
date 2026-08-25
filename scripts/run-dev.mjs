/**
 * Lance Vite + Electron en supprimant ELECTRON_RUN_AS_NODE si elle est définie
 * (sinon require/import('electron') renvoie le chemin de l'exécutable, pas l'API).
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.VITE_AUTO_LOGIN ??= 'true';
env.HMP_DEV_AUTO_ADMIN ??= '1';
env.VITE_DEV_ADMIN_PASSWORD ??= 'Admin@2026!';
env.HMP_DEV_ADMIN_PASSWORD ??= env.VITE_DEV_ADMIN_PASSWORD;

if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn(
    '[dev] ELECTRON_RUN_AS_NODE était défini — ignoré pour le lancement Electron.',
  );
}

const freePort = spawnSync(process.execPath, [path.join(root, 'scripts', 'free-dev-port.mjs')], {
  cwd: root,
  env,
  stdio: 'inherit',
});

if (freePort.status !== 0) {
  process.exit(freePort.status ?? 1);
}

const viteBin = path.join(
  root,
  'node_modules',
  'vite',
  'bin',
  'vite.js',
);

const child = spawn(process.execPath, [viteBin], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
