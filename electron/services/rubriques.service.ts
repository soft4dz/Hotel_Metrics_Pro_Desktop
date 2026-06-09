import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';

export interface RubriqueListItem {
  id: number;
  uuid: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  parentLabel: string | null;
}

export interface CreateRubriqueInput {
  code: string;
  label: string;
  sortOrder?: number;
  parentId?: number | null;
}

export interface UpdateRubriqueInput {
  code?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: number | null;
}

export interface ReorderRubriqueItem {
  id: number;
  sortOrder: number;
  parentId: number | null;
}

function mapRow(row: Record<string, unknown>): RubriqueListItem {
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    code: row.code as string,
    label: row.label as string,
    sortOrder: row.sort_order as number,
    isActive: Boolean(row.is_active),
    parentId: (row.parent_id as number | null) ?? null,
    parentLabel: (row.parent_label as string | null) ?? null,
  };
}

function loadRubriqueRow(
  db: ReturnType<typeof getDatabase>,
  id: number,
): Record<string, unknown> | undefined {
  return db
    .prepare(
      `
      SELECT r.id, r.uuid, r.code, r.label, r.sort_order, r.is_active, r.parent_id, p.label AS parent_label
      FROM rubriques r LEFT JOIN rubriques p ON p.id = r.parent_id
      WHERE r.id = ? AND r.deleted_at IS NULL
    `,
    )
    .get(id) as Record<string, unknown> | undefined;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

function resolveParentId(
  db: ReturnType<typeof getDatabase>,
  parentId: number | null | undefined,
  selfId?: number,
): number | null | undefined {
  if (parentId === undefined) return undefined;
  if (parentId === null) return null;
  if (selfId !== undefined && parentId === selfId) {
    throw new Error('Une rubrique ne peut pas être son propre parent.');
  }

  const parent = db
    .prepare(
      `
      SELECT id, parent_id, deleted_at
      FROM rubriques
      WHERE id = ?
    `,
    )
    .get(parentId) as { id: number; parent_id: number | null; deleted_at: string | null } | undefined;

  if (!parent || parent.deleted_at) {
    throw new Error('Rubrique parente introuvable.');
  }
  if (parent.parent_id !== null) {
    throw new Error('La rubrique parente doit être une rubrique principale.');
  }
  return parent.id;
}

export function listRubriques(actorUserId: number): RubriqueListItem[] {
  assertPermission(actorUserId, 'hotels.manage');

  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT r.id, r.uuid, r.code, r.label, r.sort_order, r.is_active,
           r.parent_id, p.label AS parent_label
    FROM rubriques r
    LEFT JOIN rubriques p ON p.id = r.parent_id
    WHERE r.deleted_at IS NULL
    ORDER BY COALESCE(p.sort_order, r.sort_order), p.label, r.sort_order, r.label
  `,
    )
    .all()
    .map((r) => mapRow(r as Record<string, unknown>));
}

export function createRubrique(
  actorUserId: number,
  input: CreateRubriqueInput,
): RubriqueListItem {
  assertPermission(actorUserId, 'hotels.manage');

  const code = normalizeCode(input.code);
  const label = input.label.trim();
  if (!code || !label) throw new Error('Code et libellé requis.');

  const db = getDatabase();
  const resolvedParentId = resolveParentId(db, input.parentId ?? null);
  const exists = db
    .prepare(`SELECT 1 FROM rubriques WHERE code = ? AND deleted_at IS NULL`)
    .get(code);
  if (exists) throw new Error('Ce code rubrique existe déjà.');

  const maxOrder = db
    .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM rubriques WHERE deleted_at IS NULL`)
    .get() as { m: number };

  const result = db
    .prepare(
      `
    INSERT INTO rubriques (uuid, code, label, sort_order, parent_id, sync_status)
    VALUES (@uuid, @code, @label, @sort_order, @parent_id, 'pending_create')
  `,
    )
    .run({
      uuid: randomUUID(),
      code,
      label,
      sort_order: input.sortOrder ?? maxOrder.m + 1,
      parent_id: resolvedParentId,
    });

  const row = loadRubriqueRow(db, Number(result.lastInsertRowid));
  if (!row) throw new Error('Rubrique créée mais introuvable.');

  const rubrique = mapRow(row);

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'administration',
    page: 'RubriquesPage',
    description: `Création rubrique ${rubrique.code}`,
    newValue: JSON.stringify(rubrique),
  });

  return rubrique;
}

export function updateRubrique(
  actorUserId: number,
  id: number,
  input: UpdateRubriqueInput,
): RubriqueListItem {
  assertPermission(actorUserId, 'hotels.manage');

  const db = getDatabase();
  const existing = loadRubriqueRow(db, id);

  if (!existing) throw new Error('Rubrique introuvable.');

  const updates: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);
    if (!code) throw new Error('Code rubrique invalide.');
    const duplicate = db
      .prepare(`SELECT 1 FROM rubriques WHERE code = ? AND id != ? AND deleted_at IS NULL`)
      .get(code, id);
    if (duplicate) throw new Error('Ce code rubrique existe déjà.');
    updates.push('code = @code');
    params.code = code;
  }
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) throw new Error('Libellé rubrique invalide.');
    updates.push('label = @label');
    params.label = label;
  }
  if (input.sortOrder !== undefined) {
    if (!Number.isFinite(input.sortOrder) || input.sortOrder < 0) {
      throw new Error('Ordre de tri invalide.');
    }
    updates.push('sort_order = @sort_order');
    params.sort_order = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    updates.push('is_active = @is_active');
    params.is_active = input.isActive ? 1 : 0;
  }
  if (input.parentId !== undefined) {
    const resolvedParentId = resolveParentId(db, input.parentId, id);
    if (resolvedParentId !== null) {
      const childCount = db
        .prepare(`SELECT COUNT(*) AS c FROM rubriques WHERE parent_id = ? AND deleted_at IS NULL`)
        .get(id) as { c: number };
      if (childCount.c > 0) {
        throw new Error(
          'Une rubrique avec des sous-rubriques ne peut pas devenir une sous-rubrique.',
        );
      }
    }
    updates.push('parent_id = @parent_id');
    params.parent_id = resolvedParentId;
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')", "sync_status = 'pending_update'");
    db.prepare(`UPDATE rubriques SET ${updates.join(', ')} WHERE id = @id`).run(params);
  }

  const row = loadRubriqueRow(db, id);
  if (!row) throw new Error('Rubrique mise à jour introuvable.');

  const rubrique = mapRow(row);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'RubriquesPage',
    description: `Modification rubrique ${rubrique.code}`,
    oldValue: JSON.stringify(mapRow(existing)),
    newValue: JSON.stringify(rubrique),
  });

  return rubrique;
}

export function reorderRubriques(
  actorUserId: number,
  items: ReorderRubriqueItem[],
): RubriqueListItem[] {
  assertPermission(actorUserId, 'hotels.manage');
  if (items.length === 0) return listRubriques(actorUserId);

  const db = getDatabase();
  const existing = listRubriques(actorUserId);
  const byId = new Map(existing.map((r) => [r.id, r]));

  if (items.length !== existing.length) {
    throw new Error('Réordonnancement incomplet : toutes les rubriques doivent être incluses.');
  }

  const seenIds = new Set<number>();
  for (const item of items) {
    if (seenIds.has(item.id)) throw new Error('Identifiant rubrique dupliqué.');
    seenIds.add(item.id);
    if (!byId.has(item.id)) throw new Error(`Rubrique #${item.id} introuvable.`);
    if (!Number.isFinite(item.sortOrder) || item.sortOrder < 0) {
      throw new Error('Ordre de tri invalide.');
    }
  }

  for (const item of items) {
    const rub = byId.get(item.id)!;
    if (item.parentId !== null) {
      if (item.parentId === item.id) {
        throw new Error('Une rubrique ne peut pas être son propre parent.');
      }
      const parent = byId.get(item.parentId);
      if (!parent || parent.parentId !== null) {
        throw new Error('La rubrique parente doit être une rubrique principale.');
      }
      const childCount = existing.filter((r) => r.parentId === item.id).length;
      if (childCount > 0) {
        throw new Error(
          `La rubrique "${rub.label}" possède des sous-rubriques et ne peut pas être déplacée.`,
        );
      }
    }
  }

  const update = db.prepare(`
    UPDATE rubriques
    SET sort_order = @sort_order,
        parent_id = @parent_id,
        updated_at = datetime('now'),
        sync_status = 'pending_update'
    WHERE id = @id AND deleted_at IS NULL
  `);

  const run = db.transaction(() => {
    for (const item of items) {
      update.run({
        id: item.id,
        sort_order: item.sortOrder,
        parent_id: item.parentId,
      });
    }
  });
  run();

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'RubriquesPage',
    description: `Réordonnancement de ${items.length} rubrique(s)`,
    newValue: JSON.stringify(items),
  });

  return listRubriques(actorUserId);
}

export function deleteRubrique(actorUserId: number, id: number): boolean {
  assertPermission(actorUserId, 'hotels.manage');

  const db = getDatabase();
  const existing = loadRubriqueRow(db, id);
  if (!existing) throw new Error('Rubrique introuvable.');
  const rubrique = mapRow(existing);

  const childCount = db
    .prepare(`SELECT COUNT(*) AS c FROM rubriques WHERE parent_id = ? AND deleted_at IS NULL`)
    .get(id) as { c: number };
  if (childCount.c > 0) {
    throw new Error('Supprimez d’abord les sous-rubriques liées.');
  }

  const recetteCount = db
    .prepare(`SELECT COUNT(*) AS c FROM recettes_journalieres WHERE rubrique_id = ? AND deleted_at IS NULL`)
    .get(id) as { c: number };
  const mensuelleCount = db
    .prepare(`SELECT COUNT(*) AS c FROM recettes_mensuelles_lignes WHERE rubrique_id = ?`)
    .get(id) as { c: number };

  if (recetteCount.c > 0 || mensuelleCount.c > 0) {
    throw new Error('Rubrique déjà utilisée dans des recettes. Suppression impossible.');
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM hotel_rubriques WHERE rubrique_id = ?`).run(id);
    db.prepare(
      `
      UPDATE rubriques
      SET deleted_at = datetime('now'),
          is_active = 0,
          updated_at = datetime('now'),
          sync_status = 'pending_delete'
      WHERE id = ?
    `,
    ).run(id);
  });
  tx();

  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'administration',
    page: 'RubriquesPage',
    description: `Suppression rubrique ${rubrique.code}`,
    oldValue: JSON.stringify(rubrique),
  });

  return true;
}
