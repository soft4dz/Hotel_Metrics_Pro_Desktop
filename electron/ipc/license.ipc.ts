import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/license.service';
import { assertText } from './validation';

export function registerLicenseIpc(): void {
  Electron.ipcMain.handle('license:getStatus', (event) =>
    wrapIpc(event, () => svc.getLicenseStatus()));

  Electron.ipcMain.handle('license:getMachineId', (event) =>
    wrapIpc(event, () => svc.getMachineFingerprint()));

  Electron.ipcMain.handle('license:activate', (event, key: unknown) =>
    wrapIpc(event, (uid) => svc.activateLicense(uid, assertText(key, 'key', { required: true, maxLength: 80 }))));

  Electron.ipcMain.handle('license:clear', (event) =>
    wrapIpc(event, (uid) => svc.clearLicense(uid)));
}
