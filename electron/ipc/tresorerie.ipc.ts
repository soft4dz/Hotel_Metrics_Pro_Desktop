import Electron from '../lib/electronApi';
import * as tresorerieService from '../services/tresorerie.service';
import * as advanced from '../services/tresorerie-advanced.service';
import { wrapIpc } from './ipcHelpers';
import {
  assertPositiveInteger,
  assertAmount,
  assertDateJournal,
  assertText,
  assertEnum,
  assertObject,
} from './validation';

const MODES_PAIEMENT = ['especes', 'cheque', 'virement', 'carte', 'effet', 'autre'] as const;
const TYPES_OPERATION_CAISSE = ['recette', 'depense', 'virement'] as const;

export function registerTresorerieIpc(): void {
  // Dashboard — lecture seule
  Electron.ipcMain.handle('tresorerie:dashboard', (event, hotelId?: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.getDashboard(
        actorUserId,
        hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
      ),
    ),
  );

  // Encaissements
  Electron.ipcMain.handle('tresorerie:encaissements:list', (event, filters: tresorerieService.EncaissementFilters) =>
    wrapIpc(event, (actorUserId) => tresorerieService.listEncaissements(actorUserId, filters)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:create', (event, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      assertPositiveInteger(o.hotelId, 'hotelId');
      assertAmount(o.montant, 'montant');
      assertDateJournal(o.dateOperation, 'dateOperation');
      if (o.modePaiement !== undefined) assertEnum(o.modePaiement, 'modePaiement', MODES_PAIEMENT);
      return tresorerieService.createEncaissement(actorUserId, input as tresorerieService.CreateEncaissementInput);
    }),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const validId = assertPositiveInteger(id, 'id');
      const o = assertObject<Record<string, unknown>>(input, 'input');
      if (o.montant !== undefined) assertAmount(o.montant, 'montant');
      if (o.dateOperation !== undefined) assertDateJournal(o.dateOperation, 'dateOperation');
      if (o.modePaiement !== undefined) assertEnum(o.modePaiement, 'modePaiement', MODES_PAIEMENT);
      return tresorerieService.updateEncaissement(actorUserId, validId, input as Partial<tresorerieService.CreateEncaissementInput>);
    }),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:confirmer', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.confirmerEncaissement(actorUserId, assertPositiveInteger(id, 'id')),
    ),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:rejeter', (event, id: unknown, motif: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.rejeterEncaissement(
        actorUserId,
        assertPositiveInteger(id, 'id'),
        assertText(motif, 'motif', { required: true, maxLength: 500 }),
      ),
    ),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:delete', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.deleteEncaissement(actorUserId, assertPositiveInteger(id, 'id')),
    ),
  );

  // Comptes bancaires
  Electron.ipcMain.handle('tresorerie:comptes:list', (event, hotelId?: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.listComptesBancaires(
        actorUserId,
        hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
      ),
    ),
  );

  Electron.ipcMain.handle('tresorerie:comptes:create', (event, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      assertPositiveInteger(o.hotelId, 'hotelId');
      assertText(o.libelle, 'libelle', { required: true, maxLength: 200 });
      return tresorerieService.createCompteBancaire(actorUserId, input as tresorerieService.CreateCompteInput);
    }),
  );

  Electron.ipcMain.handle('tresorerie:comptes:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const validId = assertPositiveInteger(id, 'id');
      assertObject(input, 'input');
      return tresorerieService.updateCompteBancaire(actorUserId, validId, input as Partial<tresorerieService.CreateCompteInput>);
    }),
  );

  Electron.ipcMain.handle('tresorerie:comptes:delete', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.deleteCompteBancaire(actorUserId, assertPositiveInteger(id, 'id')),
    ),
  );

  // Journal de caisse
  Electron.ipcMain.handle('tresorerie:caisse:list', (event, hotelId: unknown, dateDebut: unknown, dateFin: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.getJournalCaisse(
        actorUserId,
        assertPositiveInteger(hotelId, 'hotelId'),
        assertDateJournal(dateDebut, 'dateDebut'),
        assertDateJournal(dateFin, 'dateFin'),
      ),
    ),
  );

  Electron.ipcMain.handle('tresorerie:caisse:add', (event, input: unknown) =>
    wrapIpc(event, (actorUserId) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      assertPositiveInteger(o.hotelId, 'hotelId');
      assertAmount(o.montant, 'montant');
      assertDateJournal(o.dateOperation, 'dateOperation');
      if (o.typeOperation !== undefined) assertEnum(o.typeOperation, 'typeOperation', TYPES_OPERATION_CAISSE);
      return tresorerieService.addOperationCaisse(actorUserId, input as tresorerieService.AddCaisseInput);
    }),
  );

  Electron.ipcMain.handle('tresorerie:caisse:delete', (event, id: unknown) =>
    wrapIpc(event, (actorUserId) =>
      tresorerieService.deleteOperationCaisse(actorUserId, assertPositiveInteger(id, 'id')),
    ),
  );

  // Ordres de paiement et trésorerie avancée
  Electron.ipcMain.handle('tresorerie:ordres:list', (event, hotelId?: unknown) =>
    wrapIpc(event, (actor) =>
      advanced.listPaymentOrders(actor, hotelId !== undefined ? assertPositiveInteger(hotelId, 'hotelId') : undefined),
    ),
  );

  Electron.ipcMain.handle('tresorerie:ordres:create', (event, input: unknown) =>
    wrapIpc(event, (actor) => {
      assertObject(input, 'input');
      return advanced.createPaymentOrder(actor, input);
    }),
  );

  Electron.ipcMain.handle('tresorerie:ordres:decide', (event, id: unknown, approved: unknown) =>
    wrapIpc(event, (actor) => {
      if (typeof approved !== 'boolean') throw new Error('approved: booléen attendu');
      return advanced.decidePaymentOrder(actor, assertPositiveInteger(id, 'id'), approved);
    }),
  );

  Electron.ipcMain.handle('tresorerie:ordres:execute', (event, id: unknown) =>
    wrapIpc(event, (actor) => advanced.executePaymentOrder(actor, assertPositiveInteger(id, 'id'))),
  );

  Electron.ipcMain.handle('tresorerie:forecast:list', (event, hotelId: unknown, from: unknown, to: unknown) =>
    wrapIpc(event, (actor) =>
      advanced.listForecast(
        actor,
        assertPositiveInteger(hotelId, 'hotelId'),
        assertDateJournal(from, 'from'),
        assertDateJournal(to, 'to'),
      ),
    ),
  );

  Electron.ipcMain.handle('tresorerie:forecast:create', (event, input: unknown) =>
    wrapIpc(event, (actor) => { assertObject(input, 'input'); return advanced.createForecast(actor, input); }),
  );

  Electron.ipcMain.handle('tresorerie:bank:import', (event, input: unknown) =>
    wrapIpc(event, (actor) => { assertObject(input, 'input'); return advanced.importBankStatement(actor, input); }),
  );

  Electron.ipcMain.handle('tresorerie:bank:lines', (event, accountId: unknown) =>
    wrapIpc(event, (actor) => advanced.listBankLines(actor, assertPositiveInteger(accountId, 'accountId'))),
  );

  Electron.ipcMain.handle('tresorerie:bank:suggest', (event, lineId: unknown) =>
    wrapIpc(event, (actor) => advanced.suggestReconciliation(actor, assertPositiveInteger(lineId, 'lineId'))),
  );

  Electron.ipcMain.handle('tresorerie:bank:confirm', (event, input: unknown) =>
    wrapIpc(event, (actor) => { assertObject(input, 'input'); return advanced.confirmReconciliation(actor, input); }),
  );

  Electron.ipcMain.handle('tresorerie:cost-centers:list', (event, hotelId: unknown) =>
    wrapIpc(event, (actor) => advanced.listCostCenters(actor, assertPositiveInteger(hotelId, 'hotelId'))),
  );

  Electron.ipcMain.handle('tresorerie:cost-centers:create', (event, input: unknown) =>
    wrapIpc(event, (actor) => { assertObject(input, 'input'); return advanced.createCostCenter(actor, input); }),
  );

  Electron.ipcMain.handle('tresorerie:cost-centers:allocate', (event, input: unknown) =>
    wrapIpc(event, (actor) => { assertObject(input, 'input'); return advanced.allocateCost(actor, input); }),
  );

  Electron.ipcMain.handle('tresorerie:analytics:report', (event, hotelId: unknown, from: unknown, to: unknown) =>
    wrapIpc(event, (actor) =>
      advanced.analyticalReport(
        actor,
        assertPositiveInteger(hotelId, 'hotelId'),
        assertDateJournal(from, 'from'),
        assertDateJournal(to, 'to'),
      ),
    ),
  );
}
