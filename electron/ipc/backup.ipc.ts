import Electron from '../lib/electronApi';
import * as backupService from '../services/backup.service';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';

export function registerBackupIpc(): void {
  Electron.ipcMain.handle('backup:list', (event) =>
    wrapIpc(event, (actorUserId) => backupService.listBackups(actorUserId)),
  );

  Electron.ipcMain.handle('backup:create', (event) =>
    wrapIpcAsync(event, (actorUserId) => backupService.createBackup(actorUserId)),
  );

  Electron.ipcMain.handle('backup:restore', (event, filename: string) =>
    wrapIpcAsync(event, (actorUserId) => backupService.restoreBackup(actorUserId, filename)),
  );

  Electron.ipcMain.handle('backup:delete', (event, filename: string) =>
    wrapIpc(event, (actorUserId) => backupService.deleteBackup(actorUserId, filename)),
  );
}
