import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  auditIpcSource,
  buildAuditReport,
  assertCertificationAudit,
  channelRequiresValidation,
  handlerBlockHasValidation,
} from './ipc-security-audit';

const ipcDir = path.join(__dirname);

describe('IPC security audit — Lot 4 industrialisation', () => {
  it('identifie les canaux mutation', () => {
    expect(channelRequiresValidation('rgpd:demandes:create', 'event, input: unknown')).toBe(true);
    expect(channelRequiresValidation('rgpd:dashboard', 'event')).toBe(false);
    expect(channelRequiresValidation('immo:exportCsv', 'event')).toBe(false);
  });

  it('détecte assert* dans un bloc handler', () => {
    const block = "ipcMain.handle('x', (e, id) => wrapIpc(e, (uid) => svc.foo(uid, assertPositiveInteger(id, 'id'))))";
    expect(handlerBlockHasValidation(block)).toBe(true);
  });

  it('Phase 3 IPC — 100 % validation sur mutations', () => {
    const files = readdirSync(ipcDir).filter((f) => f.endsWith('.ipc.ts'));
    const handlers = files.flatMap((f) => auditIpcSource(readFileSync(path.join(ipcDir, f), 'utf-8'), f));
    const report = buildAuditReport(handlers);
    expect(report.phase3Coverage).toBe(100);
    expect(() => assertCertificationAudit(report)).not.toThrow();
  });
});
