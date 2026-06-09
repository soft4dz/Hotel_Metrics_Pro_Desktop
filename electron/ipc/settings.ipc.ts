import Electron from '../lib/electronApi';
import * as settingsService from '../services/settings.service';
import { wrapIpc } from './ipcHelpers';

export function registerSettingsIpc(): void {
  Electron.ipcMain.handle('settings:getAppInfo', (event) =>
    wrapIpc(event, (actorUserId) => settingsService.getAppInfo(actorUserId)),
  );

  Electron.ipcMain.handle(
    'settings:update',
    (event, input: Partial<settingsService.AppSettingsDto>) =>
      wrapIpc(event, (actorUserId) => settingsService.updateAppSettings(actorUserId, input)),
  );
}
