import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/sifec-connector.service';
import {
  assertObject,
  assertPositiveInteger,
  assertText,
} from './validation';
import type { SifecMode } from '../services/sifec-connector.service';

const MODES = new Set(['sandbox', 'production']);

function assertEnum<T extends string>(value: unknown, label: string, allowed: Set<string>): T {
  const s = assertText(value, label, { required: true });
  if (!allowed.has(s)) throw new Error(`${label}: valeur non autorisée`);
  return s as T;
}

export function registerSifecIpc(): void {
  Electron.ipcMain.handle('sifec:dashboard', (event) =>
    wrapIpc(event, (uid) => svc.getSifecDashboard(uid)));

  Electron.ipcMain.handle('sifec:config:get', (event) =>
    wrapIpc(event, (uid) => svc.getSifecConfig(uid)));

  Electron.ipcMain.handle('sifec:config:update', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.updateSifecConfig(uid, {
        mode: o.mode ? assertEnum<SifecMode>(o.mode, 'mode', MODES) : undefined,
        apiBaseUrl: o.apiBaseUrl !== undefined ? (o.apiBaseUrl ? assertText(o.apiBaseUrl, 'apiBaseUrl', { maxLength: 500 }) : null) : undefined,
        apiKeyRef: o.apiKeyRef !== undefined ? (o.apiKeyRef ? assertText(o.apiKeyRef, 'apiKeyRef', { maxLength: 200 }) : null) : undefined,
        nifDeclarant: o.nifDeclarant !== undefined ? (o.nifDeclarant ? assertText(o.nifDeclarant, 'nifDeclarant', { maxLength: 30 }) : null) : undefined,
        actif: o.actif !== undefined ? Boolean(o.actif) : undefined,
      });
    }));

  Electron.ipcMain.handle('sifec:config:test', (event) =>
    wrapIpc(event, (uid) => svc.testSifecConnection(uid)));

  Electron.ipcMain.handle('sifec:factures:list', (event, statut?: string) =>
    wrapIpc(event, (uid) => svc.listFacturesSifec(uid, statut)));

  Electron.ipcMain.handle('sifec:factures:prepare', (event, factureId: number) =>
    wrapIpc(event, (uid) => svc.prepareFactureSifec(uid, assertPositiveInteger(factureId, 'factureId'))));

  Electron.ipcMain.handle('sifec:factures:submit', (event, factureId: number) =>
    wrapIpc(event, (uid) => svc.submitFactureSifec(uid, assertPositiveInteger(factureId, 'factureId'))));

  Electron.ipcMain.handle('sifec:factures:submitBatch', (event, factureIds: unknown) =>
    wrapIpc(event, (uid) => {
      if (!Array.isArray(factureIds)) throw new Error('factureIds doit être un tableau.');
      return svc.submitBatchFacturesSifec(uid, factureIds.map((id, i) => assertPositiveInteger(id, `factureIds[${i}]`)));
    }));

  Electron.ipcMain.handle('sifec:transmissions:list', (event, limit?: number) =>
    wrapIpc(event, (uid) => svc.listSifecTransmissions(uid, limit ?? 100)));
}
