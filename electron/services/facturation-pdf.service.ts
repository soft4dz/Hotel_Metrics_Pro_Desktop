import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getFactureDetail } from './facturation.service';
import {
  formatDzdPdf,
  getEmployeurLegalInfo,
  loadPdfLib,
  saveRhExportFile,
  sanitizePdfText,
  type RhExportResult,
} from './rh-legal-export.util';

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? fallback;
}

function timbreMontant(): number {
  const v = parseFloat(readSetting('invoice_timbre_amount', '0'));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export async function exportFacturationPdf(actorUserId: number, factureId: number): Promise<RhExportResult> {
  const facture = getFactureDetail(actorUserId, factureId);
  if (!['validee', 'payee'].includes(facture.statut)) {
    throw new Error('Seules les factures validées ou payées peuvent être exportées en PDF.');
  }

  const db = getDatabase();
  const client = facture.clientId
    ? db.prepare(`
        SELECT nom, prenom, raison_sociale, type, nif, rc, adresse_ligne1, ville, wilaya
        FROM clients_facturation WHERE id = ? AND deleted_at IS NULL
      `).get(facture.clientId) as Record<string, unknown> | undefined
    : undefined;

  const emp = getEmployeurLegalInfo();
  const timbre = timbreMontant();
  const totalTtcAvecTimbre = facture.montantTtc + timbre;

  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const draw = (text: string, size = 10, isBold = false, x = 45) => {
    page.drawText(sanitizePdfText(text).slice(0, 100), { x, y, size, font: isBold ? bold : font, color: rgb(0.08, 0.1, 0.15) });
    y -= size + 5;
  };

  draw('FACTURE — RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', 11, true);
  draw(emp.raisonSociale, 10, true);
  draw(emp.adresse, 9);
  if (emp.nis) draw(`NIS : ${emp.nis}`, 9);
  if (emp.nssEmployeur) draw(`N° employeur : ${emp.nssEmployeur}`, 9);
  y -= 4;
  draw(`N° facture : ${facture.numero}`, 10, true);
  draw(`Date d'émission : ${facture.dateEmission}`, 9);
  if (facture.dateEcheance) draw(`Date d'échéance : ${facture.dateEcheance}`, 9);
  draw(`Hôtel / unité : ${facture.hotelName}`, 9);
  y -= 4;
  draw('CLIENT', 10, true);
  const clientNom = client
    ? String(client.type === 'entreprise' ? (client.raison_sociale ?? client.nom) : `${client.nom} ${client.prenom ?? ''}`.trim())
    : facture.clientNom;
  draw(clientNom, 9);
  if (client?.nif) draw(`NIF : ${client.nif}`, 9);
  if (client?.rc) draw(`RC : ${client.rc}`, 9);
  if (client?.adresse_ligne1) draw(String(client.adresse_ligne1), 9);
  if (client?.ville) draw(`${client.ville}${client.wilaya ? ` — ${client.wilaya}` : ''}`, 9);
  y -= 6;
  draw('DÉSIGNATION', 9, true, 45);
  draw('QTÉ', 9, true, 300);
  draw('P.U. HT', 9, true, 340);
  draw('TVA %', 9, true, 400);
  draw('TTC', 9, true, 460);
  y -= 2;

  for (const l of facture.lignes) {
    draw(l.designation, 9, false, 45);
    page.drawText(sanitizePdfText(String(l.quantite)), { x: 300, y: y + 14, size: 9, font });
    page.drawText(sanitizePdfText(formatDzdPdf(l.prixUnitaire)), { x: 340, y: y + 14, size: 9, font });
    page.drawText(sanitizePdfText(String(l.tauxTva)), { x: 400, y: y + 14, size: 9, font });
    page.drawText(sanitizePdfText(formatDzdPdf(l.montantTtc)), { x: 460, y: y + 14, size: 9, font });
    y -= 4;
  }

  y -= 8;
  draw(`Total HT : ${formatDzdPdf(facture.montantHt)}`, 10);
  draw(`Total TVA : ${formatDzdPdf(facture.montantTva)}`, 10);
  if (timbre > 0) draw(`Timbre fiscal : ${formatDzdPdf(timbre)}`, 10);
  draw(`TOTAL TTC : ${formatDzdPdf(totalTtcAvecTimbre)}`, 12, true);
  if (facture.montantPaye > 0) draw(`Montant paye : ${formatDzdPdf(facture.montantPaye)}`, 9);
  if (facture.montantRestant > 0) draw(`Reste a payer : ${formatDzdPdf(facture.montantRestant)}`, 9, true);
  y -= 6;
  draw('Mentions légales : facture établie conformément à la réglementation fiscale algérienne.', 8);
  draw('TVA applicable selon les taux en vigueur (9 % hébergement / 19 % prestations).', 8);
  draw('Conservation obligatoire — article 45 du Code des taxes sur le chiffre d\'affaires.', 8);

  const buffer = Buffer.from(await pdf.save());
  writeAuditLog({
    userId: actorUserId,
    action: 'EXPORT',
    module: 'facturation',
    description: `Facture PDF ${facture.numero}`,
  });
  return saveRhExportFile(buffer, `facture_${facture.numero.replace(/\//g, '-')}.pdf`, 'pdf');
}
