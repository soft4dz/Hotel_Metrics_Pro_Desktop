/**
 * Immobilisations & amortissements — SCF Algérie (classe 2).
 */
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { creerEcriture } from './comptabilite.service';
import { csvLine } from './rh-legal-export.util';

export type ImmoCategorie = 'corporelle' | 'incorporelle' | 'financiere';
export type ImmoStatut = 'actif' | 'cede' | 'sorti';

export interface Immobilisation {
  id: number;
  code: string;
  libelle: string;
  categorie: ImmoCategorie;
  dateAcquisition: string;
  valeurAcquisition: number;
  valeurResiduelle: number;
  dureeAmortissementMois: number;
  methode: string;
  compteImmobilisation: string;
  compteAmortissement: string;
  compteDotation: string;
  hotelId: number | null;
  statut: ImmoStatut;
}

export interface AmortissementLigne {
  id: number;
  immobilisationId: number;
  immoCode: string;
  periode: string;
  dotation: number;
  cumulAmortissement: number;
  vnc: number;
  statut: 'prevu' | 'comptabilise';
  ecritureId: number | null;
}

export interface UpsertImmobilisationInput {
  code: string;
  libelle: string;
  categorie?: ImmoCategorie;
  dateAcquisition: string;
  valeurAcquisition: number;
  valeurResiduelle?: number;
  dureeAmortissementMois?: number;
  methode?: string;
  compteImmobilisation?: string;
  compteAmortissement?: string;
  compteDotation?: string;
  hotelId?: number;
}

function assertCan(actorUserId: number) {
  if (!isGlobalAdminRole(getActorContext(actorUserId).roleCode)) throw new Error('Permission refusée.');
}

function mapImmo(row: Record<string, unknown>): Immobilisation {
  return {
    id: Number(row.id),
    code: String(row.code),
    libelle: String(row.libelle),
    categorie: row.categorie as ImmoCategorie,
    dateAcquisition: String(row.date_acquisition),
    valeurAcquisition: Number(row.valeur_acquisition),
    valeurResiduelle: Number(row.valeur_residuelle),
    dureeAmortissementMois: Number(row.duree_amortissement_mois),
    methode: String(row.methode),
    compteImmobilisation: String(row.compte_immobilisation),
    compteAmortissement: String(row.compte_amortissement),
    compteDotation: String(row.compte_dotation),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    statut: row.statut as ImmoStatut,
  };
}

export function listImmobilisations(actorUserId: number, actifOnly = true): Immobilisation[] {
  assertCan(actorUserId);
  const cond = actifOnly ? "statut = 'actif'" : '1=1';
  return (getDatabase().prepare(`SELECT * FROM immobilisations WHERE ${cond} ORDER BY code`).all() as Record<string, unknown>[]).map(mapImmo);
}

export function upsertImmobilisation(actorUserId: number, input: UpsertImmobilisationInput, existingId?: number): Immobilisation {
  assertCan(actorUserId);
  const db = getDatabase();
  const isUpdate = existingId != null;
  let recordId: number;

  if (isUpdate) {
    db.prepare(`
      UPDATE immobilisations SET code=?, libelle=?, categorie=?, date_acquisition=?, valeur_acquisition=?, valeur_residuelle=?,
        duree_amortissement_mois=?, methode=?, compte_immobilisation=?, compte_amortissement=?, compte_dotation=?, hotel_id=?, updated_at=datetime('now')
      WHERE id=?
    `).run(input.code, input.libelle, input.categorie ?? 'corporelle', input.dateAcquisition, input.valeurAcquisition,
      input.valeurResiduelle ?? 0, input.dureeAmortissementMois ?? 60, input.methode ?? 'lineaire',
      input.compteImmobilisation ?? '218000', input.compteAmortissement ?? '281000', input.compteDotation ?? '681000',
      input.hotelId ?? null, existingId);
    recordId = existingId!;
  } else {
    const r = db.prepare(`
      INSERT INTO immobilisations (code, libelle, categorie, date_acquisition, valeur_acquisition, valeur_residuelle, duree_amortissement_mois, methode, compte_immobilisation, compte_amortissement, compte_dotation, hotel_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.code, input.libelle, input.categorie ?? 'corporelle', input.dateAcquisition, input.valeurAcquisition,
      input.valeurResiduelle ?? 0, input.dureeAmortissementMois ?? 60, input.methode ?? 'lineaire',
      input.compteImmobilisation ?? '218000', input.compteAmortissement ?? '281000', input.compteDotation ?? '681000',
      input.hotelId ?? null);
    recordId = Number(r.lastInsertRowid);
  }
  writeAuditLog({ userId: actorUserId, action: isUpdate ? 'UPDATE' : 'CREATE', module: 'immobilisations', description: `Immobilisation ${input.code}` });
  return mapImmo(db.prepare('SELECT * FROM immobilisations WHERE id = ?').get(recordId) as Record<string, unknown>);
}

function dotationMensuelle(immo: Immobilisation): number {
  const base = immo.valeurAcquisition - immo.valeurResiduelle;
  if (immo.dureeAmortissementMois <= 0) return 0;
  return Math.round((base / immo.dureeAmortissementMois) * 100) / 100;
}

export function genererPlanAmortissement(actorUserId: number, immobilisationId: number): AmortissementLigne[] {
  assertCan(actorUserId);
  const db = getDatabase();
  const immo = mapImmo(db.prepare('SELECT * FROM immobilisations WHERE id = ?').get(immobilisationId) as Record<string, unknown>);
  if (immo.statut !== 'actif') throw new Error('Immobilisation inactive.');

  const mensuel = dotationMensuelle(immo);
  let cumul = 0;
  const start = new Date(immo.dateAcquisition.slice(0, 7) + '-01');

  for (let i = 0; i < immo.dureeAmortissementMois; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periode = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const reste = immo.valeurAcquisition - immo.valeurResiduelle - cumul;
    const dot = Math.min(mensuel, Math.max(0, reste));
    cumul = Math.round((cumul + dot) * 100) / 100;
    const vnc = Math.round((immo.valeurAcquisition - cumul) * 100) / 100;
    db.prepare(`
      INSERT INTO immobilisations_amortissements (immobilisation_id, periode, dotation, cumul_amortissement, vnc, statut)
      VALUES (?, ?, ?, ?, ?, 'prevu')
      ON CONFLICT(immobilisation_id, periode) DO UPDATE SET dotation=excluded.dotation, cumul_amortissement=excluded.cumul_amortissement, vnc=excluded.vnc
    `).run(immobilisationId, periode, dot, cumul, vnc);
    if (dot <= 0) break;
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'immobilisations', description: `Plan amortissement ${immo.code}` });
  return listAmortissements(actorUserId, immobilisationId);
}

export function listAmortissements(actorUserId: number, immobilisationId?: number, periode?: string): AmortissementLigne[] {
  assertCan(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (immobilisationId) { conds.push('a.immobilisation_id = ?'); params.push(immobilisationId); }
  if (periode) { conds.push('a.periode = ?'); params.push(periode); }
  return (getDatabase().prepare(`
    SELECT a.*, i.code as immo_code FROM immobilisations_amortissements a
    JOIN immobilisations i ON i.id = a.immobilisation_id
    WHERE ${conds.join(' AND ')} ORDER BY a.periode
  `).all(...params) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    immobilisationId: Number(r.immobilisation_id),
    immoCode: String(r.immo_code),
    periode: String(r.periode),
    dotation: Number(r.dotation),
    cumulAmortissement: Number(r.cumul_amortissement),
    vnc: Number(r.vnc),
    statut: r.statut as AmortissementLigne['statut'],
    ecritureId: r.ecriture_id ? Number(r.ecriture_id) : null,
  }));
}

export function comptabiliserAmortissementMensuel(actorUserId: number, periode: string): number {
  assertCan(actorUserId);
  const db = getDatabase();
  const lignes = listAmortissements(actorUserId, undefined, periode).filter((l) => l.statut === 'prevu' && l.dotation > 0);
  let count = 0;

  for (const l of lignes) {
    const immo = mapImmo(db.prepare('SELECT * FROM immobilisations WHERE id = ?').get(l.immobilisationId) as Record<string, unknown>);
    const ecriture = creerEcriture(actorUserId, {
      journalCode: 'OD',
      dateEcriture: `${periode}-28`,
      libelle: `Dotation amortissement ${immo.code} — ${periode}`,
      piece: `AMORT-${immo.code}-${periode}`,
      sourceModule: 'immobilisations',
      sourceRef: String(l.id),
      hotelId: immo.hotelId ?? undefined,
      lignes: [
        { compteNumero: immo.compteDotation, debit: l.dotation, credit: 0 },
        { compteNumero: immo.compteAmortissement, debit: 0, credit: l.dotation },
      ],
    }, true);
    db.prepare(`UPDATE immobilisations_amortissements SET statut='comptabilise', ecriture_id=? WHERE id=?`).run(ecriture.id, l.id);
    count += 1;
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'immobilisations', description: `Amortissements comptabilisés ${periode} — ${count} ligne(s)` });
  return count;
}

export function exportImmobilisationsCsv(actorUserId: number): string {
  assertCan(actorUserId);
  const items = listImmobilisations(actorUserId, false);
  const lines = [
    csvLine(['Code', 'Libellé', 'Valeur', 'VNC fin plan', 'Durée mois', 'Statut']),
    ...items.map((i) => {
      const amort = listAmortissements(actorUserId, i.id);
      const vnc = amort.length ? amort[amort.length - 1].vnc : i.valeurAcquisition;
      return csvLine([i.code, i.libelle, i.valeurAcquisition.toFixed(2), vnc.toFixed(2), i.dureeAmortissementMois, i.statut]);
    }),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'immobilisations', description: 'Export registre immobilisations' });
  return lines.join('\n');
}
