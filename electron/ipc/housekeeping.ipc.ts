import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type {
  CreateHousekeepingTacheInput,
  StatutTacheHousekeeping,
  UpdateChecklistItemInput,
  UpdateHousekeepingTacheInput,
} from '../../src/shared/types/housekeeping';
import {
  createTache,
  getHousekeepingStats,
  listChecklistItems,
  listChambresMenageSansTache,
  listTaches,
  syncTachesFromChambresMenage,
  updateChecklistItem,
  updateTache,
} from '../services/housekeeping.service';

export function registerHousekeepingIpc(): void {
  Electron.ipcMain.handle('housekeeping:listTaches', (event, hotelId: number, statut?: StatutTacheHousekeeping, datePrevue?: string) =>
    wrapIpc(event, () => listTaches(hotelId, statut, datePrevue)));

  Electron.ipcMain.handle('housekeeping:createTache', (event, input: CreateHousekeepingTacheInput) =>
    wrapIpc(event, (uid) => createTache(uid, input)));

  Electron.ipcMain.handle('housekeeping:updateTache', (event, id: number, input: UpdateHousekeepingTacheInput) =>
    wrapIpc(event, (uid) => updateTache(uid, id, input)));

  Electron.ipcMain.handle('housekeeping:listChecklistItems', (event, tacheId: number) =>
    wrapIpc(event, () => listChecklistItems(tacheId)));

  Electron.ipcMain.handle('housekeeping:updateChecklistItem', (event, itemId: number, input: UpdateChecklistItemInput) =>
    wrapIpc(event, () => updateChecklistItem(itemId, input)));

  Electron.ipcMain.handle('housekeeping:stats', (event, hotelId: number) =>
    wrapIpc(event, () => getHousekeepingStats(hotelId)));

  Electron.ipcMain.handle('housekeeping:syncFromChambres', (event, hotelId: number) =>
    wrapIpc(event, (uid) => syncTachesFromChambresMenage(uid, hotelId)));

  Electron.ipcMain.handle('housekeeping:chambresMenageSansTache', (event, hotelId: number) =>
    wrapIpc(event, () => listChambresMenageSansTache(hotelId)));
}
