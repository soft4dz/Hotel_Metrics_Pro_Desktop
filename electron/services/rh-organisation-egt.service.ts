import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';

export interface OrganigrammeNode {
  id: number;
  type: 'direction' | 'departement' | 'poste';
  libelle: string;
  parentId: number | null;
  effectifCible: number;
  effectifReel: number;
  ecart: number;
}

export interface EffectifEgtSummary {
  directionId: number;
  directionNom: string;
  effectifCible: number;
  effectifReel: number;
  ecart: number;
}

export interface FichePoste {
  id: number;
  posteId: number;
  posteLibelle: string;
  directionId: number | null;
  departementId: number | null;
  missionPrincipale: string | null;
  responsabilites: string | null;
  competencesRequises: string | null;
  indicateursPerformance: string | null;
  version: number;
  actif: boolean;
}

function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function getOrganigrammeEgt(actorUserId: number, hotelId?: number): OrganigrammeNode[] {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const nodes: OrganigrammeNode[] = [];

  const directions = db.prepare(`SELECT id, nom as libelle FROM rh_directions WHERE actif = 1 ORDER BY nom`).all() as { id: number; libelle: string }[];
  for (const d of directions) {
    const cible = (db.prepare(`
      SELECT COALESCE(SUM(effectif_cible),0) as c FROM rh_effectifs_cibles_egt WHERE direction_id=? ${hotelId ? 'AND (hotel_id IS NULL OR hotel_id=?)' : ''}
    `).get(hotelId ? [d.id, hotelId] : [d.id]) as { c: number }).c;
    const reel = (db.prepare(`
      SELECT COUNT(DISTINCT e.id) as c FROM rh_employes e
      INNER JOIN rh_affectations a ON a.employe_id=e.id AND a.statut='active'
      INNER JOIN rh_postes p ON p.id=a.poste_id
      INNER JOIN rh_departements dep ON dep.id=p.departement_id
      WHERE dep.direction_id=? AND e.deleted_at IS NULL AND e.statut_rh='actif' ${hotelId ? 'AND a.hotel_id=?' : ''}
    `).get(hotelId ? [d.id, hotelId] : [d.id]) as { c: number }).c;
    nodes.push({ id: d.id, type: 'direction', libelle: d.libelle, parentId: null, effectifCible: cible, effectifReel: reel, ecart: reel - cible });
  }

  const postes = db.prepare(`
    SELECT p.id, p.nom as libelle, d.direction_id, p.departement_id,
      COALESCE((SELECT effectif_cible FROM rh_effectifs_cibles_egt ec WHERE ec.poste_id=p.id LIMIT 1),0) as cible
    FROM rh_postes p
    INNER JOIN rh_departements d ON d.id = p.departement_id
    WHERE p.actif=1 ORDER BY p.nom
  `).all() as { id: number; libelle: string; direction_id: number | null; departement_id: number; cible: number }[];

  for (const p of postes) {
    const reel = (db.prepare(`
      SELECT COUNT(DISTINCT e.id) as c FROM rh_employes e
      INNER JOIN rh_affectations a ON a.employe_id=e.id AND a.statut='active' AND a.poste_id=?
      WHERE e.deleted_at IS NULL AND e.statut_rh='actif' ${hotelId ? 'AND a.hotel_id=?' : ''}
    `).get(hotelId ? [p.id, hotelId] : [p.id]) as { c: number }).c;
    nodes.push({ id: p.id, type: 'poste', libelle: p.libelle, parentId: p.direction_id ?? null, effectifCible: p.cible, effectifReel: reel, ecart: reel - p.cible });
  }

  return nodes;
}

export function getEffectifsEgtSummary(actorUserId: number, hotelId?: number): EffectifEgtSummary[] {
  const nodes = getOrganigrammeEgt(actorUserId, hotelId);
  const dirs = nodes.filter((n) => n.type === 'direction');
  return dirs.map((d) => ({
    directionId: d.id, directionNom: d.libelle,
    effectifCible: d.effectifCible, effectifReel: d.effectifReel, ecart: d.ecart,
  }));
}

export function listFichesPoste(actorUserId: number, posteId?: number): FichePoste[] {
  assertRhManage(actorUserId);
  const conds = ['fp.actif = 1'];
  const params: unknown[] = [];
  if (posteId) { conds.push('fp.poste_id = ?'); params.push(posteId); }
  return (getDatabase().prepare(`
    SELECT fp.*, p.nom as poste_libelle FROM rh_fiches_poste fp
    INNER JOIN rh_postes p ON p.id = fp.poste_id WHERE ${conds.join(' AND ')} ORDER BY p.nom, fp.version DESC
  `).all(...params) as Record<string, unknown>[]).map(mapFiche);
}

function mapFiche(row: Record<string, unknown>): FichePoste {
  return {
    id: Number(row.id), posteId: Number(row.poste_id), posteLibelle: String(row.poste_libelle ?? ''),
    directionId: row.direction_id ? Number(row.direction_id) : null,
    departementId: row.departement_id ? Number(row.departement_id) : null,
    missionPrincipale: row.mission_principale ? String(row.mission_principale) : null,
    responsabilites: row.responsabilites ? String(row.responsabilites) : null,
    competencesRequises: row.competences_requises ? String(row.competences_requises) : null,
    indicateursPerformance: row.indicateurs_performance ? String(row.indicateurs_performance) : null,
    version: Number(row.version), actif: Boolean(row.actif),
  };
}

export function upsertFichePoste(actorUserId: number, input: {
  posteId: number; directionId?: number; departementId?: number;
  missionPrincipale?: string; responsabilites?: string; competencesRequises?: string; indicateursPerformance?: string;
}): FichePoste {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const current = db.prepare(`SELECT MAX(version) as v FROM rh_fiches_poste WHERE poste_id=?`).get(input.posteId) as { v: number | null };
  const version = (current.v ?? 0) + 1;
  db.prepare(`UPDATE rh_fiches_poste SET actif=0 WHERE poste_id=?`).run(input.posteId);
  const r = db.prepare(`
    INSERT INTO rh_fiches_poste (poste_id, direction_id, departement_id, mission_principale, responsabilites, competences_requises, indicateurs_performance, version, actif)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(input.posteId, input.directionId ?? null, input.departementId ?? null, input.missionPrincipale ?? null, input.responsabilites ?? null, input.competencesRequises ?? null, input.indicateursPerformance ?? null, version);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Fiche poste v${version} poste #${input.posteId}` });
  return mapFiche(db.prepare(`
    SELECT fp.*, p.nom as poste_libelle FROM rh_fiches_poste fp INNER JOIN rh_postes p ON p.id=fp.poste_id WHERE fp.id=?
  `).get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function exportOrganigrammeCsv(actorUserId: number, hotelId?: number): string {
  const nodes = getOrganigrammeEgt(actorUserId, hotelId);
  const lines = ['Type;Libellé;Effectif cible;Effectif réel;Écart', ...nodes.map((n) => [n.type, n.libelle, n.effectifCible, n.effectifReel, n.ecart].join(';'))];
  return lines.join('\n');
}
