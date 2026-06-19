import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateProduitInput, CreateMouvementInput } from '../services/stocks.service';
import { listProduits, createProduit, getNiveaux, createMouvement, listCategories } from '../services/stocks.service';

export function registerStocksIpc(): void {
  Electron.ipcMain.handle('stocks:listProduits', (event) =>
    wrapIpc(event, () => listProduits()));
  Electron.ipcMain.handle('stocks:createProduit', (event, input: CreateProduitInput) =>
    wrapIpc(event, () => createProduit(input)));
  Electron.ipcMain.handle('stocks:getNiveaux', (event, hotelId: number) =>
    wrapIpc(event, () => getNiveaux(hotelId)));
  Electron.ipcMain.handle('stocks:createMouvement', (event, input: CreateMouvementInput) =>
    wrapIpc(event, (uid) => createMouvement(uid, input)));
  Electron.ipcMain.handle('stocks:listCategories', (event) =>
    wrapIpc(event, () => listCategories()));
}
