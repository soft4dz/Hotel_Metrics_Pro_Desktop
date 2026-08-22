import { getDatabase } from '../database/sqlite';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Electron from '../lib/electronApi';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';

export interface PdgKpi {
  code: string;
  libelle: string;
  domaine: string;
  unite: string;
  value: number;
  level: 'normal' | 'warning' | 'critical';
}

export interface PdgDashboard {
  kpis: PdgKpi[];
  parHotel: { hotelId: number; hotelName: string; caMois: number; occupation: number; creances: number }[];
  generatedAt: string;
}

export function getDashboardPdg(actorUserId: number): PdgDashboard {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Dashboard PDG réservé à la direction.');
  void actor;

  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const caJour = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM recettes_journalieres WHERE date_journal=? AND deleted_at IS NULL
  `).get(today) as { v: number }).v;

  const caMois = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM recettes_journalieres WHERE strftime('%Y-%m', date_journal)=? AND deleted_at IS NULL
  `).get(month) as { v: number }).v;

  const objectif = (db.prepare(`
    SELECT COALESCE(SUM(objectif_hebergement + objectif_restauration + objectif_boissons + objectif_autres),0) as v
    FROM objectifs WHERE annee=? AND mois=?
  `).get(Number(month.slice(0, 4)), Number(month.slice(5, 7))) as { v: number }).v ?? 0;

  const tauxObjectif = objectif > 0 ? Math.round((caMois / objectif) * 100) : 0;
  const creances = (db.prepare(`
    SELECT COALESCE(SUM(montant_restant),0) as v FROM global_creances WHERE statut IN ('ouverte','partielle')
  `).get() as { v: number }).v;

  const encJour = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM encaissements WHERE date_encaissement=? AND statut='confirme' AND deleted_at IS NULL
  `).get(today) as { v: number }).v;

  const anomalies = (db.prepare(`SELECT COUNT(*) as c FROM anomalies WHERE statut IN ('ouverte','en_cours') AND deleted_at IS NULL`).get() as { c: number }).c;
  const reclamations = (db.prepare(`SELECT COUNT(*) as c FROM reclamations WHERE statut NOT IN ('cloturee','resolue')`).get() as { c: number }).c;

  const kpis: PdgKpi[] = [
    { code: 'CA_JOUR', libelle: 'CA du jour', domaine: 'finance', unite: 'DA', value: caJour, level: 'normal' },
    { code: 'CA_MOIS', libelle: 'CA du mois', domaine: 'finance', unite: 'DA', value: caMois, level: 'normal' },
    { code: 'OBJECTIF_REALISE', libelle: 'Objectif vs réalisé', domaine: 'finance', unite: '%', value: tauxObjectif, level: tauxObjectif < 70 ? 'critical' : tauxObjectif < 90 ? 'warning' : 'normal' },
    { code: 'CREANCES_OUVERTES', libelle: 'Créances ouvertes', domaine: 'finance', unite: 'DA', value: creances, level: creances > 1000000 ? 'critical' : creances > 300000 ? 'warning' : 'normal' },
    { code: 'ENCAISSEMENTS_JOUR', libelle: 'Encaissements jour', domaine: 'tresorerie', unite: 'DA', value: encJour, level: 'normal' },
    { code: 'ANOMALIES_OUVERTES', libelle: 'Anomalies', domaine: 'controle', unite: 'nb', value: anomalies, level: anomalies > 10 ? 'critical' : anomalies > 0 ? 'warning' : 'normal' },
    { code: 'RECLAMATIONS_OUVERTES', libelle: 'Réclamations', domaine: 'qualite', unite: 'nb', value: reclamations, level: reclamations > 5 ? 'warning' : 'normal' },
  ];

  const parHotel = (db.prepare(`
    SELECT h.id as hotel_id, h.name as hotel_name,
      COALESCE((SELECT SUM(montant) FROM recettes_journalieres r WHERE r.hotel_id=h.id AND strftime('%Y-%m', r.date_journal)=? AND r.deleted_at IS NULL),0) as ca_mois,
      COALESCE((SELECT SUM(montant_restant) FROM global_creances c WHERE c.hotel_id=h.id AND c.statut IN ('ouverte','partielle')),0) as creances
    FROM hotels h WHERE h.deleted_at IS NULL ORDER BY h.name
  `).all(month) as { hotel_id: number; hotel_name: string; ca_mois: number; creances: number }[]).map((h) => ({
    hotelId: h.hotel_id, hotelName: h.hotel_name, caMois: h.ca_mois, occupation: 0, creances: h.creances,
  }));

  return { kpis, parHotel, generatedAt: new Date().toISOString() };
}

export function exportPdgReportCsv(actorUserId: number): string {
  const dash = getDashboardPdg(actorUserId);
  const lines = [
    'Code;Libellé;Valeur;Unité;Niveau',
    ...dash.kpis.map((k) => [k.code, k.libelle, k.value, k.unite, k.level].join(';')),
    '',
    'Unité;CA mois;Créances',
    ...dash.parHotel.map((h) => [h.hotelName, h.caMois, h.creances].join(';')),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'dashboard_pdg', description: 'Export rapport PDG CSV' });
  return lines.join('\n');
}

const require = createRequire(import.meta.url);

async function loadExcelJS() {
  const mod = require('exceljs') as { default?: typeof import('exceljs') } & typeof import('exceljs');
  return ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
}

export interface PdgExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
}

/** Rapport mensuel consolidé pour Conseil d'Administration (Excel). */
export async function exportPdgReportMensuelXlsx(actorUserId: number, periode?: string): Promise<PdgExportResult> {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Export PDG réservé à la direction.');

  const month = periode ?? new Date().toISOString().slice(0, 7);
  const db = getDatabase();
  const dash = getDashboardPdg(actorUserId);

  const parHotel = (db.prepare(`
    SELECT h.id as hotel_id, h.name as hotel_name,
      COALESCE((SELECT SUM(montant) FROM recettes_journalieres r WHERE r.hotel_id=h.id AND strftime('%Y-%m', r.date_journal)=? AND r.deleted_at IS NULL),0) as ca_mois,
      COALESCE((SELECT SUM(montant_restant) FROM global_creances c WHERE c.hotel_id=h.id AND c.statut IN ('ouverte','partielle')),0) as creances
    FROM hotels h WHERE h.deleted_at IS NULL ORDER BY h.name
  `).all(month) as { hotel_name: string; ca_mois: number; creances: number }[]);

  const objectif = (db.prepare(`
    SELECT COALESCE(SUM(objectif_hebergement + objectif_restauration + objectif_boissons + objectif_autres),0) as v
    FROM objectifs WHERE annee=? AND mois=?
  `).get(Number(month.slice(0, 4)), Number(month.slice(5, 7))) as { v: number }).v ?? 0;

  const caMoisGlobal = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM recettes_journalieres
    WHERE strftime('%Y-%m', date_journal)=? AND deleted_at IS NULL
  `).get(month) as { v: number }).v;

  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Raqmi System';
  wb.created = new Date();

  const synth = wb.addWorksheet('Synthèse CA');
  synth.columns = [
    { header: 'Indicateur', key: 'libelle', width: 32 },
    { header: 'Valeur', key: 'value', width: 18 },
    { header: 'Unité', key: 'unite', width: 10 },
  ];
  synth.addRow({ libelle: 'Période', value: month, unite: '' });
  synth.addRow({ libelle: 'CA mensuel consolidé', value: caMoisGlobal, unite: 'DA' });
  synth.addRow({ libelle: 'Objectif mensuel', value: objectif, unite: 'DA' });
  synth.addRow({
    libelle: 'Taux réalisation objectif',
    value: objectif > 0 ? Math.round((caMoisGlobal / objectif) * 100) : 0,
    unite: '%',
  });
  for (const k of dash.kpis) {
    synth.addRow({ libelle: k.libelle, value: k.value, unite: k.unite });
  }

  const units = wb.addWorksheet('Par unité');
  units.columns = [
    { header: 'Unité', key: 'hotel', width: 28 },
    { header: 'CA mois', key: 'ca', width: 16 },
    { header: 'Créances ouvertes', key: 'creances', width: 18 },
  ];
  for (const h of parHotel) {
    units.addRow({ hotel: h.hotel_name, ca: h.ca_mois, creances: h.creances });
  }

  const detail = wb.addWorksheet('CA journalier');
  detail.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Unité', key: 'hotel', width: 24 },
    { header: 'Montant', key: 'montant', width: 14 },
  ];
  const dailyRows = db.prepare(`
    SELECT r.date_journal as d, h.name as hotel, SUM(r.montant) as m
    FROM recettes_journalieres r INNER JOIN hotels h ON h.id=r.hotel_id
    WHERE strftime('%Y-%m', r.date_journal)=? AND r.deleted_at IS NULL
    GROUP BY r.date_journal, r.hotel_id ORDER BY r.date_journal, h.name
  `).all(month) as { d: string; hotel: string; m: number }[];
  for (const row of dailyRows) {
    detail.addRow({ date: row.d, hotel: row.hotel, montant: row.m });
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const defaultName = `Rapport_CA_mensuel_${month}.xlsx`;
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { ok: false, message: 'Export annulé.' };

  writeFileSync(filePath, buffer);
  writeAuditLog({
    userId: actorUserId, action: 'EXPORT', module: 'dashboard_pdg',
    description: `Export rapport mensuel CA ${month} → ${filePath}`,
  });
  return { ok: true, filePath };
}
