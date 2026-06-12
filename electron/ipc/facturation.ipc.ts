import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/facturation.service';

export function registerFacturationIpc(): void {
  Electron.ipcMain.handle('facturation:getDashboard', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.getFacturationDashboard(uid, hotelId)));

  Electron.ipcMain.handle('facturation:listFactures', (event, filters: svc.FactureFilters) =>
    wrapIpc(event, (uid) => svc.listFactures(uid, filters)));

  Electron.ipcMain.handle('facturation:getFacture', (event, id: number) =>
    wrapIpc(event, (uid) => svc.getFactureDetail(uid, id)));

  Electron.ipcMain.handle('facturation:createFacture', (event, input: svc.CreateFactureInput) =>
    wrapIpc(event, (uid) => svc.createFacture(uid, input)));

  Electron.ipcMain.handle('facturation:updateFacture', (event, id: number, input: Partial<svc.CreateFactureInput>) =>
    wrapIpc(event, (uid) => svc.updateFacture(uid, id, input)));

  Electron.ipcMain.handle('facturation:soumettre', (event, id: number) =>
    wrapIpc(event, (uid) => svc.soumettreFacture(uid, id)));

  Electron.ipcMain.handle('facturation:valider', (event, id: number) =>
    wrapIpc(event, (uid) => svc.validerFacture(uid, id)));

  Electron.ipcMain.handle('facturation:annuler', (event, id: number) =>
    wrapIpc(event, (uid) => svc.annulerFacture(uid, id)));

  Electron.ipcMain.handle('facturation:deleteFacture', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteFacture(uid, id)));

  Electron.ipcMain.handle('facturation:addPaiement', (event, input: svc.AddPaiementInput) =>
    wrapIpc(event, (uid) => svc.addPaiement(uid, input)));

  Electron.ipcMain.handle('facturation:deletePaiement', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deletePaiement(uid, id)));

  Electron.ipcMain.handle('facturation:listClients', (event, search?: string) =>
    wrapIpc(event, (uid) => svc.listClients(uid, search)));

  Electron.ipcMain.handle('facturation:createClient', (event, input: svc.CreateClientInput) =>
    wrapIpc(event, (uid) => svc.createClient(uid, input)));

  Electron.ipcMain.handle('facturation:updateClient', (event, id: number, input: Partial<svc.CreateClientInput>) =>
    wrapIpc(event, (uid) => svc.updateClient(uid, id, input)));

  Electron.ipcMain.handle('facturation:deleteClient', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteClient(uid, id)));
}
