import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as pos from '../services/pos.service';
import * as posCloture from '../services/pos-cloture.service';
import * as kds from '../services/pos-kds.service';
import type {
  CreatePointVenteInput,
  CreateFactionInput,
  OpenSessionInput,
  CreateTicketInput,
  AddTicketLigneInput,
  ValiderTicketInput,
  CloturerSessionInput,
  CloturerJourneeInput,
} from '../../src/shared/types/pos';

export function registerPosIpc(): void {
  Electron.ipcMain.handle('pos:points:list', (event, hotelId: number) =>
    wrapIpc(event, () => pos.listPointsVente(hotelId)));
  Electron.ipcMain.handle('pos:points:create', (event, input: CreatePointVenteInput) =>
    wrapIpc(event, (uid) => pos.createPointVente(uid, input)));
  Electron.ipcMain.handle('pos:factions:list', (event, pointVenteId: number) =>
    wrapIpc(event, () => pos.listFactions(pointVenteId)));
  Electron.ipcMain.handle('pos:factions:create', (event, input: CreateFactionInput) =>
    wrapIpc(event, (uid) => pos.createFaction(uid, input)));
  Electron.ipcMain.handle('pos:sessions:list', (event, pointVenteId: number, dateService?: string) =>
    wrapIpc(event, () => pos.listSessions(pointVenteId, dateService)));
  Electron.ipcMain.handle('pos:sessions:open', (event, input: OpenSessionInput) =>
    wrapIpc(event, (uid) => pos.openSession(uid, input)));
  Electron.ipcMain.handle('pos:sessions:rapport', (event, sessionId: number) =>
    wrapIpc(event, () => posCloture.getRapportSession(sessionId)));
  Electron.ipcMain.handle('pos:sessions:cloturer', (event, input: CloturerSessionInput) =>
    wrapIpc(event, (uid) => posCloture.cloturerSessionFaction(uid, input)));
  Electron.ipcMain.handle('pos:tickets:list', (event, sessionId: number) =>
    wrapIpc(event, () => pos.listTickets(sessionId)));
  Electron.ipcMain.handle('pos:tickets:create', (event, input: CreateTicketInput) =>
    wrapIpc(event, (uid) => pos.createTicket(uid, input)));
  Electron.ipcMain.handle('pos:tickets:addLigne', (event, input: AddTicketLigneInput) =>
    wrapIpc(event, (uid) => pos.addTicketLigne(uid, input)));
  Electron.ipcMain.handle('pos:tickets:removeLigne', (event, ligneId: number) =>
    wrapIpc(event, (uid) => pos.removeTicketLigne(uid, ligneId)));
  Electron.ipcMain.handle('pos:tickets:valider', (event, input: ValiderTicketInput) =>
    wrapIpc(event, (uid) => pos.validerTicket(uid, input)));
  Electron.ipcMain.handle('pos:tickets:annuler', (event, ticketId: number) =>
    wrapIpc(event, (uid) => pos.annulerTicket(uid, ticketId)));
  Electron.ipcMain.handle('pos:clotures:list', (event, pointVenteId: number) =>
    wrapIpc(event, () => posCloture.listCloturesJournalieres(pointVenteId)));
  Electron.ipcMain.handle('pos:clotures:journee', (event, input: CloturerJourneeInput) =>
    wrapIpc(event, (uid) => posCloture.cloturerJourneePos(uid, input)));
  Electron.ipcMain.handle('pos:hotelClosureStatus', (event, hotelId: number, dateJournal: string) =>
    wrapIpc(event, () => posCloture.getPosClosureStatusForHotel(hotelId, dateJournal)));
  Electron.ipcMain.handle('pos:kds:list', (event, pointVenteId: number) => wrapIpc(event, () => kds.listKds(pointVenteId)));
  Electron.ipcMain.handle('pos:kds:update', (event, id: number, statut: string) => wrapIpc(event, uid => kds.updateKds(uid,id,statut)));
  Electron.ipcMain.handle('pos:devices:list', (event, pointVenteId: number) => wrapIpc(event, () => kds.listPeripheriques(pointVenteId)));
  Electron.ipcMain.handle('pos:devices:save', (event, input: {pointVenteId:number;type:string;nom:string;connexion:string;adresse?:string;actif:boolean}) => wrapIpc(event, uid => kds.savePeripherique(uid,input)));
}
