import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as svc from '../services/veille-reglementaire.service';
import type { CreateTexteReglementaireInput, UpdateTexteReglementaireInput } from '../../src/shared/types/veilleReglementaire';

export function registerVeilleReglementaireIpc(): void {
  Electron.ipcMain.handle('veille:list', (e, filters?: { hotelId?: number; categorie?: string; statutConformite?: string; search?: string }) =>
    wrapIpc(e, (uid) => svc.listTextes(uid, filters)));
  Electron.ipcMain.handle('veille:create', (e, input: CreateTexteReglementaireInput) =>
    wrapIpc(e, (uid) => svc.createTexte(uid, input)));
  Electron.ipcMain.handle('veille:update', (e, id: number, input: UpdateTexteReglementaireInput) =>
    wrapIpc(e, (uid) => svc.updateTexte(uid, id, input)));
  Electron.ipcMain.handle('veille:delete', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteTexte(uid, id)));
  Electron.ipcMain.handle('veille:attachDocument', (e, id: number) =>
    wrapIpcAsync(e, (uid) => svc.attachDocument(uid, id)));
  Electron.ipcMain.handle('veille:ouvrirDocument', (e, id: number) =>
    wrapIpc(e, (uid) => svc.ouvrirDocument(uid, id)));
}
