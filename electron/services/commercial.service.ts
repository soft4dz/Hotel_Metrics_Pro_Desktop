import { getDatabase } from '../database/sqlite';

export interface Partenaire { id: number; uuid: string; code: string; raisonSociale: string; type: string; contactNom: string | null; email: string | null; telephone: string | null; adresse: string | null; remisePct: number; creditJours: number; isActive: boolean; notes: string | null; createdAt: string }
export interface Opportunite { id: number; uuid: string; hotelId: number | null; partenaireId: number | null; partenaireNom: string | null; titre: string; type: string; statut: string; montantEstime: number | null; probabilite: number; dateEcheance: string | null; notes: string | null; commercialId: number | null; commercialNom: string | null; createdAt: string; updatedAt: string }
export interface CreatePartenaireInput { code: string; raisonSociale: string; type?: string; contactNom?: string; email?: string; telephone?: string; adresse?: string; remisePct?: number; creditJours?: number; notes?: string }
export interface CreateOpportuniteInput { hotelId?: number; partenaireId?: number; titre: string; type?: string; montantEstime?: number; probabilite?: number; dateEcheance?: string; notes?: string }

function mapPart(r: Record<string, unknown>): Partenaire {
  return { id: r.id as number, uuid: r.uuid as string, code: r.code as string, raisonSociale: r.raison_sociale as string, type: r.type as string, contactNom: r.contact_nom as string | null, email: r.email as string | null, telephone: r.telephone as string | null, adresse: r.adresse as string | null, remisePct: r.remise_pct as number, creditJours: r.credit_jours as number, isActive: Boolean(r.is_active), notes: r.notes as string | null, createdAt: r.created_at as string };
}
function mapOpport(r: Record<string, unknown>): Opportunite {
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number | null, partenaireId: r.partenaire_id as number | null, partenaireNom: r.part_nom as string | null, titre: r.titre as string, type: r.type as string, statut: r.statut as string, montantEstime: r.montant_estime as number | null, probabilite: r.probabilite as number, dateEcheance: r.date_echeance as string | null, notes: r.notes as string | null, commercialId: r.commercial_id as number | null, commercialNom: r.comm_nom as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string };
}

export function listPartenaires(actifOnly = true): Partenaire[] {
  const rows = getDatabase().prepare(`SELECT * FROM partenaires ${actifOnly ? 'WHERE is_active = 1' : ''} ORDER BY raison_sociale`).all() as Record<string, unknown>[];
  return rows.map(mapPart);
}

export function createPartenaire(input: CreatePartenaireInput): Partenaire {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO partenaires (code,raison_sociale,type,contact_nom,email,telephone,adresse,remise_pct,credit_jours,notes) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.code, input.raisonSociale, input.type ?? 'agence', input.contactNom ?? null, input.email ?? null, input.telephone ?? null, input.adresse ?? null, input.remisePct ?? 0, input.creditJours ?? 30, input.notes ?? null) as { id: number };
  return listPartenaires(false).find(p => p.id === res.id)!;
}

export function listOpportunites(hotelId?: number, statut?: string): Opportunite[] {
  const db = getDatabase();
  const where: string[] = [];
  const params: unknown[] = [];
  if (hotelId) { where.push('o.hotel_id = ?'); params.push(hotelId); }
  if (statut) { where.push('o.statut = ?'); params.push(statut); }
  const rows = db.prepare(`SELECT o.*, p.raison_sociale AS part_nom, u.full_name AS comm_nom FROM opportunites o LEFT JOIN partenaires p ON p.id = o.partenaire_id LEFT JOIN users u ON u.id = o.commercial_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.date_echeance ASC NULLS LAST, o.created_at DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapOpport);
}

export function createOpportunite(actorId: number, input: CreateOpportuniteInput): Opportunite {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO opportunites (hotel_id,partenaire_id,titre,type,probabilite,montant_estime,date_echeance,notes,commercial_id) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId ?? null, input.partenaireId ?? null, input.titre, input.type ?? 'groupe', input.probabilite ?? 50, input.montantEstime ?? null, input.dateEcheance ?? null, input.notes ?? null, actorId) as { id: number };
  return listOpportunites().find(o => o.id === res.id)!;
}

export function updateOpportunite(id: number, input: Partial<CreateOpportuniteInput> & { statut?: string }): Opportunite {
  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.titre !== undefined) { sets.push('titre = ?'); params.push(input.titre); }
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.probabilite !== undefined) { sets.push('probabilite = ?'); params.push(input.probabilite); }
  if (input.montantEstime !== undefined) { sets.push('montant_estime = ?'); params.push(input.montantEstime); }
  if (input.notes !== undefined) { sets.push('notes = ?'); params.push(input.notes); }
  params.push(id);
  db.prepare(`UPDATE opportunites SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return listOpportunites().find(o => o.id === id)!;
}

export function getCommercialStats(hotelId?: number): { totalPartenaires: number; opportunitesActives: number; montantPipeline: number; tauxConversion: number } {
  const db = getDatabase();
  const nbPart = (db.prepare(`SELECT COUNT(*) AS n FROM partenaires WHERE is_active = 1`).get() as { n: number }).n;
  const where = hotelId ? 'WHERE hotel_id = ?' : '';
  const params = hotelId ? [hotelId] : [];
  const r = db.prepare(`SELECT SUM(statut NOT IN ('gagne','perdu','annule')) AS actives, COALESCE(SUM(CASE WHEN statut NOT IN ('gagne','perdu','annule') THEN COALESCE(montant_estime,0) END),0) AS pipeline, SUM(statut='gagne') AS gagnes, COUNT(*) AS total FROM opportunites ${where}`).get(...params) as Record<string, number>;
  return { totalPartenaires: nbPart, opportunitesActives: r.actives || 0, montantPipeline: r.pipeline, tauxConversion: r.total > 0 ? Math.round((r.gagnes / r.total) * 100) : 0 };
}
