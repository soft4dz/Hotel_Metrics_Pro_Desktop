import Electron from '../lib/electronApi';
import { wrapIpcAsync } from './ipcHelpers';
import type { UploadDocumentInput } from '../services/ged.service';
import { listCategories, listDocuments, uploadDocument, archiverDocument, ouvrirDocument, supprimerDocument } from '../services/ged.service';
import { assertPositiveInteger } from './validation';
import { assertText } from './validation';
import * as lifecycle from '../services/ged-lifecycle.service';

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
  Electron.ipcMain.handle('ged:versions:list', (event, id: unknown) => wrapIpcAsync(event, async () => lifecycle.listVersions(assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('ged:versions:add', (event, id: unknown, note?: unknown) => wrapIpcAsync(event, uid => lifecycle.addVersion(uid,assertPositiveInteger(id,'id'),note?assertText(note,'note',{maxLength:1000}):undefined)));
  Electron.ipcMain.handle('ged:ocr:request', (event, id: unknown, langue?: unknown) => wrapIpcAsync(event, async uid => lifecycle.requestOcr(uid,assertPositiveInteger(id,'id'),langue?assertText(langue,'langue',{maxLength:10}):'fra')));
  Electron.ipcMain.handle('ged:ocr:complete', (event, id: unknown, texte: unknown, confidence?: number) => wrapIpcAsync(event, async uid => lifecycle.completeOcr(uid,assertPositiveInteger(id,'id'),assertText(texte,'texte',{required:true,maxLength:1_000_000}),confidence)));
  Electron.ipcMain.handle('ged:ocr:search', (event, query: unknown) => wrapIpcAsync(event, async () => lifecycle.searchOcr(assertText(query,'query',{required:true,maxLength:200}))));
  Electron.ipcMain.handle('ged:signatures:list', (event, id: unknown) => wrapIpcAsync(event, async () => lifecycle.listSignatures(assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('ged:signatures:add', (event, id: unknown, motif?: unknown) => wrapIpcAsync(event, async uid => lifecycle.signDocument(uid,assertPositiveInteger(id,'id'),motif?assertText(motif,'motif',{maxLength:500}):undefined)));
}
