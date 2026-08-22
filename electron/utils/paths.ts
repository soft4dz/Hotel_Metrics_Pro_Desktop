import { existsSync } from 'node:fs';
import path from '../lib/nodePath';
import { fileURLToPath } from 'node:url';

/** Répertoire du bundle main (ex. dist-electron/) — compatible ESM, pas de __dirname */
export const ELECTRON_MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Résout le dossier des migrations SQL (dev, build, installateur).
 */
export function resolveMigrationsDirectory(): string {
  const candidates = [
    path.join(process.cwd(), 'electron', 'database', 'migrations'),
    path.join(ELECTRON_MODULE_DIR, '..', 'electron', 'database', 'migrations'),
    path.join(ELECTRON_MODULE_DIR, 'database', 'migrations'),
    path.join(process.resourcesPath, 'migrations'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  throw new Error(
    `Dossier migrations introuvable. Chemins testés : ${candidates.join(' | ')}`,
  );
}

/** Dossier assets/logos du projet ou ressources empaquetées. */
export function resolveBundledLogosDirectory(): string {
  const candidates = [
    path.join(process.cwd(), 'assets', 'logos'),
    path.join(ELECTRON_MODULE_DIR, '..', '..', 'assets', 'logos'),
    path.join(ELECTRON_MODULE_DIR, '..', 'assets', 'logos'),
    path.join(process.resourcesPath, 'logos-default'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  return path.join(process.cwd(), 'assets', 'logos');
}

/** Icône de l'application (fenêtre + taskbar) — dev, build, installateur. */
export function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), 'assets', 'icon.ico'),
    path.join(ELECTRON_MODULE_DIR, '..', '..', 'assets', 'icon.ico'),
    path.join(ELECTRON_MODULE_DIR, '..', 'assets', 'icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
  ];

  return candidates.find((p) => existsSync(p));
}

/** Dossier des guides utilisateurs (dev, build, installateur). */
export function resolveGuidesDirectory(): string {
  const candidates = [
    path.join(process.cwd(), 'docs', 'guides-utilisateurs'),
    path.join(ELECTRON_MODULE_DIR, '..', '..', 'docs', 'guides-utilisateurs'),
    path.join(ELECTRON_MODULE_DIR, '..', 'docs', 'guides-utilisateurs'),
    path.join(process.resourcesPath, 'guides'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  throw new Error(
    `Dossier guides introuvable. Chemins testés : ${candidates.join(' | ')}`,
  );
}
