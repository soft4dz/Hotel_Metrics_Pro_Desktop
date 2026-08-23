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
import {
  assertPositiveInteger,
  assertText,
  assertObject,
  assertAmount,
  assertDateJournal,
  assertEnum,
} from './validation';
import type { DashboardFilters } from '../../src/shared/types/dashboard';

export function registerPortmasterIpc(): void {
  Electron.ipcMain.handle('portmaster:dashboard', (event, filters?: DashboardFilters) =>
    wrapIpc(event, (actorUserId) => portService.getPortDashboard(actorUserId, filters)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:list', (event, search?: string) =>
    wrapIpc(event, (actorUserId) => portService.listBateaux(actorUserId, search)),
  );

  Electron.ipcMain.handle('portmaster:bateaux:get', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => portService.getBateau(actorUserId, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle('portmaster:bateaux:create', (event, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      assertText(o.nom, 'nom', { required: true, maxLength: 200 });
      return portService.createBateau(actorUserId, input as portService.SaveBateauInput);
    }),
  );

  Electron.ipcMain.handle(
    'portmaster:bateaux:update',
    (event, id: unknown, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        assertObject(input, 'input');
        return portService.updateBateau(actorUserId, assertPositiveInteger(id, 'id'), input as portService.SaveBateauInput);
      }),
  );

  Electron.ipcMain.handle('portmaster:bateaux:deactivate', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => {
      portService.deactivateBateau(actorUserId, assertPositiveInteger(id, 'id'));
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

  Electron.ipcMain.handle('portmaster:contrats:get', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => portService.getContrat(actorUserId, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle(
    'portmaster:contrats:save',
    (event, input: unknown, id?: unknown) =>
      wrapIpc(event, (actorUserId) => {
        assertObject(input, 'input');
        return portService.saveContrat(
          actorUserId,
          input as portService.SaveContratInput,
          id !== undefined ? assertPositiveInteger(id, 'id') : undefined,
        );
      }),
  );

  Electron.ipcMain.handle('portmaster:contrats:submit', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => {
      portService.submitContratForValidation(actorUserId, assertPositiveInteger(id, 'id'));
      return true;
    }),
  );

  Electron.ipcMain.handle(
    'portmaster:encaissements:add',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.contratId, 'contratId');
        assertAmount(o.montant, 'montant');
        assertDateJournal(o.datePaiement, 'datePaiement');
        if (o.mode !== undefined) assertEnum(o.mode, 'mode', ['especes', 'cheque', 'virement', 'carte', 'autre'] as const);
        return portService.addEncaissement(actorUserId, input as portService.AddEncaissementInput);
      }),
  );

  Electron.ipcMain.handle('portmaster:bateaux:options', (event) =>
    wrapIpc(event, (actorUserId) => portService.listBateauxOptions(actorUserId)),
  );

  Electron.ipcMain.handle('portmaster:clients:list', (event, search?: string) =>
    wrapIpc(event, (actorUserId) => portClients.listClients(actorUserId, search)),
  );

  Electron.ipcMain.handle('portmaster:clients:get', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => portClients.getClient(actorUserId, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle(
    'portmaster:clients:save',
    (event, input: unknown, id?: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertText(o.nom, 'nom', { required: true, maxLength: 200 });
        return portClients.saveClient(
          actorUserId,
          input as portClients.SaveClientInput,
          id !== undefined ? assertPositiveInteger(id, 'id') : undefined,
        );
      }),
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

  Electron.ipcMain.handle('portmaster:tarifs:get', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => portTarifs.getTarif(actorUserId, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle(
    'portmaster:tarifs:save',
    (event, input: unknown, id?: unknown) =>
      wrapIpc(event, (actorUserId) => {
        assertObject(input, 'input');
        return portTarifs.saveTarif(
          actorUserId,
          input as portTarifs.SaveTarifInput,
          id !== undefined ? assertPositiveInteger(id, 'id') : undefined,
        );
      }),
  );

  Electron.ipcMain.handle(
    'portmaster:tarifs:simuler',
    (event, tarifId: unknown, longueurM: unknown) =>
      wrapIpc(event, (actorUserId) =>
        portTarifs.simulerTarif(
          actorUserId,
          assertPositiveInteger(tarifId, 'tarifId'),
          assertAmount(longueurM, 'longueurM'),
        ),
      ),
  );

  Electron.ipcMain.handle('portmaster:factures:list', (event, statut?: string) =>
    wrapIpc(event, (actorUserId) => portFactures.listFactures(actorUserId, statut)),
  );

  Electron.ipcMain.handle('portmaster:factures:get', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => portFactures.getFacture(actorUserId, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:create',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.contratId, 'contratId');
        return portFactures.createFacture(actorUserId, input as portFactures.CreateFactureInput);
      }),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:fromContrat',
    (event, contratId: unknown, tarifId?: unknown) =>
      wrapIpc(event, (actorUserId) =>
        portFactures.createFactureFromContrat(
          actorUserId,
          assertPositiveInteger(contratId, 'contratId'),
          tarifId !== undefined ? assertPositiveInteger(tarifId, 'tarifId') : undefined,
        ),
      ),
  );

  Electron.ipcMain.handle('portmaster:factures:submit', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => {
      portFactures.submitFacture(actorUserId, assertPositiveInteger(id, 'id'));
      return true;
    }),
  );

  Electron.ipcMain.handle(
    'portmaster:factures:addPaiement',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.factureId, 'factureId');
        assertAmount(o.montant, 'montant');
        assertDateJournal(o.datePaiement, 'datePaiement');
        return portFactures.addPaiementFacture(actorUserId, input as portFactures.AddPaiementFactureInput);
      }),
  );

  Electron.ipcMain.handle('portmaster:validations:list', (event) =>
    wrapIpc(event, (actorUserId) => portValidations.listValidationsEnAttente(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:validations:valider',
    (event, entityType: unknown, entityId: unknown, motif?: unknown) =>
      wrapIpc(event, (actorUserId) => {
        portValidations.validerEntite(
          actorUserId,
          assertText(entityType, 'entityType', { required: true, maxLength: 50 }),
          assertPositiveInteger(entityId, 'entityId'),
          motif !== undefined ? assertText(motif, 'motif', { maxLength: 500 }) : undefined,
        );
        return true;
      }),
  );

  Electron.ipcMain.handle(
    'portmaster:validations:rejeter',
    (event, entityType: unknown, entityId: unknown, motif: unknown) =>
      wrapIpc(event, (actorUserId) => {
        portValidations.rejeterEntite(
          actorUserId,
          assertText(entityType, 'entityType', { required: true, maxLength: 50 }),
          assertPositiveInteger(entityId, 'entityId'),
          assertText(motif, 'motif', { required: true, maxLength: 500 }),
        );
        return true;
      }),
  );

  Electron.ipcMain.handle('portmaster:mouvements:list', (event) =>
    wrapIpc(event, (actorUserId) => portMouvements.listMouvements(actorUserId)),
  );

  Electron.ipcMain.handle(
    'portmaster:mouvements:create',
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.bateauId, 'bateauId');
        assertDateJournal(o.dateMouvement, 'dateMouvement');
        return portMouvements.createMouvement(actorUserId, input as portMouvements.SaveMouvementInput);
      }),
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
    (event, input: unknown) =>
      wrapIpc(event, (actorUserId) => {
        const o = assertObject<Record<string, unknown>>(input, 'input');
        assertPositiveInteger(o.creanceId, 'creanceId');
        assertText(o.type, 'type', { required: true, maxLength: 50 });
        return portRecouvrement.createRelance(actorUserId, input as portRecouvrement.CreateRelanceInput);
      }),
  );

  Electron.ipcMain.handle('portmaster:recouvrement:relanceEnvoyee', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) => {
      portRecouvrement.marquerRelanceEnvoyee(actorUserId, assertPositiveInteger(id, 'id'));
      return true;
    }),
  );
}
