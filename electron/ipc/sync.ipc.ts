import Electron from '../lib/electronApi';
import * as syncService from '../services/sync.service';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import { assertEnum, assertObject, assertPositiveInteger, assertText } from './validation';

export function registerSyncIpc(): void {
  Electron.ipcMain.handle('sync:config:get', (event) =>
    wrapIpc(event, (actorUserId) => syncService.getSyncConfig(actorUserId)),
  );

  Electron.ipcMain.handle(
    'sync:config:update',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const value = assertObject<Record<string, unknown>>(input, 'input');
        if (value.autoSync !== undefined && typeof value.autoSync !== 'boolean') throw new Error('autoSync invalide.');
        return syncService.updateSyncConfig(actorUserId, {
          apiBaseUrl: value.apiBaseUrl !== undefined ? assertText(value.apiBaseUrl, 'apiBaseUrl', { required: true, maxLength: 2048 }) : undefined,
          autoSync: value.autoSync as boolean | undefined,
        });
      }),
  );

  Electron.ipcMain.handle('sync:status', (event) =>
    wrapIpcAsync(event, async (actorUserId) => {
      const status = syncService.getSyncStatus(actorUserId);
      const online = await syncService.checkSyncOnline(actorUserId);
      return { ...status, online };
    }),
  );

  Electron.ipcMain.handle('sync:queue:list', (event) =>
    wrapIpc(event, (actorUserId) => syncService.listSyncQueue(actorUserId)),
  );

  Electron.ipcMain.handle('sync:queue:retryFailed', (event) =>
    wrapIpc(event, (actorUserId) => syncService.retryFailedSync(actorUserId)),
  );

  Electron.ipcMain.handle('sync:conflicts:list', (event) =>
    wrapIpc(event, (actorUserId) => syncService.listSyncConflicts(actorUserId)),
  );

  Electron.ipcMain.handle('sync:conflicts:resolve', (event, conflictId: unknown, decision: unknown, note?: unknown) =>
    wrapIpc(event, (actorUserId) => syncService.resolveSyncConflict(
      actorUserId,
      assertPositiveInteger(conflictId, 'conflictId'),
      assertEnum(decision, 'decision', ['keep_local', 'apply_remote'] as const),
      note == null ? undefined : assertText(note, 'note', { maxLength: 1000 }),
    )),
  );

  Electron.ipcMain.handle('sync:run', (event) =>
    wrapIpcAsync(event, (actorUserId) => syncService.runSync(actorUserId)),
  );
}
