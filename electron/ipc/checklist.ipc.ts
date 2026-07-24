import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/checklist.service';
import { assertPositiveInteger } from './validation';

export function registerChecklistIpc(): void {
  Electron.ipcMain.handle('checklist:templates', (event) =>
    wrapIpc(event, (uid) => svc.listChecklistTemplates(uid)));

  Electron.ipcMain.handle('checklist:start', (event, templateId: number, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.startChecklistRun(uid, assertPositiveInteger(templateId, 'templateId'), hotelId)));

  Electron.ipcMain.handle('checklist:get', (event, runId: number) =>
    wrapIpc(event, (uid) => ({ run: svc.getChecklistRun(uid, runId), results: svc.getChecklistResults(uid, runId) })));

  Electron.ipcMain.handle('checklist:updateResult', (event, runId: number, itemId: number, input: { statut: string; commentaire?: string; preuvePath?: string }) =>
    wrapIpc(event, (uid) => {
      svc.updateChecklistResult(uid, runId, itemId, input);
      return true;
    }));

  Electron.ipcMain.handle('checklist:submit', (event, runId: number) =>
    wrapIpc(event, (uid) => svc.submitChecklistRun(uid, assertPositiveInteger(runId, 'runId'))));

  Electron.ipcMain.handle('checklist:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.listChecklistRuns(uid, hotelId)));

  Electron.ipcMain.handle('checklist:stats', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.getChecklistStats(uid, hotelId)));
}
