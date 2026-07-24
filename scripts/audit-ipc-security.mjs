#!/usr/bin/env node
/**
 * Audit sécurité IPC — usage CI / pré-release.
 * node scripts/audit-ipc-security.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTATION_CHANNEL_PATTERN =
  /:(create|update|upsert|delete|submit|calculer|marquer|import|export|comptabiliser|cloturer|prepare|generer|valider|revoke|archive|restore|change|add|remove|send|transmit)/i;

const PHASE3_IPC_FILES = ['rgpd.ipc.ts', 'sifec.ipc.ts', 'fiscalite-avancee.ipc.ts', 'modules-legaux.ipc.ts'];
const LEGAL_IPC_FILES = ['comptabilite.ipc.ts', 'fiscalite-dz.ipc.ts', 'facturation.ipc.ts', 'ged-archivage.ipc.ts', 'workflow.ipc.ts'];

function channelRequiresValidation(channel, handlerParams) {
  const params = (handlerParams ?? '').trim();
  if (!params.includes(',')) return false;
  return MUTATION_CHANNEL_PATTERN.test(channel);
}

function handlerBlockHasValidation(block) {
  return /\bassert[A-Z][A-Za-z]*\s*\(/.test(block);
}

function extractIpcHandlers(source, fileName) {
  const results = [];
  const handleRe = /ipcMain\.handle\s*\(\s*['"]([^'"]+)['"]\s*,/g;
  let match;
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

function coverageForFiles(handlers, files) {
  const subset = handlers.filter((h) => files.includes(h.file) && h.requiresValidation);
  if (subset.length === 0) return 100;
  return Math.round((subset.filter((h) => h.hasValidation).length / subset.length) * 1000) / 10;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ipcDir = path.join(__dirname, '..', 'electron', 'ipc');
const files = readdirSync(ipcDir).filter((f) => f.endsWith('.ipc.ts'));
const allHandlers = files.flatMap((f) => extractIpcHandlers(readFileSync(path.join(ipcDir, f), 'utf-8'), f));
const failures = allHandlers
  .filter((h) => h.requiresValidation && !h.hasValidation)
  .map((h) => `${h.file} → ${h.channel}`);
const phase3Failures = failures.filter((f) => PHASE3_IPC_FILES.some((file) => f.startsWith(`${file} →`)));
const phase3Coverage = coverageForFiles(allHandlers, PHASE3_IPC_FILES);
const legalCoverage = coverageForFiles(allHandlers, LEGAL_IPC_FILES);

console.log('=== Audit sécurité IPC ===');
console.log(`Handlers analysés : ${allHandlers.length}`);
console.log(`Couverture Phase 3  : ${phase3Coverage}%`);
console.log(`Couverture légale   : ${legalCoverage}%`);

if (phase3Failures.length) {
  console.error('\nÉCHEC — handlers Phase 3 sans assert*:');
  phase3Failures.forEach((f) => console.error('  -', f));
  process.exit(1);
}
if (failures.length) {
  console.log(`\nAvertissement — ${failures.length} handler(s) hors Phase 3 sans validation (dette IPC).`);
}
if (phase3Coverage < 100) {
  console.error(`\nÉCHEC — couverture Phase 3 ${phase3Coverage}%`);
  process.exit(1);
}
console.log('\nOK — audit IPC certification passé.');
