import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/comptabilite.service';
import {
  assertObject,
  assertPositiveInteger,
  assertDateJournal,
  assertText,
  assertArray,
  assertAmount,
} from './validation';

export function registerComptabiliteIpc(): void {
  Electron.ipcMain.handle('comptabilite:comptes:list', (event, classe?: number) =>
    wrapIpc(event, (uid) => svc.listComptes(uid, classe)));

  Electron.ipcMain.handle('comptabilite:journaux:list', (event) =>
    wrapIpc(event, (uid) => svc.listJournaux(uid)));

  Electron.ipcMain.handle('comptabilite:exercices:list', (event) =>
    wrapIpc(event, (uid) => svc.listExercices(uid)));

  Electron.ipcMain.handle('comptabilite:exercices:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createExercice(uid, {
        code: assertText(o.code, 'code', { required: true, maxLength: 20 }),
        libelle: assertText(o.libelle, 'libelle', { required: true, maxLength: 200 }),
        dateDebut: assertDateJournal(o.dateDebut, 'dateDebut'),
        dateFin: assertDateJournal(o.dateFin, 'dateFin'),
      });
    }));

  Electron.ipcMain.handle('comptabilite:exercices:cloturer', (event, exerciceId: number) =>
    wrapIpc(event, (uid) => svc.cloturerExercice(uid, assertPositiveInteger(exerciceId, 'exerciceId'))));

  Electron.ipcMain.handle('comptabilite:ecritures:list', (event, filters: svc.EcritureFilters) =>
    wrapIpc(event, (uid) => svc.listEcritures(uid, filters ?? {})));

  Electron.ipcMain.handle('comptabilite:ecritures:get', (event, id: number) =>
    wrapIpc(event, (uid) => svc.getEcritureDetail(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('comptabilite:ecritures:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      const lignesRaw = assertArray(o.lignes, 'lignes', 2);
      const lignes = lignesRaw.map((l, i) => {
        const line = assertObject<Record<string, unknown>>(l, `lignes[${i}]`);
        return {
          compteNumero: assertText(line.compteNumero, `lignes[${i}].compteNumero`, { required: true, maxLength: 20 }),
          libelle: line.libelle ? assertText(line.libelle, `lignes[${i}].libelle`, { maxLength: 200 }) : undefined,
          debit: line.debit !== undefined ? assertAmount(line.debit, `lignes[${i}].debit`) : undefined,
          credit: line.credit !== undefined ? assertAmount(line.credit, `lignes[${i}].credit`) : undefined,
          hotelId: line.hotelId !== undefined ? assertPositiveInteger(line.hotelId, `lignes[${i}].hotelId`) : undefined,
        };
      });
      return svc.creerEcriture(uid, {
        journalCode: assertText(o.journalCode, 'journalCode', { required: true, maxLength: 10 }),
        dateEcriture: assertDateJournal(o.dateEcriture, 'dateEcriture'),
        libelle: assertText(o.libelle, 'libelle', { required: true, maxLength: 500 }),
        piece: o.piece ? assertText(o.piece, 'piece', { maxLength: 50 }) : undefined,
        hotelId: o.hotelId !== undefined ? assertPositiveInteger(o.hotelId, 'hotelId') : undefined,
        lignes,
        sourceModule: o.sourceModule ? assertText(o.sourceModule, 'sourceModule', { maxLength: 50 }) : undefined,
        sourceRef: o.sourceRef ? assertText(o.sourceRef, 'sourceRef', { maxLength: 100 }) : undefined,
      });
    }));

  Electron.ipcMain.handle('comptabilite:ecritures:valider', (event, id: number) =>
    wrapIpc(event, (uid) => svc.validerEcriture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('comptabilite:grandLivre', (event, compteNumero: string, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => svc.getGrandLivre(uid, compteNumero, dateDebut, dateFin)));

  Electron.ipcMain.handle('comptabilite:balance', (event, exerciceId?: number, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => svc.getBalanceGenerale(uid, exerciceId, dateDebut, dateFin)));

  Electron.ipcMain.handle('comptabilite:lettrage:lignes', (event, compteNumero: unknown) =>
    wrapIpc(event, (uid) => svc.listLignesLettrables(uid, assertText(compteNumero, 'compteNumero', { required: true, maxLength: 20 }))));
  Electron.ipcMain.handle('comptabilite:lettrage:list', (event) =>
    wrapIpc(event, (uid) => svc.listLettrages(uid)));
  Electron.ipcMain.handle('comptabilite:lettrage:create', (event, ligneIds: unknown) =>
    wrapIpc(event, (uid) => svc.creerLettrage(uid, assertArray(ligneIds, 'ligneIds', 2).map((id, i) => assertPositiveInteger(id, `ligneIds[${i}]`)))));
  Electron.ipcMain.handle('comptabilite:lettrage:cancel', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.annulerLettrage(uid, assertPositiveInteger(id, 'id'))));
}
