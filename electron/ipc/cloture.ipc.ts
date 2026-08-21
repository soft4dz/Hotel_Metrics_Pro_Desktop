import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/daily-closure.service';
import * as nightAudit from '../services/night-audit.service';
import { assertDateJournal, assertPositiveInteger, assertText } from './validation';

export function registerClotureIpc(): void {
  Electron.ipcMain.handle('cloture:create', (event, hotelId: number, dateJournal: string) =>
    wrapIpc(event, (uid) => svc.createDailyClosure(uid, assertPositiveInteger(hotelId, 'hotelId'), assertDateJournal(dateJournal, 'dateJournal'))));

  Electron.ipcMain.handle('cloture:prefill', (event, closureId: number) =>
    wrapIpc(event, (uid) => svc.prefillDailyClosure(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:submit', (event, closureId: number) =>
    wrapIpc(event, (uid) => svc.submitDailyClosure(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:validateUnit', (event, closureId: number) =>
    wrapIpc(event, (uid) => svc.validateDailyClosureUnit(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:validateDec', (event, closureId: number) =>
    wrapIpc(event, (uid) => svc.validateDailyClosureDec(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:reject', (event, closureId: number, motif: string) =>
    wrapIpc(event, (uid) => {
      assertText(motif, 'motif', { required: true });
      return svc.rejectDailyClosure(uid, assertPositiveInteger(closureId, 'closureId'), motif);
    }));

  Electron.ipcMain.handle('cloture:close', (event, closureId: number) =>
    wrapIpc(event, (uid) => svc.closeDailyClosure(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:list', (event, hotelId?: number, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => svc.listDailyClosures(uid, hotelId, dateDebut, dateFin)));

  Electron.ipcMain.handle('cloture:posStatus', (event, hotelId: number, dateJournal: string) =>
    wrapIpc(event, () => svc.getPosClosureStatusForHotel(assertPositiveInteger(hotelId, 'hotelId'), assertDateJournal(dateJournal, 'dateJournal'))));

  Electron.ipcMain.handle('cloture:nightAudit:businessDate', (event, hotelId: unknown) =>
    wrapIpc(event, (uid) => nightAudit.getHotelBusinessDate(uid, assertPositiveInteger(hotelId, 'hotelId'))));

  Electron.ipcMain.handle('cloture:nightAudit:get', (event, closureId: unknown) =>
    wrapIpc(event, (uid) => nightAudit.getNightAuditReport(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:nightAudit:run', (event, closureId: unknown) =>
    wrapIpc(event, (uid) => nightAudit.runNightAuditControls(uid, assertPositiveInteger(closureId, 'closureId'))));

  Electron.ipcMain.handle('cloture:nightAudit:reopen', (event, closureId: unknown, motif: unknown) =>
    wrapIpc(event, (uid) => nightAudit.reopenNightAudit(
      uid,
      assertPositiveInteger(closureId, 'closureId'),
      assertText(motif, 'motif', { required: true, maxLength: 1000 }),
    )));
}
