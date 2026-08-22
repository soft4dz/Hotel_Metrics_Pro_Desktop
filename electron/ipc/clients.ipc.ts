import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/clients.service';
import * as crm from '../services/crm.service';

export function registerClientsIpc(): void {
  Electron.ipcMain.handle('clients:getDashboard', (event) =>
    wrapIpc(event, (uid) => svc.getClientsDashboard(uid)));

  Electron.ipcMain.handle('clients:list', (event, filters?: svc.ClientFilters) =>
    wrapIpc(event, (uid) => svc.listClients(uid, filters)));

  Electron.ipcMain.handle('clients:get', (event, id: number) =>
    wrapIpc(event, (uid) => svc.getClientDetail(uid, id)));

  Electron.ipcMain.handle('clients:create', (event, input: svc.CreateClientInput) =>
    wrapIpc(event, (uid) => svc.createClient(uid, input)));

  Electron.ipcMain.handle('clients:update', (event, id: number, input: Partial<svc.CreateClientInput>) =>
    wrapIpc(event, (uid) => svc.updateClient(uid, id, input)));

  Electron.ipcMain.handle('clients:toggleActif', (event, id: number) =>
    wrapIpc(event, (uid) => svc.toggleActifClient(uid, id)));

  Electron.ipcMain.handle('clients:delete', (event, id: number) =>
    wrapIpc(event, (uid) => svc.deleteClient(uid, id)));

  // ── Contacts ────────────────────────────────────────────────────────────────

  Electron.ipcMain.handle('clients:contacts:list', (event, clientId: number) =>
    wrapIpc(event, (uid) => svc.listContacts(uid, clientId)));

  Electron.ipcMain.handle('clients:contacts:create', (event, clientId: number, input: svc.CreateContactInput) =>
    wrapIpc(event, (uid) => svc.createContact(uid, clientId, input)));

  Electron.ipcMain.handle('clients:contacts:update', (event, contactId: number, input: Partial<svc.CreateContactInput>) =>
    wrapIpc(event, (uid) => svc.updateContact(uid, contactId, input)));

  Electron.ipcMain.handle('clients:contacts:delete', (event, contactId: number) =>
    wrapIpc(event, (uid) => svc.deleteContact(uid, contactId)));

  // ── CRM & expérience client ───────────────────────────────────────────────
  Electron.ipcMain.handle('crm:dashboard', (event, hotelId?: number) => wrapIpc(event, uid => crm.crmDashboard(uid, hotelId)));
  Electron.ipcMain.handle('crm:client360', (event, clientId: number) => wrapIpc(event, uid => crm.client360(uid, clientId)));
  Electron.ipcMain.handle('crm:consents:list', (event, clientId: number) => wrapIpc(event, uid => crm.listConsents(uid, clientId)));
  Electron.ipcMain.handle('crm:consents:record', (event, input: Parameters<typeof crm.recordConsent>[1]) => wrapIpc(event, uid => crm.recordConsent(uid, input)));
  Electron.ipcMain.handle('crm:segments:list', event => wrapIpc(event, uid => crm.listSegments(uid)));
  Electron.ipcMain.handle('crm:segments:create', (event, input: Parameters<typeof crm.createSegment>[1]) => wrapIpc(event, uid => crm.createSegment(uid, input)));
  Electron.ipcMain.handle('crm:segments:recompute', (event, id: number) => wrapIpc(event, uid => crm.recomputeSegment(uid, id)));
  Electron.ipcMain.handle('crm:loyalty:enroll', (event, clientId: number) => wrapIpc(event, uid => crm.enrollLoyalty(uid, clientId)));
  Electron.ipcMain.handle('crm:loyalty:move', (event, input: Parameters<typeof crm.moveLoyaltyPoints>[1]) => wrapIpc(event, uid => crm.moveLoyaltyPoints(uid, input)));
  Electron.ipcMain.handle('crm:campaigns:create', (event, input: Parameters<typeof crm.createCampaign>[1]) => wrapIpc(event, uid => crm.createCampaign(uid, input)));
  Electron.ipcMain.handle('crm:campaigns:prepare', (event, id: number) => wrapIpc(event, uid => crm.prepareCampaign(uid, id)));
  Electron.ipcMain.handle('crm:messages:queue', (event, input: Parameters<typeof crm.queueMessage>[1]) => wrapIpc(event, uid => crm.queueMessage(uid, input)));
  Electron.ipcMain.handle('crm:messages:next', (event, limit?: number) => wrapIpc(event, uid => crm.nextMessages(uid, limit)));
  Electron.ipcMain.handle('crm:messages:complete', (event, input: Parameters<typeof crm.completeMessage>[1]) => wrapIpc(event, uid => crm.completeMessage(uid, input)));
  Electron.ipcMain.handle('crm:surveys:create', (event, input: Parameters<typeof crm.createSurvey>[1]) => wrapIpc(event, uid => crm.createSurvey(uid, input)));
  Electron.ipcMain.handle('crm:surveys:invite', (event, input: Parameters<typeof crm.inviteSurvey>[1]) => wrapIpc(event, uid => crm.inviteSurvey(uid, input)));
  Electron.ipcMain.handle('crm:surveys:submit', (event, input: Parameters<typeof crm.submitSurvey>[0]) => wrapIpc(event, () => crm.submitSurvey(input)));
  Electron.ipcMain.handle('crm:nps:dashboard', (event, hotelId: number) => wrapIpc(event, uid => crm.npsDashboard(uid, hotelId)));
  Electron.ipcMain.handle('crm:reviews:ingest', (event, input: Parameters<typeof crm.ingestReview>[1]) => wrapIpc(event, uid => crm.ingestReview(uid, input)));
  Electron.ipcMain.handle('crm:reviews:list', (event, hotelId: number) => wrapIpc(event, uid => crm.listReviews(uid, hotelId)));
  Electron.ipcMain.handle('crm:reviews:respond', (event, id: number, response: string) => wrapIpc(event, uid => crm.respondReview(uid, id, response)));
  Electron.ipcMain.handle('crm:portal:invite', (event, clientId: number, email?: string) => wrapIpc(event, uid => crm.invitePortal(uid, clientId, email)));
  Electron.ipcMain.handle('crm:portal:activate', (event, input: Parameters<typeof crm.activatePortal>[0]) => wrapIpc(event, () => crm.activatePortal(input)));
  Electron.ipcMain.handle('crm:portal:overview', (event, input: Parameters<typeof crm.portalOverview>[0]) => wrapIpc(event, () => crm.portalOverview(input)));
  Electron.ipcMain.handle('crm:precheckin:invite', (event, reservationId: number) => wrapIpc(event, uid => crm.invitePrecheckin(uid, reservationId)));
  Electron.ipcMain.handle('crm:precheckin:submit', (event, input: Parameters<typeof crm.submitPrecheckin>[0]) => wrapIpc(event, () => crm.submitPrecheckin(input)));
  Electron.ipcMain.handle('crm:precheckin:validate', (event, id: number, approved: boolean) => wrapIpc(event, uid => crm.validatePrecheckin(uid, id, approved)));
}
