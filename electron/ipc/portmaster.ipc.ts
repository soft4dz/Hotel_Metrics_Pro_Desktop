import Electron from '../lib/electronApi';
import * as portService from '../services/portmaster.service';
import * as portClients from '../services/portmaster-clients.service';
import * as portReferentiel from '../services/portmaster-referentiel.service';
import * as portAlertes from '../services/portmaster-alertes.service';
import * as portTarifs from '../services/portmaster-tarifs.service';
import * as portFactures from '../services/portmaster-factures.service';
import * as portValidations from '../services/portmaster-validations.service';
import * as portMouvements from '../services/portmaster-mouvements.service';
import * as portRecouvrement from '../services/portmaster-recouvrement.service';
import { wrapIpc } from './ipcHelpers';

export function registerPortmasterIpc(): void {
  Electron.ipcMain.handle('portmaster:dashboard', (event) =>
    wrapIpc(event, (actorUserId) => portService.getPortDashboard(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:list', (event, search?: string) =>
    wrapIpc(event, (actorUserId) => portService.listBateaux(actorUserId, search)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => portService.getBateau(actorUserId, id)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:create', (event, input: portService.SaveBateauInput) =>
    wrapIpc(event, (actorUserId) => portService.createBateau(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'portmaster:bateaux:update',
    (event, id: number, input: portService.SaveBateauInput) =>
      wrapIpc(event, (actorUserId) => portService.updateBateau(actorUserId, id, input)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:deactivate', (event, id: number) =>
    wrapIpc(event, (actorUserId) => {
      portService.deactivateBateau(actorUserId, id);
      return true;
    }),
  );

  Electron.ipcMain.handle('portmaster:emplacements:list', (event) =>
    wrapIpc(event, (actorUserId) => portService.listEmplacements(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:emplacements:libres', (event) =>
    wrapIpc(event, (actorUserId) => portService.listEmplacementsLibres(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:contrats:list', (event, statut?: string) =>
    wrapIpc(event, (actorUserId) => portService.listContrats(actorUserId, statut)),
  );

  Electron.ipcMain.handle('portmaster:contrats:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => portService.getContrat(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'portmaster:contrats:save',
    (event, input: portService.SaveContratInput, id?: number) =>
      wrapIpc(event, (actorUserId) => portService.saveContrat(actorUserId, input, id)),
  );

  Electron.ipcMain.handle('portmaster:contrats:submit', (event, id: number) =>
    wrapIpc(event, (actorUserId) => {
      portService.submitContratForValidation(actorUserId, id);
      return true;
    }),
  );

  Electron.ipcMain.handle(
    'portmaster:encaissements:add',
    (event, input: portService.AddEncaissementInput) =>
      wrapIpc(event, (actorUserId) => portService.addEncaissement(actorUserId, input)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:options', (event) =>
    wrapIpc(event, (actorUserId) => portService.listBateauxOptions(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:clients:list', (event, search?: string) =>
    wrapIpc(event, (actorUserId) => portClients.listClients(actorUserId, search)),
  );

  Electron.ipcMain.handle('portmaster:clients:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => portClients.getClient(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'portmaster:clients:save',
    (event, input: portClients.SaveClientInput, id?: number) =>
      wrapIpc(event, (actorUserId) => portClients.saveClient(actorUserId, input, id)),
  );

  Electron.ipcMain.handle('portmaster:clients:options', (event) =>
    wrapIpc(event, (actorUserId) => portClients.listClientsOptions(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:referentiel:bassins', (event) =>
    wrapIpc(event, (actorUserId) => portReferentiel.listBassins(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:referentiel:quais',
    (event, bassinId?: number) =>
      wrapIpc(event, (actorUserId) => portReferentiel.listQuais(actorUserId, bassinId)),
  );

  Electron.ipcMain.handle(
    'portmaster:referentiel:emplacements',
    (event, filters?: Parameters<typeof portReferentiel.listEmplacementsDetail>[1]) =>
      wrapIpc(event, (actorUserId) => portReferentiel.listEmplacementsDetail(actorUserId, filters)),
  );

  Electron.ipcMain.handle(
    'portmaster:referentiel:search',
    (event, query: string) =>
      wrapIpc(event, (actorUserId) => portReferentiel.searchReferentiel(actorUserId, query)),
  );

  Electron.ipcMain.handle('portmaster:alertes:list', (event) =>
    wrapIpc(event, (actorUserId) => portAlertes.listAlertes(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:tarifs:list', (event) =>
    wrapIpc(event, (actorUserId) => portTarifs.listTarifs(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:tarifs:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => portTarifs.getTarif(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'portmaster:tarifs:save',
    (event, input: portTarifs.SaveTarifInput, id?: number) =>
      wrapIpc(event, (actorUserId) => portTarifs.saveTarif(actorUserId, input, id)),
  );

  Electron.ipcMain.handle(
    'portmaster:tarifs:simuler',
    (event, tarifId: number, longueurM: number) =>
      wrapIpc(event, (actorUserId) => portTarifs.simulerTarif(actorUserId, tarifId, longueurM)),
  );

  Electron.ipcMain.handle('portmaster:factures:list', (event, statut?: string) =>
    wrapIpc(event, (actorUserId) => portFactures.listFactures(actorUserId, statut)),
  );

  Electron.ipcMain.handle('portmaster:factures:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => portFactures.getFacture(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:create',
    (event, input: portFactures.CreateFactureInput) =>
      wrapIpc(event, (actorUserId) => portFactures.createFacture(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:fromContrat',
    (event, contratId: number, tarifId?: number) =>
      wrapIpc(event, (actorUserId) => portFactures.createFactureFromContrat(actorUserId, contratId, tarifId)),
  );

  Electron.ipcMain.handle('portmaster:factures:submit', (event, id: number) =>
    wrapIpc(event, (actorUserId) => {
      portFactures.submitFacture(actorUserId, id);
      return true;
    }),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:addPaiement',
    (event, input: portFactures.AddPaiementFactureInput) =>
      wrapIpc(event, (actorUserId) => portFactures.addPaiementFacture(actorUserId, input)),
  );

  Electron.ipcMain.handle('portmaster:validations:list', (event) =>
    wrapIpc(event, (actorUserId) => portValidations.listValidationsEnAttente(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:validations:valider',
    (event, entityType: string, entityId: number, motif?: string) =>
      wrapIpc(event, (actorUserId) => {
        portValidations.validerEntite(actorUserId, entityType, entityId, motif);
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'portmaster:validations:rejeter',
    (event, entityType: string, entityId: number, motif: string) =>
      wrapIpc(event, (actorUserId) => {
        portValidations.rejeterEntite(actorUserId, entityType, entityId, motif);
        return true;
      }),
  );

  Electron.ipcMain.handle('portmaster:mouvements:list', (event) =>
    wrapIpc(event, (actorUserId) => portMouvements.listMouvements(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:mouvements:create',
    (event, input: portMouvements.SaveMouvementInput) =>
      wrapIpc(event, (actorUserId) => portMouvements.createMouvement(actorUserId, input)),
  );

  Electron.ipcMain.handle('portmaster:recouvrement:summary', (event) =>
    wrapIpc(event, (actorUserId) => portRecouvrement.getRecouvrementSummary(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:recouvrement:creances', (event) =>
    wrapIpc(event, (actorUserId) => portRecouvrement.listCreances(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:recouvrement:relances', (event) =>
    wrapIpc(event, (actorUserId) => portRecouvrement.listRelances(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:recouvrement:relanceCreate',
    (event, input: portRecouvrement.CreateRelanceInput) =>
      wrapIpc(event, (actorUserId) => portRecouvrement.createRelance(actorUserId, input)),
  );

  Electron.ipcMain.handle('portmaster:recouvrement:relanceEnvoyee', (event, id: number) =>
    wrapIpc(event, (actorUserId) => {
      portRecouvrement.marquerRelanceEnvoyee(actorUserId, id);
      return true;
    }),
  );
}
