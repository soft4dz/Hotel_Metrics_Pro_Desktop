import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { AnomalieFilters, CreateAnomalieInput, UpdateAnomalieInput } from '../services/anomalies.service';
import { listAnomalies, getAnomalieStats, createAnomalie, updateAnomalie, deleteAnomalie } from '../services/anomalies.service';

export function registerAnomaliesIpc(): void {
  Electron.ipcMain.handle('anomalies:list', (event, filters?: AnomalieFilters) =>
    wrapIpc(event, (uid) => listAnomalies(uid, filters)));
  Electron.ipcMain.handle('anomalies:stats', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => getAnomalieStats(uid, hotelId)));
  Electron.ipcMain.handle('anomalies:create', (event, input: CreateAnomalieInput) =>
    wrapIpc(event, (uid) => createAnomalie(uid, input)));
  Electron.ipcMain.handle('anomalies:update', (event, id: number, input: UpdateAnomalieInput) =>
    wrapIpc(event, (uid) => updateAnomalie(uid, id, input)));
  Electron.ipcMain.handle('anomalies:delete', (event, id: number) =>
    wrapIpc(event, (uid) => { deleteAnomalie(uid, id); return true; }));
}
