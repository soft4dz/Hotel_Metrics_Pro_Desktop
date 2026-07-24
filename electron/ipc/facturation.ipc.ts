import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import {
  IpcValidationError,
  assertAmount,
  assertArray,
  assertDateJournal,
  assertEnum,
  assertObject,
  assertPercentage,
  assertPositiveInteger,
  assertPositiveNumber,
  assertText,
} from './validation';
import * as svc from '../services/facturation.service';
import * as pdfSvc from '../services/facturation-pdf.service';

const FACTURE_STATUTS = ['brouillon', 'soumise', 'validee', 'payee', 'annulee'] as const;
const CLIENT_TYPES = ['particulier', 'entreprise'] as const;
const PAYMENT_MODES = ['especes', 'cheque', 'virement', 'carte', 'effet', 'autre'] as const;

function optionalDate(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertDateJournal(value, label);
}

function optionalPositiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertPositiveInteger(value, label);
}

function validateLine(value: unknown, index: number): svc.LigneInput {
  const input = assertObject(value, `lignes[${index}]`);
  const tauxTva =
    input.tauxTva === undefined || input.tauxTva === null
      ? undefined
      : assertPercentage(input.tauxTva, `lignes[${index}].tauxTva`);
  const ordre =
    input.ordre === undefined || input.ordre === null
      ? undefined
      : assertPositiveInteger(input.ordre, `lignes[${index}].ordre`, { allowZero: true });

  return {
    designation: assertText(input.designation, `lignes[${index}].designation`, {
      required: true,
      maxLength: 500,
    }),
    quantite: assertPositiveNumber(input.quantite, `lignes[${index}].quantite`),
    prixUnitaire: assertAmount(input.prixUnitaire, `lignes[${index}].prixUnitaire`),
    tauxTva,
    ordre,
  };
}

function validateLines(value: unknown): svc.LigneInput[] {
  const lines = assertArray(value, 'lignes', 1);
  if (lines.length > 500) {
    throw new IpcValidationError('lignes: maximum 500 éléments', [
      'lignes: maximum 500 éléments',
    ]);
  }
  return lines.map(validateLine);
}

function validateCreateFacture(value: unknown): svc.CreateFactureInput {
  const input = assertObject(value, 'facture');
  const clientId = optionalPositiveInteger(input.clientId, 'clientId');
  const clientNom = assertText(input.clientNom, 'clientNom', { maxLength: 250 });
  if (!clientId && !clientNom) {
    throw new IpcValidationError('client: clientId ou clientNom requis', [
      'client: clientId ou clientNom requis',
    ]);
  }

  const dateEmission = optionalDate(input.dateEmission, 'dateEmission');
  const dateEcheance = optionalDate(input.dateEcheance, 'dateEcheance');
  if (dateEmission && dateEcheance && dateEcheance < dateEmission) {
    throw new IpcValidationError(
      "dateEcheance: ne peut pas précéder la date d'émission",
      ["dateEcheance: ne peut pas précéder la date d'émission"],
    );
  }

  return {
    hotelId: assertPositiveInteger(input.hotelId, 'hotelId'),
    clientId,
    clientNom: clientNom || undefined,
    dateEmission,
    dateEcheance,
    notes: assertText(input.notes, 'notes', { maxLength: 2_000 }) || undefined,
    lignes: validateLines(input.lignes),
  };
}

function validateUpdateFacture(value: unknown): Partial<svc.CreateFactureInput> {
  const input = assertObject(value, 'facture');
  const output: Partial<svc.CreateFactureInput> = {};

  if ('clientId' in input) output.clientId = optionalPositiveInteger(input.clientId, 'clientId');
  if ('clientNom' in input) {
    output.clientNom = assertText(input.clientNom, 'clientNom', { maxLength: 250 });
  }
  if ('dateEmission' in input) output.dateEmission = optionalDate(input.dateEmission, 'dateEmission');
  if ('dateEcheance' in input) output.dateEcheance = optionalDate(input.dateEcheance, 'dateEcheance');
  if ('notes' in input) output.notes = assertText(input.notes, 'notes', { maxLength: 2_000 });
  if ('lignes' in input) output.lignes = validateLines(input.lignes);

  if (
    output.dateEmission &&
    output.dateEcheance &&
    output.dateEcheance < output.dateEmission
  ) {
    throw new IpcValidationError(
      "dateEcheance: ne peut pas précéder la date d'émission",
      ["dateEcheance: ne peut pas précéder la date d'émission"],
    );
  }

  return output;
}

function validateFilters(value: unknown): svc.FactureFilters {
  if (value === undefined || value === null) return {};
  const input = assertObject(value, 'filtres');
  return {
    hotelId: optionalPositiveInteger(input.hotelId, 'hotelId'),
    statut:
      input.statut === undefined || input.statut === null || input.statut === ''
        ? undefined
        : assertEnum(input.statut, 'statut', FACTURE_STATUTS),
    clientId: optionalPositiveInteger(input.clientId, 'clientId'),
    dateDebut: optionalDate(input.dateDebut, 'dateDebut'),
    dateFin: optionalDate(input.dateFin, 'dateFin'),
    search: assertText(input.search, 'search', { maxLength: 200 }) || undefined,
  };
}

function validatePayment(value: unknown): svc.AddPaiementInput {
  const input = assertObject(value, 'paiement');
  return {
    factureId: assertPositiveInteger(input.factureId, 'factureId'),
    datePaiement: assertDateJournal(input.datePaiement, 'datePaiement'),
    montant: assertPositiveNumber(input.montant, 'montant'),
    mode: assertEnum(input.mode, 'mode', PAYMENT_MODES),
    reference: assertText(input.reference, 'reference', { maxLength: 200 }) || undefined,
    notes: assertText(input.notes, 'notes', { maxLength: 2_000 }) || undefined,
  };
}

function validateClient(value: unknown, partial = false): svc.CreateClientInput | Partial<svc.CreateClientInput> {
  const input = assertObject(value, 'client');
  const output: Partial<svc.CreateClientInput> = {};

  if (!partial || 'type' in input) output.type = assertEnum(input.type, 'type', CLIENT_TYPES);
  if (!partial || 'nom' in input) {
    output.nom = assertText(input.nom, 'nom', { required: !partial, maxLength: 200 });
  }
  if ('raisonSociale' in input) {
    output.raisonSociale = assertText(input.raisonSociale, 'raisonSociale', { maxLength: 250 });
  }
  if ('email' in input) output.email = assertText(input.email, 'email', { maxLength: 254 });
  if ('telephone' in input) {
    output.telephone = assertText(input.telephone, 'telephone', { maxLength: 50 });
  }
  if ('adresse' in input) output.adresse = assertText(input.adresse, 'adresse', { maxLength: 500 });
  if ('nif' in input) output.nif = assertText(input.nif, 'nif', { maxLength: 50 });
  if ('rc' in input) output.rc = assertText(input.rc, 'rc', { maxLength: 100 });

  return output as svc.CreateClientInput | Partial<svc.CreateClientInput>;
}

export function registerFacturationIpc(): void {
  Electron.ipcMain.handle('facturation:getDashboard', (event, hotelId?: number) =>
    wrapIpc(event, (uid) =>
      svc.getFacturationDashboard(uid, optionalPositiveInteger(hotelId, 'hotelId')),
    ));

  Electron.ipcMain.handle('facturation:listFactures', (event, filters: unknown) =>
    wrapIpc(event, (uid) => svc.listFactures(uid, validateFilters(filters))));

  Electron.ipcMain.handle('facturation:getFacture', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.getFactureDetail(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:createFacture', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createFacture(uid, validateCreateFacture(input))));

  Electron.ipcMain.handle('facturation:updateFacture', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) =>
      svc.updateFacture(uid, assertPositiveInteger(id, 'id'), validateUpdateFacture(input)),
    ));

  Electron.ipcMain.handle('facturation:soumettre', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.soumettreFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:valider', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.validerFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:annuler', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.annulerFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:deleteFacture', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.deleteFacture(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:addPaiement', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.addPaiement(uid, validatePayment(input))));

  Electron.ipcMain.handle('facturation:deletePaiement', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.deletePaiement(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:listClients', (event, search?: unknown) =>
    wrapIpc(event, (uid) =>
      svc.listClients(uid, assertText(search, 'search', { maxLength: 200 }) || undefined),
    ));

  Electron.ipcMain.handle('facturation:createClient', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createClient(uid, validateClient(input) as svc.CreateClientInput)));

  Electron.ipcMain.handle('facturation:updateClient', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) =>
      svc.updateClient(
        uid,
        assertPositiveInteger(id, 'id'),
        validateClient(input, true) as Partial<svc.CreateClientInput>,
      ),
    ));

  Electron.ipcMain.handle('facturation:deleteClient', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.deleteClient(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('facturation:exportPdf', (event, factureId: unknown) =>
    wrapIpcAsync(event, (uid) =>
      pdfSvc.exportFacturationPdf(uid, assertPositiveInteger(factureId, 'factureId')),
    ));
}
