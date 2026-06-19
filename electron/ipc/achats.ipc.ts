import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateFournisseurInput, CreateBonInput } from '../services/achats.service';
import { listFournisseurs, createFournisseur, listBonsCommande, createBon, validerBon } from '../services/achats.service';

export function registerAchatsIpc(): void {
  Electron.ipcMain.handle('achats:listFournisseurs', (event) =>
    wrapIpc(event, () => listFournisseurs()));
  Electron.ipcMain.handle('achats:createFournisseur', (event, input: CreateFournisseurInput) =>
    wrapIpc(event, () => createFournisseur(input)));
  Electron.ipcMain.handle('achats:listBons', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, () => listBonsCommande(hotelId, statut)));
  Electron.ipcMain.handle('achats:createBon', (event, input: CreateBonInput) =>
    wrapIpc(event, (uid) => createBon(uid, input)));
  Electron.ipcMain.handle('achats:validerBon', (event, id: number) =>
    wrapIpc(event, (uid) => validerBon(uid, id)));
}
