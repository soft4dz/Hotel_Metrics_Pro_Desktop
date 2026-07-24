import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  listTypesChambre, createTypeChambre, deleteTypeChambre,
  listChambres, createChambre, updateChambre, updateStatutChambre, deleteChambre,
  listReservations, getReservation, createReservation, updateReservationStatut, deleteReservation,
  getOccupationKpis, estimateReservationPrice, createFactureFromReservation,
  getFolioByReservation, createFolioFromReservation, addFolioLine, closeFolioToFacture,
} from '../services/hebergement.service';
import type { CreateTypeChambreInput, CreateChambreInput, CreateReservationInput, EstimateReservationPriceInput, StatutChambre, StatutReservation } from '../../src/shared/types/hebergement';

export function registerHebergementIpc() {
  Electron.ipcMain.handle('hebergement:listTypesChambre', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => listTypesChambre(uid, hotelId)));
  Electron.ipcMain.handle('hebergement:createTypeChambre', (event, input: CreateTypeChambreInput) =>
    wrapIpc(event, (uid) => createTypeChambre(uid, input)));
  Electron.ipcMain.handle('hebergement:deleteTypeChambre', (event, id: number) =>
    wrapIpc(event, (uid) => deleteTypeChambre(uid, id)));

  Electron.ipcMain.handle('hebergement:listChambres', (event, hotelId?: number, statut?: StatutChambre) =>
    wrapIpc(event, (uid) => listChambres(uid, hotelId, statut)));
  Electron.ipcMain.handle('hebergement:createChambre', (event, input: CreateChambreInput) =>
    wrapIpc(event, (uid) => createChambre(uid, input)));
  Electron.ipcMain.handle('hebergement:updateChambre', (event, id: number, input: Partial<CreateChambreInput>) =>
    wrapIpc(event, (uid) => updateChambre(uid, id, input)));
  Electron.ipcMain.handle('hebergement:updateStatutChambre', (event, id: number, statut: StatutChambre) =>
    wrapIpc(event, (uid) => updateStatutChambre(uid, id, statut)));
  Electron.ipcMain.handle('hebergement:deleteChambre', (event, id: number) =>
    wrapIpc(event, (uid) => deleteChambre(uid, id)));

  Electron.ipcMain.handle('hebergement:listReservations', (event, hotelId?: number, deb?: string, fin?: string, s?: StatutReservation) =>
    wrapIpc(event, (uid) => listReservations(uid, hotelId, deb, fin, s)));
  Electron.ipcMain.handle('hebergement:getReservation', (event, id: number) =>
    wrapIpc(event, (uid) => getReservation(uid, id)));
  Electron.ipcMain.handle('hebergement:createReservation', (event, input: CreateReservationInput) =>
    wrapIpc(event, (uid) => createReservation(uid, input)));
  Electron.ipcMain.handle('hebergement:updateReservationStatut', (event, id: number, statut: StatutReservation) =>
    wrapIpc(event, (uid) => updateReservationStatut(uid, id, statut)));
  Electron.ipcMain.handle('hebergement:deleteReservation', (event, id: number) =>
    wrapIpc(event, (uid) => deleteReservation(uid, id)));

  Electron.ipcMain.handle('hebergement:estimatePrice', (event, input: EstimateReservationPriceInput) =>
    wrapIpc(event, (uid) => estimateReservationPrice(uid, input)));

  Electron.ipcMain.handle('hebergement:createFactureFromReservation', (event, reservationId: number) =>
    wrapIpc(event, (uid) => createFactureFromReservation(uid, reservationId)));

  Electron.ipcMain.handle('hebergement:getOccupationKpis', (event, deb: string, fin: string, hotelId?: number) =>
    wrapIpc(event, (uid) => getOccupationKpis(uid, deb, fin, hotelId)));

  Electron.ipcMain.handle('hebergement:getFolio', (event, reservationId: number) =>
    wrapIpc(event, (uid) => getFolioByReservation(uid, reservationId)));
  Electron.ipcMain.handle('hebergement:createFolio', (event, reservationId: number) =>
    wrapIpc(event, (uid) => createFolioFromReservation(uid, reservationId)));
  Electron.ipcMain.handle('hebergement:addFolioLine', (event, folioId: number, input: { designation: string; quantite?: number; prixUnitaire: number; tauxTva?: number; categorie?: string }) =>
    wrapIpc(event, (uid) => addFolioLine(uid, folioId, input)));
  Electron.ipcMain.handle('hebergement:closeFolioToFacture', (event, reservationId: number) =>
    wrapIpc(event, (uid) => closeFolioToFacture(uid, reservationId)));
}
