import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { calculatePaieDz } from './rh-paie-dz-engine';
import {
  formatDzdPdf,
  getEmployeurLegalInfo,
  loadPdfLib,
  saveRhExportFile,
  sanitizePdfText,
  type RhExportResult,
} from './rh-legal-export.util';

function assertRhPaie(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export async function exportBulletinPaiePdf(actorUserId: number, bulletinId: number): Promise<RhExportResult> {
  assertRhPaie(actorUserId);
  const row = getDatabase()
    .prepare(`
      SELECT b.*, e.prenom, e.nom, e.nss, e.nin, e.rib, e.enfants_charge, e.dlg_matricule,
             p.nom AS poste_nom, h.name AS hotel_name
      FROM rh_bulletins b
      INNER JOIN rh_employes e ON e.id = b.employe_id AND e.deleted_at IS NULL
      LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
      LEFT JOIN hotels h ON h.id = e.hotel_id
      WHERE b.id = ?
    `)
    .get(bulletinId) as Record<string, unknown> | undefined;

  if (!row) throw new Error('Bulletin introuvable.');

  const brut = row.brut as number;
  const enfants = (row.enfants_charge as number) ?? 0;
  const paie = calculatePaieDz(brut, enfants);
  const emp = getEmployeurLegalInfo();
  const employeNom = `${row.prenom as string} ${row.nom as string}`;
  const periode = row.periode as string;

  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const draw = (text: string, size = 10, isBold = false) => {
    page.drawText(sanitizePdfText(text).slice(0, 95), {
      x: 45,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.08, 0.1, 0.15),
    });
    y -= size + 6;
  };

  draw('BULLETIN DE PAIE — RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 11, true);
  draw(emp.raisonSociale, 10, true);
  draw(emp.adresse, 9);
  if (emp.nssEmployeur) draw(`N° employeur CNAS : ${emp.nssEmployeur}`, 9);
  if (emp.nis) draw(`NIS : ${emp.nis}`, 9);
  y -= 4;
  draw(`Période : ${periode}`, 10, true);
  draw(`Matricule : ${(row.dlg_matricule as string) ?? `EMP-${row.employe_id}`}`, 9);
  draw(`Employé : ${employeNom}`, 9);
  draw(`Poste : ${(row.poste_nom as string) ?? '—'} — ${(row.hotel_name as string) ?? '—'}`, 9);
  draw(`N° SS (NSS) : ${(row.nss as string) ?? '—'}`, 9);
  draw(`NIN : ${(row.nin as string) ?? '—'}`, 9);
  draw(`RIB : ${(row.rib as string) ?? '—'}`, 9);
  y -= 6;
  draw('ÉLÉMENTS DE RÉMUNÉRATION', 10, true);
  draw(`Salaire brut + primes : ${formatDzdPdf(brut)}`, 9);
  draw(`Heures travaillees : ${row.heures_travaillees} h — Jours absence : ${row.jours_absence}`, 9);
  draw(`Primes periode : ${formatDzdPdf(row.primes_total as number)}`, 9);
  y -= 4;
  draw('RETENUES LEGALES', 10, true);
  draw(`Cotisation CNAS salariale (9 %) : ${formatDzdPdf(paie.cotisationSalarie)}`, 9);
  draw(`IRG (bareme en vigueur, ${enfants} enfant(s) a charge) : ${formatDzdPdf(paie.irg)}`, 9);
  draw(`Part patronale CNAS (26 %) — information : ${formatDzdPdf(paie.cotisationPatronale)}`, 9);
  y -= 4;
  draw(`NET A PAYER : ${formatDzdPdf(paie.net)}`, 12, true);
  y -= 8;
  draw('Mentions légales : bulletin établi conformément à la législation algérienne du travail', 8);
  draw('et de sécurité sociale (CNAS). Conservation obligatoire par l\'employeur et le salarié.', 8);
  draw(`Statut bulletin : ${row.statut as string}`, 8);

  const buffer = Buffer.from(await pdf.save());
  writeAuditLog({
    userId: actorUserId,
    action: 'EXPORT',
    module: 'rh',
    description: `Bulletin PDF #${bulletinId} — ${employeNom} ${periode}`,
  });
  return saveRhExportFile(buffer, `bulletin_${periode}_${employeNom.replace(/\s+/g, '_')}.pdf`, 'pdf');
}
