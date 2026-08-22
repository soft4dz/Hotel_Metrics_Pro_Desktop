import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';

const require = createRequire(import.meta.url);

export interface RhExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
}

export interface RhEmployeurLegalInfo {
  raisonSociale: string;
  adresse: string;
  telephone: string;
  email: string;
  nis: string;
  nssEmployeur: string;
  agenceCnas: string;
}

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? fallback;
}

export function getEmployeurLegalInfo(): RhEmployeurLegalInfo {
  return {
    raisonSociale: readSetting('company_legal_name', readSetting('company_name', 'Raqmi System')),
    adresse: readSetting('company_address', 'Algérie'),
    telephone: readSetting('company_phone', ''),
    email: readSetting('company_email', ''),
    nis: readSetting('rh_employeur_nis', ''),
    nssEmployeur: readSetting('rh_employeur_nss', ''),
    agenceCnas: readSetting('rh_employeur_agence_cnas', ''),
  };
}

export async function saveRhExportFile(
  buffer: Buffer,
  defaultName: string,
  ext: 'pdf' | 'csv',
): Promise<RhExportResult> {
  const labels: Record<string, string> = { pdf: 'PDF', csv: 'CSV' };
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: labels[ext], extensions: [ext] }],
  });
  if (canceled || !filePath) return { ok: false, message: 'Export annulé.' };
  writeFileSync(filePath, buffer);
  return { ok: true, filePath };
}

export async function loadPdfLib() {
  return require('pdf-lib') as typeof import('pdf-lib');
}

export function formatDzd(amount: number): string {
  return `${amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`;
}

/** Texte compatible police PDF standard (Helvetica / WinAnsi). */
export function sanitizePdfText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2010-\u2015\u202f\u00a0]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
}

export function formatDzdPdf(amount: number): string {
  const fixed = amount.toFixed(2).replace('.', ',');
  const [intPart, dec] = fixed.split(',');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped},${dec} DZD`;
}

export function csvLine(cols: (string | number)[]): string {
  return cols
    .map((v) => {
      const s = String(v);
      if (s.includes(';') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(';');
}
