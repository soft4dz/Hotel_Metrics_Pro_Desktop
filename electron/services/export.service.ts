import Electron from '../lib/electronApi';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getDatabase } from '../database/sqlite';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { getFacture } from './portmaster-factures.service';
import { listFactures } from './portmaster-factures.service';
import { getDashboard, type DashboardFilters } from './dashboard.service';

function assertExport(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (
    userHasPermission(actorUserId, 'reports.export') ||
    userHasPermission(actorUserId, 'portmaster.full') ||
    isGlobalAdminRole(actor.roleCode) ||
    actor.roleCode === 'PDG' ||
    actor.roleCode === 'COMPTABILITE'
  ) {
    return actor;
  }
  assertPermission(actorUserId, 'reports.export');
  return actor;
}

const require = createRequire(import.meta.url);

async function loadExcelJS() {
  const mod = require('exceljs') as { default?: typeof import('exceljs') } & typeof import('exceljs');
  return ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
}

async function loadPdfLib() {
  return require('pdf-lib') as typeof import('pdf-lib');
}

export type ExportKind =
  | 'port_factures'
  | 'port_creances'
  | 'recettes_historique'
  | 'port_contrats'
  | 'dashboard';

export interface ExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
}

async function saveWithDialog(
  buffer: Buffer,
  defaultName: string,
  ext: 'xlsx' | 'pdf',
): Promise<ExportResult> {
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: ext === 'xlsx' ? 'Excel' : 'PDF', extensions: [ext] }],
  });
  if (canceled || !filePath) {
    return { ok: false, message: 'Export annulé.' };
  }
  writeFileSync(filePath, buffer);
  return { ok: true, filePath };
}

export async function exportExcel(actorUserId: number, kind: ExportKind): Promise<ExportResult> {
  assertExport(actorUserId);
  const ExcelJS = await loadExcelJS();
  const db = getDatabase();
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Données');

  if (kind === 'port_factures') {
    sheet.columns = [
      { header: 'N° facture', key: 'numero', width: 18 },
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'TTC', key: 'ttc', width: 14 },
      { header: 'Payé', key: 'paye', width: 14 },
      { header: 'Reste', key: 'reste', width: 14 },
      { header: 'Statut', key: 'statut', width: 14 },
    ];
    for (const f of listFactures(actorUserId)) {
      sheet.addRow({
        numero: f.numero,
        client: f.clientName,
        date: f.dateFacture,
        ttc: f.montantTtc,
        paye: f.paye,
        reste: f.reste,
        statut: f.statut,
      });
    }
  } else if (kind === 'port_creances') {
    sheet.columns = [
      { header: 'Client', key: 'client', width: 30 },
      { header: 'Facture', key: 'numero', width: 18 },
      { header: 'Reste dû', key: 'reste', width: 14 },
      { header: 'Statut', key: 'statut', width: 14 },
    ];
    for (const f of listFactures(actorUserId)) {
      if (f.reste > 0) {
        sheet.addRow({
          client: f.clientName,
          numero: f.numero,
          reste: f.reste,
          statut: f.statut,
        });
      }
    }
  } else if (kind === 'port_contrats') {
    sheet.columns = [
      { header: 'N° contrat', key: 'numero', width: 16 },
      { header: 'Bateau', key: 'bateau', width: 22 },
      { header: 'Emplacement', key: 'emp', width: 12 },
      { header: 'Début', key: 'debut', width: 12 },
      { header: 'Fin', key: 'fin', width: 12 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Statut', key: 'statut', width: 12 },
    ];
    const rows = db
      .prepare(
        `
      SELECT c.numero, b.nom AS bateau, e.code AS emp, c.date_debut, c.date_fin, c.montant_total, c.statut
      FROM port_contrats c
      INNER JOIN port_bateaux b ON b.id = c.bateau_id
      INNER JOIN port_emplacements e ON e.id = c.emplacement_id
      WHERE c.deleted_at IS NULL ORDER BY c.numero
    `,
      )
      .all() as Array<Record<string, unknown>>;
    for (const r of rows) {
      sheet.addRow({
        numero: r.numero,
        bateau: r.bateau,
        emp: r.emp,
        debut: r.date_debut,
        fin: r.date_fin,
        total: r.montant_total,
        statut: r.statut,
      });
    }
  } else if (kind === 'recettes_historique') {
    sheet.columns = [
      { header: 'Hôtel', key: 'hotel', width: 22 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Rubrique', key: 'rub', width: 20 },
      { header: 'Montant', key: 'montant', width: 14 },
      { header: 'Statut', key: 'statut', width: 12 },
    ];
    const rows = db
      .prepare(
        `
      SELECT h.name AS hotel, rj.date_journal, rub.label AS rubrique, rj.montant, rj.statut
      FROM recettes_journalieres rj
      INNER JOIN hotels h ON h.id = rj.hotel_id
      INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
      WHERE rj.deleted_at IS NULL
      ORDER BY rj.date_journal DESC LIMIT 5000
    `,
      )
      .all() as Array<Record<string, unknown>>;
    for (const r of rows) {
      sheet.addRow({
        hotel: r.hotel,
        date: r.date_journal,
        rub: r.rubrique,
        montant: r.montant,
        statut: r.statut,
      });
    }
  }

  sheet.getRow(1).font = { bold: true };
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const name = `export_${kind}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return saveWithDialog(buffer, name, 'xlsx');
}

export async function exportFacturePdf(
  actorUserId: number,
  factureId: number,
): Promise<ExportResult> {
  assertExport(actorUserId);
  const f = getFacture(actorUserId, factureId);
  if (!f) throw new Error('Facture introuvable.');
  if (!f.canPrint) {
    throw new Error('Impression autorisée uniquement après validation de la facture.');
  }

  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const draw = (text: string, size = 11, useBold = false) => {
    page.drawText(text, { x: 50, y, size, font: useBold ? bold : font, color: rgb(0.1, 0.15, 0.2) });
    y -= size + 8;
  };

  draw('HOTEL METRICS PRO — PORTMASTER', 14, true);
  draw(`Facture n° ${f.numero}`, 12, true);
  draw(`Date : ${f.dateFacture}`);
  draw(`Client : ${f.clientName}`);
  if (f.bateauNom) draw(`Bateau : ${f.bateauNom}`);
  if (f.contratNumero) draw(`Contrat : ${f.contratNumero}`);
  if (f.periodeDebut) draw(`Période : ${f.periodeDebut} → ${f.periodeFin ?? '—'}`);
  y -= 10;
  draw(`Montant HT : ${f.montantHt.toLocaleString('fr-FR')} DZD`);
  draw(`TVA : ${f.montantTva.toLocaleString('fr-FR')} DZD`);
  draw(`Montant TTC : ${f.montantTtc.toLocaleString('fr-FR')} DZD`, 12, true);
  draw(`Encaissé : ${f.paye.toLocaleString('fr-FR')} — Reste : ${f.reste.toLocaleString('fr-FR')} DZD`);

  const bytes = await pdf.save();
  return saveWithDialog(Buffer.from(bytes), `${f.numero}.pdf`, 'pdf');
}

export async function exportDashboardExcel(
  actorUserId: number,
  filters: DashboardFilters,
): Promise<ExportResult> {
  assertExport(actorUserId);
  const ExcelJS = await loadExcelJS();
  const d = getDashboard(actorUserId, filters);
  const wb = new ExcelJS.Workbook();

  const kpi = wb.addWorksheet('KPIs');
  kpi.addRow(['Indicateur', 'Valeur']);
  kpi.addRow(['CA jour', d.kpis.caJour]);
  kpi.addRow(['CA mois', d.kpis.caMois]);
  kpi.addRow(['CA annuel', d.kpis.caAnnuel]);
  kpi.addRow(['Objectif', d.kpis.objectifMois]);
  kpi.addRow(['Taux réalisation %', d.kpis.tauxRealisation]);
  kpi.addRow(['Encaissements', d.kpis.totalEncaissements]);
  kpi.addRow(['Taux encaissement %', d.kpis.tauxEncaissement]);
  kpi.getRow(1).font = { bold: true };

  const hotels = wb.addWorksheet('Par hôtel');
  hotels.addRow([
    'Hôtel',
    'Réalisé',
    'Objectif',
    'Taux %',
    'Encaissements',
    'Taux enc. %',
    'Écart',
    'Statut',
  ]);
  for (const h of d.parHotel) {
    hotels.addRow([
      h.hotelName,
      h.realise,
      h.objectif,
      h.tauxRealisation,
      h.encaissements,
      h.tauxEncaissement,
      h.ecartObjectif,
      h.statut,
    ]);
  }
  hotels.getRow(1).font = { bold: true };

  const rub = wb.addWorksheet('Par rubrique');
  rub.addRow(['Rubrique', 'Réalisé', '% total', 'Objectif', 'Taux %']);
  for (const r of d.parRubrique) {
    rub.addRow([r.groupe, r.realise, r.pctTotal, r.objectif, r.tauxObjectif]);
  }
  rub.getRow(1).font = { bold: true };

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return saveWithDialog(
    buffer,
    `dashboard_${filters.annee}_${filters.mois ?? 'periode'}.xlsx`,
    'xlsx',
  );
}

export async function exportDashboardPdf(
  actorUserId: number,
  filters: DashboardFilters,
): Promise<ExportResult> {
  assertExport(actorUserId);
  const d = getDashboard(actorUserId, filters);
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const draw = (text: string, size = 10, useBold = false) => {
    page.drawText(text.slice(0, 90), {
      x: 40,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= size + 6;
  };
  draw('TABLEAU DE BORD — HOTEL METRICS PRO', 14, true);
  draw(`Période : ${d.kpis.periodeLabel}`);
  draw(`CA mois : ${d.kpis.caMois.toLocaleString('fr-FR')} DZD`);
  draw(`Objectif : ${d.kpis.objectifMois.toLocaleString('fr-FR')} — Taux : ${d.kpis.tauxRealisation}%`);
  draw(`Encaissements : ${d.kpis.totalEncaissements.toLocaleString('fr-FR')} DZD`);
  y -= 8;
  draw('Synthèse par hôtel', 12, true);
  for (const h of d.parHotel.slice(0, 12)) {
    draw(`${h.hotelName} — ${h.realise.toLocaleString('fr-FR')} / obj. ${h.objectif.toLocaleString('fr-FR')} (${h.statut})`);
  }
  const bytes = await pdf.save();
  return saveWithDialog(
    Buffer.from(bytes),
    `dashboard_${filters.annee}.pdf`,
    'pdf',
  );
}
