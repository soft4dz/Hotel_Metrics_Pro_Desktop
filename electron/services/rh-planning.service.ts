import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  assertRhTeam,
  assertRhManage,
  assertCanAccessEmploye,
  getTeamEmployeIds,
  teamFilterSql,
  SHIFT_HORAIRES,
  countJoursAbsence,
} from './rh-helpers';
import { listOrganisation } from './rh-affectation.service';
import { listPointages } from './rh-pointage.service';
import type {
  RhPlanning,
  RhPlanningSynthese,
  RhEquipeMembre,
  RhSuggestionRenfort,
  CreatePlanningInput,
  AddEquipeMembreInput,
  ShiftPlanning,
  StatutPlanning,
} from '../../src/shared/types/rh';

// ── Planning ──────────────────────────────────────────────────────────────────

const planningSql = `
  SELECT pl.*,
         h.name AS hotel_name,
         e.prenom || ' ' || e.nom AS employe_nom,
         p.nom AS poste_nom
  FROM rh_plannings pl
  INNER JOIN hotels h ON h.id = pl.hotel_id
  INNER JOIN rh_employes e ON e.id = pl.employe_id AND e.deleted_at IS NULL
  LEFT JOIN rh_postes p ON p.id = pl.poste_id
`;

function planningHeuresPrevues(shift: ShiftPlanning, heureDebut: string | null, heureFin: string | null): number {
  const debut = heureDebut ?? SHIFT_HORAIRES[shift].debut;
  const fin = heureFin ?? SHIFT_HORAIRES[shift].fin;
  const [eh, em] = debut.split(':').map(Number);
  const [sh, sm] = fin.split(':').map(Number);
  const mins = sh * 60 + sm - (eh * 60 + em);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 8;
}

function mapPlanning(row: Record<string, unknown>): RhPlanning {
  const shift = row.shift as ShiftPlanning;
  const heureDebut = (row.heure_debut as string | null) ?? null;
  const heureFin = (row.heure_fin as string | null) ?? null;
  return {
    id: row.id as number,
    hotelId: row.hotel_id as number,
    hotelName: row.hotel_name as string,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    posteId: (row.poste_id as number | null) ?? null,
    posteNom: (row.poste_nom as string | null) ?? null,
    date: row.date as string,
    shift,
    heureDebut,
    heureFin,
    heuresPrevues: planningHeuresPrevues(shift, heureDebut, heureFin),
    statut: row.statut as StatutPlanning,
    notes: (row.notes as string | null) ?? null,
  };
}

export function listPlannings(
  actorUserId: number,
  opts?: { hotelId?: number; dateDebut?: string; dateFin?: string; employeId?: number },
): RhPlanning[] {
  assertRhTeam(actorUserId);
  const team = getTeamEmployeIds(actorUserId);
  const teamClause = teamFilterSql(team, 'pl.employe_id');
  const conditions = [teamClause.sql, "pl.statut != 'annule'"];
  const params: unknown[] = [...teamClause.params];
  if (opts?.hotelId) { conditions.push('pl.hotel_id = ?'); params.push(opts.hotelId); }
  if (opts?.dateDebut) { conditions.push('pl.date >= ?'); params.push(opts.dateDebut); }
  if (opts?.dateFin) { conditions.push('pl.date <= ?'); params.push(opts.dateFin); }
  if (opts?.employeId) {
    assertCanAccessEmploye(actorUserId, opts.employeId);
    conditions.push('pl.employe_id = ?');
    params.push(opts.employeId);
  }
  return getDatabase()
    .prepare(`${planningSql} WHERE ${conditions.join(' AND ')} ORDER BY pl.date, pl.shift, employe_nom`)
    .all(...params)
    .map((r) => mapPlanning(r as Record<string, unknown>));
}

export function createPlanning(actorUserId: number, input: CreatePlanningInput): RhPlanning {
  assertRhTeam(actorUserId);
  assertCanAccessEmploye(actorUserId, input.employeId);
  const db = getDatabase();
  const horaires = SHIFT_HORAIRES[input.shift];
  const result = db.prepare(`
    INSERT INTO rh_plannings (hotel_id, employe_id, poste_id, date, shift, heure_debut, heure_fin, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.hotelId,
    input.employeId,
    input.posteId ?? null,
    input.date,
    input.shift,
    input.heureDebut ?? horaires.debut,
    input.heureFin ?? horaires.fin,
    input.notes?.trim() ?? null,
    actorUserId,
  );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Planning employé #${input.employeId} le ${input.date}`,
  });
  const row = db.prepare(`${planningSql} WHERE pl.id = ?`).get(Number(result.lastInsertRowid)) as Record<string, unknown>;
  return mapPlanning(row);
}

export function deletePlanning(actorUserId: number, planningId: number): void {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const pl = db.prepare(`SELECT employe_id FROM rh_plannings WHERE id = ?`).get(planningId) as
    | { employe_id: number }
    | undefined;
  if (!pl) throw new Error('Créneau planning introuvable.');
  assertCanAccessEmploye(actorUserId, pl.employe_id);
  db.prepare(`UPDATE rh_plannings SET statut = 'annule', updated_at = datetime('now') WHERE id = ?`).run(planningId);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'rh', description: `Annulation planning #${planningId}` });
}

export function getPlanningSynthese(
  actorUserId: number,
  dateDebut: string,
  dateFin: string,
  hotelId?: number,
): RhPlanningSynthese {
  assertRhTeam(actorUserId);
  const plannings = listPlannings(actorUserId, { hotelId, dateDebut, dateFin });
  const pointages = listPointages(actorUserId, dateDebut, dateFin);
  const byEmploye = new Map<number, { nom: string; prevues: number; pointees: number }>();

  for (const pl of plannings) {
    const cur = byEmploye.get(pl.employeId) ?? { nom: pl.employeNom, prevues: 0, pointees: 0 };
    cur.prevues += pl.heuresPrevues;
    byEmploye.set(pl.employeId, cur);
  }
  for (const pt of pointages) {
    if (pt.statut !== 'valide' || pt.heuresTravaillees == null) continue;
    const cur = byEmploye.get(pt.employeId) ?? { nom: pt.employeNom, prevues: 0, pointees: 0 };
    cur.pointees += pt.heuresTravaillees;
    byEmploye.set(pt.employeId, cur);
  }

  const lignes = Array.from(byEmploye.entries())
    .map(([employeId, v]) => ({
      employeId,
      employeNom: v.nom,
      heuresPrevues: Math.round(v.prevues * 100) / 100,
      heuresPointees: Math.round(v.pointees * 100) / 100,
      ecart: Math.round((v.pointees - v.prevues) * 100) / 100,
    }))
    .sort((a, b) => a.employeNom.localeCompare(b.employeNom));

  return {
    periodeDebut: dateDebut,
    periodeFin: dateFin,
    lignes,
    totalHeuresPrevues: Math.round(lignes.reduce((s, l) => s + l.heuresPrevues, 0) * 100) / 100,
    totalHeuresPointees: Math.round(lignes.reduce((s, l) => s + l.heuresPointees, 0) * 100) / 100,
  };
}

export function getSuggestionsRenfort(
  actorUserId: number,
  seuilOccupation = 85,
  joursFuturs = 7,
): RhSuggestionRenfort[] {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const dateDebut = new Date().toISOString().slice(0, 10);
  const dateFin = new Date(Date.now() + joursFuturs * 86_400_000).toISOString().slice(0, 10);
  const hotels = db
    .prepare(`SELECT id, name FROM hotels WHERE is_active = 1 AND deleted_at IS NULL`)
    .all() as { id: number; name: string }[];
  const suggestions: RhSuggestionRenfort[] = [];

  for (const h of hotels) {
    const to = computeTauxOccupationHotel(db, h.id, dateDebut, dateFin);
    if (to < seuilOccupation) continue;
    const org = listOrganisation(actorUserId, h.id);
    const manque = org.totalManque;
    suggestions.push({
      hotelId: h.id,
      hotelName: h.name,
      tauxOccupation: to,
      dateDebut,
      dateFin,
      manqueEffectif: manque,
      message:
        manque > 0
          ? `Occupation ${to}% — ${manque} poste(s) en manque : renfort recommandé.`
          : `Occupation ${to}% élevée — surveiller les effectifs réception / housekeeping.`,
    });
  }
  return suggestions.sort((a, b) => b.tauxOccupation - a.tauxOccupation);
}

function computeTauxOccupationHotel(
  db: ReturnType<typeof getDatabase>,
  hotelId: number,
  dateDebut: string,
  dateFin: string,
): number {
  const totalChambres = (db.prepare(
    `SELECT COUNT(*) AS c FROM chambres WHERE hotel_id = ? AND actif = 1 AND statut != 'hors_service'`,
  ).get(hotelId) as { c: number }).c;
  if (totalChambres === 0) return 0;
  const nbJours = countJoursAbsence(dateDebut, dateFin);
  const capacite = totalChambres * nbJours;
  const nuitees = (db.prepare(`
    SELECT COUNT(*) AS c FROM reservations
    WHERE hotel_id = ? AND deleted_at IS NULL
      AND statut NOT IN ('annulee','no_show','provisoire')
      AND date_arrivee < ? AND date_depart > ?
  `).get(hotelId, dateFin, dateDebut) as { c: number }).c;
  return Math.round((nuitees / capacite) * 1000) / 10;
}

// ── Équipes ───────────────────────────────────────────────────────────────────

export function listEquipes(actorUserId: number, chefEmployeId?: number): RhEquipeMembre[] {
  assertRhTeam(actorUserId);
  const team = getTeamEmployeIds(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (chefEmployeId) {
    if (team !== null && !team.includes(chefEmployeId)) {
      throw new Error('Accès refusé au périmètre équipe.');
    }
    conditions.push('eq.chef_employe_id = ?');
    params.push(chefEmployeId);
  } else if (team !== null) {
    const clause = teamFilterSql(team, 'eq.chef_employe_id');
    conditions.push(clause.sql);
    params.push(...clause.params);
  }
  return getDatabase()
    .prepare(`
      SELECT eq.*,
             c.prenom || ' ' || c.nom AS chef_nom,
             m.prenom || ' ' || m.nom AS membre_nom,
             h.name AS hotel_name
      FROM rh_equipes eq
      INNER JOIN rh_employes c ON c.id = eq.chef_employe_id
      INNER JOIN rh_employes m ON m.id = eq.membre_employe_id
      LEFT JOIN hotels h ON h.id = eq.hotel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY chef_nom, membre_nom
    `)
    .all(...params)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as number,
        chefEmployeId: r.chef_employe_id as number,
        chefNom: r.chef_nom as string,
        membreEmployeId: r.membre_employe_id as number,
        membreNom: r.membre_nom as string,
        hotelId: (r.hotel_id as number | null) ?? null,
        hotelName: (r.hotel_name as string | null) ?? null,
      };
    });
}

export function addEquipeMembre(actorUserId: number, input: AddEquipeMembreInput): RhEquipeMembre {
  assertRhManage(actorUserId);
  const db = getDatabase();
  if (input.chefEmployeId === input.membreEmployeId) {
    throw new Error('Un chef ne peut pas être membre de sa propre équipe.');
  }
  const result = db.prepare(`
    INSERT INTO rh_equipes (chef_employe_id, membre_employe_id, hotel_id)
    VALUES (?, ?, ?)
  `).run(input.chefEmployeId, input.membreEmployeId, input.hotelId ?? null);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Équipe : membre #${input.membreEmployeId} sous chef #${input.chefEmployeId}`,
  });
  return listEquipes(actorUserId, input.chefEmployeId).find((e) => e.id === Number(result.lastInsertRowid))!;
}

export function removeEquipeMembre(actorUserId: number, equipeId: number): void {
  assertRhManage(actorUserId);
  getDatabase().prepare(`DELETE FROM rh_equipes WHERE id = ?`).run(equipeId);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'rh', description: `Retrait membre équipe #${equipeId}` });
}
