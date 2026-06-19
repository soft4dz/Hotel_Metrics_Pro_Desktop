import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateEntreeInput } from '../services/plage.service';
import { getPlageConfig, savePlageConfig, listEntrees, createEntree, getPlageStats } from '../services/plage.service';

export function registerPlageIpc(): void {
  Electron.ipcMain.handle('plage:getConfig', (event, hotelId: number) =>
    wrapIpc(event, () => getPlageConfig(hotelId)));
  Electron.ipcMain.handle('plage:saveConfig', (event, hotelId: number, input: Partial<Parameters<typeof savePlageConfig>[1]>) =>
    wrapIpc(event, () => savePlageConfig(hotelId, input)));
  Electron.ipcMain.handle('plage:listEntrees', (event, hotelId: number, date?: string) =>
    wrapIpc(event, () => listEntrees(hotelId, date, date)));
  Electron.ipcMain.handle('plage:createEntree', (event, input: CreateEntreeInput) =>
    wrapIpc(event, (uid) => createEntree(uid, input)));
  Electron.ipcMain.handle('plage:stats', (event, hotelId: number) =>
    wrapIpc(event, () => getPlageStats(hotelId)));
}
