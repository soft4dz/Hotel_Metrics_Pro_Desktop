import Electron from '../lib/electronApi';
import * as settingsService from '../services/settings.service';
import type { CompanyBrandAsset } from '../services/logo.service';
import { wrapIpc, wrapIpcAsync, wrapIpcPublic } from './ipcHelpers';

export function registerSettingsIpc(): void {
  Electron.ipcMain.handle('settings:getBranding', () =>
    wrapIpcPublic(() => settingsService.getCompanyBranding()),
  );

  Electron.ipcMain.handle('settings:getAppInfo', (event) =>
    wrapIpc(event, (actorUserId) => settingsService.getAppInfo(actorUserId)),
  );

  Electron.ipcMain.handle(
    'settings:update',
    (event, input: Partial<settingsService.AppSettingsDto>) =>
      wrapIpc(event, (actorUserId) => settingsService.updateAppSettings(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'settings:pickBrandAsset',
    (event, asset: CompanyBrandAsset) =>
      wrapIpcAsync(event, (actorUserId) => settingsService.pickCompanyBrandAsset(actorUserId, asset)),
  );

  Electron.ipcMain.handle(
    'settings:removeBrandAsset',
    (event, asset: CompanyBrandAsset) =>
      wrapIpc(event, (actorUserId) => settingsService.removeCompanyBrandAsset(actorUserId, asset)),
  );
}
