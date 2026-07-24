import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/contrats-hotel.service';
import { assertObject, assertPositiveInteger, assertText, assertAmount } from './validation';

export function registerContratsHotelIpc(): void {
  Electron.ipcMain.handle('contratsHotel:list', (event, hotelId?: unknown) =>
    wrapIpc(event, (uid) => svc.listContratsHotel(uid, hotelId != null ? assertPositiveInteger(hotelId, 'hotelId') : undefined)));

  Electron.ipcMain.handle('contratsHotel:get', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.getContratHotel(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('contratsHotel:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createContratHotel(uid, {
        hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
        clientId: o.clientId != null ? assertPositiveInteger(o.clientId, 'clientId') : undefined,
        typeContrat: o.typeContrat ? assertText(o.typeContrat, 'typeContrat', { maxLength: 50 }) : undefined,
        reference: assertText(o.reference, 'reference', { required: true, maxLength: 80 }),
        dateDebut: assertText(o.dateDebut, 'dateDebut', { required: true, maxLength: 10 }),
        dateFin: assertText(o.dateFin, 'dateFin', { required: true, maxLength: 10 }),
        montant: o.montant != null ? assertAmount(o.montant, 'montant') : undefined,
        statut: o.statut ? assertText(o.statut, 'statut', { maxLength: 20 }) as svc.ContratHotelStatut : undefined,
        documentGedId: o.documentGedId != null ? assertPositiveInteger(o.documentGedId, 'documentGedId') : undefined,
        notes: o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined,
      });
    }));

  Electron.ipcMain.handle('contratsHotel:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.updateContratHotel(uid, assertPositiveInteger(id, 'id'), {
        clientId: o.clientId != null ? assertPositiveInteger(o.clientId, 'clientId') : undefined,
        typeContrat: o.typeContrat ? assertText(o.typeContrat, 'typeContrat', { maxLength: 50 }) : undefined,
        reference: o.reference ? assertText(o.reference, 'reference', { maxLength: 80 }) : undefined,
        dateDebut: o.dateDebut ? assertText(o.dateDebut, 'dateDebut', { maxLength: 10 }) : undefined,
        dateFin: o.dateFin ? assertText(o.dateFin, 'dateFin', { maxLength: 10 }) : undefined,
        montant: o.montant != null ? assertAmount(o.montant, 'montant') : undefined,
        statut: o.statut ? assertText(o.statut, 'statut', { maxLength: 20 }) as svc.ContratHotelStatut : undefined,
        notes: o.notes !== undefined ? (o.notes ? assertText(o.notes, 'notes', { maxLength: 2000 }) : undefined) : undefined,
      });
    }));

  Electron.ipcMain.handle('contratsHotel:echeances', (event, jours?: unknown) =>
    wrapIpc(event, (uid) => svc.listContratsEcheanceProche(uid, jours != null ? assertPositiveInteger(jours, 'jours') : 30)));
}
