import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/tarifs.service';
import type {
  CreateComposantInput, CreateFormuleInput, CreatePlanInput,
  UpsertTarifInput, UpsertTarifsBulkInput,
  CreatePromotionInput, CreateConventionInput, SimulateurInput,
} from '../../src/shared/types/tarifs';

export function registerTarifsIpc(): void {
  // Composants
  Electron.ipcMain.handle('tarifs:listComposants', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listComposants(uid, hotelId)));
  Electron.ipcMain.handle('tarifs:createComposant', (e, input: CreateComposantInput) =>
    wrapIpc(e, (uid) => svc.createComposant(uid, input)));
  Electron.ipcMain.handle('tarifs:deleteComposant', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteComposant(uid, id)));

  // Formules
  Electron.ipcMain.handle('tarifs:listFormules', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listFormules(uid, hotelId)));
  Electron.ipcMain.handle('tarifs:createFormule', (e, input: CreateFormuleInput) =>
    wrapIpc(e, (uid) => svc.createFormule(uid, input)));
  Electron.ipcMain.handle('tarifs:deleteFormule', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteFormule(uid, id)));

  // Plans
  Electron.ipcMain.handle('tarifs:listPlans', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listPlans(uid, hotelId)));
  Electron.ipcMain.handle('tarifs:createPlan', (e, input: CreatePlanInput) =>
    wrapIpc(e, (uid) => svc.createPlan(uid, input)));
  Electron.ipcMain.handle('tarifs:deletePlan', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deletePlan(uid, id)));

  // Grille tarifaire
  Electron.ipcMain.handle('tarifs:getGrille', (e, hotelId: number, planId: number, dateDebut: string, dateFin: string, formuleId?: number) =>
    wrapIpc(e, (uid) => svc.getTarifsGrille(uid, hotelId, planId, dateDebut, dateFin, formuleId)));
  Electron.ipcMain.handle('tarifs:upsertTarif', (e, input: UpsertTarifInput) =>
    wrapIpc(e, (uid) => svc.upsertTarif(uid, input)));
  Electron.ipcMain.handle('tarifs:upsertBulk', (e, input: UpsertTarifsBulkInput) =>
    wrapIpc(e, (uid) => svc.upsertTarifsBulk(uid, input)));

  // Promotions
  Electron.ipcMain.handle('tarifs:listPromotions', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listPromotions(uid, hotelId)));
  Electron.ipcMain.handle('tarifs:createPromotion', (e, input: CreatePromotionInput) =>
    wrapIpc(e, (uid) => svc.createPromotion(uid, input)));
  Electron.ipcMain.handle('tarifs:togglePromotion', (e, id: number, actif: boolean) =>
    wrapIpc(e, (uid) => svc.togglePromotion(uid, id, actif)));
  Electron.ipcMain.handle('tarifs:deletePromotion', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deletePromotion(uid, id)));

  // Conventions
  Electron.ipcMain.handle('tarifs:listConventions', (e, hotelId?: number, clientId?: number) =>
    wrapIpc(e, (uid) => svc.listConventions(uid, hotelId, clientId)));
  Electron.ipcMain.handle('tarifs:createConvention', (e, input: CreateConventionInput) =>
    wrapIpc(e, (uid) => svc.createConvention(uid, input)));
  Electron.ipcMain.handle('tarifs:toggleConvention', (e, id: number, actif: boolean) =>
    wrapIpc(e, (uid) => svc.toggleConvention(uid, id, actif)));
  Electron.ipcMain.handle('tarifs:deleteConvention', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteConvention(uid, id)));

  // Simulateur
  Electron.ipcMain.handle('tarifs:simuler', (e, input: SimulateurInput) =>
    wrapIpc(e, (uid) => svc.simulerPrix(uid, input)));
}
