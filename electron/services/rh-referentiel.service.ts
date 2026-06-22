import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertRhManage } from './rh-helpers';
import type {
  RhDirection,
  RhDepartement,
  RhPoste,
  CreateDirectionInput,
  UpdateDirectionInput,
  CreateDepartementInput,
  CreatePosteInput,
  UpdateDepartementInput,
  UpdatePosteInput,
} from '../../src/shared/types/rh';

function mapDirection(row: Record<string, unknown>): RhDirection {
  return {
    id: row.id as number,
    nom: row.nom as string,
    code: (row.code as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    actif: row.actif === 1,
  };
}

function mapDepartement(row: Record<string, unknown>): RhDepartement {
  return {
    id: row.id as number,
    nom: row.nom as string,
    directionId: (row.direction_id as number | null) ?? null,
    directionNom: (row.direction_nom as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    actif: row.actif === 1,
  };
}

function mapPoste(row: Record<string, unknown>): RhPoste {
  return {
    id: row.id as number,
    nom: row.nom as string,
    departementId: row.departement_id as number,
    departementNom: row.departement_nom as string,
    directionId: (row.direction_id as number | null) ?? null,
    directionNom: (row.direction_nom as string | null) ?? null,
    salaireMin: (row.salaire_min as number | null) ?? null,
    salaireMax: (row.salaire_max as number | null) ?? null,
    roleSystemAssocie: (row.role_system_associe as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    actif: row.actif === 1,
  };
}

// ── Directions ────────────────────────────────────────────────────────────────

export function listDirections(actorUserId: number): RhDirection[] {
  assertRhManage(actorUserId);
  return getDatabase()
    .prepare(`SELECT * FROM rh_directions WHERE actif = 1 ORDER BY nom`)
    .all()
    .map((r) => mapDirection(r as Record<string, unknown>));
}

export function createDirection(actorUserId: number, input: CreateDirectionInput): RhDirection {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`INSERT INTO rh_directions (nom, code, description) VALUES (?, ?, ?)`)
    .run(input.nom.trim(), input.code?.trim().toUpperCase() ?? null, input.description?.trim() ?? null);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Direction "${input.nom}" créée`,
  });
  const row = db.prepare(`SELECT * FROM rh_directions WHERE id = ?`).get(Number(result.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  return mapDirection(row);
}

export function updateDirection(actorUserId: number, id: number, input: UpdateDirectionInput): RhDirection {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_directions WHERE id = ?`).get(id);
  if (!existing) throw new Error('Direction introuvable.');
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.nom !== undefined) {
    fields.push('nom = ?');
    params.push(input.nom.trim());
  }
  if (input.code !== undefined) {
    fields.push('code = ?');
    params.push(input.code?.trim().toUpperCase() ?? null);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description?.trim() ?? null);
  }
  if (input.actif !== undefined) {
    fields.push('actif = ?');
    params.push(input.actif ? 1 : 0);
  }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_directions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Direction #${id} modifiée`,
  });
  const row = db.prepare(`SELECT * FROM rh_directions WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapDirection(row);
}

// ── Départements ──────────────────────────────────────────────────────────────

export function listDepartements(actorUserId: number, directionId?: number): RhDepartement[] {
  assertRhManage(actorUserId);
  const conditions = ['d.actif = 1'];
  const params: unknown[] = [];
  if (directionId) {
    conditions.push('d.direction_id = ?');
    params.push(directionId);
  }
  const rows = getDatabase()
    .prepare(`
      SELECT d.*, dir.nom AS direction_nom
      FROM rh_departements d
      LEFT JOIN rh_directions dir ON dir.id = d.direction_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY dir.nom, d.nom
    `)
    .all(...params) as Record<string, unknown>[];
  return rows.map(mapDepartement);
}

export function createDepartement(actorUserId: number, input: CreateDepartementInput): RhDepartement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const direction = db.prepare(`SELECT id FROM rh_directions WHERE id = ? AND actif = 1`).get(input.directionId);
  if (!direction) throw new Error('Direction introuvable.');
  const result = db
    .prepare(`INSERT INTO rh_departements (nom, direction_id, description) VALUES (?, ?, ?)`)
    .run(input.nom.trim(), input.directionId, input.description?.trim() ?? null);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Département "${input.nom}" créé`,
  });
  return listDepartements(actorUserId).find((d) => d.id === Number(result.lastInsertRowid))!;
}

export function updateDepartement(
  actorUserId: number,
  id: number,
  input: UpdateDepartementInput,
): RhDepartement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_departements WHERE id = ?`).get(id);
  if (!existing) throw new Error('Département introuvable.');
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.nom !== undefined) {
    fields.push('nom = ?');
    params.push(input.nom.trim());
  }
  if (input.directionId !== undefined) {
    fields.push('direction_id = ?');
    params.push(input.directionId);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description?.trim() ?? null);
  }
  if (input.actif !== undefined) {
    fields.push('actif = ?');
    params.push(input.actif ? 1 : 0);
  }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_departements SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Département #${id} modifié`,
  });
  return listDepartements(actorUserId).find((d) => d.id === id)!;
}

// ── Postes ────────────────────────────────────────────────────────────────────

export function listPostes(actorUserId: number, departementId?: number): RhPoste[] {
  assertRhManage(actorUserId);
  const conditions = ['p.actif = 1'];
  const params: unknown[] = [];
  if (departementId) {
    conditions.push('p.departement_id = ?');
    params.push(departementId);
  }
  const rows = getDatabase()
    .prepare(`
      SELECT p.*, d.nom AS departement_nom, d.direction_id, dir.nom AS direction_nom
      FROM rh_postes p
      INNER JOIN rh_departements d ON d.id = p.departement_id
      LEFT JOIN rh_directions dir ON dir.id = d.direction_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY dir.nom, d.nom, p.nom
    `)
    .all(...params) as Record<string, unknown>[];
  return rows.map(mapPoste);
}

export function createPoste(actorUserId: number, input: CreatePosteInput): RhPoste {
  assertRhManage(actorUserId);
  const db = getDatabase();
  db.prepare(`
    INSERT INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.nom.trim(),
    input.departementId,
    input.salaireMin ?? null,
    input.salaireMax ?? null,
    input.roleSystemAssocie ?? null,
    input.description?.trim() ?? null,
  );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Poste "${input.nom}" créé`,
  });
  return listPostes(actorUserId).find((p) => p.nom === input.nom.trim())!;
}

export function updatePoste(actorUserId: number, id: number, input: UpdatePosteInput): RhPoste {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_postes WHERE id = ?`).get(id);
  if (!existing) throw new Error('Poste introuvable.');
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.nom !== undefined) {
    fields.push('nom = ?');
    params.push(input.nom.trim());
  }
  if (input.departementId !== undefined) {
    fields.push('departement_id = ?');
    params.push(input.departementId);
  }
  if (input.salaireMin !== undefined) {
    fields.push('salaire_min = ?');
    params.push(input.salaireMin);
  }
  if (input.salaireMax !== undefined) {
    fields.push('salaire_max = ?');
    params.push(input.salaireMax);
  }
  if (input.roleSystemAssocie !== undefined) {
    fields.push('role_system_associe = ?');
    params.push(input.roleSystemAssocie);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description?.trim() ?? null);
  }
  if (input.actif !== undefined) {
    fields.push('actif = ?');
    params.push(input.actif ? 1 : 0);
  }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_postes SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Poste #${id} modifié`,
  });
  return listPostes(actorUserId).find((p) => p.id === id)!;
}
