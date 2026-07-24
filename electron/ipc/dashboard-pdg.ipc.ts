import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as svc from '../services/dashboard-pdg.service';

export function registerDashboardPdgIpc(): void {
  Electron.ipcMain.handle('dashboard:pdg:get', (event) =>
    wrapIpc(event, (uid) => svc.getDashboardPdg(uid)));

  Electron.ipcMain.handle('dashboard:pdg:exportCsv', (event) =>
    wrapIpc(event, (uid) => svc.exportPdgReportCsv(uid)));

  Electron.ipcMain.handle('dashboard:pdg:exportMensuel', (event, periode?: string) =>
    wrapIpcAsync(event, (uid) => svc.exportPdgReportMensuelXlsx(uid, periode)));
}
