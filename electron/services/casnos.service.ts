/**
 * CASNOS — cotisations travailleurs non salariés (Algérie).
 */
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { csvLine } from './rh-legal-export.util';

export type CasnosTypeAffilie = 'gerant' | 'prestataire' | 'artisan' | 'autre';
export type CasnosDeclStatut = 'brouillon' | 'calculee' | 'declaree' | 'payee';

export interface CasnosAffilie {
  id: number;
  typeAffilie: CasnosTypeAffilie;
  nom: string;
  prenom: string | null;
  nin: string | null;
  nif: string | null;
  numeroCasnos: string | null;
  activite: string | null;
  dateAffiliation: string | null;
  tauxCotisation: number;
  revenuAssiette: number;
  hotelId: number | null;
  actif: boolean;
}

export interface CasnosDeclaration {
  id: number;
  affilieId: number;
  affilieNom: string;
  periode: string;
  revenuDeclare: number;
  cotisationCalculee: number;
  statut: CasnosDeclStatut;
  referenceCasnos: string | null;
  dateDeclaration: string | null;
}

export interface UpsertCasnosAffilieInput {
  typeAffilie?: CasnosTypeAffilie;
  nom: string;
  prenom?: string;
  nin?: string;
  nif?: string;
  numeroCasnos?: string;
  activite?: string;
  dateAffiliation?: string;
  tauxCotisation?: number;
  revenuAssiette?: number;
  hotelId?: number;
  actif?: boolean;
}

function assertCan(actorUserId: number) {
  if (!isGlobalAdminRole(getActorContext(actorUserId).roleCode)) throw new Error('Permission refusée.');
}

function mapAffilie(row: Record<string, unknown>): CasnosAffilie {
  return {
    id: Number(row.id),
    typeAffilie: row.type_affilie as CasnosTypeAffilie,
    nom: String(row.nom),
    prenom: row.prenom ? String(row.prenom) : null,
    nin: row.nin ? String(row.nin) : null,
    nif: row.nif ? String(row.nif) : null,
    numeroCasnos: row.numero_casnos ? String(row.numero_casnos) : null,
    activite: row.activite ? String(row.activite) : null,
    dateAffiliation: row.date_affiliation ? String(row.date_affiliation) : null,
    tauxCotisation: Number(row.taux_cotisation),
    revenuAssiette: Number(row.revenu_assiette),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    actif: Boolean(row.actif),
  };
}

export function listCasnosAffilies(actorUserId: number, actifOnly = true): CasnosAffilie[] {
  assertCan(actorUserId);
  const cond = actifOnly ? 'actif = 1' : '1=1';
  return (getDatabase().prepare(`SELECT * FROM casnos_affilies WHERE ${cond} ORDER BY nom`).all() as Record<string, unknown>[]).map(mapAffilie);
}

export function upsertCasnosAffilie(actorUserId: number, input: UpsertCasnosAffilieInput, id?: number): CasnosAffilie {
  assertCan(actorUserId);
  const db = getDatabase();
  if (id) {
    db.prepare(`
      UPDATE casnos_affilies SET type_affilie=?, nom=?, prenom=?, nin=?, nif=?, numero_casnos=?, activite=?, date_affiliation=?,
        taux_cotisation=?, revenu_assiette=?, hotel_id=?, actif=? WHERE id=?
    `).run(input.typeAffilie ?? 'prestataire', input.nom, input.prenom ?? null, input.nin ?? null, input.nif ?? null,
      input.numeroCasnos ?? null, input.activite ?? null, input.dateAffiliation ?? null,
      input.tauxCotisation ?? 15, input.revenuAssiette ?? 0, input.hotelId ?? null, input.actif !== false ? 1 : 0, id);
  } else {
    const r = db.prepare(`
      INSERT INTO casnos_affilies (type_affilie, nom, prenom, nin, nif, numero_casnos, activite, date_affiliation, taux_cotisation, revenu_assiette, hotel_id, actif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.typeAffilie ?? 'prestataire', input.nom, input.prenom ?? null, input.nin ?? null, input.nif ?? null,
      input.numeroCasnos ?? null, input.activite ?? null, input.dateAffiliation ?? null,
      input.tauxCotisation ?? 15, input.revenuAssiette ?? 0, input.hotelId ?? null, input.actif !== false ? 1 : 0);
    id = Number(r.lastInsertRowid);
  }
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'casnos', description: `Affilié CASNOS ${input.nom}` });
  return mapAffilie(db.prepare('SELECT * FROM casnos_affilies WHERE id = ?').get(id) as Record<string, unknown>);
}

export function calculerDeclarationCasnos(actorUserId: number, affilieId: number, periode: string, revenuDeclare?: number): CasnosDeclaration {
  assertCan(actorUserId);
  const db = getDatabase();
  const aff = mapAffilie(db.prepare('SELECT * FROM casnos_affilies WHERE id = ?').get(affilieId) as Record<string, unknown>);
  const revenu = revenuDeclare ?? aff.revenuAssiette / 12;
  const cotisation = Math.round(revenu * aff.tauxCotisation) / 100;

  db.prepare(`
    INSERT INTO casnos_declarations (affilie_id, periode, revenu_declare, cotisation_calculee, statut, created_by, updated_at)
    VALUES (?, ?, ?, ?, 'calculee', ?, datetime('now'))
    ON CONFLICT(affilie_id, periode) DO UPDATE SET revenu_declare=excluded.revenu_declare, cotisation_calculee=excluded.cotisation_calculee, statut='calculee', updated_at=datetime('now')
  `).run(affilieId, periode, revenu, cotisation, actorUserId);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'casnos', description: `Déclaration CASNOS ${aff.nom} ${periode}` });
  return listCasnosDeclarations(actorUserId, periode).find((d) => d.affilieId === affilieId)!;
}

export function listCasnosDeclarations(actorUserId: number, periode?: string): CasnosDeclaration[] {
  assertCan(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (periode) { conds.push('d.periode = ?'); params.push(periode); }
  return (getDatabase().prepare(`
    SELECT d.*, a.nom as affilie_nom FROM casnos_declarations d
    JOIN casnos_affilies a ON a.id = d.affilie_id
    WHERE ${conds.join(' AND ')} ORDER BY d.periode DESC, a.nom
  `).all(...params) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    affilieId: Number(r.affilie_id),
    affilieNom: String(r.affilie_nom),
    periode: String(r.periode),
    revenuDeclare: Number(r.revenu_declare),
    cotisationCalculee: Number(r.cotisation_calculee),
    statut: r.statut as CasnosDeclStatut,
    referenceCasnos: r.reference_casnos ? String(r.reference_casnos) : null,
    dateDeclaration: r.date_declaration ? String(r.date_declaration) : null,
  }));
}

export function marquerDeclarationCasnosDeclaree(actorUserId: number, id: number, referenceCasnos: string): CasnosDeclaration {
  assertCan(actorUserId);
  const db = getDatabase();
  db.prepare(`
    UPDATE casnos_declarations SET statut='declaree', reference_casnos=?, date_declaration=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(referenceCasnos, id);
  const row = db.prepare(`
    SELECT d.*, a.nom as affilie_nom FROM casnos_declarations d JOIN casnos_affilies a ON a.id = d.affilie_id WHERE d.id=?
  `).get(id) as Record<string, unknown>;
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'casnos', description: `CASNOS déclaré ref ${referenceCasnos}` });
  return {
    id: Number(row.id), affilieId: Number(row.affilie_id), affilieNom: String(row.affilie_nom),
    periode: String(row.periode), revenuDeclare: Number(row.revenu_declare), cotisationCalculee: Number(row.cotisation_calculee),
    statut: 'declaree', referenceCasnos, dateDeclaration: new Date().toISOString(),
  };
}

export function exportCasnosCsv(actorUserId: number, periode: string): string {
  assertCan(actorUserId);
  const decls = listCasnosDeclarations(actorUserId, periode);
  const lines = [
    csvLine(['Période', 'Affilié', 'Revenu', 'Cotisation', 'Statut', 'Réf CASNOS']),
    ...decls.map((d) => csvLine([d.periode, d.affilieNom, d.revenuDeclare.toFixed(2), d.cotisationCalculee.toFixed(2), d.statut, d.referenceCasnos ?? ''])),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'casnos', description: `Export CASNOS ${periode}` });
  return lines.join('\n');
}

export function calculerDeclarationsCasnosPeriode(actorUserId: number, periode: string): CasnosDeclaration[] {
  assertCan(actorUserId);
  const affilies = listCasnosAffilies(actorUserId);
  return affilies.map((a) => calculerDeclarationCasnos(actorUserId, a.id, periode));
}
