import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/system-health.service';

export function registerSystemHealthIpc(): void {
  Electron.ipcMain.handle('systemHealth:get', (event) =>
    wrapIpc(event, (uid) => svc.getSystemHealth(uid)));

  Electron.ipcMain.handle('systemHealth:gedIntegrity', (event, limit?: number) =>
    wrapIpc(event, (uid) => svc.runGedIntegrityBatch(uid, limit ?? 20)));
}
