import Electron from '../lib/electronApi';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getDatabase } from '../database/sqlite';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { getFacture } from './portmaster-factures.service';
import { listFactures } from './portmaster-factures.service';
import { getDashboard, type DashboardFilters } from './dashboard.service';
import {
  formatDzdPdf,
  getEmployeurLegalInfo,
  loadPdfLib,
  sanitizePdfText,
} from './rh-legal-export.util';

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
  const emp = getEmployeurLegalInfo();
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]);
  let y = 800;

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 800;
  };

  const draw = (text: string, size = 10, useBold = false, x = 40) => {
    if (y < 50) newPage();
    page.drawText(sanitizePdfText(text).slice(0, 95), {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= size + 6;
  };

  draw('TABLEAU DE BORD — HOTEL METRICS PRO', 14, true);
  draw(emp.raisonSociale, 10, true);
  draw(`Periode : ${d.kpis.periodeLabel}`, 10, true);
  draw(`Genere le : ${new Date().toISOString().slice(0, 10)}`, 9);
  y -= 4;

  draw('INDICATEURS CLES', 11, true);
  draw(`CA jour : ${formatDzdPdf(d.kpis.caJour)}`);
  draw(`CA mois : ${formatDzdPdf(d.kpis.caMois)}`);
  draw(`CA annuel : ${formatDzdPdf(d.kpis.caAnnuel)}`);
  draw(`Objectif mois : ${formatDzdPdf(d.kpis.objectifMois)} — Taux realisation : ${d.kpis.tauxRealisation}%`);
  draw(`Ecart objectif : ${formatDzdPdf(d.kpis.ecartObjectif)}`);
  draw(`Encaissements : ${formatDzdPdf(d.kpis.totalEncaissements)} — Taux : ${d.kpis.tauxEncaissement}%`);
  draw(`Variation CA : ${d.kpis.variationCaPct}%`);
  y -= 4;

  draw('HOSPITALITE', 11, true);
  draw(`Taux occupation : ${d.kpis.tauxOccupation}% — RevPAR : ${formatDzdPdf(d.kpis.revPAR ?? 0)}`);
  draw(`ADR : ${formatDzdPdf(d.kpis.adr ?? 0)} — Prix moyen couvert : ${formatDzdPdf(d.kpis.prixMoyenCouvert ?? 0)}`);
  draw(`Chambres : ${d.frequentation.chambres} — Nuitees : ${d.frequentation.nuitees} — Couverts : ${d.frequentation.couverts}`);
  y -= 4;

  draw('SYNTHESE PAR HOTEL', 11, true);
  for (const h of d.parHotel) {
    draw(
      `${h.hotelName} : ${formatDzdPdf(h.realise)} / obj. ${formatDzdPdf(h.objectif)} (${h.tauxRealisation}% — ${h.statut})`,
    );
    draw(`  Encaissements : ${formatDzdPdf(h.encaissements)} (${h.tauxEncaissement}%)`, 9);
  }
  y -= 4;

  draw('REPARTITION PAR RUBRIQUE', 11, true);
  for (const r of d.parRubrique) {
    draw(
      `${r.groupe} : ${formatDzdPdf(r.realise)} (${r.pctTotal}% du CA) — Obj. ${formatDzdPdf(r.objectif)} (${r.tauxObjectif}%)`,
    );
  }

  if (d.alertes.length > 0) {
    y -= 4;
    draw('ALERTES', 11, true);
    for (const a of d.alertes.slice(0, 8)) {
      draw(`${a.niveau.toUpperCase()} : ${a.description}`, 9);
    }
  }

  y -= 6;
  draw('Document de synthese interne — Hotel Metrics Pro Desktop.', 8);

  const suffix = filters.mois ? `${filters.annee}_${String(filters.mois).padStart(2, '0')}` : String(filters.annee);
  const bytes = await pdf.save();
  return saveWithDialog(Buffer.from(bytes), `dashboard_${suffix}.pdf`, 'pdf');
}
