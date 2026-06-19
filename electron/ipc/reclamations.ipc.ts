import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateReclamationInput, UpdateReclamationInput } from '../services/reclamations.service';
import { listReclamations, createReclamation, updateReclamation, getReclamationStats } from '../services/reclamations.service';

export function registerReclamationsIpc(): void {
  Electron.ipcMain.handle('reclamations:list', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, () => listReclamations(hotelId, statut)));
  Electron.ipcMain.handle('reclamations:stats', (event, hotelId?: number) =>
    wrapIpc(event, () => getReclamationStats(hotelId)));
  Electron.ipcMain.handle('reclamations:create', (event, input: CreateReclamationInput) =>
    wrapIpc(event, (uid) => createReclamation(uid, input)));
  Electron.ipcMain.handle('reclamations:update', (event, id: number, input: UpdateReclamationInput) =>
    wrapIpc(event, () => updateReclamation(id, input)));
}
