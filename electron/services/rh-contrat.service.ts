import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertRhManage } from './rh-helpers';
import type {
  RhContrat,
  RhContratListe,
  RhSoldeConges,
  CreateContratInput,
  UpsertSoldeCongesInput,
} from '../../src/shared/types/rh';

// ── Contrats ──────────────────────────────────────────────────────────────────

export function listContrats(actorUserId: number, employeId: number): RhContrat[] {
  assertRhManage(actorUserId);
  const rows = getDatabase().prepare(`
    SELECT c.*, p.nom AS poste_nom
    FROM rh_contrats c
    INNER JOIN rh_postes p ON p.id = c.poste_id
    WHERE c.employe_id = ?
    ORDER BY c.date_debut DESC
  `).all(employeId) as Record<string, unknown>[];
  return rows.map((r) => mapContrat(r));
}

export function createContrat(actorUserId: number, input: CreateContratInput): RhContrat {
  assertRhManage(actorUserId);
  const db = getDatabase();
  db.prepare(`UPDATE rh_contrats SET actif = 0, updated_at = datetime('now') WHERE employe_id = ? AND actif = 1`).run(input.employeId);
  const result = db.prepare(`
    INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, date_fin, salaire_brut, heures_hebdo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.posteId,
    input.type,
    input.dateDebut,
    input.dateFin ?? null,
    input.salaireBrut,
    input.heuresHebdo ?? 35,
  );
  db.prepare(`UPDATE rh_employes SET poste_actuel_id = ?, updated_at = datetime('now') WHERE id = ?`).run(input.posteId, input.employeId);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Contrat employé #${input.employeId}` });
  return listContrats(actorUserId, input.employeId).find((c) => c.id === Number(result.lastInsertRowid))!;
}

export function listAllContrats(actorUserId: number): RhContratListe[] {
  assertRhManage(actorUserId);
  const rows = getDatabase()
    .prepare(`
      SELECT c.*, p.nom AS poste_nom,
             e.prenom || ' ' || e.nom AS employe_nom,
             CASE WHEN c.date_fin IS NOT NULL
               THEN CAST(julianday(c.date_fin) - julianday('now') AS INTEGER)
               ELSE NULL END AS jours_restants
      FROM rh_contrats c
      INNER JOIN rh_postes p ON p.id = c.poste_id
      INNER JOIN rh_employes e ON e.id = c.employe_id AND e.deleted_at IS NULL
      WHERE c.actif = 1
      ORDER BY c.date_fin IS NULL, c.date_fin ASC, e.nom
    `)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    posteId: r.poste_id as number,
    posteNom: r.poste_nom as string,
    type: r.type as RhContrat['type'],
    dateDebut: r.date_debut as string,
    dateFin: (r.date_fin as string | null) ?? null,
    salaireBrut: r.salaire_brut as number,
    heuresHebdo: r.heures_hebdo as number,
    actif: r.actif === 1,
    joursRestants: (r.jours_restants as number | null) ?? null,
  }));
}

export function countContratsEcheanceProche(actorUserId: number, jours = 60): number {
  return listAllContrats(actorUserId).filter(
    (c) =>
      c.dateFin &&
      c.joursRestants !== null &&
      c.joursRestants >= 0 &&
      c.joursRestants <= jours &&
      c.type !== 'CDI',
  ).length;
}

function mapContrat(r: Record<string, unknown>): RhContrat {
  return {
    id: r.id as number,
    employeId: r.employe_id as number,
    posteId: r.poste_id as number,
    posteNom: r.poste_nom as string,
    type: r.type as RhContrat['type'],
    dateDebut: r.date_debut as string,
    dateFin: (r.date_fin as string | null) ?? null,
    salaireBrut: r.salaire_brut as number,
    heuresHebdo: r.heures_hebdo as number,
    actif: r.actif === 1,
  };
}

export function listContratsForSelf(employeId: number): RhContrat[] {
  const rows = getDatabase().prepare(`
    SELECT c.*, p.nom AS poste_nom FROM rh_contrats c
    INNER JOIN rh_postes p ON p.id = c.poste_id WHERE c.employe_id = ?
  `).all(employeId) as Record<string, unknown>[];
  return rows.map((r) => mapContrat(r));
}

// ── Soldes congés ─────────────────────────────────────────────────────────────

export const SOLDE_TYPES = new Set(['CP', 'RTT', 'Maladie']);

export function listSoldesConges(
  actorUserId: number,
  opts?: { employeId?: number; annee?: number },
): RhSoldeConges[] {
  assertRhManage(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (opts?.employeId) { conditions.push('s.employe_id = ?'); params.push(opts.employeId); }
  if (opts?.annee) { conditions.push('s.annee = ?'); params.push(opts.annee); }
  return getDatabase()
    .prepare(`
      SELECT s.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_soldes_conges s
      INNER JOIN rh_employes e ON e.id = s.employe_id AND e.deleted_at IS NULL
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.annee DESC, e.nom, s.type
    `)
    .all(...params)
    .map((r) => mapSolde(r as Record<string, unknown>));
}

export function upsertSoldeConges(actorUserId: number, input: UpsertSoldeCongesInput): RhSoldeConges {
  assertRhManage(actorUserId);
  if (!SOLDE_TYPES.has(input.type)) {
    throw new Error('Type de solde non géré (CP, RTT ou Maladie).');
  }
  const reste = Math.round((input.acquis - input.pris) * 100) / 100;
  const db = getDatabase();
  db.prepare(`
    INSERT INTO rh_soldes_conges (employe_id, annee, type, acquis, pris, reste)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(employe_id, annee, type) DO UPDATE SET
      acquis = excluded.acquis,
      pris = excluded.pris,
      reste = excluded.reste,
      updated_at = datetime('now')
  `).run(input.employeId, input.annee, input.type, input.acquis, input.pris, reste);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Solde ${input.type} employé #${input.employeId} (${input.annee})`,
  });
  return listSoldesConges(actorUserId, { employeId: input.employeId, annee: input.annee }).find(
    (s) => s.type === input.type,
  )!;
}

export function decrementSoldeConges(employeId: number, type: string, jours: number, annee: number): void {
  if (!SOLDE_TYPES.has(type)) return;
  const db = getDatabase();
  const solde = db
    .prepare(`SELECT id, pris, acquis FROM rh_soldes_conges WHERE employe_id = ? AND annee = ? AND type = ?`)
    .get(employeId, annee, type) as { id: number; pris: number; acquis: number } | undefined;
  if (!solde) return;
  const pris = Math.round((solde.pris + jours) * 100) / 100;
  const reste = Math.round((solde.acquis - pris) * 100) / 100;
  db.prepare(`UPDATE rh_soldes_conges SET pris = ?, reste = ?, updated_at = datetime('now') WHERE id = ?`).run(
    pris,
    reste,
    solde.id,
  );
}

function mapSolde(row: Record<string, unknown>): RhSoldeConges {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    annee: row.annee as number,
    type: row.type as RhSoldeConges['type'],
    acquis: row.acquis as number,
    pris: row.pris as number,
    reste: row.reste as number,
  };
}
