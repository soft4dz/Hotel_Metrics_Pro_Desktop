import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcPublic } from './ipcHelpers';
import { listEnabledModuleIds, setModuleEnabled } from '../services/modules.service';

export function registerModulesIpc(): void {
  Electron.ipcMain.handle('modules:listEnabled', () =>
    wrapIpcPublic(() => listEnabledModuleIds()),
  );

  Electron.ipcMain.handle('modules:setEnabled', (event, moduleId: string, enabled: boolean) =>
    wrapIpc(event, () => { setModuleEnabled(moduleId, enabled); return true; }),
  );
}
