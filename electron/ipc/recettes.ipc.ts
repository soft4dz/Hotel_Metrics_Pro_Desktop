import Electron from '../lib/electronApi';
import * as recettesService from '../services/recettes.service';
import { wrapIpc } from './ipcHelpers';
import {
  assertPositiveInteger,
  assertAmount,
  assertDateJournal,
  assertText,
  assertMonth,
  assertYear,
  assertObject,
  assertArray,
} from './validation';

export function registerRecettesIpc(): void {
  // Lecture seule — pas de validation nécessaire sur les handlers sans payload
  Electron.ipcMain.handle('recettes:rubriques', (event) =>
    wrapIpc(event, (actorUserId) => recettesService.listRubriquesActives(actorUserId)),
  );

  Electron.ipcMain.handle(
    'recettes:getSaisie',
    (event, hotelId: unknown, dateJournal: unknown) =>
      wrapIpc(event, (actorUserId) =>
        recettesService.getSaisieJournaliere(
          actorUserId,
          assertPositiveInteger(hotelId, 'hotelId'),
          assertDateJournal(dateJournal, 'dateJournal'),
        ),
      ),
  );

  Electron.ipcMain.handle(
    'recettes:saveSaisie',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.hotelId, 'hotelId');
        assertDateJournal(o.dateJournal, 'dateJournal');
        assertArray(o.lignes, 'lignes', 1);
        return recettesService.saveSaisieJournaliere(actorUserId, input as recettesService.SaveSaisieInput);
      }),
  );

  Electron.ipcMain.handle(
    'recettes:historique',
    (event, filters: recettesService.HistoriqueFilters) =>
      wrapIpc(event, (actorUserId) => recettesService.listHistorique(actorUserId, filters)),
  );

  Electron.ipcMain.handle(
    'recettes:historiqueGrouped',
    (event, filters: recettesService.HistoriqueFilters) =>
      wrapIpc(event, (actorUserId) => recettesService.listHistoriqueGrouped(actorUserId, filters)),
  );

  Electron.ipcMain.handle(
    'recettes:updateLigne',
    (event, id: unknown, montant: unknown, observation: unknown, motif: unknown) =>
      wrapIpc(event, (actorUserId) => {
        recettesService.updateRecetteLigne(
          actorUserId,
          assertPositiveInteger(id, 'id'),
          assertAmount(montant, 'montant'),
          observation !== null && observation !== undefined
            ? assertText(observation, 'observation', { maxLength: 1000 })
            : null,
          assertText(motif, 'motif', { required: true, maxLength: 500 }),
        );
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'recettes:deleteLigne',
    (event, id: unknown, motif: unknown) =>
      wrapIpc(event, (actorUserId) => {
        recettesService.deleteRecetteLigne(
          actorUserId,
          assertPositiveInteger(id, 'id'),
          assertText(motif, 'motif', { required: true, maxLength: 500 }),
        );
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'recettes:deleteJournee',
    (event, hotelId: unknown, dateJournal: unknown, motif: unknown) =>
      wrapIpc(event, (actorUserId) =>
        recettesService.deleteJourneeRecettes(
          actorUserId,
          assertPositiveInteger(hotelId, 'hotelId'),
          assertDateJournal(dateJournal, 'dateJournal'),
          assertText(motif, 'motif', { required: true, maxLength: 500 }),
        ),
      ),
  );

  Electron.ipcMain.handle(
    'recettes:listAValider',
    (event, hotelId?: unknown) =>
      wrapIpc(event, (actorUserId) =>
        recettesService.listJoursAValider(
          actorUserId,
          hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
        ),
      ),
  );

  Electron.ipcMain.handle(
    'recettes:validerJour',
    (event, hotelId: unknown, dateJournal: unknown, motif?: unknown) =>
      wrapIpc(event, (actorUserId) => {
        recettesService.validerJour(
          actorUserId,
          assertPositiveInteger(hotelId, 'hotelId'),
          assertDateJournal(dateJournal, 'dateJournal'),
          motif !== undefined ? assertText(motif, 'motif', { maxLength: 500 }) : undefined,
        );
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'recettes:refuserJour',
    (event, hotelId: unknown, dateJournal: unknown, motif: unknown) =>
      wrapIpc(event, (actorUserId) => {
        recettesService.refuserJour(
          actorUserId,
          assertPositiveInteger(hotelId, 'hotelId'),
          assertDateJournal(dateJournal, 'dateJournal'),
          assertText(motif, 'motif', { required: true, maxLength: 500 }),
        );
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'recettes:getMensuelle',
    (event, hotelId: unknown, annee: unknown, mois: unknown) =>
      wrapIpc(event, (actorUserId) =>
        recettesService.getRecetteMensuelle(
          actorUserId,
          assertPositiveInteger(hotelId, 'hotelId'),
          assertYear(annee, 'annee'),
          assertMonth(mois, 'mois'),
        ),
      ),
  );

  Electron.ipcMain.handle(
    'recettes:saveMensuelle',
    (event, hotelId: unknown, annee: unknown, mois: unknown, payload: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const validHotelId = assertPositiveInteger(hotelId, 'hotelId');
        const validAnnee = assertYear(annee, 'annee');
        const validMois = assertMonth(mois, 'mois');
        const o = assertObject<Record<string, unknown>>(payload, 'payload');
        const lignes = assertArray<{ rubriqueId: number; montantMensuel: number; justification?: string }>(
          o.lignes,
          'lignes',
        );
        return recettesService.saveRecetteMensuelle(
          actorUserId,
          validHotelId,
          validAnnee,
          validMois,
          lignes,
          o.justificationEcart
            ? assertText(o.justificationEcart, 'justificationEcart', { maxLength: 2000 })
            : undefined,
          typeof o.verrouiller === 'boolean' ? o.verrouiller : undefined,
        );
      }),
  );
}
