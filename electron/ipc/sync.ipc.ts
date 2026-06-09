import Electron from '../lib/electronApi';
import * as syncService from '../services/sync.service';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';

export function registerSyncIpc(): void {
  Electron.ipcMain.handle('sync:config:get', (event) =>
    wrapIpc(event, (actorUserId) => syncService.getSyncConfig(actorUserId)),
  );

  Electron.ipcMain.handle(
    'sync:config:update',
    (event, input: { apiBaseUrl?: string; autoSync?: boolean }) =>
      wrapIpc(event, (actorUserId) => syncService.updateSyncConfig(actorUserId, input)),
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

  Electron.ipcMain.handle('sync:run', (event) =>
    wrapIpcAsync(event, (actorUserId) => syncService.runSync(actorUserId)),
  );
}
