import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { enqueueSync } from './sync.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

export interface MouvementListItem {
  id: number;
  bateauNom: string;
  typeMouvement: string;
  emplacementFromCode: string | null;
  emplacementToCode: string | null;
  dateMouvement: string;
  motif: string | null;
  statut: string;
}

export interface SaveMouvementInput {
  bateauId: number;
  typeMouvement: 'arrivee' | 'depart' | 'changement_emplacement';
  emplacementFromId?: number | null;
  emplacementToId?: number | null;
  dateMouvement: string;
  motif?: string | null;
}

function syncEmplacementStatut(db: ReturnType<typeof getDatabase>, emplacementId: number): void {
  const actif = db
    .prepare(
      `SELECT 1 FROM port_contrats WHERE emplacement_id = ? AND statut = 'actif' AND deleted_at IS NULL`,
    )
    .get(emplacementId);
  const statut = actif ? 'occupe' : 'disponible';
  db.prepare(
    `UPDATE port_emplacements SET statut = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(statut, emplacementId);
}

export function listMouvements(actorUserId: number, limit = 100): MouvementListItem[] {
  assertPortmaster(actorUserId);
  const rows = getDatabase()
    .prepare(
      `
    SELECT m.id, b.nom AS bateau_nom, m.type_mouvement, m.date_mouvement, m.motif, m.statut,
           ef.code AS from_code, et.code AS to_code
    FROM port_mouvements m
    JOIN port_bateaux b ON b.id = m.bateau_id
    LEFT JOIN port_emplacements ef ON ef.id = m.emplacement_from_id
    LEFT JOIN port_emplacements et ON et.id = m.emplacement_to_id
    ORDER BY m.date_mouvement DESC, m.id DESC
    LIMIT ?
  `,
    )
    .all(limit) as Array<{
      id: number;
      bateau_nom: string;
      type_mouvement: string;
      date_mouvement: string;
      motif: string | null;
      statut: string;
      from_code: string | null;
      to_code: string | null;
    }>;

  return rows.map((r) => ({
    id: r.id,
    bateauNom: r.bateau_nom,
    typeMouvement: r.type_mouvement,
    emplacementFromCode: r.from_code,
    emplacementToCode: r.to_code,
    dateMouvement: r.date_mouvement,
    motif: r.motif,
    statut: r.statut,
  }));
}

export function createMouvement(actorUserId: number, input: SaveMouvementInput): MouvementListItem {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();

  const bateau = db.prepare(`SELECT id, nom FROM port_bateaux WHERE id = ? AND deleted_at IS NULL`).get(
    input.bateauId,
  );
  if (!bateau) throw new Error('Bateau introuvable.');

  if (input.typeMouvement === 'arrivee' && !input.emplacementToId) {
    throw new Error('Emplacement d\'arrivée obligatoire.');
  }
  if (input.typeMouvement === 'depart' && !input.emplacementFromId) {
    throw new Error('Emplacement de départ obligatoire.');
  }
  if (input.typeMouvement === 'changement_emplacement' && (!input.emplacementFromId || !input.emplacementToId)) {
    throw new Error('Emplacements source et destination obligatoires.');
  }

  const uuid = randomUUID();
  const r = db
    .prepare(
      `
    INSERT INTO port_mouvements (
      uuid, bateau_id, type_mouvement, emplacement_from_id, emplacement_to_id,
      date_mouvement, motif, statut, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'valide', ?)
  `,
    )
    .run(
      uuid,
      input.bateauId,
      input.typeMouvement,
      input.emplacementFromId ?? null,
      input.emplacementToId ?? null,
      input.dateMouvement,
      input.motif?.trim() || null,
      actor.userId,
    );

  const contratActif = db
    .prepare(
      `SELECT id, emplacement_id FROM port_contrats
       WHERE bateau_id = ? AND statut = 'actif' AND deleted_at IS NULL LIMIT 1`,
    )
    .get(input.bateauId) as { id: number; emplacement_id: number } | undefined;

  if (contratActif && input.typeMouvement === 'changement_emplacement' && input.emplacementToId) {
    const oldEmp = contratActif.emplacement_id;
    db.prepare(`UPDATE port_contrats SET emplacement_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
      input.emplacementToId,
      contratActif.id,
    );
    syncEmplacementStatut(db, oldEmp);
    syncEmplacementStatut(db, input.emplacementToId);
  } else if (contratActif && input.typeMouvement === 'arrivee' && input.emplacementToId) {
    const oldEmp = contratActif.emplacement_id;
    if (oldEmp !== input.emplacementToId) {
      db.prepare(`UPDATE port_contrats SET emplacement_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
        input.emplacementToId,
        contratActif.id,
      );
      syncEmplacementStatut(db, oldEmp);
    }
    syncEmplacementStatut(db, input.emplacementToId);
  } else {
    if (input.emplacementFromId) syncEmplacementStatut(db, input.emplacementFromId);
    if (input.emplacementToId) syncEmplacementStatut(db, input.emplacementToId);
  }

  try {
    enqueueSync('port_mouvement', 'create', Number(r.lastInsertRowid), {
      uuid,
      bateauId: input.bateauId,
      typeMouvement: input.typeMouvement,
    });
  } catch {
    /* sync_config peut ne pas exister sur très vieilles bases */
  }

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'MouvementsPage',
    description: `Mouvement ${input.typeMouvement} — ${(bateau as { nom: string }).nom}`,
  });

  const list = listMouvements(actorUserId, 1);
  return list[0]!;
}
