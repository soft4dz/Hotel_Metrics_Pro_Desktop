import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/finance-reconciliation.service';
import { assertDateJournal, assertPositiveInteger, assertText } from './validation';

export function registerReconciliationIpc(): void {
  Electron.ipcMain.handle('reconciliation:create', (event, hotelId: number, dateJournal: string) =>
    wrapIpc(event, (uid) => svc.createReconciliation(uid, assertPositiveInteger(hotelId, 'hotelId'), assertDateJournal(dateJournal, 'dateJournal'))));

  Electron.ipcMain.handle('reconciliation:prefill', (event, id: number) =>
    wrapIpc(event, (uid) => svc.prefillReconciliation(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('reconciliation:justify', (event, id: number, justification: string) =>
    wrapIpc(event, (uid) => {
      assertText(justification, 'justification', { required: true });
      return svc.justifyReconciliation(uid, assertPositiveInteger(id, 'id'), justification);
    }));

  Electron.ipcMain.handle('reconciliation:validate', (event, id: number) =>
    wrapIpc(event, (uid) => svc.validateReconciliation(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('reconciliation:list', (event, hotelId?: number, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => svc.listReconciliations(uid, hotelId, dateDebut, dateFin)));
}
