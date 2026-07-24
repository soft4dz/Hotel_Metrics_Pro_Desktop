import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from '../lib/nodePath';

const INSECURE_SYNC_KEYS = new Set(['', 'dev-sync-key-change-me']);

function ensureRuntimeSyncSecret(): void {
  const configured = process.env.HMP_SYNC_API_KEY?.trim() ?? '';
  if (!INSECURE_SYNC_KEYS.has(configured)) return;

  // Une clé éphémère désactive de fait la synchronisation tant qu'une clé
  // explicite et partagée avec le serveur n'a pas été configurée. Elle évite
  // surtout qu'un secret universel connu soit accepté silencieusement.
  process.env.HMP_SYNC_API_KEY = randomBytes(32).toString('base64url');
  process.env.HMP_SYNC_API_KEY_EPHEMERAL = '1';
}

/** Charge .env depuis la racine projet (dev) sans écraser les variables déjà définies. */
export function loadDotEnvFile(): void {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }

  ensureRuntimeSyncSecret();
}
