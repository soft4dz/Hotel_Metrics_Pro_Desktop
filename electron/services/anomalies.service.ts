import { getDatabase } from '../database/sqlite';
import type { ActorContext } from './actorContext';
import { getActorContext } from './actorContext';

export interface Anomalie {
  id: number; uuid: string; hotelId: number | null; titre: string;
  description: string | null; categorie: string; severite: string; statut: string;
  signalePar: number | null; signaleParNom: string | null;
  assigneA: number | null; assigneANom: string | null;
  dateSignalement: string; dateResolution: string | null;
  actionCorrective: string | null; createdAt: string; updatedAt: string;
}
export interface CreateAnomalieInput {
  hotelId?: number | null; titre: string; description?: string;
  categorie?: string; severite?: string; assigneA?: number | null;
  dateSignalement?: string;
}
export interface UpdateAnomalieInput {
  titre?: string; description?: string; categorie?: string; severite?: string;
  statut?: string; assigneA?: number | null; dateResolution?: string | null;
  actionCorrective?: string | null;
}
export interface AnomalieFilters {
  hotelId?: number; statut?: string; severite?: string; categorie?: string;
}
export interface AnomalieStats {
  total: number; ouvertes: number; enCours: number; resolues: number; critiques: number;
}

function mapAnomalie(r: Record<string, unknown>): Anomalie {
  return {
    id: r.id as number, uuid: r.uuid as string,
    hotelId: r.hotel_id as number | null, titre: r.titre as string,
    description: r.description as string | null, categorie: r.categorie as string,
    severite: r.severite as string, statut: r.statut as string,
    signalePar: r.signale_par as number | null, signaleParNom: r.signale_par_nom as string | null,
    assigneA: r.assigne_a as number | null, assigneANom: r.assigne_a_nom as string | null,
    dateSignalement: r.date_signalement as string, dateResolution: r.date_resolution as string | null,
    actionCorrective: r.action_corrective as string | null,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

const SQL_BASE = `
  SELECT a.*,
    us.full_name AS signale_par_nom,
    ua.full_name AS assigne_a_nom
  FROM anomalies a
  LEFT JOIN users us ON us.id = a.signale_par
  LEFT JOIN users ua ON ua.id = a.assigne_a
`;

export function listAnomalies(actorId: number, filters: AnomalieFilters = {}): Anomalie[] {
  const db = getDatabase();
  const ctx: ActorContext = getActorContext(actorId);
  const where: string[] = ['a.deleted_at IS NULL'];
  const params: unknown[] = [];

  const hotelId = filters.hotelId ?? (!ctx.allHotelsAccess && ctx.hotelIds[0] ? ctx.hotelIds[0] : null);
  if (hotelId) { where.push('a.hotel_id = ?'); params.push(hotelId); }
  if (filters.statut) { where.push('a.statut = ?'); params.push(filters.statut); }
  if (filters.severite) { where.push('a.severite = ?'); params.push(filters.severite); }
  if (filters.categorie) { where.push('a.categorie = ?'); params.push(filters.categorie); }

  const rows = db.prepare(`${SQL_BASE} WHERE ${where.join(' AND ')} ORDER BY a.severite = 'critique' DESC, a.created_at DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapAnomalie);
}

export function getAnomalieStats(actorId: number, hotelId?: number): AnomalieStats {
  const db = getDatabase();
  const ctx: ActorContext = getActorContext(actorId);
  const hid = hotelId ?? (!ctx.allHotelsAccess && ctx.hotelIds[0] ? ctx.hotelIds[0] : null);
  const cond = hid ? 'hotel_id = ?' : '1=1';
  const params = hid ? [hid] : [];
  const r = db.prepare(`SELECT
    COUNT(*) AS total,
    SUM(statut IN ('ouverte','en_cours')) AS ouvertes_encours,
    SUM(statut = 'ouverte') AS ouvertes,
    SUM(statut = 'en_cours') AS en_cours,
    SUM(statut = 'resolue') AS resolues,
    SUM(severite = 'critique' AND statut NOT IN ('resolue','fermee')) AS critiques
    FROM anomalies WHERE ${cond}`).get(...params) as Record<string, number>;
  return { total: r.total, ouvertes: r.ouvertes + r.en_cours, enCours: r.en_cours, resolues: r.resolues, critiques: r.critiques };
}

export function createAnomalie(actorId: number, input: CreateAnomalieInput): Anomalie {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO anomalies (hotel_id,titre,description,categorie,severite,signale_par,assigne_a,date_signalement)
    VALUES (?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId ?? null, input.titre, input.description ?? null,
      input.categorie ?? 'autre', input.severite ?? 'mineure',
      actorId, input.assigneA ?? null, input.dateSignalement ?? new Date().toISOString().slice(0,10)) as { id: number };
  return db.prepare(`${SQL_BASE} WHERE a.id = ?`).get(res.id) as unknown as Anomalie;
}

export function updateAnomalie(_actorId: number, id: number, input: UpdateAnomalieInput): Anomalie {
  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.titre !== undefined) { sets.push('titre = ?'); params.push(input.titre); }
  if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description); }
  if (input.categorie !== undefined) { sets.push('categorie = ?'); params.push(input.categorie); }
  if (input.severite !== undefined) { sets.push('severite = ?'); params.push(input.severite); }
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.assigneA !== undefined) { sets.push('assigne_a = ?'); params.push(input.assigneA); }
  if (input.dateResolution !== undefined) { sets.push('date_resolution = ?'); params.push(input.dateResolution); }
  if (input.actionCorrective !== undefined) { sets.push('action_corrective = ?'); params.push(input.actionCorrective); }
  params.push(id);
  db.prepare(`UPDATE anomalies SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare(`${SQL_BASE} WHERE a.id = ?`).get(id);
  if (!row) throw new Error('Anomalie introuvable');
  return mapAnomalie(row as Record<string, unknown>);
}

export function deleteAnomalie(_actorId: number, id: number): void {
  getDatabase().prepare(`DELETE FROM anomalies WHERE id = ?`).run(id);
}
