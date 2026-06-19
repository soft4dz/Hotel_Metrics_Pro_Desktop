import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateDecisionInput, UpdateDecisionInput } from '../services/decisions.service';
import { listDecisions, createDecision, getDecision, updateDecision, marquerLu, archiverDecision } from '../services/decisions.service';

export function registerDecisionsIpc(): void {
  Electron.ipcMain.handle('decisions:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => listDecisions(uid, hotelId)));
  Electron.ipcMain.handle('decisions:get', (event, id: number) =>
    wrapIpc(event, () => getDecision(id)));
  Electron.ipcMain.handle('decisions:create', (event, input: CreateDecisionInput) =>
    wrapIpc(event, (uid) => createDecision(uid, input)));
  Electron.ipcMain.handle('decisions:update', (event, id: number, input: UpdateDecisionInput) =>
    wrapIpc(event, (uid) => updateDecision(uid, id, input)));
  Electron.ipcMain.handle('decisions:marquerLu', (event, id: number) =>
    wrapIpc(event, (uid) => { marquerLu(id, uid); return true; }));
  Electron.ipcMain.handle('decisions:archiver', (event, id: number) =>
    wrapIpc(event, () => { archiverDecision(id); return true; }));
}
