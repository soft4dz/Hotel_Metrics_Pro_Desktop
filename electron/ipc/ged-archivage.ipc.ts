import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/ged-archivage.service';
import { assertPositiveInteger } from './validation';

export function registerGedArchivageIpc(): void {
  Electron.ipcMain.handle('ged:retention:list', (event) =>
    wrapIpc(event, () => svc.listRetentionPolicies()));

  Electron.ipcMain.handle('ged:legal:archive', (event, documentId: number, politiqueCode?: string) =>
    wrapIpc(event, (uid) => svc.archiverLegalement(uid, assertPositiveInteger(documentId, 'documentId'), politiqueCode)));

  Electron.ipcMain.handle('ged:legal:list', (event) =>
    wrapIpc(event, (uid) => svc.listLegalArchives(uid)));

  Electron.ipcMain.handle('ged:legal:verify', (event, archiveId: number) =>
    wrapIpc(event, () => svc.verifierIntegriteArchive(assertPositiveInteger(archiveId, 'archiveId'))));
}
