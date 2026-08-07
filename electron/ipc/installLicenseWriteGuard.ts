import Electron from '../lib/electronApi';
import { assertLicenseWritable, LicenseReadOnlyError } from '../services/license.service';

/** Canaux toujours autorisés (lecture, auth, licence, exports). */
const EXEMPT_PREFIXES = [
  'license:',
  'auth:',
  'guide:',
  'settings:get',
  'settings:list',
  'app:',
];

/** Suffixes / motifs indiquant une lecture ou un export autorisé en lecture seule. */
const READ_PATTERNS = [
  ':list',
  ':get',
  ':read',
  ':status',
  ':count',
  ':search',
  ':options',
  ':catalog',
  ':preview',
  ':export',
  ':download',
  ':historique',
  ':board',
  ':summary',
  ':dashboard',
  ':ping',
  ':health',
  ':restore', // auth session restore
];

/** Motifs indiquant une mutation métier. */
const MUTATION_PATTERN =
  /:(create|update|save|delete|set|submit|approve|reject|cloture|activate|import|restore|run|vacuum|pay|encaisse|add|remove|toggle|enable|disable|mark|send|upload|assign|deactivate|validate|sync|merge|publish|archive|cancel|close|open|start|stop|reset|issue|pick|change|apply|saisie|valider|refuser|annuler|payer|generer|marquer|cloturer|activer|desactiver)/i;

function isMutationChannel(channel: string): boolean {
  if (EXEMPT_PREFIXES.some((p) => channel.startsWith(p))) return false;
  if (READ_PATTERNS.some((p) => channel.includes(p))) return false;
  if (channel === 'database:importLegacy') return true;
  if (channel === 'backup:restore') return true;
  if (channel === 'settings:update') return true;
  if (channel === 'settings:saveUiPreferences') return true;
  if (MUTATION_PATTERN.test(channel)) return true;
  return false;
}

/**
 * Intercepte ipcMain.handle pour bloquer les écritures quand la licence est expirée (lecture seule).
 * Doit être appelé avant tout enregistrement IPC.
 */
export function installLicenseWriteGuard(): void {
  const ipcMain = Electron.ipcMain;
  const originalHandle = ipcMain.handle.bind(ipcMain);

  ipcMain.handle = ((channel: string, listener: (...args: unknown[]) => unknown) => {
    return originalHandle(channel, async (event, ...args: unknown[]) => {
      if (isMutationChannel(channel)) {
        try {
          assertLicenseWritable();
        } catch (err) {
          if (err instanceof LicenseReadOnlyError) {
            return { ok: false, error: err.message, errorCode: 'LICENSE_READONLY' };
          }
          throw err;
        }
      }
      return listener(event, ...args);
    });
  }) as typeof ipcMain.handle;
}
