import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/fiscalite-dz.service';
import { assertAmount, assertDateJournal, assertText, assertPeriodeMois } from './validation';

export function registerFiscaliteDzIpc(): void {
  Electron.ipcMain.handle('fiscalite:registreTva:list', (event, periode?: string) =>
    wrapIpc(event, (uid) => svc.listRegistreTvaVentes(uid, periode)));

  Electron.ipcMain.handle('fiscalite:registreTva:generer', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.genererRegistreTvaMensuel(uid, assertPeriodeMois(periode, 'periode'))));

  Electron.ipcMain.handle('fiscalite:registreTva:exportCsv', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.exportRegistreTvaCsv(uid, assertPeriodeMois(periode, 'periode'))));

  Electron.ipcMain.handle('fiscalite:declaration:calculer', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.calculerDeclarationTva(uid, assertPeriodeMois(periode, 'periode'))));

  Electron.ipcMain.handle('fiscalite:declaration:get', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.getDeclarationTva(uid, periode)));

  Electron.ipcMain.handle('fiscalite:declaration:list', (event) =>
    wrapIpc(event, (uid) => svc.listDeclarationsTva(uid)));

  Electron.ipcMain.handle('fiscalite:retenue:create', (event, input: svc.CreateRetenueInput) =>
    wrapIpc(event, (uid) => {
      assertText(input.fournisseurNom, 'fournisseurNom', { required: true });
      assertAmount(input.baseHt, 'baseHt');
      assertDateJournal(input.dateRetenue, 'dateRetenue');
      return svc.enregistrerRetenueSource(uid, input);
    }));

  Electron.ipcMain.handle('fiscalite:retenue:list', (event) =>
    wrapIpc(event, (uid) => svc.listRetenuesSource(uid)));

  Electron.ipcMain.handle('fiscalite:liasse:generer', (event, exercice: number) =>
    wrapIpc(event, (uid) => svc.genererLiasseFiscale(uid, exercice)));

  Electron.ipcMain.handle('fiscalite:liasse:list', (event, exercice: number) =>
    wrapIpc(event, (uid) => svc.listLiasseFiscale(uid, exercice)));

  Electron.ipcMain.handle('fiscalite:liasse:exportCsv', (event, exercice: number) =>
    wrapIpc(event, (uid) => svc.exportLiasseCsv(uid, exercice)));
}
