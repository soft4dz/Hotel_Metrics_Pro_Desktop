import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as svc from '../services/appels-offres.service';
import type {
  CreateAppelOffresInput, CreateLotInput, UploadDocumentAoInput,
  CreateOffreAoInput, CreateCritereInput, NoteEvaluation,
  OuvrirPlisInput, AttribuerLotInput,
} from '../../src/shared/types/appelsOffres';

export function registerAppelsOffresIpc(): void {
  Electron.ipcMain.handle('appelsOffres:list', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listAppelsOffres(uid, hotelId)));
  Electron.ipcMain.handle('appelsOffres:create', (e, input: CreateAppelOffresInput) =>
    wrapIpc(e, (uid) => svc.createAppelOffres(uid, input)));
  Electron.ipcMain.handle('appelsOffres:publier', (e, id: number, dateLimiteDepot: string) =>
    wrapIpc(e, (uid) => svc.publierAppelOffres(uid, id, dateLimiteDepot)));
  Electron.ipcMain.handle('appelsOffres:annuler', (e, id: number, motif: string) =>
    wrapIpc(e, (uid) => svc.annulerAppelOffres(uid, id, motif)));

  Electron.ipcMain.handle('appelsOffres:listLots', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listLots(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:createLot', (e, input: CreateLotInput) =>
    wrapIpc(e, (uid) => svc.createLot(uid, input)));
  Electron.ipcMain.handle('appelsOffres:deleteLot', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteLot(uid, id)));

  Electron.ipcMain.handle('appelsOffres:listDocuments', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listDocuments(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:uploadDocument', (e, input: UploadDocumentAoInput) =>
    wrapIpcAsync(e, (uid) => svc.uploadDocument(uid, input)));
  Electron.ipcMain.handle('appelsOffres:ouvrirDocument', (e, id: number) =>
    wrapIpc(e, (uid) => svc.ouvrirDocument(uid, id)));
  Electron.ipcMain.handle('appelsOffres:deleteDocument', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteDocument(uid, id)));

  Electron.ipcMain.handle('appelsOffres:listFournisseurs', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listFournisseursInvites(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:inviteFournisseurs', (e, appelOffresId: number, fournisseurIds: number[]) =>
    wrapIpc(e, (uid) => svc.inviteFournisseurs(uid, appelOffresId, fournisseurIds)));
  Electron.ipcMain.handle('appelsOffres:removeFournisseurInvite', (e, id: number) =>
    wrapIpc(e, (uid) => svc.removeFournisseurInvite(uid, id)));

  Electron.ipcMain.handle('appelsOffres:listCriteres', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listCriteres(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:createCritere', (e, input: CreateCritereInput) =>
    wrapIpc(e, (uid) => svc.createCritere(uid, input)));
  Electron.ipcMain.handle('appelsOffres:deleteCritere', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteCritere(uid, id)));
  Electron.ipcMain.handle('appelsOffres:saveNote', (e, input: NoteEvaluation) =>
    wrapIpc(e, (uid) => svc.saveNote(uid, input)));
  Electron.ipcMain.handle('appelsOffres:listNotes', (e, lotId: number) =>
    wrapIpc(e, (uid) => svc.listNotes(uid, lotId)));

  Electron.ipcMain.handle('appelsOffres:listOffres', (e, appelOffresId: number, lotId?: number) =>
    wrapIpc(e, (uid) => svc.listOffres(uid, appelOffresId, lotId)));
  Electron.ipcMain.handle('appelsOffres:createOffre', (e, input: CreateOffreAoInput) =>
    wrapIpc(e, (uid) => svc.createOffre(uid, input)));

  Electron.ipcMain.handle('appelsOffres:listCommission', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listCommission(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:listPv', (e, appelOffresId: number) =>
    wrapIpc(e, (uid) => svc.listPv(uid, appelOffresId)));
  Electron.ipcMain.handle('appelsOffres:ouvrirPlis', (e, input: OuvrirPlisInput) =>
    wrapIpc(e, (uid) => svc.ouvrirPlis(uid, input)));

  Electron.ipcMain.handle('appelsOffres:attribuerLot', (e, input: AttribuerLotInput) =>
    wrapIpc(e, (uid) => svc.attribuerLot(uid, input)));
  Electron.ipcMain.handle('appelsOffres:marquerLotInfructueux', (e, lotId: number) =>
    wrapIpc(e, (uid) => svc.marquerLotInfructueux(uid, lotId)));
}
