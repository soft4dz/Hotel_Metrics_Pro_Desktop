import Electron from '../lib/electronApi';
import { wrapIpcAsync } from './ipcHelpers';
import type { UploadDocumentInput } from '../services/ged.service';
import { listCategories, listDocuments, uploadDocument, archiverDocument, ouvrirDocument, supprimerDocument } from '../services/ged.service';
import { assertPositiveInteger } from './validation';

export function registerGedIpc(): void {
  Electron.ipcMain.handle('ged:listCategories', (event) =>
    wrapIpcAsync(event, async () => listCategories()));
  Electron.ipcMain.handle('ged:listDocuments', (event, hotelId?: number, categorieId?: number, search?: string) =>
    wrapIpcAsync(event, async () => listDocuments(hotelId, categorieId, search)));
  Electron.ipcMain.handle('ged:upload', (event, input: UploadDocumentInput) =>
    wrapIpcAsync(event, async (uid) => uploadDocument(uid, input)));
  Electron.ipcMain.handle('ged:archiver', (event, id: number) =>
    wrapIpcAsync(event, async () => { archiverDocument(id); return true; }));
  Electron.ipcMain.handle('ged:ouvrir', (event, id: number) =>
    wrapIpcAsync(event, async () => { ouvrirDocument(id); return true; }));
  Electron.ipcMain.handle('ged:delete', (event, id: number, motif?: string) =>
    wrapIpcAsync(event, async (uid) => {
      supprimerDocument(uid, assertPositiveInteger(id, 'id'), motif);
      return true;
    }));
}
