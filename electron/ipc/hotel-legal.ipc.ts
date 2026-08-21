import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/hotel-legal.service';
import {
  assertAmount,
  assertDateJournal,
  assertEnum,
  assertObject,
  assertPeriodeMois,
  assertPositiveInteger,
  assertText,
} from './validation';

const FICHE_STATUTS = ['present', 'parti', 'annule'] as const;

function optionalDate(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return assertDateJournal(value, label);
}

function optionalText(value: unknown, label: string, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return assertText(value, label, { maxLength });
}

function validateCreateFiche(input: unknown): svc.CreateFichePoliceInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
    reservationId: o.reservationId != null ? assertPositiveInteger(o.reservationId, 'reservationId') : undefined,
    nom: assertText(o.nom, 'nom', { required: true, maxLength: 100 }),
    prenom: assertText(o.prenom, 'prenom', { required: true, maxLength: 100 }),
    dateNaissance: optionalDate(o.dateNaissance, 'dateNaissance'),
    lieuNaissance: optionalText(o.lieuNaissance, 'lieuNaissance', 150),
    nationalite: optionalText(o.nationalite, 'nationalite', 100),
    typePiece: assertEnum(o.typePiece, 'typePiece', svc.FICHE_POLICE_TYPE_PIECES),
    numeroPiece: assertText(o.numeroPiece, 'numeroPiece', { required: true, maxLength: 100 }),
    dateEntree: assertDateJournal(o.dateEntree, 'dateEntree'),
    dateSortiePrevue: optionalDate(o.dateSortiePrevue, 'dateSortiePrevue'),
    dateSortieReelle: optionalDate(o.dateSortieReelle, 'dateSortieReelle'),
    chambreNumero: optionalText(o.chambreNumero, 'chambreNumero', 30),
    statut: o.statut != null ? assertEnum(o.statut, 'statut', FICHE_STATUTS) : undefined,
  };
}

function validateUpdateFiche(input: unknown): svc.UpdateFichePoliceInput {
  const o = assertObject<Record<string, unknown>>(input, 'input');
  return {
    nom: o.nom !== undefined ? assertText(o.nom, 'nom', { required: true, maxLength: 100 }) : undefined,
    prenom: o.prenom !== undefined ? assertText(o.prenom, 'prenom', { required: true, maxLength: 100 }) : undefined,
    dateNaissance: optionalDate(o.dateNaissance, 'dateNaissance'),
    lieuNaissance: optionalText(o.lieuNaissance, 'lieuNaissance', 150),
    nationalite: optionalText(o.nationalite, 'nationalite', 100),
    typePiece: o.typePiece !== undefined ? assertEnum(o.typePiece, 'typePiece', svc.FICHE_POLICE_TYPE_PIECES) : undefined,
    numeroPiece: o.numeroPiece !== undefined ? assertText(o.numeroPiece, 'numeroPiece', { required: true, maxLength: 100 }) : undefined,
    dateEntree: o.dateEntree !== undefined ? assertDateJournal(o.dateEntree, 'dateEntree') : undefined,
    dateSortiePrevue: optionalDate(o.dateSortiePrevue, 'dateSortiePrevue'),
    dateSortieReelle: optionalDate(o.dateSortieReelle, 'dateSortieReelle'),
    chambreNumero: optionalText(o.chambreNumero, 'chambreNumero', 30),
    statut: o.statut !== undefined ? assertEnum(o.statut, 'statut', FICHE_STATUTS) : undefined,
  };
}

export function registerHotelLegalIpc(): void {
  Electron.ipcMain.handle('hotelLegal:fichePolice:list', (event, hotelId?: unknown, statut?: unknown) =>
    wrapIpc(event, (uid) => svc.listFichesPolice(
      uid,
      hotelId != null ? assertPositiveInteger(hotelId, 'hotelId') : undefined,
      statut != null ? assertEnum(statut, 'statut', FICHE_STATUTS) : undefined,
    )));

  Electron.ipcMain.handle('hotelLegal:fichePolice:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => svc.createFichePolice(uid, validateCreateFiche(input))));

  Electron.ipcMain.handle('hotelLegal:fichePolice:update', (event, ficheId: unknown, input: unknown) =>
    wrapIpc(event, (uid) => svc.updateFichePolice(uid, assertPositiveInteger(ficheId, 'ficheId'), validateUpdateFiche(input))));

  Electron.ipcMain.handle('hotelLegal:fichePolice:checkout', (event, ficheId: number, dateSortie: string) =>
    wrapIpc(event, (uid) => svc.checkoutFichePolice(uid, assertPositiveInteger(ficheId, 'ficheId'), assertDateJournal(dateSortie, 'dateSortie'))));

  Electron.ipcMain.handle('hotelLegal:taxeSejour:calculer', (event, hotelId: unknown, periode: unknown, taux?: unknown) =>
    wrapIpc(event, (uid) => svc.calculerTaxeSejour(
      uid,
      assertPositiveInteger(hotelId, 'hotelId'),
      assertPeriodeMois(periode, 'periode'),
      taux != null ? assertAmount(taux, 'taux') : undefined,
    )));

  Electron.ipcMain.handle('hotelLegal:tourisme:generer', (event, hotelId: unknown, periode: unknown) =>
    wrapIpc(event, (uid) => svc.genererRapportTourisme(uid, assertPositiveInteger(hotelId, 'hotelId'), assertPeriodeMois(periode, 'periode'))));

  Electron.ipcMain.handle('hotelLegal:tourisme:list', (event, hotelId?: unknown) =>
    wrapIpc(event, (uid) => svc.listRapportsTourisme(uid, hotelId != null ? assertPositiveInteger(hotelId, 'hotelId') : undefined)));

  Electron.ipcMain.handle('hotelLegal:fichePolice:exportCsv', (event, hotelId: number) =>
    wrapIpc(event, (uid) => svc.exportFichesPoliceCsv(uid, assertPositiveInteger(hotelId, 'hotelId'))));
}
