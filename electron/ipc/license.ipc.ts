import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as svc from '../services/license.service';
import { getLicensePackSummary } from '../services/license-pack.service';
import { assertText } from './validation';

export function registerLicenseIpc(): void {
  Electron.ipcMain.handle('license:getStatus', (event) =>
    wrapIpc(event, () => svc.getLicenseStatus()));

  Electron.ipcMain.handle('license:getMachineId', (event) =>
    wrapIpc(event, () => svc.getMachineFingerprint()));

  Electron.ipcMain.handle('license:getConfig', (event) =>
    wrapIpcAsync(event, (uid) => svc.getLicenseConfig(uid)));

  Electron.ipcMain.handle(
    'license:updateConfig',
    (event, input: Partial<svc.LicenseConfigDto>) =>
      wrapIpc(event, (uid) => svc.updateLicenseConfig(uid, input)),
  );

  Electron.ipcMain.handle('license:activate', (event, key: unknown) =>
    wrapIpcAsync(event, (uid) =>
      svc.activateLicense(uid, assertText(key, 'key', { required: true, maxLength: 4096 })),
    ),
  );

  Electron.ipcMain.handle('license:syncRemote', (event) =>
    wrapIpcAsync(event, (uid) => svc.syncRemoteLicense(uid)));

  Electron.ipcMain.handle('license:clear', (event) =>
    wrapIpc(event, (uid) => svc.clearLicense(uid)));

  Electron.ipcMain.handle('license:getPack', (event) =>
    wrapIpc(event, () => getLicensePackSummary()));
}
