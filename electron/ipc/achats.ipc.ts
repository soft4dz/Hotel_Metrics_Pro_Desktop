import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  assertObject,
  assertPositiveInteger,
  assertText,
  assertArray,
  assertAmount,
} from './validation';
import {
  listFournisseurs,
  createFournisseur,
  listBonsCommande,
  getBonLignes,
  createBon,
  validerBon,
  envoyerBon,
  livrerBon,
  type CreateFournisseurInput,
  type CreateBonInput,
} from '../services/achats.service';

function parseCreateFournisseur(input: unknown): CreateFournisseurInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    code: assertText(o.code, 'code', { required: true, maxLength: 30 }),
    raisonSociale: assertText(o.raisonSociale, 'raisonSociale', { required: true, maxLength: 200 }),
    contactNom: o.contactNom ? assertText(o.contactNom, 'contactNom', { maxLength: 100 }) : undefined,
    email: o.email ? assertText(o.email, 'email', { maxLength: 200 }) : undefined,
    telephone: o.telephone ? assertText(o.telephone, 'telephone', { maxLength: 50 }) : undefined,
    adresse: o.adresse ? assertText(o.adresse, 'adresse', { maxLength: 500 }) : undefined,
    rc: o.rc ? assertText(o.rc, 'rc', { maxLength: 30 }) : undefined,
    nif: o.nif ? assertText(o.nif, 'nif', { maxLength: 30 }) : undefined,
    nis: o.nis ? assertText(o.nis, 'nis', { maxLength: 30 }) : undefined,
  };
}

function parseCreateBon(input: unknown): CreateBonInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  assertArray(o.lignes, 'lignes', 1);
  return {
    hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
    fournisseurId: assertPositiveInteger(o.fournisseurId, 'fournisseurId'),
    dateCommande: o.dateCommande ? assertText(o.dateCommande, 'dateCommande', { maxLength: 10 }) : undefined,
    dateLivraisonPrevue: o.dateLivraisonPrevue ? assertText(o.dateLivraisonPrevue, 'dateLivraisonPrevue', { maxLength: 10 }) : undefined,
    notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined,
    lignes: (o.lignes as CreateBonInput['lignes']),
  };
}

function parseLivrerBon(input: unknown) {
  if (input == null) return undefined;
  const o = assertObject<Record<string, unknown>>(input, 'input');
  if (o.lignes === undefined) return undefined;
  const lignesRaw = assertArray(o.lignes, 'lignes');
  return {
    lignes: lignesRaw.map((item, idx) => {
      const l = assertObject<Record<string, unknown>>(item, `lignes[${idx}]`);
      return {
        ligneId: assertPositiveInteger(l.ligneId, 'ligneId'),
        qteRecue: assertAmount(l.qteRecue, 'qteRecue'),
      };
    }),
  };
}

export function registerAchatsIpc(): void {
  Electron.ipcMain.handle('achats:listFournisseurs', (event) =>
    wrapIpc(event, () => listFournisseurs()));

  Electron.ipcMain.handle('achats:createFournisseur', (event, input: unknown) =>
    wrapIpc(event, () => createFournisseur(parseCreateFournisseur(input))));

  Electron.ipcMain.handle('achats:listBons', (event, hotelId?: number, statut?: string) =>
    wrapIpc(event, () => listBonsCommande(
      hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
      statut ? assertText(statut, 'statut', { maxLength: 30 }) : undefined,
    )));

  Electron.ipcMain.handle('achats:getBonLignes', (event, bonId: unknown) =>
    wrapIpc(event, () => getBonLignes(assertPositiveInteger(bonId, 'bonId'))));

  Electron.ipcMain.handle('achats:createBon', (event, input: unknown) =>
    wrapIpc(event, (uid) => createBon(uid, parseCreateBon(input))));

  Electron.ipcMain.handle('achats:validerBon', (event, id: unknown) =>
    wrapIpc(event, (uid) => validerBon(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('achats:envoyerBon', (event, id: unknown) =>
    wrapIpc(event, (uid) => envoyerBon(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('achats:livrerBon', (event, id: unknown, input?: unknown) =>
    wrapIpc(event, (uid) => livrerBon(uid, assertPositiveInteger(id, 'id'), parseLivrerBon(input))));
}
