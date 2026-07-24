import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/creances.service';
import { assertAmount, assertPositiveInteger } from './validation';

export function registerCreancesIpc(): void {
  Electron.ipcMain.handle('creances:list', (event, filters?: { hotelId?: number; statut?: svc.CreanceStatut }) =>
    wrapIpc(event, (uid) => svc.listCreances(uid, filters ?? {})));

  Electron.ipcMain.handle('creances:fromFacture', (event, factureId: number) =>
    wrapIpc(event, (uid) => svc.createCreanceFromFacture(uid, assertPositiveInteger(factureId, 'factureId'))));

  Electron.ipcMain.handle('creances:relance', (event, creanceId: number, input: { canal: string; objet?: string; contenu?: string }) =>
    wrapIpc(event, (uid) => svc.addCreanceRelance(uid, assertPositiveInteger(creanceId, 'creanceId'), input)));

  Electron.ipcMain.handle('creances:balanceAgee', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.getBalanceAgee(uid, hotelId)));

  Electron.ipcMain.handle('creances:updateStatut', (event, creanceId: number, statut: svc.CreanceStatut) =>
    wrapIpc(event, (uid) => svc.updateCreanceStatut(uid, assertPositiveInteger(creanceId, 'creanceId'), statut)));

  Electron.ipcMain.handle('creances:paiement', (event, creanceId: number, montant: number) =>
    wrapIpc(event, (uid) => svc.enregistrerPaiementCreance(uid, assertPositiveInteger(creanceId, 'creanceId'), assertAmount(montant, 'montant'))));

  Electron.ipcMain.handle('creances:runRelancesAuto', (event) =>
    wrapIpc(event, (uid) => svc.runRelancesAutomatiques(uid)));

  Electron.ipcMain.handle('creances:getRelancesAuto', (event) =>
    wrapIpc(event, () => svc.isRelancesAutomatiquesActives()));

  Electron.ipcMain.handle('creances:setRelancesAuto', (event, actif: unknown) =>
    wrapIpc(event, (uid) => svc.setRelancesAutomatiquesActives(uid, Boolean(actif))));
}
