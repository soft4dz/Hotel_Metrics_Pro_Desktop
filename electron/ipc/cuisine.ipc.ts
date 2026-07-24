import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  listRecettes,
  getRecette,
  createRecette,
  updateRecette,
  upsertRecetteLigne,
  removeRecetteLigne,
  validerRecette,
  listOrdresProduction,
  createOrdreProduction,
  executerOrdreProduction,
} from '../services/cuisine-production.service';
import type {
  CreateRecetteInput,
  UpsertRecetteLigneInput,
  CreateOrdreProductionInput,
} from '../../src/shared/types/cuisine';

export function registerCuisineIpc(): void {
  Electron.ipcMain.handle('cuisine:recettes:list', (event, hotelId: number) =>
    wrapIpc(event, () => listRecettes(hotelId)));
  Electron.ipcMain.handle('cuisine:recettes:get', (event, id: number) =>
    wrapIpc(event, () => getRecette(id)));
  Electron.ipcMain.handle('cuisine:recettes:create', (event, input: CreateRecetteInput) =>
    wrapIpc(event, (uid) => createRecette(uid, input)));
  Electron.ipcMain.handle('cuisine:recettes:update', (event, id: number, input: Partial<CreateRecetteInput>) =>
    wrapIpc(event, (uid) => updateRecette(uid, id, input)));
  Electron.ipcMain.handle('cuisine:recettes:ligne:upsert', (event, recetteId: number, input: UpsertRecetteLigneInput, ligneId?: number) =>
    wrapIpc(event, (uid) => upsertRecetteLigne(uid, recetteId, input, ligneId)));
  Electron.ipcMain.handle('cuisine:recettes:ligne:remove', (event, recetteId: number, ligneId: number) =>
    wrapIpc(event, (uid) => removeRecetteLigne(uid, recetteId, ligneId)));
  Electron.ipcMain.handle('cuisine:recettes:valider', (event, id: number) =>
    wrapIpc(event, (uid) => validerRecette(uid, id)));
  Electron.ipcMain.handle('cuisine:ordres:list', (event, hotelId: number) =>
    wrapIpc(event, () => listOrdresProduction(hotelId)));
  Electron.ipcMain.handle('cuisine:ordres:create', (event, input: CreateOrdreProductionInput) =>
    wrapIpc(event, (uid) => createOrdreProduction(uid, input)));
  Electron.ipcMain.handle('cuisine:ordres:executer', (event, id: number) =>
    wrapIpc(event, (uid) => executerOrdreProduction(uid, id)));
}
