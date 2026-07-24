import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateDecisionInput, UpdateDecisionInput } from '../services/decisions.service';
import { listDecisions, listDecisionsForUser, createDecision, getDecision, updateDecision, marquerLu, archiverDecision, getDecisionDestinataires } from '../services/decisions.service';
import { assertObject, assertPositiveInteger } from './validation';

export function registerDecisionsIpc(): void {
  Electron.ipcMain.handle('decisions:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => listDecisions(uid, hotelId)));
  Electron.ipcMain.handle('decisions:listForUser', (event, filters?: { unreadOnly?: boolean; hotelId?: number }) =>
    wrapIpc(event, (uid) => listDecisionsForUser(uid, filters ?? {})));
  Electron.ipcMain.handle('decisions:destinataires', (event, id: unknown) =>
    wrapIpc(event, () => getDecisionDestinataires(assertPositiveInteger(id, 'id'))));
  Electron.ipcMain.handle('decisions:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<CreateDecisionInput & Record<string, unknown>>(input, 'input');
      if (o.destinataireIds && Array.isArray(o.destinataireIds)) {
        o.destinataireIds = o.destinataireIds.map((x) => assertPositiveInteger(x, 'destinataireId'));
      }
      return createDecision(uid, o);
    }));
  Electron.ipcMain.handle('decisions:get', (event, id: number) =>
    wrapIpc(event, () => getDecision(id)));
  Electron.ipcMain.handle('decisions:update', (event, id: number, input: UpdateDecisionInput) =>
    wrapIpc(event, (uid) => updateDecision(uid, id, input)));
  Electron.ipcMain.handle('decisions:marquerLu', (event, id: number) =>
    wrapIpc(event, (uid) => { marquerLu(id, uid); return true; }));
  Electron.ipcMain.handle('decisions:archiver', (event, id: number) =>
    wrapIpc(event, () => { archiverDecision(id); return true; }));
}
