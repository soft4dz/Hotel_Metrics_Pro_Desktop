import { getDatabase } from '../database/sqlite';

export interface Decision {
  id: number; uuid: string; hotelId: number | null; type: string; titre: string;
  contenu: string; priorite: string; statut: string; auteurId: number | null;
  auteurNom: string | null; dateEmission: string; dateEcheance: string | null;
  nbDestinataires: number; nbLu: number; createdAt: string;
}
export interface CreateDecisionInput {
  hotelId?: number | null; type?: string; titre: string; contenu: string;
  priorite?: string; dateEcheance?: string | null; destinataireIds?: number[];
}
export interface UpdateDecisionInput {
  titre?: string; contenu?: string; priorite?: string; statut?: string; dateEcheance?: string | null;
}

function mapDecision(r: Record<string, unknown>): Decision {
  return {
    id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number | null,
    type: r.type as string, titre: r.titre as string, contenu: r.contenu as string,
    priorite: r.priorite as string, statut: r.statut as string,
    auteurId: r.auteur_id as number | null, auteurNom: r.auteur_nom as string | null,
    dateEmission: r.date_emission as string, dateEcheance: r.date_echeance as string | null,
    nbDestinataires: r.nb_dest as number ?? 0, nbLu: r.nb_lu as number ?? 0,
    createdAt: r.created_at as string,
  };
}

export function listDecisions(_actorId: number, hotelId?: number): Decision[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT d.*, u.full_name AS auteur_nom,
      COUNT(DISTINCT dd.user_id) AS nb_dest,
      COUNT(DISTINCT CASE WHEN dd.lu_at IS NOT NULL THEN dd.user_id END) AS nb_lu
    FROM decisions d
    LEFT JOIN users u ON u.id = d.auteur_id
    LEFT JOIN decisions_destinataires dd ON dd.decision_id = d.id
    WHERE d.statut != 'archivee' ${hotelId ? 'AND d.hotel_id = ?' : ''}
    GROUP BY d.id ORDER BY d.date_emission DESC
  `).all(...(hotelId ? [hotelId] : [])) as Record<string, unknown>[];
  return rows.map(mapDecision);
}

export interface DecisionDestinataireStatut {
  userId: number;
  userNom: string;
  lu: boolean;
  luAt: string | null;
}

export function listDecisionsForUser(actorId: number, filters: { unreadOnly?: boolean; hotelId?: number } = {}): Decision[] {
  const db = getDatabase();
  const conds = [`d.statut != 'archivee'`];
  const params: unknown[] = [];
  if (filters.hotelId) { conds.push('d.hotel_id = ?'); params.push(filters.hotelId); }

  const rows = db.prepare(`
    SELECT d.*, u.full_name AS auteur_nom,
      COUNT(DISTINCT dd.user_id) AS nb_dest,
      COUNT(DISTINCT CASE WHEN dd.lu_at IS NOT NULL THEN dd.user_id END) AS nb_lu
    FROM decisions d
    LEFT JOIN users u ON u.id = d.auteur_id
    LEFT JOIN decisions_destinataires dd ON dd.decision_id = d.id
    WHERE ${conds.join(' AND ')}
    GROUP BY d.id ORDER BY d.date_emission DESC
  `).all(...params) as Record<string, unknown>[];

  const decisions = rows.map(mapDecision);
  return decisions.filter((d) => {
    const dests = getDecisionDestinataires(d.id);
    const isDest = dests.some((x) => x.userId === actorId);
    const isAuthor = d.auteurId === actorId;
    if (!isDest && !isAuthor && dests.length > 0) return false;
    if (filters.unreadOnly && isDest) {
      const mine = dests.find((x) => x.userId === actorId);
      return mine ? !mine.lu : false;
    }
    return isAuthor || isDest || dests.length === 0;
  });
}

export function getDecisionDestinataires(decisionId: number): DecisionDestinataireStatut[] {
  const rows = getDatabase().prepare(`
    SELECT dd.user_id, u.full_name AS user_nom, dd.lu_at
    FROM decisions_destinataires dd
    INNER JOIN users u ON u.id = dd.user_id
    WHERE dd.decision_id = ?
    ORDER BY u.full_name
  `).all(decisionId) as Record<string, unknown>[];
  return rows.map((r) => ({
    userId: Number(r.user_id),
    userNom: String(r.user_nom),
    lu: r.lu_at != null,
    luAt: r.lu_at ? String(r.lu_at) : null,
  }));
}

export function createDecision(actorId: number, input: CreateDecisionInput): Decision {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO decisions (hotel_id,type,titre,contenu,priorite,auteur_id,date_echeance)
    VALUES (?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId ?? null, input.type ?? 'decision', input.titre, input.contenu,
      input.priorite ?? 'normale', actorId, input.dateEcheance ?? null) as { id: number };

  if (input.destinataireIds?.length) {
    const stmt = db.prepare(`INSERT OR IGNORE INTO decisions_destinataires (decision_id,user_id) VALUES (?,?)`);
    for (const uid of input.destinataireIds) stmt.run(res.id, uid);
  }
  return getDecision(res.id)!;
}

export function getDecision(id: number): Decision | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT d.*, u.full_name AS auteur_nom,
    COUNT(DISTINCT dd.user_id) AS nb_dest,
    COUNT(DISTINCT CASE WHEN dd.lu_at IS NOT NULL THEN dd.user_id END) AS nb_lu
    FROM decisions d LEFT JOIN users u ON u.id = d.auteur_id
    LEFT JOIN decisions_destinataires dd ON dd.decision_id = d.id
    WHERE d.id = ? GROUP BY d.id`).get(id) as Record<string, unknown> | undefined;
  return row ? mapDecision(row) : null;
}

export function updateDecision(_actorId: number, id: number, input: UpdateDecisionInput): Decision {
  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.titre !== undefined) { sets.push('titre = ?'); params.push(input.titre); }
  if (input.contenu !== undefined) { sets.push('contenu = ?'); params.push(input.contenu); }
  if (input.priorite !== undefined) { sets.push('priorite = ?'); params.push(input.priorite); }
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.dateEcheance !== undefined) { sets.push('date_echeance = ?'); params.push(input.dateEcheance); }
  params.push(id);
  db.prepare(`UPDATE decisions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getDecision(id)!;
}

export function marquerLu(decisionId: number, userId: number): void {
  getDatabase().prepare(`UPDATE decisions_destinataires SET lu_at = datetime('now') WHERE decision_id = ? AND user_id = ? AND lu_at IS NULL`).run(decisionId, userId);
}

export function archiverDecision(id: number): void {
  getDatabase().prepare(`UPDATE decisions SET statut = 'archivee', updated_at = datetime('now') WHERE id = ?`).run(id);
}
