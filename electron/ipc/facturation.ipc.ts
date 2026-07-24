import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as svc from '../services/facturation.service';
import * as pdfSvc from '../services/facturation-pdf.service';
import {
  assertAmount,
  assertDateJournal,
  assertObject,
  assertPositiveInteger,
  assertText,
  assertArray,
  assertEnum,
} from './validation';

const MODES_PAIEMENT = ['especes', 'cheque', 'virement', 'carte', 'effet', 'autre'] as const;
const TYPES_CLIENT = ['particulier', 'entreprise'] as const;

function parseCreateFactureInput(input: unknown): svc.CreateFactureInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  assertArray(o.lignes, 'lignes', 1);
  return {
    hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
    clientId: o.clientId !== undefined ? assertPositiveInteger(o.clientId, 'clientId') : undefined,
    clientNom: o.clientNom ? assertText(o.clientNom, 'clientNom', { maxLength: 200 }) : undefined,
    dateEmission: o.dateEmission ? assertDateJournal(o.dateEmission, 'dateEmission') : undefined,
    dateEcheance: o.dateEcheance ? assertDateJournal(o.dateEcheance, 'dateEcheance') : undefined,
    notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined,
    lignes: o.lignes as svc.CreateFactureInput['lignes'],
  };
}

function parseAddPaiementInput(input: unknown): svc.AddPaiementInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    factureId: assertPositiveInteger(o.factureId, 'factureId'),
    datePaiement: assertDateJournal(o.datePaiement, 'datePaiement'),
    montant: assertAmount(o.montant, 'montant'),
    mode: assertEnum(o.mode, 'mode', MODES_PAIEMENT),
    reference: o.reference ? assertText(o.reference, 'reference', { maxLength: 100 }) : undefined,
    notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 500 }) : undefined,
  };
}

function parseCreateClientInput(input: unknown): svc.CreateClientInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    type: assertEnum(o.type, 'type', TYPES_CLIENT),
    nom: assertText(o.nom, 'nom', { required: true, maxLength: 200 }),
    raisonSociale: o.raisonSociale ? assertText(o.raisonSociale, 'raisonSociale', { maxLength: 200 }) : undefined,
    email: o.email ? assertText(o.email, 'email', { maxLength: 200 }) : undefined,
    telephone: o.telephone ? assertText(o.telephone, 'telephone', { maxLength: 50 }) : undefined,
    adresse: o.adresse ? assertText(o.adresse, 'adresse', { maxLength: 500 }) : undefined,
    nif: o.nif ? assertText(o.nif, 'nif', { maxLength: 30 }) : undefined,
    rc: o.rc ? assertText(o.rc, 'rc', { maxLength: 30 }) : undefined,
  };
}

function parseCreateAvoirInput(input: unknown): svc.CreateAvoirInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    factureOrigineId: assertPositiveInteger(o.factureOrigineId, 'factureOrigineId'),
    lignes: o.lignes !== undefined ? (assertArray(o.lignes, 'lignes') as svc.LigneInput[]) : undefined,
    notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined,
  };
}

function parseUpdateClientInput(input: unknown): Partial<svc.CreateClientInput> {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    type: o.type !== undefined ? assertEnum(o.type, 'type', TYPES_CLIENT) : undefined,
    nom: o.nom !== undefined ? assertText(o.nom, 'nom', { required: true, maxLength: 200 }) : undefined,
    raisonSociale: o.raisonSociale !== undefined ? assertText(o.raisonSociale, 'raisonSociale', { maxLength: 200 }) : undefined,
    email: o.email !== undefined ? assertText(o.email, 'email', { maxLength: 200 }) : undefined,
    telephone: o.telephone !== undefined ? assertText(o.telephone, 'telephone', { maxLength: 50 }) : undefined,
    adresse: o.adresse !== undefined ? assertText(o.adresse, 'adresse', { maxLength: 500 }) : undefined,
    nif: o.nif !== undefined ? assertText(o.nif, 'nif', { maxLength: 30 }) : undefined,
    rc: o.rc !== undefined ? assertText(o.rc, 'rc', { maxLength: 30 }) : undefined,
  };
}

export function registerFacturationIpc(): void {
  Electron.ipcMain.handle('facturation:getDashboard', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => svc.getFacturationDashboard(uid, hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined)));

  Electron.ipcMain.handle('facturation:listFactures', (event, filters: svc.FactureFilters) =>
    wrapIpc(event, (uid) => svc.listFactures(uid, filters)));

  Electron.ipcMain.handle('facturation:getFacture', (event, id: number) =>
    wrapIpc(event, (uid) => svc.getFactureDetail(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:createFacture', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createFacture(uid, parseCreateFactureInput(input))));

  Electron.ipcMain.handle('facturation:updateFacture', (event, id: number, input: unknown) =>
    wrapIpc(event, (uid) => svc.updateFacture(uid, assertPositiveInteger(id, 'id'), assertObject(input, 'input'))));

  Electron.ipcMain.handle('facturation:soumettre', (event, id: number) =>
    wrapIpc(event, (uid) => svc.soumettreFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:valider', (event, id: number) =>
    wrapIpc(event, (uid) => svc.validerFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:annuler', (event, id: number) =>
    wrapIpc(event, (uid) => svc.annulerFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:deleteFacture', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:addPaiement', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.addPaiement(uid, parseAddPaiementInput(input))));

  Electron.ipcMain.handle('facturation:deletePaiement', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deletePaiement(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:listClients', (event, search?: string) =>
    wrapIpc(event, (uid) => svc.listClients(uid, search ? assertText(search, 'search', { maxLength: 100 }) : undefined)));

  Electron.ipcMain.handle('facturation:createClient', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createClient(uid, parseCreateClientInput(input))));

  Electron.ipcMain.handle('facturation:updateClient', (event, id: number, input: unknown) =>
    wrapIpc(event, (uid) => svc.updateClient(uid, assertPositiveInteger(id, 'id'), parseUpdateClientInput(input))));

  Electron.ipcMain.handle('facturation:deleteClient', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteClient(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:exportPdf', (event, factureId: number) =>
    wrapIpcAsync(event, (uid) => pdfSvc.exportFacturationPdf(uid, assertPositiveInteger(factureId, 'factureId'))));

  Electron.ipcMain.handle('facturation:createAvoir', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createAvoir(uid, parseCreateAvoirInput(input))));

  Electron.ipcMain.handle('facturation:registre:list', (event, filters: svc.FactureFilters) =>
    wrapIpc(event, (uid) => svc.listRegistreFactures(uid, filters)));

  Electron.ipcMain.handle('facturation:registre:exportCsv', (event, filters: svc.FactureFilters) =>
    wrapIpc(event, (uid) => svc.exportRegistreFacturesCsv(uid, filters)));
}
