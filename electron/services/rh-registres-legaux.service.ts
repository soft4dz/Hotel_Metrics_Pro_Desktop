import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { createPdfWithLetterhead, PDF_A4_LANDSCAPE } from './pdf-letterhead.util';
import {
  csvLine,
  getEmployeurLegalInfo,
  saveRhExportFile,
  type RhExportResult,
} from './rh-legal-export.util';
import type {
  CreateRhAccidentInput,
  CreateRhVisiteMedicaleInput,
  RhAccidentTravail,
  RhRegistreCongesLigne,
  RhRegistrePersonnelLigne,
  RhVisiteMedicale,
} from '../../src/shared/types/rh';

function assertRhLegal(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function listRegistrePersonnel(actorUserId: number): RhRegistrePersonnelLigne[] {
  assertRhLegal(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT
        e.id,
        e.nom,
        e.prenom,
        e.date_embauche,
        e.date_sortie,
        e.statut_rh,
        e.nin,
        e.nss,
        p.nom AS poste_nom,
        d.nom AS departement_nom,
        h.name AS hotel_name
      FROM rh_employes e
      LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
      LEFT JOIN rh_departements d ON d.id = p.departement_id
      LEFT JOIN hotels h ON h.id = e.hotel_id
      WHERE e.deleted_at IS NULL
      ORDER BY e.date_embauche, e.nom, e.prenom
    `)
    .all()
    .map((row, idx) => {
      const r = row as Record<string, unknown>;
      return {
        numeroOrdre: idx + 1,
        employeId: r.id as number,
        nom: r.nom as string,
        prenom: r.prenom as string,
        dateEmbauche: r.date_embauche as string,
        dateSortie: (r.date_sortie as string | null) ?? null,
        statutRh: r.statut_rh as RhRegistrePersonnelLigne['statutRh'],
        nin: (r.nin as string | null) ?? null,
        nss: (r.nss as string | null) ?? null,
        posteNom: (r.poste_nom as string | null) ?? null,
        departementNom: (r.departement_nom as string | null) ?? null,
        hotelName: (r.hotel_name as string | null) ?? null,
      };
    });
}

export function listRegistreConges(actorUserId: number, annee?: number): RhRegistreCongesLigne[] {
  assertRhLegal(actorUserId);
  const y = annee ?? new Date().getFullYear();
  return getDatabase()
    .prepare(`
      SELECT s.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_soldes_conges s
      INNER JOIN rh_employes e ON e.id = s.employe_id AND e.deleted_at IS NULL
      WHERE s.annee = ?
      ORDER BY employe_nom, s.type
    `)
    .all(y)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        employeId: r.employe_id as number,
        employeNom: r.employe_nom as string,
        annee: r.annee as number,
        type: r.type as RhRegistreCongesLigne['type'],
        acquis: r.acquis as number,
        pris: r.pris as number,
        reste: r.reste as number,
      };
    });
}

export function listAccidentsTravail(actorUserId: number): RhAccidentTravail[] {
  assertRhLegal(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_accidents_travail a
      INNER JOIN rh_employes e ON e.id = a.employe_id
      ORDER BY a.date_accident DESC
    `)
    .all()
    .map((row) => mapAccident(row as Record<string, unknown>));
}

export function listVisitesMedicales(actorUserId: number): RhVisiteMedicale[] {
  assertRhLegal(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT v.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_visites_medicales v
      INNER JOIN rh_employes e ON e.id = v.employe_id
      ORDER BY v.date_echeance IS NULL, v.date_echeance, v.date_visite DESC
    `)
    .all()
    .map((row) => mapVisite(row as Record<string, unknown>));
}

function mapAccident(row: Record<string, unknown>): RhAccidentTravail {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    dateAccident: row.date_accident as string,
    lieu: (row.lieu as string | null) ?? null,
    nature: row.nature as string,
    mesuresPrises: (row.mesures_prises as string | null) ?? null,
    declarationCnas: Boolean(row.declaration_cnas),
    createdAt: row.created_at as string,
  };
}

function mapVisite(row: Record<string, unknown>): RhVisiteMedicale {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    typeVisite: row.type_visite as RhVisiteMedicale['typeVisite'],
    dateVisite: row.date_visite as string,
    dateEcheance: (row.date_echeance as string | null) ?? null,
    medecin: (row.medecin as string | null) ?? null,
    apte: Boolean(row.apte),
    restrictions: (row.restrictions as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function createAccidentTravail(actorUserId: number, input: CreateRhAccidentInput): RhAccidentTravail {
  assertRhLegal(actorUserId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_accidents_travail (employe_id, date_accident, lieu, nature, mesures_prises, declaration_cnas, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.dateAccident,
    input.lieu?.trim() ?? null,
    input.nature.trim(),
    input.mesuresPrises?.trim() ?? null,
    input.declarationCnas ? 1 : 0,
    actorUserId,
  );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Accident travail employé #${input.employeId}`,
  });
  return listAccidentsTravail(actorUserId).find((a) => a.id === Number(result.lastInsertRowid))!;
}

export function createVisiteMedicale(actorUserId: number, input: CreateRhVisiteMedicaleInput): RhVisiteMedicale {
  assertRhLegal(actorUserId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_visites_medicales (employe_id, type_visite, date_visite, date_echeance, medecin, apte, restrictions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.typeVisite,
    input.dateVisite,
    input.dateEcheance ?? null,
    input.medecin?.trim() ?? null,
    input.apte !== false ? 1 : 0,
    input.restrictions?.trim() ?? null,
  );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Visite médicale employé #${input.employeId}`,
  });
  return listVisitesMedicales(actorUserId).find((v) => v.id === Number(result.lastInsertRowid))!;
}

async function buildRegistrePdf(
  titre: string,
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  const emp = getEmployeurLegalInfo();
  const ctx = await createPdfWithLetterhead(PDF_A4_LANDSCAPE);
  const draw = (text: string, size = 9, isBold = false, x = 40) => ctx.draw(text, size, isBold, x);

  draw('REGISTRE LEGAL — CONFORMITE ALGERIE', 12, true);
  draw(emp.raisonSociale, 10, true);
  draw(emp.adresse, 9);
  if (emp.nssEmployeur) draw(`N° employeur CNAS : ${emp.nssEmployeur}`, 9);
  draw(titre, 11, true);
  draw(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 8);
  ctx.y -= 8;
  draw(headers.join(' | '), 8, true);
  for (const row of rows) {
    draw(row.join(' | '), 8);
  }
  draw('Document indicatif — registre a parapher et conserver selon la reglementation en vigueur.', 7);

  return Buffer.from(await ctx.finalize());
}

export async function exportRegistrePersonnelPdf(actorUserId: number): Promise<RhExportResult> {
  const lignes = listRegistrePersonnel(actorUserId);
  const rows = lignes.map((l) => [
    String(l.numeroOrdre),
    `${l.prenom} ${l.nom}`,
    l.dateEmbauche,
    l.dateSortie ?? '—',
    l.posteNom ?? '—',
    l.nss ?? '—',
    l.statutRh,
  ]);
  const buffer = await buildRegistrePdf(
    'Registre du personnel',
    ['N°', 'Nom', 'Entrée', 'Sortie', 'Poste', 'NSS', 'Statut'],
    rows,
  );
  return saveRhExportFile(buffer, `registre_personnel_${new Date().toISOString().slice(0, 10)}.pdf`, 'pdf');
}

export async function exportRegistrePersonnelCsv(actorUserId: number): Promise<RhExportResult> {
  const lignes = listRegistrePersonnel(actorUserId);
  const lines = [
    csvLine(['N°', 'Nom', 'Prénom', 'Date embauche', 'Date sortie', 'Poste', 'Département', 'NSS', 'NIN', 'Statut']),
    ...lignes.map((l) =>
      csvLine([
        l.numeroOrdre,
        l.nom,
        l.prenom,
        l.dateEmbauche,
        l.dateSortie ?? '',
        l.posteNom ?? '',
        l.departementNom ?? '',
        l.nss ?? '',
        l.nin ?? '',
        l.statutRh,
      ]),
    ),
  ];
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `registre_personnel.csv`, 'csv');
}

export async function exportRegistreCongesPdf(actorUserId: number, annee?: number): Promise<RhExportResult> {
  const y = annee ?? new Date().getFullYear();
  const lignes = listRegistreConges(actorUserId, y);
  const rows = lignes.map((l) => [
    l.employeNom,
    l.type,
    String(l.acquis),
    String(l.pris),
    String(l.reste),
  ]);
  const buffer = await buildRegistrePdf(
    `Registre des congés payés — ${y}`,
    ['Employé', 'Type', 'Acquis', 'Pris', 'Reste'],
    rows,
  );
  return saveRhExportFile(buffer, `registre_conges_${y}.pdf`, 'pdf');
}

export async function exportRegistreAccidentsPdf(actorUserId: number): Promise<RhExportResult> {
  const lignes = listAccidentsTravail(actorUserId);
  const rows = lignes.map((l) => [
    l.dateAccident,
    l.employeNom,
    l.nature,
    l.lieu ?? '—',
    l.declarationCnas ? 'Oui' : 'Non',
  ]);
  const buffer = await buildRegistrePdf(
    'Registre des accidents du travail',
    ['Date', 'Employé', 'Nature', 'Lieu', 'Décl. CNAS'],
    rows,
  );
  return saveRhExportFile(buffer, `registre_accidents.pdf`, 'pdf');
}

export async function exportRegistreVisitesPdf(actorUserId: number): Promise<RhExportResult> {
  const lignes = listVisitesMedicales(actorUserId);
  const rows = lignes.map((l) => [
    l.employeNom,
    l.typeVisite,
    l.dateVisite,
    l.dateEcheance ?? '—',
    l.apte ? 'Apte' : 'Inapte',
  ]);
  const buffer = await buildRegistrePdf(
    'Registre des visites médicales',
    ['Employé', 'Type', 'Visite', 'Échéance', 'Résultat'],
    rows,
  );
  return saveRhExportFile(buffer, `registre_visites_medicales.pdf`, 'pdf');
}
