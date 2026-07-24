import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/dec-cockpit.service';
import { assertPositiveInteger } from './validation';

export function registerDecCockpitIpc(): void {
  Electron.ipcMain.handle('dec:cockpit:get', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.getDecCockpit(uid, hotelId)));

  Electron.ipcMain.handle('dec:alerts:list', (event, statut?: string) =>
    wrapIpc(event, (uid) => svc.listDecAlerts(uid, statut ?? 'ouverte')));

  Electron.ipcMain.handle('dec:alerts:close', (event, alertId: number) =>
    wrapIpc(event, (uid) => svc.closeDecAlert(uid, assertPositiveInteger(alertId, 'alertId'))));
}
