import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/clients.service';

export function registerClientsIpc(): void {
  Electron.ipcMain.handle('clients:getDashboard', (event) =>
    wrapIpc(event, (uid) => svc.getClientsDashboard(uid)));

  Electron.ipcMain.handle('clients:list', (event, filters?: svc.ClientFilters) =>
    wrapIpc(event, (uid) => svc.listClients(uid, filters)));

  Electron.ipcMain.handle('clients:get', (event, id: number) =>
    wrapIpc(event, (uid) => svc.getClientDetail(uid, id)));

  Electron.ipcMain.handle('clients:create', (event, input: svc.CreateClientInput) =>
    wrapIpc(event, (uid) => svc.createClient(uid, input)));

  Electron.ipcMain.handle('clients:update', (event, id: number, input: Partial<svc.CreateClientInput>) =>
    wrapIpc(event, (uid) => svc.updateClient(uid, id, input)));

  Electron.ipcMain.handle('clients:toggleActif', (event, id: number) =>
    wrapIpc(event, (uid) => svc.toggleActifClient(uid, id)));

  Electron.ipcMain.handle('clients:delete', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteClient(uid, id)));

  // ── Contacts ────────────────────────────────────────────────────────────────

  Electron.ipcMain.handle('clients:contacts:list', (event, clientId: number) =>
    wrapIpc(event, (uid) => svc.listContacts(uid, clientId)));

  Electron.ipcMain.handle('clients:contacts:create', (event, clientId: number, input: svc.CreateContactInput) =>
    wrapIpc(event, (uid) => svc.createContact(uid, clientId, input)));

  Electron.ipcMain.handle('clients:contacts:update', (event, contactId: number, input: Partial<svc.CreateContactInput>) =>
    wrapIpc(event, (uid) => svc.updateContact(uid, contactId, input)));

  Electron.ipcMain.handle('clients:contacts:delete', (event, contactId: number) =>
    wrapIpc(event, (uid) => svc.deleteContact(uid, contactId)));
}
