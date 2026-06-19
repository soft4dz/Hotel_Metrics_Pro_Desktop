import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertRhManage } from './rh-helpers';
import type {
  RhDepartement,
  RhPoste,
  CreateDepartementInput,
  CreatePosteInput,
  UpdateDepartementInput,
  UpdatePosteInput,
} from '../../src/shared/types/rh';

// ── Départements ──────────────────────────────────────────────────────────────

export function listDepartements(actorUserId: number): RhDepartement[] {
  assertRhManage(actorUserId);
  const rows = getDatabase()
    .prepare(`SELECT * FROM rh_departements WHERE actif = 1 ORDER BY nom`)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    nom: r.nom as string,
    description: (r.description as string | null) ?? null,
    actif: r.actif === 1,
  }));
}

export function createDepartement(actorUserId: number, input: CreateDepartementInput): RhDepartement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`INSERT INTO rh_departements (nom, description) VALUES (?, ?)`)
    .run(input.nom.trim(), input.description?.trim() ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Département "${input.nom}" créé` });
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
  if (input.nom !== undefined) { fields.push('nom = ?'); params.push(input.nom.trim()); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description?.trim() ?? null); }
  if (input.actif !== undefined) { fields.push('actif = ?'); params.push(input.actif ? 1 : 0); }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_departements SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Département #${id} modifié` });
  const row = db.prepare(`SELECT * FROM rh_departements WHERE id = ?`).get(id) as Record<string, unknown>;
  return {
    id: row.id as number,
    nom: row.nom as string,
    description: (row.description as string | null) ?? null,
    actif: row.actif === 1,
  };
}

// ── Postes ────────────────────────────────────────────────────────────────────

export function listPostes(actorUserId: number): RhPoste[] {
  assertRhManage(actorUserId);
  const rows = getDatabase()
    .prepare(`
      SELECT p.*, d.nom AS departement_nom
      FROM rh_postes p
      INNER JOIN rh_departements d ON d.id = p.departement_id
      WHERE p.actif = 1
      ORDER BY d.nom, p.nom
    `)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    nom: r.nom as string,
    departementId: r.departement_id as number,
    departementNom: r.departement_nom as string,
    salaireMin: (r.salaire_min as number | null) ?? null,
    salaireMax: (r.salaire_max as number | null) ?? null,
    roleSystemAssocie: (r.role_system_associe as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    actif: r.actif === 1,
  }));
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
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Poste "${input.nom}" créé` });
  return listPostes(actorUserId).find((p) => p.nom === input.nom.trim())!;
}

export function updatePoste(actorUserId: number, id: number, input: UpdatePosteInput): RhPoste {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_postes WHERE id = ?`).get(id);
  if (!existing) throw new Error('Poste introuvable.');
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.nom !== undefined) { fields.push('nom = ?'); params.push(input.nom.trim()); }
  if (input.departementId !== undefined) { fields.push('departement_id = ?'); params.push(input.departementId); }
  if (input.salaireMin !== undefined) { fields.push('salaire_min = ?'); params.push(input.salaireMin); }
  if (input.salaireMax !== undefined) { fields.push('salaire_max = ?'); params.push(input.salaireMax); }
  if (input.roleSystemAssocie !== undefined) { fields.push('role_system_associe = ?'); params.push(input.roleSystemAssocie); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description?.trim() ?? null); }
  if (input.actif !== undefined) { fields.push('actif = ?'); params.push(input.actif ? 1 : 0); }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_postes SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Poste #${id} modifié` });
  return listPostes(actorUserId).find((p) => p.id === id)!;
}
