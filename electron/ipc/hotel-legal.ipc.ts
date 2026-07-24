import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/hotel-legal.service';
import { assertDateJournal, assertPositiveInteger } from './validation';

export function registerHotelLegalIpc(): void {
  Electron.ipcMain.handle('hotelLegal:fichePolice:list', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, (uid) => svc.listFichesPolice(uid, hotelId, statut)));

  Electron.ipcMain.handle('hotelLegal:fichePolice:create', (event, input: Parameters<typeof svc.createFichePolice>[1]) =>
    wrapIpc(event, (uid) => svc.createFichePolice(uid, input)));

  Electron.ipcMain.handle('hotelLegal:fichePolice:checkout', (event, ficheId: number, dateSortie: string) =>
    wrapIpc(event, (uid) => svc.checkoutFichePolice(uid, assertPositiveInteger(ficheId, 'ficheId'), assertDateJournal(dateSortie, 'dateSortie'))));

  Electron.ipcMain.handle('hotelLegal:taxeSejour:calculer', (event, hotelId: number, periode: string, taux?: number) =>
    wrapIpc(event, (uid) => svc.calculerTaxeSejour(uid, assertPositiveInteger(hotelId, 'hotelId'), periode, taux)));

  Electron.ipcMain.handle('hotelLegal:tourisme:generer', (event, hotelId: number, periode: string) =>
    wrapIpc(event, (uid) => svc.genererRapportTourisme(uid, assertPositiveInteger(hotelId, 'hotelId'), periode)));

  Electron.ipcMain.handle('hotelLegal:tourisme:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.listRapportsTourisme(uid, hotelId)));

  Electron.ipcMain.handle('hotelLegal:fichePolice:exportCsv', (event, hotelId: number) =>
    wrapIpc(event, (uid) => svc.exportFichesPoliceCsv(uid, assertPositiveInteger(hotelId, 'hotelId'))));
}
