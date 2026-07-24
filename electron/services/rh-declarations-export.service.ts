import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { calculatePaieDz } from './rh-paie-dz-engine';
import { getPaieParams } from './rh-paie-cloture.service';
import {
  csvLine,
  getEmployeurLegalInfo,
  saveRhExportFile,
  type RhExportResult,
} from './rh-legal-export.util';

function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export async function exportDasAnnuelle(actorUserId: number, annee: number): Promise<RhExportResult> {
  assertRhManage(actorUserId);
  const emp = getEmployeurLegalInfo();
  const rows = getDatabase().prepare(`
    SELECT e.nin, e.nss, e.nom, e.prenom, e.dlg_matricule,
           SUM(b.brut) AS brut_annuel,
           SUM(b.primes_total) AS primes_annuelles,
           COUNT(*) AS nb_bulletins
    FROM rh_bulletins b
    INNER JOIN rh_employes e ON e.id = b.employe_id AND e.deleted_at IS NULL
    WHERE b.statut IN ('valide', 'importe') AND b.periode LIKE ?
    GROUP BY e.id
    ORDER BY e.nom, e.prenom
  `).all(`${annee}-%`) as Record<string, unknown>[];

  const lines = [
    csvLine(['DAS', annee, emp.raisonSociale, emp.nis, emp.nssEmployeur]),
    csvLine(['NIN', 'NSS', 'Matricule', 'Nom', 'Prénom', 'Brut annuel', 'Primes', 'CNAS salarié', 'CNAS patronale', 'Accident travail', 'Chômage', 'Formation pro', 'IRG annuel', 'Net annuel', 'Nb bulletins']),
  ];

  const parafiscales = getPaieParams();
  for (const r of rows) {
    const brut = Number(r.brut_annuel) + Number(r.primes_annuelles);
    const paie = calculatePaieDz(brut, 0, parafiscales);
    const irgAnnuel = paie.irg * Number(r.nb_bulletins);
    const netAnnuel = paie.net * Number(r.nb_bulletins);
    lines.push(csvLine([
      String(r.nin ?? ''), String(r.nss ?? ''), String(r.dlg_matricule ?? ''), String(r.nom), String(r.prenom),
      Number(r.brut_annuel).toFixed(2), Number(r.primes_annuelles).toFixed(2),
      (paie.cotisationSalarie * Number(r.nb_bulletins)).toFixed(2),
      (paie.cotisationPatronale * Number(r.nb_bulletins)).toFixed(2),
      (paie.parafiscalesPatronales.accidentTravail * Number(r.nb_bulletins)).toFixed(2),
      (paie.parafiscalesPatronales.assuranceChomage * Number(r.nb_bulletins)).toFixed(2),
      (paie.parafiscalesPatronales.formationPro * Number(r.nb_bulletins)).toFixed(2),
      irgAnnuel.toFixed(2), netAnnuel.toFixed(2), Number(r.nb_bulletins),
    ]));
  }

  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rh', description: `Export DAS ${annee}` });
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `DAS_${annee}.csv`, 'csv');
}

export async function exportCnasMensuelle(actorUserId: number, periode: string): Promise<RhExportResult> {
  assertRhManage(actorUserId);
  const emp = getEmployeurLegalInfo();
  const rows = getDatabase().prepare(`
    SELECT e.nss, e.nom, e.prenom, b.brut, b.primes_total, b.periode
    FROM rh_bulletins b
    INNER JOIN rh_employes e ON e.id = b.employe_id AND e.deleted_at IS NULL
    WHERE b.periode = ? AND b.statut IN ('valide', 'importe')
    ORDER BY e.nom
  `).all(periode) as Record<string, unknown>[];

  let totalBrut = 0;
  let totalCotSal = 0;
  let totalCotPat = 0;
  // Format CNAS dépôt — colonnes officielles documentées :
  // NSS | Nom | Prénom | Brut imposable | Cot. salariale 9% | Cot. patronale 26% | Code établissement | Période AAAA-MM
  const lines = [
    csvLine(['CNAS', periode, emp.raisonSociale, emp.nssEmployeur, emp.agenceCnas]),
    csvLine(['NSS', 'Nom', 'Prénom', 'Brut imposable', 'Cot. salariale 9%', 'Cot. patronale 26%', 'Code établissement', 'Période']),
  ];

  const parafiscales = getPaieParams();
  for (const r of rows) {
    const brut = Number(r.brut) + Number(r.primes_total);
    const paie = calculatePaieDz(brut, 0, parafiscales);
    totalBrut += brut;
    totalCotSal += paie.cotisationSalarie;
    totalCotPat += paie.cotisationPatronale;
    lines.push(csvLine([
      String(r.nss ?? ''), String(r.nom), String(r.prenom), brut.toFixed(2),
      paie.cotisationSalarie.toFixed(2), paie.cotisationPatronale.toFixed(2),
      emp.nis ?? '', periode,
    ]));
  }
  lines.push(csvLine([]));
  lines.push(csvLine(['TOTAUX', '', '', totalBrut.toFixed(2), totalCotSal.toFixed(2), totalCotPat.toFixed(2)]));

  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rh', description: `Export CNAS ${periode}` });
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `CNAS_${periode}.csv`, 'csv');
}

export async function exportVirementsPaie(actorUserId: number, periode: string): Promise<RhExportResult> {
  assertRhManage(actorUserId);
  const emp = getEmployeurLegalInfo();
  const rows = getDatabase().prepare(`
    SELECT e.rib, e.nom, e.prenom, b.net, b.periode
    FROM rh_bulletins b
    INNER JOIN rh_employes e ON e.id = b.employe_id AND e.deleted_at IS NULL
    WHERE b.periode = ? AND b.statut IN ('valide', 'importe') AND b.net > 0
    ORDER BY e.nom
  `).all(periode) as Record<string, unknown>[];

  const lines = [
    csvLine(['VIREMENTS PAIE', periode, emp.raisonSociale]),
    csvLine(['RIB', 'Bénéficiaire', 'Montant net (DZD)', 'Référence']),
  ];

  let total = 0;
  for (const r of rows) {
    const net = Number(r.net);
    total += net;
    const nom = `${r.prenom} ${r.nom}`.trim();
    lines.push(csvLine([String(r.rib ?? ''), nom, net.toFixed(2), `PAIE-${periode}-${nom.replace(/\s+/g, '_')}`]));
  }
  lines.push(csvLine(['', 'TOTAL', total.toFixed(2), '']));

  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rh', description: `Export virements ${periode}` });
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `virements_${periode}.csv`, 'csv');
}

export async function exportAnemEmbauches(actorUserId: number): Promise<RhExportResult> {
  assertRhManage(actorUserId);
  const rows = getDatabase().prepare(`
    SELECT e.nin, e.nss, e.nom, e.prenom, e.date_embauche, p.nom AS poste_nom, h.name AS hotel_name
    FROM rh_employes e
    LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
    LEFT JOIN hotels h ON h.id = e.hotel_id
    WHERE e.deleted_at IS NULL AND e.declaration_anem_statut = 'a_faire'
    ORDER BY e.date_embauche
  `).all() as Record<string, unknown>[];

  const lines = [
    csvLine(['ANEM', 'Déclarations embauche à transmettre']),
    csvLine(['NIN', 'NSS', 'Nom', 'Prénom', 'Date embauche', 'Poste', 'Établissement']),
  ];

  for (const r of rows) {
    lines.push(csvLine([
      String(r.nin ?? ''), String(r.nss ?? ''), String(r.nom), String(r.prenom),
      String(r.date_embauche ?? ''), String(r.poste_nom ?? ''), String(r.hotel_name ?? ''),
    ]));
  }

  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rh', description: 'Export ANEM embauches' });
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `ANEM_embauches_${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
}
