/**
 * Canaux IPC sensibles — mutations et exports réglementaires.
 * Lot 4 Phase 3 : chaque handler listé doit appeler assert* (validation.ts).
 */
export const MUTATION_CHANNEL_PATTERN =
  /:(create|update|upsert|delete|submit|calculer|marquer|import|export|comptabiliser|cloturer|prepare|generer|valider|revoke|archive|restore|change|add|remove|send|transmit)/i;

/** Fichiers Phase 3 — couverture validation 100 % obligatoire (CI). */
export const PHASE3_IPC_FILES = [
  'rgpd.ipc.ts',
  'sifec.ipc.ts',
  'fiscalite-avancee.ipc.ts',
  'modules-legaux.ipc.ts',
] as const;

/** Modules conformité légale Phase 1–2 — couverture élevée requise. */
export const LEGAL_IPC_FILES = [
  'comptabilite.ipc.ts',
  'fiscalite-dz.ipc.ts',
  'facturation.ipc.ts',
  'ged-archivage.ipc.ts',
  'workflow.ipc.ts',
] as const;

export interface IpcHandlerAudit {
  channel: string;
  file: string;
  requiresValidation: boolean;
  hasValidation: boolean;
}

export interface IpcSecurityAuditReport {
  handlers: IpcHandlerAudit[];
  phase3Coverage: number;
  legalCoverage: number;
  failures: string[];
}

export function channelRequiresValidation(channel: string, handlerParams: string): boolean {
  const params = handlerParams.trim();
  const hasUserArgs = params.includes(',');
  if (!hasUserArgs) return false;
  if (MUTATION_CHANNEL_PATTERN.test(channel)) return true;
  if (channel.includes(':input') || channel.endsWith(':upsert')) return true;
  return false;
}

export function handlerBlockHasValidation(block: string): boolean {
  return /\bassert[A-Z][A-Za-z]*\s*\(/.test(block) || /\bvalidate[A-Z][A-Za-z]*\s*\(/.test(block);
}

/** Extrait les blocs handler ipcMain.handle('channel', ...) */
export function extractIpcHandlers(source: string, fileName: string): IpcHandlerAudit[] {
  const results: IpcHandlerAudit[] = [];
  const handleRe = /ipcMain\.handle\s*\(\s*['"]([^'"]+)['"]\s*,/g;
  let match: RegExpExecArray | null;

  while ((match = handleRe.exec(source)) !== null) {
    const channel = match[1];
    const start = match.index;
    const sigSlice = source.slice(start, start + 400);
    const paramMatch = sigSlice.match(/ipcMain\.handle\s*\(\s*['"][^'"]+['"]\s*,\s*(?:async\s*)?\(([^)]*)\)/);
    const handlerParams = paramMatch?.[1] ?? 'event';
    let depth = 0;
    let started = false;
    let end = start;
    for (let i = match.index; i < source.length; i++) {
      const ch = source[i];
      if (ch === '(') { depth++; started = true; }
      else if (ch === ')') {
        depth--;
        if (started && depth === 0) { end = i + 1; break; }
      }
    }
    const block = source.slice(start, end);
    const requiresValidation = channelRequiresValidation(channel, handlerParams);
    const hasValidation = !requiresValidation || handlerBlockHasValidation(block);
    results.push({ channel, file: fileName, requiresValidation, hasValidation });
  }

  return results;
}

export function auditIpcSource(source: string, fileName: string): IpcHandlerAudit[] {
  return extractIpcHandlers(source, fileName);
}

function coverageForFiles(handlers: IpcHandlerAudit[], files: readonly string[]): number {
  const subset = handlers.filter((h) => files.includes(h.file) && h.requiresValidation);
  if (subset.length === 0) return 100;
  const ok = subset.filter((h) => h.hasValidation).length;
  return Math.round((ok / subset.length) * 1000) / 10;
}

export function buildAuditReport(allHandlers: IpcHandlerAudit[]): IpcSecurityAuditReport {
  const failures = allHandlers
    .filter((h) => h.requiresValidation && !h.hasValidation)
    .map((h) => `${h.file} → ${h.channel}`);

  return {
    handlers: allHandlers,
    phase3Coverage: coverageForFiles(allHandlers, PHASE3_IPC_FILES),
    legalCoverage: coverageForFiles(allHandlers, LEGAL_IPC_FILES),
    failures,
  };
}

export function assertCertificationAudit(report: IpcSecurityAuditReport): void {
  const phase3Failures = report.failures.filter((f) =>
    PHASE3_IPC_FILES.some((file) => f.startsWith(`${file} →`)),
  );
  if (report.phase3Coverage < 100) {
    throw new Error(`Couverture validation Phase 3 insuffisante: ${report.phase3Coverage}% (requis 100%)`);
  }
  if (phase3Failures.length > 0) {
    throw new Error(`Handlers Phase 3 sans validation:\n${phase3Failures.join('\n')}`);
  }
}
