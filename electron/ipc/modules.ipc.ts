import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcPublic } from './ipcHelpers';
import {
  listEnabledModuleIds,
  listModulesConfigForUser,
  setModuleEnabledForUser,
} from '../services/modules.service';

export function registerModulesIpc(): void {
  Electron.ipcMain.handle('modules:listEnabled', () =>
    wrapIpcPublic(() => listEnabledModuleIds()),
  );

  Electron.ipcMain.handle('modules:listConfig', (event) =>
    wrapIpc(event, (actorUserId) => listModulesConfigForUser(actorUserId)),
  );

  Electron.ipcMain.handle('modules:setEnabled', (event, moduleId: string, enabled: boolean) =>
    wrapIpc(event, (actorUserId) => setModuleEnabledForUser(actorUserId, moduleId, enabled)),
  );
}
