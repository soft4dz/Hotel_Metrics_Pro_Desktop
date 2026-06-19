import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreatePartenaireInput, CreateOpportuniteInput } from '../services/commercial.service';
import { listPartenaires, createPartenaire, listOpportunites, createOpportunite, updateOpportunite, getCommercialStats } from '../services/commercial.service';

export function registerCommercialIpc(): void {
  Electron.ipcMain.handle('commercial:listPartenaires', (event) =>
    wrapIpc(event, () => listPartenaires()));
  Electron.ipcMain.handle('commercial:createPartenaire', (event, input: CreatePartenaireInput) =>
    wrapIpc(event, () => createPartenaire(input)));
  Electron.ipcMain.handle('commercial:listOpportunites', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, () => listOpportunites(hotelId, statut)));
  Electron.ipcMain.handle('commercial:createOpportunite', (event, input: CreateOpportuniteInput) =>
    wrapIpc(event, (uid) => createOpportunite(uid, input)));
  Electron.ipcMain.handle('commercial:updateOpportunite', (event, id: number, input: Partial<CreateOpportuniteInput> & { statut?: string }) =>
    wrapIpc(event, () => updateOpportunite(id, input)));
  Electron.ipcMain.handle('commercial:stats', (event, hotelId?: number) =>
    wrapIpc(event, () => getCommercialStats(hotelId)));
}
