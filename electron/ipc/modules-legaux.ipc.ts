import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as immo from '../services/immobilisations.service';
import * as casnos from '../services/casnos.service';
import * as inv from '../services/inventaire-legal.service';
import {
  assertAmount,
  assertDateJournal,
  assertObject,
  assertPositiveInteger,
  assertText,
} from './validation';
import type { CasnosTypeAffilie } from '../services/casnos.service';
import type { ImmoCategorie } from '../services/immobilisations.service';

const IMMO_CAT = new Set(['corporelle', 'incorporelle', 'financiere']);
const CASNOS_TYPE = new Set(['gerant', 'prestataire', 'artisan', 'autre']);

function assertEnum<T extends string>(value: unknown, label: string, allowed: Set<string>): T {
  const s = assertText(value, label, { required: true });
  if (!allowed.has(s)) throw new Error(`${label}: valeur non autorisée`);
  return s as T;
}

function assertPeriode(value: unknown): string {
  const s = assertText(value, 'periode', { required: true, maxLength: 7 });
  if (!/^\d{4}-\d{2}$/.test(s)) throw new Error('periode: format YYYY-MM attendu');
  return s;
}

export function registerModulesLegauxIpc(): void {
  Electron.ipcMain.handle('modulesLegaux:dashboard', (event) =>
    wrapIpc(event, (uid) => inv.getModulesLegauxDashboard(uid)));

  // Immobilisations
  Electron.ipcMain.handle('immo:list', (event, actifOnly?: boolean) =>
    wrapIpc(event, (uid) => immo.listImmobilisations(uid, actifOnly ?? true)));

  Electron.ipcMain.handle('immo:upsert', (event, input: unknown, id?: number) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return immo.upsertImmobilisation(uid, {
        code: assertText(o.code, 'code', { required: true, maxLength: 30 }),
        libelle: assertText(o.libelle, 'libelle', { required: true, maxLength: 200 }),
        categorie: o.categorie ? assertEnum<ImmoCategorie>(o.categorie, 'categorie', IMMO_CAT) : undefined,
        dateAcquisition: assertDateJournal(o.dateAcquisition, 'dateAcquisition'),
        valeurAcquisition: assertAmount(o.valeurAcquisition, 'valeurAcquisition'),
        valeurResiduelle: o.valeurResiduelle !== undefined ? assertAmount(o.valeurResiduelle, 'valeurResiduelle') : undefined,
        dureeAmortissementMois: o.dureeAmortissementMois !== undefined ? assertPositiveInteger(o.dureeAmortissementMois, 'dureeAmortissementMois') : undefined,
        hotelId: o.hotelId !== undefined ? assertPositiveInteger(o.hotelId, 'hotelId') : undefined,
      }, id !== undefined ? assertPositiveInteger(id, 'id') : undefined);
    }));

  Electron.ipcMain.handle('immo:genererPlan', (event, immobilisationId: number) =>
    wrapIpc(event, (uid) => immo.genererPlanAmortissement(uid, assertPositiveInteger(immobilisationId, 'immobilisationId'))));

  Electron.ipcMain.handle('immo:listAmortissements', (event, immobilisationId?: number, periode?: string) =>
    wrapIpc(event, (uid) => immo.listAmortissements(uid, immobilisationId, periode)));

  Electron.ipcMain.handle('immo:comptabiliserMensuel', (event, periode: string) =>
    wrapIpc(event, (uid) => immo.comptabiliserAmortissementMensuel(uid, assertPeriode(periode))));

  Electron.ipcMain.handle('immo:exportCsv', (event) =>
    wrapIpc(event, (uid) => immo.exportImmobilisationsCsv(uid)));

  // CASNOS
  Electron.ipcMain.handle('casnos:affilies:list', (event, actifOnly?: boolean) =>
    wrapIpc(event, (uid) => casnos.listCasnosAffilies(uid, actifOnly ?? true)));

  Electron.ipcMain.handle('casnos:affilies:upsert', (event, input: unknown, id?: number) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return casnos.upsertCasnosAffilie(uid, {
        typeAffilie: o.typeAffilie ? assertEnum<CasnosTypeAffilie>(o.typeAffilie, 'typeAffilie', CASNOS_TYPE) : undefined,
        nom: assertText(o.nom, 'nom', { required: true, maxLength: 100 }),
        prenom: o.prenom ? assertText(o.prenom, 'prenom', { maxLength: 100 }) : undefined,
        nin: o.nin ? assertText(o.nin, 'nin', { maxLength: 30 }) : undefined,
        nif: o.nif ? assertText(o.nif, 'nif', { maxLength: 30 }) : undefined,
        numeroCasnos: o.numeroCasnos ? assertText(o.numeroCasnos, 'numeroCasnos', { maxLength: 30 }) : undefined,
        tauxCotisation: o.tauxCotisation !== undefined ? assertAmount(o.tauxCotisation, 'tauxCotisation') : undefined,
        revenuAssiette: o.revenuAssiette !== undefined ? assertAmount(o.revenuAssiette, 'revenuAssiette') : undefined,
        hotelId: o.hotelId !== undefined ? assertPositiveInteger(o.hotelId, 'hotelId') : undefined,
        actif: o.actif !== undefined ? Boolean(o.actif) : undefined,
      }, id !== undefined ? assertPositiveInteger(id, 'id') : undefined);
    }));

  Electron.ipcMain.handle('casnos:declarations:list', (event, periode?: string) =>
    wrapIpc(event, (uid) => casnos.listCasnosDeclarations(uid, periode)));

  Electron.ipcMain.handle('casnos:declarations:calculer', (event, affilieId: number, periode: string, revenu?: number) =>
    wrapIpc(event, (uid) => casnos.calculerDeclarationCasnos(uid, assertPositiveInteger(affilieId, 'affilieId'), assertPeriode(periode), revenu !== undefined ? assertAmount(revenu, 'revenu') : undefined)));

  Electron.ipcMain.handle('casnos:declarations:calculerPeriode', (event, periode: string) =>
    wrapIpc(event, (uid) => casnos.calculerDeclarationsCasnosPeriode(uid, assertPeriode(periode))));

  Electron.ipcMain.handle('casnos:declarations:marquerDeclaree', (event, id: number, referenceCasnos: string) =>
    wrapIpc(event, (uid) => casnos.marquerDeclarationCasnosDeclaree(uid, assertPositiveInteger(id, 'id'), assertText(referenceCasnos, 'referenceCasnos', { required: true, maxLength: 100 }))));

  Electron.ipcMain.handle('casnos:exportCsv', (event, periode: string) =>
    wrapIpc(event, (uid) => casnos.exportCasnosCsv(uid, assertPeriode(periode))));

  // Inventaire légal
  Electron.ipcMain.handle('inventaireLegal:sessions:list', (event, exercice?: number) =>
    wrapIpc(event, (uid) => inv.listInventaireSessions(uid, exercice)));

  Electron.ipcMain.handle('inventaireLegal:sessions:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return inv.createInventaireSession(uid, {
        exercice: assertPositiveInteger(o.exercice, 'exercice'),
        hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
        dateInventaire: assertDateJournal(o.dateInventaire, 'dateInventaire'),
        commentaire: o.commentaire ? assertText(o.commentaire, 'commentaire', { maxLength: 500 }) : undefined,
      });
    }));

  Electron.ipcMain.handle('inventaireLegal:lignes:list', (event, sessionId: number) =>
    wrapIpc(event, (uid) => inv.listInventaireLignes(uid, assertPositiveInteger(sessionId, 'sessionId'))));

  Electron.ipcMain.handle('inventaireLegal:lignes:update', (event, ligneId: number, quantitePhysique: number, motifEcart?: string) =>
    wrapIpc(event, (uid) => inv.updateInventaireLigne(uid, assertPositiveInteger(ligneId, 'ligneId'), assertAmount(quantitePhysique, 'quantitePhysique'), motifEcart)));

  Electron.ipcMain.handle('inventaireLegal:sessions:cloturer', (event, sessionId: number) =>
    wrapIpc(event, (uid) => inv.cloturerInventaireSession(uid, assertPositiveInteger(sessionId, 'sessionId'))));

  Electron.ipcMain.handle('inventaireLegal:exportCsv', (event, sessionId: number) =>
    wrapIpc(event, (uid) => inv.exportInventaireLegalCsv(uid, assertPositiveInteger(sessionId, 'sessionId'))));
}
