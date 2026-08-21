import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as pos from '../services/pos.service';
import * as posCloture from '../services/pos-cloture.service';
import * as kds from '../services/pos-kds.service';
import * as restaurant from '../services/pos-restaurant-advanced.service';
import { assertAmount, assertArray, assertEnum, assertObject, assertPositiveInteger, assertText } from './validation';
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
  Electron.ipcMain.handle('pos:salles:list',(event,pointVenteId:unknown)=>wrapIpc(event,uid=>restaurant.listSalles(uid,assertPositiveInteger(pointVenteId,'pointVenteId'))));
  Electron.ipcMain.handle('pos:salles:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return restaurant.createSalle(uid,{pointVenteId:assertPositiveInteger(o.pointVenteId,'pointVenteId'),nom:assertText(o.nom,'nom',{required:true,maxLength:100}),largeur:o.largeur===undefined?undefined:assertPositiveInteger(o.largeur,'largeur'),hauteur:o.hauteur===undefined?undefined:assertPositiveInteger(o.hauteur,'hauteur')});}));
  Electron.ipcMain.handle('pos:tables:list',(event,salleId:unknown)=>wrapIpc(event,uid=>restaurant.listTables(uid,assertPositiveInteger(salleId,'salleId'))));
  Electron.ipcMain.handle('pos:tables:save',(event,input:unknown,tableId?:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return restaurant.saveTable(uid,{salleId:assertPositiveInteger(o.salleId,'salleId'),numero:assertText(o.numero,'numero',{required:true,maxLength:20}),capacite:o.capacite===undefined?undefined:assertPositiveInteger(o.capacite,'capacite'),forme:o.forme===undefined?undefined:assertEnum(o.forme,'forme',['carree','ronde','rectangle'] as const),positionX:o.positionX===undefined?undefined:assertPositiveInteger(o.positionX,'positionX',{allowZero:true}),positionY:o.positionY===undefined?undefined:assertPositiveInteger(o.positionY,'positionY',{allowZero:true}),largeur:o.largeur===undefined?undefined:assertPositiveInteger(o.largeur,'largeur'),hauteur:o.hauteur===undefined?undefined:assertPositiveInteger(o.hauteur,'hauteur'),statut:o.statut===undefined?undefined:assertEnum(o.statut,'statut',['libre','reservee','occupee','a_nettoyer','hors_service'] as const)},tableId===undefined?undefined:assertPositiveInteger(tableId,'tableId'));}));
  Electron.ipcMain.handle('pos:tables:status',(event,tableId:unknown,statut:unknown)=>wrapIpc(event,uid=>restaurant.updateTableStatus(uid,assertPositiveInteger(tableId,'tableId'),assertEnum(statut,'statut',['libre','reservee','occupee','a_nettoyer','hors_service'] as const))));
  Electron.ipcMain.handle('pos:tickets:assignTable',(event,ticketId:unknown,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return restaurant.assignTicketTable(uid,assertPositiveInteger(ticketId,'ticketId'),assertPositiveInteger(o.tableId,'tableId'),assertPositiveInteger(o.nbCouverts,'nbCouverts'));}));
  Electron.ipcMain.handle('pos:tickets:serviceStage',(event,ticketId:unknown,etape:unknown)=>wrapIpc(event,uid=>restaurant.updateServiceStage(uid,assertPositiveInteger(ticketId,'ticketId'),assertEnum(etape,'etape',['commande','envoyee','preparation','prete','servie','addition','terminee'] as const))));
  Electron.ipcMain.handle('pos:tickets:split',(event,ticketId:unknown,lineIds:unknown)=>wrapIpc(event,uid=>restaurant.splitTicket(uid,assertPositiveInteger(ticketId,'ticketId'),assertArray<unknown>(lineIds,'lineIds',1).map((v,i)=>assertPositiveInteger(v,`lineIds[${i}]`)))));
  Electron.ipcMain.handle('pos:tickets:discount',(event,ticketId:unknown,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return restaurant.applyDiscount(uid,assertPositiveInteger(ticketId,'ticketId'),{type:assertEnum(o.type,'type',['pourcentage','montant'] as const),valeur:assertAmount(o.valeur,'valeur'),motif:assertText(o.motif,'motif',{required:true,maxLength:500})});}));
  Electron.ipcMain.handle('pos:tickets:refund',(event,ticketId:unknown,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return restaurant.refundTicket(uid,assertPositiveInteger(ticketId,'ticketId'),{montant:assertAmount(o.montant,'montant'),mode:assertEnum(o.mode,'mode',['especes','carte','cheque','virement','autre','folio'] as const),motif:assertText(o.motif,'motif',{required:true,maxLength:500}),reference:o.reference?assertText(o.reference,'reference',{maxLength:100}):undefined,remettreEnStock:o.remettreEnStock===true});}));
}
