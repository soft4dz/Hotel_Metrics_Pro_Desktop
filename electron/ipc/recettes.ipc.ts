import Electron from '../lib/electronApi';

import * as recettesService from '../services/recettes.service';

import { wrapIpc } from './ipcHelpers';



export function registerRecettesIpc(): void {

  Electron.ipcMain.handle('recettes:rubriques', (event) =>

    wrapIpc(event, (actorUserId) => recettesService.listRubriquesActives(actorUserId)),

  );



  Electron.ipcMain.handle(

    'recettes:getSaisie',

    (event, hotelId: number, dateJournal: string) =>

      wrapIpc(event, (actorUserId) =>

        recettesService.getSaisieJournaliere(actorUserId, hotelId, dateJournal),

      ),

  );



  Electron.ipcMain.handle(

    'recettes:saveSaisie',

    (event, input: recettesService.SaveSaisieInput) =>

      wrapIpc(event, (actorUserId) => recettesService.saveSaisieJournaliere(actorUserId, input)),

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

    (event, id: number, montant: number, observation: string | null, motif: string) =>

      wrapIpc(event, (actorUserId) => {

        recettesService.updateRecetteLigne(actorUserId, id, montant, observation, motif);

        return true;

      }),

  );



  Electron.ipcMain.handle(

    'recettes:deleteLigne',

    (event, id: number, motif: string) =>

      wrapIpc(event, (actorUserId) => {

        recettesService.deleteRecetteLigne(actorUserId, id, motif);

        return true;

      }),

  );

  Electron.ipcMain.handle(

    'recettes:deleteJournee',

    (event, hotelId: number, dateJournal: string, motif: string) =>

      wrapIpc(event, (actorUserId) =>

        recettesService.deleteJourneeRecettes(actorUserId, hotelId, dateJournal, motif),

      ),

  );



  Electron.ipcMain.handle(

    'recettes:listAValider',

    (event, hotelId?: number) =>

      wrapIpc(event, (actorUserId) => recettesService.listJoursAValider(actorUserId, hotelId)),

  );



  Electron.ipcMain.handle(

    'recettes:validerJour',

    (event, hotelId: number, dateJournal: string, motif?: string) =>

      wrapIpc(event, (actorUserId) => {

        recettesService.validerJour(actorUserId, hotelId, dateJournal, motif);

        return true;

      }),

  );



  Electron.ipcMain.handle(

    'recettes:refuserJour',

    (event, hotelId: number, dateJournal: string, motif: string) =>

      wrapIpc(event, (actorUserId) => {

        recettesService.refuserJour(actorUserId, hotelId, dateJournal, motif);

        return true;

      }),

  );



  Electron.ipcMain.handle(

    'recettes:getMensuelle',

    (event, hotelId: number, annee: number, mois: number) =>

      wrapIpc(event, (actorUserId) =>

        recettesService.getRecetteMensuelle(actorUserId, hotelId, annee, mois),

      ),

  );



  Electron.ipcMain.handle(

    'recettes:saveMensuelle',

    (

      event,

      hotelId: number,

      annee: number,

      mois: number,

      payload: {

        lignes: Array<{ rubriqueId: number; montantMensuel: number; justification?: string }>;

        justificationEcart?: string;

        verrouiller?: boolean;

      },

    ) =>

      wrapIpc(event, (actorUserId) =>

        recettesService.saveRecetteMensuelle(

          actorUserId,

          hotelId,

          annee,

          mois,

          payload.lignes,

          payload.justificationEcart,

          payload.verrouiller,

        ),

      ),

  );

}


