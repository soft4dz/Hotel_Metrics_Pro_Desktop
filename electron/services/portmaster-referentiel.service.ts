import { getDatabase } from '../database/sqlite';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
}

export interface BassinItem {
  id: number;
  code: string;
  label: string;
  quaiCount: number;
  emplacementCount: number;
}

export interface QuaiItem {
  id: number;
  bassinId: number;
  bassinCode: string;
  code: string;
  label: string;
  emplacementCount: number;
  occupes: number;
}

export interface EmplacementDetailItem {
  id: number;
  code: string;
  label: string;
  quaiCode: string;
  bassinCode: string;
  longueurMaxM: number | null;
  largeurMaxM: number | null;
  profondeurM: number | null;
  typeEmplacement: string | null;
  statut: string;
  bateauNom: string | null;
  clientName: string | null;
  contratNumero: string | null;
}

export interface ReferentielSearchResult {
  emplacements: EmplacementDetailItem[];
  bateaux: Array<{ id: number; nom: string; immatriculation: string | null }>;
  clients: Array<{ id: number; label: string }>;
}

export function listBassins(actorUserId: number): BassinItem[] {
  assertPortmaster(actorUserId);
  return getDatabase()
    .prepare(
      `
    SELECT
      b.id, b.code, b.label,
      (SELECT COUNT(*) FROM port_quais q WHERE q.bassin_id = b.id AND q.deleted_at IS NULL) AS quaiCount,
      (SELECT COUNT(*) FROM port_emplacements e
        INNER JOIN port_quais q ON q.id = e.quai_id
        WHERE q.bassin_id = b.id AND e.deleted_at IS NULL) AS emplacementCount
    FROM port_bassins b
    WHERE b.deleted_at IS NULL AND b.is_active = 1
    ORDER BY b.code
  `,
    )
    .all() as BassinItem[];
}

export function listQuais(actorUserId: number, bassinId?: number): QuaiItem[] {
  assertPortmaster(actorUserId);
  const conditions = ['q.deleted_at IS NULL', 'q.is_active = 1'];
  const params: unknown[] = [];
  if (bassinId) {
    conditions.push('q.bassin_id = ?');
    params.push(bassinId);
  }

  return getDatabase()
    .prepare(
      `
    SELECT
      q.id, q.bassin_id AS bassinId, bs.code AS bassinCode, q.code, q.label,
      (SELECT COUNT(*) FROM port_emplacements e WHERE e.quai_id = q.id AND e.deleted_at IS NULL) AS emplacementCount,
      (SELECT COUNT(*) FROM port_emplacements e WHERE e.quai_id = q.id AND e.statut = 'occupe' AND e.deleted_at IS NULL) AS occupes
    FROM port_quais q
    INNER JOIN port_bassins bs ON bs.id = q.bassin_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY bs.code, q.code
  `,
    )
    .all(...params) as QuaiItem[];
}

export function listEmplacementsDetail(actorUserId: number, filters?: {
  bassinId?: number;
  quaiId?: number;
  statut?: string;
  search?: string;
}): EmplacementDetailItem[] {
  assertPortmaster(actorUserId);
  const conditions = ['e.deleted_at IS NULL', 'e.is_active = 1'];
  const params: unknown[] = [];

  if (filters?.quaiId) {
    conditions.push('e.quai_id = ?');
    params.push(filters.quaiId);
  } else if (filters?.bassinId) {
    conditions.push('q.bassin_id = ?');
    params.push(filters.bassinId);
  }
  if (filters?.statut) {
    conditions.push('e.statut = ?');
    params.push(filters.statut);
  }
  if (filters?.search?.trim()) {
    conditions.push(
      `(e.code LIKE ? OR e.label LIKE ? OR b.nom LIKE ? OR cl.raison_sociale LIKE ? OR cl.nom LIKE ?)`,
    );
    const q = `%${filters.search.trim()}%`;
    params.push(q, q, q, q, q);
  }

  return getDatabase()
    .prepare(
      `
    SELECT
      e.id, e.code, e.label,
      q.code AS quaiCode, bs.code AS bassinCode,
      e.longueur_max_m AS longueurMaxM, e.largeur_max_m AS largeurMaxM, e.profondeur_m AS profondeurM,
      e.type_emplacement AS typeEmplacement, e.statut,
      bt.nom AS bateauNom,
      COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS clientName,
      c.numero AS contratNumero
    FROM port_emplacements e
    LEFT JOIN port_quais q ON q.id = e.quai_id
    LEFT JOIN port_bassins bs ON bs.id = q.bassin_id
    LEFT JOIN port_contrats c ON c.emplacement_id = e.id AND c.statut = 'actif' AND c.deleted_at IS NULL
    LEFT JOIN port_bateaux bt ON bt.id = c.bateau_id AND bt.deleted_at IS NULL
    LEFT JOIN port_clients cl ON cl.id = c.client_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY bs.code, q.code, e.code
  `,
    )
    .all(...params) as EmplacementDetailItem[];
}

export function searchReferentiel(actorUserId: number, query: string): ReferentielSearchResult {
  assertPortmaster(actorUserId);
  const q = query.trim();
  if (!q) {
    return { emplacements: [], bateaux: [], clients: [] };
  }
  const db = getDatabase();
  const like = `%${q}%`;

  const emplacements = listEmplacementsDetail(actorUserId, { search: q }).slice(0, 20);

  const bateaux = db
    .prepare(
      `
    SELECT id, nom, immatriculation FROM port_bateaux
    WHERE deleted_at IS NULL AND (nom LIKE ? OR immatriculation LIKE ?)
    LIMIT 15
  `,
    )
    .all(like, like) as Array<{ id: number; nom: string; immatriculation: string | null }>;

  const clients = db
    .prepare(
      `
    SELECT id,
      COALESCE(raison_sociale, prenom || ' ' || nom) AS label
    FROM port_clients
    WHERE deleted_at IS NULL AND (
      raison_sociale LIKE ? OR nom LIKE ? OR prenom LIKE ? OR email LIKE ?
    )
    LIMIT 15
  `,
    )
    .all(like, like, like, like) as Array<{ id: number; label: string }>;

  return { emplacements, bateaux, clients };
}
