import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/rgpd-anpdp.service';
import type { RgpdIncidentStatut } from '../../src/shared/types/rgpd';
import {
  assertDateJournal,
  assertObject,
  assertPositiveInteger,
  assertText,
} from './validation';

const BASE_LEGALE = new Set(['consentement', 'contrat', 'obligation_legale', 'interet_legitime', 'mission_publique']);
const SUJET_TYPES = new Set(['client', 'employe', 'heberge', 'autre']);
const TYPE_DEMANDE = new Set(['acces', 'rectification', 'suppression', 'opposition', 'portabilite']);
const DEMANDE_STATUT = new Set(['recue', 'en_cours', 'traitee', 'refusee']);
const GRAVITE = new Set(['faible', 'moderee', 'grave', 'critique']);
const INCIDENT_STATUT = new Set(['ouvert', 'en_cours', 'clos']);

function assertEnum<T extends string>(value: unknown, label: string, allowed: Set<string>): T {
  const s = assertText(value, label, { required: true });
  if (!allowed.has(s)) throw new Error(`${label}: valeur non autorisée`);
  return s as T;
}

export function registerRgpdIpc(): void {
  Electron.ipcMain.handle('rgpd:dashboard', (event) =>
    wrapIpc(event, (uid) => svc.getRgpdDashboard(uid)));

  Electron.ipcMain.handle('rgpd:traitements:list', (event, actifOnly?: boolean) =>
    wrapIpc(event, (uid) => svc.listTraitements(uid, actifOnly ?? true)));

  Electron.ipcMain.handle('rgpd:traitements:upsert', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.upsertTraitement(uid, {
        id: o.id ? assertPositiveInteger(o.id, 'id') : undefined,
        code: assertText(o.code, 'code', { required: true, maxLength: 40 }),
        libelle: assertText(o.libelle, 'libelle', { required: true, maxLength: 200 }),
        finalite: assertText(o.finalite, 'finalite', { required: true, maxLength: 500 }),
        baseLegale: assertEnum(o.baseLegale, 'baseLegale', BASE_LEGALE),
        categoriesDonnees: Array.isArray(o.categoriesDonnees) ? o.categoriesDonnees.map(String) : undefined,
        categoriesPersonnes: Array.isArray(o.categoriesPersonnes) ? o.categoriesPersonnes.map(String) : undefined,
        destinataires: o.destinataires ? assertText(o.destinataires, 'destinataires', { maxLength: 500 }) : undefined,
        dureeConservation: o.dureeConservation ? assertText(o.dureeConservation, 'dureeConservation', { maxLength: 200 }) : undefined,
        mesuresSecurite: o.mesuresSecurite ? assertText(o.mesuresSecurite, 'mesuresSecurite', { maxLength: 500 }) : undefined,
        responsableTraitement: o.responsableTraitement ? assertText(o.responsableTraitement, 'responsableTraitement', { maxLength: 200 }) : undefined,
        sousTraitants: o.sousTraitants ? assertText(o.sousTraitants, 'sousTraitants', { maxLength: 500 }) : undefined,
        transfertHorsAlgerie: Boolean(o.transfertHorsAlgerie),
      });
    }));

  Electron.ipcMain.handle('rgpd:traitements:exportCsv', (event) =>
    wrapIpc(event, (uid) => svc.exportRegistreTraitementsCsv(uid)));

  Electron.ipcMain.handle('rgpd:consentements:list', (event, statut?: string) =>
    wrapIpc(event, (uid) => svc.listConsentements(uid, statut)));

  Electron.ipcMain.handle('rgpd:consentements:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createConsentement(uid, {
        traitementId: o.traitementId ? assertPositiveInteger(o.traitementId, 'traitementId') : undefined,
        sujetType: assertEnum(o.sujetType, 'sujetType', SUJET_TYPES),
        sujetId: o.sujetId ? assertPositiveInteger(o.sujetId, 'sujetId') : undefined,
        sujetLabel: assertText(o.sujetLabel, 'sujetLabel', { required: true, maxLength: 200 }),
        finalite: assertText(o.finalite, 'finalite', { required: true, maxLength: 300 }),
        dateConsentement: assertDateJournal(o.dateConsentement, 'dateConsentement'),
        preuvePath: o.preuvePath ? assertText(o.preuvePath, 'preuvePath', { maxLength: 500 }) : undefined,
      });
    }));

  Electron.ipcMain.handle('rgpd:consentements:revoke', (event, id: number, dateRetrait: string) =>
    wrapIpc(event, (uid) => svc.revokeConsentement(uid, assertPositiveInteger(id, 'id'), assertDateJournal(dateRetrait, 'dateRetrait'))));

  Electron.ipcMain.handle('rgpd:demandes:list', (event, statut?: svc.RgpdDemandeStatut) =>
    wrapIpc(event, (uid) => svc.listDemandes(uid, statut)));

  Electron.ipcMain.handle('rgpd:demandes:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createDemandeDroit(uid, {
        typeDemande: assertEnum(o.typeDemande, 'typeDemande', TYPE_DEMANDE),
        sujetType: assertEnum(o.sujetType, 'sujetType', SUJET_TYPES),
        sujetId: o.sujetId ? assertPositiveInteger(o.sujetId, 'sujetId') : undefined,
        sujetLabel: assertText(o.sujetLabel, 'sujetLabel', { required: true, maxLength: 200 }),
        canal: o.canal ? assertText(o.canal, 'canal', { maxLength: 100 }) : undefined,
        description: o.description ? assertText(o.description, 'description', { maxLength: 2000 }) : undefined,
        dateReception: assertDateJournal(o.dateReception, 'dateReception'),
      });
    }));

  Electron.ipcMain.handle('rgpd:demandes:update', (event, id: number, statut: svc.RgpdDemandeStatut, reponse?: string) =>
    wrapIpc(event, (uid) => {
      assertEnum(statut, 'statut', DEMANDE_STATUT);
      return svc.updateDemandeStatut(uid, assertPositiveInteger(id, 'id'), statut, reponse);
    }));

  Electron.ipcMain.handle('rgpd:incidents:list', (event, statut?: svc.RgpdIncidentStatut) =>
    wrapIpc(event, (uid) => svc.listIncidents(uid, statut)));

  Electron.ipcMain.handle('rgpd:incidents:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.createIncident(uid, {
        dateIncident: assertDateJournal(o.dateIncident, 'dateIncident'),
        dateDetection: assertDateJournal(o.dateDetection, 'dateDetection'),
        gravite: assertEnum(o.gravite, 'gravite', GRAVITE),
        nature: assertText(o.nature, 'nature', { required: true, maxLength: 500 }),
        donneesConcernees: o.donneesConcernees ? assertText(o.donneesConcernees, 'donneesConcernees', { maxLength: 1000 }) : undefined,
        personnesConcernees: o.personnesConcernees ? assertPositiveInteger(o.personnesConcernees, 'personnesConcernees', { allowZero: true }) : undefined,
        mesuresCorrectives: o.mesuresCorrectives ? assertText(o.mesuresCorrectives, 'mesuresCorrectives', { maxLength: 2000 }) : undefined,
        notificationAnpdp: Boolean(o.notificationAnpdp),
        dateNotificationAnpdp: o.dateNotificationAnpdp ? assertDateJournal(o.dateNotificationAnpdp, 'dateNotificationAnpdp') : undefined,
      });
    }));

  Electron.ipcMain.handle('rgpd:incidents:update', (event, id: number, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.updateIncident(uid, assertPositiveInteger(id, 'id'), {
        statut: o.statut ? assertEnum<RgpdIncidentStatut>(o.statut, 'statut', INCIDENT_STATUT) : undefined,
        mesuresCorrectives: o.mesuresCorrectives !== undefined ? assertText(o.mesuresCorrectives, 'mesuresCorrectives', { maxLength: 2000 }) : undefined,
        notificationAnpdp: o.notificationAnpdp !== undefined ? Boolean(o.notificationAnpdp) : undefined,
        dateNotificationAnpdp: o.dateNotificationAnpdp ? assertDateJournal(o.dateNotificationAnpdp, 'dateNotificationAnpdp') : undefined,
      });
    }));

  Electron.ipcMain.handle('rgpd:conservation:list', (event) =>
    wrapIpc(event, (uid) => svc.listPolitiquesConservation(uid)));
}
