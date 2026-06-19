import { getDatabase } from '../database/sqlite';

export interface Reclamation {
  id: number; uuid: string; hotelId: number | null; hotelNom: string | null; reference: string;
  clientNom: string; clientEmail: string | null; clientTel: string | null;
  canal: string; categorie: string; objet: string; description: string | null;
  priorite: string; statut: string; satisfaction: number | null;
  assigneA: number | null; assigneANom: string | null; reponse: string | null;
  dateReception: string; dateEcheance: string | null; dateResolution: string | null;
  createdAt: string;
}
export interface CreateReclamationInput {
  hotelId?: number | null; clientNom: string; clientEmail?: string; clientTel?: string;
  canal?: string; categorie?: string; objet: string; description?: string;
  priorite?: string; dateEcheance?: string; assigneA?: number | null;
}
export interface UpdateReclamationInput {
  statut?: string; assigneA?: number | null; reponse?: string;
  satisfaction?: number | null; dateResolution?: string | null; priorite?: string;
}
export interface ReclamationStats {
  total: number; ouvertes: number; resolues: number; tauxResolution: number; satisfactionMoy: number | null;
}

function nextReference(db: ReturnType<typeof getDatabase>, hotelId: number | null): string {
  const hid = hotelId ?? 0;
  db.prepare(`INSERT INTO reclamations_seq (hotel_id, last_seq) VALUES (?,1) ON CONFLICT(hotel_id) DO UPDATE SET last_seq = last_seq + 1`).run(hid);
  const { last_seq } = db.prepare(`SELECT last_seq FROM reclamations_seq WHERE hotel_id = ?`).get(hid) as { last_seq: number };
  const year = new Date().getFullYear();
  return `REC-${year}-${String(last_seq).padStart(4, '0')}`;
}

function mapRec(r: Record<string, unknown>): Reclamation {
  return {
    id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number | null,
    hotelNom: (r.hotel_nom as string | null) ?? null,
    reference: r.reference as string, clientNom: r.client_nom as string,
    clientEmail: r.client_email as string | null, clientTel: r.client_tel as string | null,
    canal: r.canal as string, categorie: r.categorie as string, objet: r.objet as string,
    description: r.description as string | null, priorite: r.priorite as string,
    statut: r.statut as string, satisfaction: r.satisfaction as number | null,
    assigneA: r.assigne_a as number | null, assigneANom: r.assigne_a_nom as string | null,
    reponse: r.reponse as string | null,
    dateReception: r.date_reception as string, dateEcheance: r.date_echeance as string | null,
    dateResolution: r.date_resolution as string | null, createdAt: r.created_at as string,
  };
}

export function listReclamations(hotelId?: number, statut?: string): Reclamation[] {
  const db = getDatabase();
  const where: string[] = [];
  const params: unknown[] = [];
  if (hotelId) { where.push('r.hotel_id = ?'); params.push(hotelId); }
  if (statut) { where.push('r.statut = ?'); params.push(statut); }
  const rows = db.prepare(`SELECT r.*, u.full_name AS assigne_a_nom, h.name AS hotel_nom
    FROM reclamations r
    LEFT JOIN users u ON u.id = r.assigne_a
    LEFT JOIN hotels h ON h.id = r.hotel_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.date_reception DESC`)
    .all(...params) as Record<string, unknown>[];
  return rows.map(mapRec);
}

export function createReclamation(_actorId: number, input: CreateReclamationInput): Reclamation {
  const db = getDatabase();
  const ref = nextReference(db, input.hotelId ?? null);
  const res = db.prepare(`INSERT INTO reclamations (hotel_id,reference,client_nom,client_email,client_tel,canal,categorie,objet,description,priorite,assigne_a,date_echeance)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId ?? null, ref, input.clientNom, input.clientEmail ?? null, input.clientTel ?? null,
      input.canal ?? 'reception', input.categorie ?? 'service', input.objet, input.description ?? null,
      input.priorite ?? 'normale', input.assigneA ?? null, input.dateEcheance ?? null) as { id: number };
  const row = db.prepare(`SELECT r.*, u.full_name AS assigne_a_nom, h.name AS hotel_nom
    FROM reclamations r LEFT JOIN users u ON u.id = r.assigne_a LEFT JOIN hotels h ON h.id = r.hotel_id WHERE r.id = ?`).get(res.id);
  if (!row) throw new Error('Réclamation introuvable');
  return mapRec(row as Record<string, unknown>);
}

export function updateReclamation(id: number, input: UpdateReclamationInput): Reclamation {
  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.assigneA !== undefined) { sets.push('assigne_a = ?'); params.push(input.assigneA); }
  if (input.reponse !== undefined) { sets.push('reponse = ?'); params.push(input.reponse); }
  if (input.satisfaction !== undefined) { sets.push('satisfaction = ?'); params.push(input.satisfaction); }
  if (input.dateResolution !== undefined) { sets.push('date_resolution = ?'); params.push(input.dateResolution); }
  if (input.priorite !== undefined) { sets.push('priorite = ?'); params.push(input.priorite); }
  params.push(id);
  db.prepare(`UPDATE reclamations SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare(`SELECT r.*, u.full_name AS assigne_a_nom, h.name AS hotel_nom
    FROM reclamations r LEFT JOIN users u ON u.id = r.assigne_a LEFT JOIN hotels h ON h.id = r.hotel_id WHERE r.id = ?`).get(id);
  if (!row) throw new Error('Réclamation introuvable');
  return mapRec(row as Record<string, unknown>);
}

export function getReclamationStats(hotelId?: number): ReclamationStats {
  const db = getDatabase();
  const cond = hotelId ? 'WHERE hotel_id = ?' : '';
  const params = hotelId ? [hotelId] : [];
  const r = db.prepare(`SELECT COUNT(*) AS total, SUM(statut NOT IN ('resolue','fermee','non_fondee')) AS ouvertes,
    SUM(statut = 'resolue') AS resolues, AVG(satisfaction) AS sat FROM reclamations ${cond}`)
    .get(...params) as Record<string, number>;
  const total = r.total || 0;
  return { total, ouvertes: r.ouvertes || 0, resolues: r.resolues || 0,
    tauxResolution: total > 0 ? Math.round((r.resolues / total) * 100) : 0,
    satisfactionMoy: r.sat ? Math.round(r.sat * 10) / 10 : null };
}
