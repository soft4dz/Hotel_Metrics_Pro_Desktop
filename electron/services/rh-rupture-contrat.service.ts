import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { sortirEmploye } from './rh.service';
import { calculateStcDz } from './rh-paie-dz-engine';
import { createPdfWithLetterhead } from './pdf-letterhead.util';
import {
  formatDzd,
  getEmployeurLegalInfo,
  saveRhExportFile,
  sanitizePdfText,
  type RhExportResult,
} from './rh-legal-export.util';
import type { ProcessRuptureInput, RhRuptureContrat, RhStcPreview } from '../../src/shared/types/rh';

function assertRhLegal(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function mapRupture(row: Record<string, unknown>): RhRuptureContrat {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    dateSortie: row.date_sortie as string,
    typeRupture: row.type_rupture as RhRuptureContrat['typeRupture'],
    motif: (row.motif as string | null) ?? null,
    salaireBrutRef: row.salaire_brut_ref as number,
    ancienneteMois: row.anciennete_mois as number,
    joursCongesRestants: row.jours_conges_restants as number,
    indemniteConges: row.indemnite_conges as number,
    indemnitePreavis: row.indemnite_preavis as number,
    indemniteLicenciement: row.indemnite_licenciement as number,
    totalBrutStc: row.total_brut_stc as number,
    retenues: row.retenues as number,
    netAPayer: row.net_a_payer as number,
    createdAt: row.created_at as string,
  };
}

export function previewStc(actorUserId: number, input: ProcessRuptureInput): RhStcPreview {
  assertRhLegal(actorUserId);
  const db = getDatabase();
  const emp = db
    .prepare(`
      SELECT e.id, e.prenom || ' ' || e.nom AS nom_complet, e.date_embauche, e.statut_rh
      FROM rh_employes e WHERE e.id = ? AND e.deleted_at IS NULL
    `)
    .get(input.employeId) as
    | { id: number; nom_complet: string; date_embauche: string; statut_rh: string }
    | undefined;
  if (!emp) throw new Error('Employé introuvable.');
  if (emp.statut_rh === 'sorti') throw new Error('Employé déjà sorti.');

  const contrat = db
    .prepare(`SELECT salaire_brut FROM rh_contrats WHERE employe_id = ? AND actif = 1 ORDER BY id DESC LIMIT 1`)
    .get(input.employeId) as { salaire_brut: number } | undefined;
  const salaireBrut = contrat?.salaire_brut ?? 0;
  if (salaireBrut <= 0) throw new Error('Aucun contrat actif avec salaire brut.');

  let joursRestants = input.joursCongesRestants;
  if (joursRestants == null) {
    const annee = Number(input.dateSortie.slice(0, 4));
    const solde = db
      .prepare(`SELECT reste FROM rh_soldes_conges WHERE employe_id = ? AND annee = ? AND type = 'CP'`)
      .get(input.employeId, annee) as { reste: number } | undefined;
    joursRestants = solde?.reste ?? 0;
  }

  const stc = calculateStcDz({
    salaireBrut,
    dateEmbauche: emp.date_embauche,
    dateSortie: input.dateSortie,
    joursCongesRestants: joursRestants,
    typeRupture: input.typeRupture,
  });

  return {
    employeId: input.employeId,
    employeNom: emp.nom_complet,
    dateSortie: input.dateSortie,
    typeRupture: input.typeRupture,
    salaireBrutRef: salaireBrut,
    joursCongesRestants: joursRestants,
    ...stc,
    disclaimer:
      'Estimation indicative selon le Code du travail algérien — validation par expert-comptable / inspection du travail requise avant paiement.',
  };
}

export function processRuptureContrat(actorUserId: number, input: ProcessRuptureInput): RhRuptureContrat {
  assertRhLegal(actorUserId);
  const preview = previewStc(actorUserId, input);
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO rh_ruptures_contrat (
      employe_id, date_sortie, type_rupture, motif, salaire_brut_ref, anciennete_mois,
      jours_conges_restants, indemnite_conges, indemnite_preavis, indemnite_licenciement,
      total_brut_stc, retenues, net_a_payer, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.dateSortie,
    input.typeRupture,
    input.motif?.trim() ?? null,
    preview.salaireBrutRef,
    preview.ancienneteMois,
    preview.joursCongesRestants,
    preview.indemniteConges,
    preview.indemnitePreavis,
    preview.indemniteLicenciement,
    preview.totalBrut,
    preview.retenues,
    preview.netAPayer,
    actorUserId,
  );

  sortirEmploye(actorUserId, input.employeId, {
    dateSortie: input.dateSortie,
    motifSortie: input.motif ?? `Rupture : ${input.typeRupture}`,
  });

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Rupture/STC employé #${input.employeId} — net ${preview.netAPayer} DZD`,
  });

  return listRuptures(actorUserId).find((r) => r.id === Number(result.lastInsertRowid))!;
}

export function listRuptures(actorUserId: number): RhRuptureContrat[] {
  assertRhLegal(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT r.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_ruptures_contrat r
      INNER JOIN rh_employes e ON e.id = r.employe_id
      ORDER BY r.created_at DESC
    `)
    .all()
    .map((row) => mapRupture(row as Record<string, unknown>));
}

export async function exportCertificatTravailPdf(
  actorUserId: number,
  ruptureId: number,
): Promise<RhExportResult> {
  assertRhLegal(actorUserId);
  const row = getDatabase()
    .prepare(`
      SELECT r.*, e.prenom, e.nom, e.date_embauche, e.nss, p.nom AS poste_nom
      FROM rh_ruptures_contrat r
      INNER JOIN rh_employes e ON e.id = r.employe_id
      LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
      WHERE r.id = ?
    `)
    .get(ruptureId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Rupture introuvable.');

  const emp = getEmployeurLegalInfo();
  const ctx = await createPdfWithLetterhead();
  const { font, bold, rgb } = ctx;
  const nom = `${row.prenom as string} ${row.nom as string}`;

  const draw = (text: string, size = 11, isBold = false) => {
    ctx.ensureSpace(size + 10);
    ctx.page.drawText(sanitizePdfText(text).slice(0, 90), {
      x: 50,
      y: ctx.y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.12, 0.18),
    });
    ctx.y -= size + 8;
  };

  draw('CERTIFICAT DE TRAVAIL', 14, true);
  draw(emp.raisonSociale, 11, true);
  draw(emp.adresse, 10);
  ctx.y -= 10;
  draw('Nous soussignés, certifions que :', 10);
  draw(`M./Mme ${nom}`, 11, true);
  draw(`N° SS : ${(row.nss as string) ?? '—'}`, 10);
  draw(`A occupé le poste de : ${(row.poste_nom as string) ?? '—'}`, 10);
  draw(`Du ${row.date_embauche as string} au ${row.date_sortie as string}`, 10);
  draw(`Motif de départ : ${row.type_rupture as string}`, 10);
  ctx.y -= 10;
  draw('Le présent certificat est délivré à l\'intéressé(e) pour servir et valoir ce que de droit,', 10);
  draw('conformément à la législation algérienne du travail.', 10);
  ctx.y -= 20;
  draw(`Fait à __________________, le ${new Date().toLocaleDateString('fr-FR')}`, 10);
  draw('Cachet et signature de l\'employeur', 10, true);

  const buffer = Buffer.from(await ctx.finalize());
  dbMarkCertificat(ruptureId);
  return saveRhExportFile(buffer, `certificat_travail_${nom.replace(/\s+/g, '_')}.pdf`, 'pdf');
}

export async function exportStcPdf(actorUserId: number, ruptureId: number): Promise<RhExportResult> {
  assertRhLegal(actorUserId);
  const row = getDatabase()
    .prepare(`
      SELECT r.*, e.prenom, e.nom, e.nss
      FROM rh_ruptures_contrat r
      INNER JOIN rh_employes e ON e.id = r.employe_id
      WHERE r.id = ?
    `)
    .get(ruptureId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Rupture introuvable.');

  const emp = getEmployeurLegalInfo();
  const nom = `${row.prenom as string} ${row.nom as string}`;
  const ctx = await createPdfWithLetterhead();
  const { font, bold, rgb } = ctx;

  const draw = (text: string, size = 10, isBold = false) => {
    ctx.ensureSpace(size + 9);
    ctx.page.drawText(sanitizePdfText(text).slice(0, 92), {
      x: 50,
      y: ctx.y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.12, 0.18),
    });
    ctx.y -= size + 7;
  };

  draw('SOLDE DE TOUT COMPTE (STC)', 14, true);
  draw(emp.raisonSociale, 11, true);
  draw(`Employé : ${nom} — NSS : ${(row.nss as string) ?? '—'}`, 10);
  draw(`Date de sortie : ${row.date_sortie as string}`, 10);
  draw(`Type de rupture : ${row.type_rupture as string}`, 10);
  ctx.y -= 6;
  draw(`Indemnité congés payés : ${formatDzd(row.indemnite_conges as number)}`, 10);
  draw(`Indemnité de préavis : ${formatDzd(row.indemnite_preavis as number)}`, 10);
  draw(`Indemnité de licenciement : ${formatDzd(row.indemnite_licenciement as number)}`, 10);
  draw(`Total brut : ${formatDzd(row.total_brut_stc as number)}`, 10, true);
  draw(`Retenues CNAS/IRG : ${formatDzd(row.retenues as number)}`, 10);
  draw(`NET À PAYER : ${formatDzd(row.net_a_payer as number)}`, 12, true);
  ctx.y -= 8;
  draw('Document indicatif — sous réserve de validation par la paie et l\'expert-comptable.', 8);

  const buffer = Buffer.from(await ctx.finalize());
  dbMarkStc(ruptureId);
  return saveRhExportFile(buffer, `STC_${nom.replace(/\s+/g, '_')}.pdf`, 'pdf');
}

function dbMarkCertificat(ruptureId: number): void {
  getDatabase()
    .prepare(`UPDATE rh_ruptures_contrat SET certificat_genere_at = datetime('now') WHERE id = ?`)
    .run(ruptureId);
}

function dbMarkStc(ruptureId: number): void {
  getDatabase()
    .prepare(`UPDATE rh_ruptures_contrat SET stc_genere_at = datetime('now') WHERE id = ?`)
    .run(ruptureId);
}
