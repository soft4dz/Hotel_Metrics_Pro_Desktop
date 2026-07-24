import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/fiscalite-avancee.service';
import {
  assertAmount,
  assertDateJournal,
  assertObject,
  assertPositiveInteger,
  assertText,
} from './validation';
import type { TeledeclarationType } from '../services/fiscalite-avancee.service';

const TYPE_DECL = new Set(['tva', 'liasse', 'retenue']);

function assertPeriode(value: unknown): string {
  const s = assertText(value, 'periode', { required: true, maxLength: 10 });
  if (!/^\d{4}-\d{2}$/.test(s) && !/^\d{4}$/.test(s)) throw new Error('periode: format YYYY-MM ou YYYY attendu');
  return s;
}

export function registerFiscaliteAvanceeIpc(): void {
  Electron.ipcMain.handle('fiscalite:achats:list', (event, periode?: string) =>
    wrapIpc(event, (uid) => svc.listRegistreTvaAchats(uid, periode)));

  Electron.ipcMain.handle('fiscalite:achats:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createRegistreTvaAchat(uid, {
        dateOperation: assertDateJournal(o.dateOperation, 'dateOperation'),
        numeroPiece: assertText(o.numeroPiece, 'numeroPiece', { required: true, maxLength: 50 }),
        fournisseurNom: assertText(o.fournisseurNom, 'fournisseurNom', { required: true, maxLength: 200 }),
        nifFournisseur: o.nifFournisseur ? assertText(o.nifFournisseur, 'nifFournisseur', { maxLength: 30 }) : undefined,
        baseHt: assertAmount(o.baseHt, 'baseHt'),
        tauxTva: o.tauxTva !== undefined ? assertAmount(o.tauxTva, 'tauxTva') : undefined,
        hotelId: o.hotelId !== undefined ? assertPositiveInteger(o.hotelId, 'hotelId') : undefined,
      });
    }));

  Electron.ipcMain.handle('fiscalite:achats:importBons', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.importTvaAchatsFromBons(uid, assertPeriode(periode))));

  Electron.ipcMain.handle('fiscalite:achats:exportCsv', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.exportRegistreTvaAchatsCsv(uid, assertPeriode(periode))));

  Electron.ipcMain.handle('fiscalite:liasse:genererAvancee', (event, exercice: number) =>
    wrapIpc(event, (uid) => svc.genererLiasseFiscaleAvancee(uid, assertPositiveInteger(exercice, 'exercice'))));

  Electron.ipcMain.handle('fiscalite:teledecl:exportTvaG50', (event, periode: string) =>
    wrapIpc(event, (uid) => svc.exportDeclarationTvaG50(uid, assertPeriode(periode))));

  Electron.ipcMain.handle('fiscalite:teledecl:list', (event, typeDecl?: string) =>
    wrapIpc(event, (uid) => {
      if (typeDecl && !TYPE_DECL.has(typeDecl)) throw new Error('typeDecl: valeur non autorisée');
      return svc.listTeledeclarations(uid, typeDecl as TeledeclarationType | undefined);
    }));

  Electron.ipcMain.handle('fiscalite:teledecl:marquerDeclaree', (event, id: number, referenceDgi: string) =>
    wrapIpc(event, (uid) => svc.marquerTeledeclarationDeclaree(
      uid,
      assertPositiveInteger(id, 'id'),
      assertText(referenceDgi, 'referenceDgi', { required: true, maxLength: 100 }),
    )));
}
