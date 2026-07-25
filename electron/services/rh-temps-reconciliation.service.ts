import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import { getTeamEmployeIds, teamFilterSql } from './rh-helpers';
import { csvLine, saveRhExportFile, type RhExportResult } from './rh-legal-export.util';
import type {
  RhReconciliationJour,
  RhReconciliationPaie,
  RhTempsAlerte,
  StatutReconciliation,
  StatutTempsAlerte,
  TypeTempsAlerte,
} from '../../src/shared/types/rh';

/** Seuil retard — alerte H+15 (Loi 90-11 / convention hôtellerie). */
export const SEUIL_RETARD_MINUTES = 15;
/** Seuil écart heures planning vs pointage pour alerte. */
export const SEUIL_ECART_HEURES = 0.5;

export function minutesRetard(heurePrevue: string, heureEntree: string | null): number {
  if (!heureEntree) return 0;
  const [ph, pm] = heurePrevue.split(':').map(Number);
  const [eh, em] = heureEntree.split(':').map(Number);
  if ([ph, pm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return eh * 60 + em - (ph * 60 + pm);
}

export function determinerStatutReconciliation(
  heuresPrevues: number,
  heuresPointees: number,
  retardMinutes: number,
): StatutReconciliation {
  if (heuresPrevues <= 0 && heuresPointees > 0) return 'sans_planning';
  if (heuresPrevues > 0 && heuresPointees <= 0) return 'sans_pointage';
  if (retardMinutes >= SEUIL_RETARD_MINUTES) return 'alerte';
  if (Math.abs(heuresPointees - heuresPrevues) >= SEUIL_ECART_HEURES) return 'ecart';
  return 'ok';
}

function assertRhTeam(actorUserId: number): void {
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    assertPermission(actorUserId, 'rh.manage');
  }
}

function mapReconciliation(row: Record<string, unknown>): RhReconciliationJour {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    hotelId: (row.hotel_id as number | null) ?? null,
    hotelName: (row.hotel_name as string | null) ?? null,
    date: row.date as string,
    heuresPrevues: row.heures_prevues as number,
    heuresPointees: row.heures_pointees as number,
    ecartHeures: row.ecart_heures as number,
    retardMinutes: row.retard_minutes as number,
    statut: row.statut as StatutReconciliation,
    paieValide: Boolean(row.paie_valide),
  };
}

function mapAlerte(row: Record<string, unknown>): RhTempsAlerte {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    hotelId: (row.hotel_id as number | null) ?? null,
    date: row.date as string,
    type: row.type as TypeTempsAlerte,
    message: row.message as string,
    severite: row.severite as RhTempsAlerte['severite'],
    statut: row.statut as StatutTempsAlerte,
    createdAt: row.created_at as string,
  };
}

function upsertAlerte(
  db: ReturnType<typeof getDatabase>,
  employeId: number,
  hotelId: number | null,
  date: string,
  type: TypeTempsAlerte,
  message: string,
  severite: RhTempsAlerte['severite'],
): void {
  const exists = db.prepare(`
    SELECT 1 FROM rh_temps_alertes
    WHERE employe_id = ? AND date = ? AND type = ? AND statut = 'ouverte'
  `).get(employeId, date, type);
  if (exists) return;
  db.prepare(`
    INSERT INTO rh_temps_alertes (employe_id, hotel_id, date, type, message, severite)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(employeId, hotelId, date, type, message, severite);
}

export function runReconciliationTemps(
  actorUserId: number,
  dateDebut: string,
  dateFin: string,
  hotelId?: number,
): { reconciliees: number; alertesCrees: number } {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const team = getTeamEmployeIds(actorUserId);
  const teamClause = teamFilterSql(team, 'pl.employe_id');

  const planningParams: unknown[] = [dateDebut, dateFin, ...teamClause.params];
  let planningHotel = '';
  if (hotelId) {
    planningHotel = ' AND pl.hotel_id = ?';
    planningParams.push(hotelId);
  }

  const plannings = db.prepare(`
    SELECT pl.employe_id, pl.hotel_id, pl.date, pl.heure_debut, pl.heure_fin, pl.shift
    FROM rh_plannings pl
    WHERE pl.statut != 'annule' AND pl.date BETWEEN ? AND ? AND ${teamClause.sql}${planningHotel}
  `).all(...planningParams) as Record<string, unknown>[];

  const ptTeamClause = teamFilterSql(team, 'pt.employe_id');
  const pointageParams: unknown[] = [dateDebut, dateFin, ...ptTeamClause.params];
  let pointageHotel = '';
  if (hotelId) {
    pointageHotel = ` AND e.hotel_id = ?`;
    pointageParams.push(hotelId);
  }

  const pointages = db.prepare(`
    SELECT pt.employe_id, pt.date, pt.heure_entree, pt.heures_travaillees, e.hotel_id
    FROM rh_pointages pt
    INNER JOIN rh_employes e ON e.id = pt.employe_id AND e.deleted_at IS NULL
    WHERE pt.date BETWEEN ? AND ? AND pt.statut IN ('soumis','valide') AND ${ptTeamClause.sql}${pointageHotel}
  `).all(...pointageParams) as Record<string, unknown>[];

  type DayAgg = {
    hotelId: number | null;
    heuresPrevues: number;
    heureDebutMin: string | null;
    heuresPointees: number;
    heureEntree: string | null;
  };

  const byKey = new Map<string, DayAgg>();

  for (const pl of plannings) {
    const key = `${pl.employe_id}:${pl.date}`;
    const debut = (pl.heure_debut as string) ?? '08:00';
    const fin = (pl.heure_fin as string) ?? '17:00';
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const heures = Math.max(0, (fh * 60 + fm - (dh * 60 + dm)) / 60);
    const cur = byKey.get(key) ?? {
      hotelId: (pl.hotel_id as number) ?? null,
      heuresPrevues: 0,
      heureDebutMin: null,
      heuresPointees: 0,
      heureEntree: null,
    };
    cur.heuresPrevues += heures;
    if (!cur.heureDebutMin || debut < cur.heureDebutMin) cur.heureDebutMin = debut;
    byKey.set(key, cur);
  }

  for (const pt of pointages) {
    const key = `${pt.employe_id}:${pt.date}`;
    const cur = byKey.get(key) ?? {
      hotelId: (pt.hotel_id as number) ?? null,
      heuresPrevues: 0,
      heureDebutMin: null,
      heuresPointees: 0,
      heureEntree: null,
    };
    cur.heuresPointees += Number(pt.heures_travaillees ?? 0);
    cur.heureEntree = (pt.heure_entree as string) ?? cur.heureEntree;
    if (!cur.hotelId) cur.hotelId = (pt.hotel_id as number) ?? null;
    byKey.set(key, cur);
  }

  let reconciliees = 0;
  let alertesCrees = 0;

  for (const [key, agg] of byKey) {
    const [employeIdStr, date] = key.split(':');
    const employeId = Number(employeIdStr);
    const retard = minutesRetard(agg.heureDebutMin ?? '08:00', agg.heureEntree);
    const ecart = Math.round((agg.heuresPointees - agg.heuresPrevues) * 100) / 100;
    const statut = determinerStatutReconciliation(agg.heuresPrevues, agg.heuresPointees, retard);

    db.prepare(`
      INSERT INTO rh_reconciliations_jour (
        employe_id, hotel_id, date, heures_prevues, heures_pointees, ecart_heures, retard_minutes, statut, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(employe_id, date) DO UPDATE SET
        hotel_id = excluded.hotel_id,
        heures_prevues = excluded.heures_prevues,
        heures_pointees = excluded.heures_pointees,
        ecart_heures = excluded.ecart_heures,
        retard_minutes = excluded.retard_minutes,
        statut = excluded.statut,
        updated_at = datetime('now')
    `).run(
      employeId, agg.hotelId, date,
      Math.round(agg.heuresPrevues * 100) / 100,
      Math.round(agg.heuresPointees * 100) / 100,
      ecart, retard, statut,
    );
    reconciliees++;

    const before = db.prepare(`SELECT COUNT(*) AS c FROM rh_temps_alertes WHERE statut = 'ouverte'`).get() as { c: number };

    if (retard >= SEUIL_RETARD_MINUTES) {
      upsertAlerte(db, employeId, agg.hotelId, date, 'retard_h15',
        `Retard H+15 : ${retard} min (prévu ${agg.heureDebutMin}, entrée ${agg.heureEntree ?? '—'})`, 'warning');
    }
    if (agg.heuresPrevues > 0 && agg.heuresPointees <= 0) {
      upsertAlerte(db, employeId, agg.hotelId, date, 'absence_non_pointee',
        'Planning prévu sans pointage enregistré', 'critique');
    }
    if (agg.heuresPrevues <= 0 && agg.heuresPointees > 0) {
      upsertAlerte(db, employeId, agg.hotelId, date, 'pointage_sans_planning',
        'Pointage sans créneau planning', 'info');
    }
    if (Math.abs(ecart) >= SEUIL_ECART_HEURES && agg.heuresPrevues > 0 && agg.heuresPointees > 0) {
      upsertAlerte(db, employeId, agg.hotelId, date, 'ecart_heures',
        `Écart heures : ${ecart > 0 ? '+' : ''}${ecart} h (prévu ${agg.heuresPrevues} h, pointé ${agg.heuresPointees} h)`, 'warning');
    }
    if (agg.heuresPointees > agg.heuresPrevues + 2 && agg.heuresPrevues > 0) {
      upsertAlerte(db, employeId, agg.hotelId, date, 'depassement_horaire',
        `Dépassement horaire : +${Math.round((agg.heuresPointees - agg.heuresPrevues) * 100) / 100} h`, 'warning');
    }

    const after = db.prepare(`SELECT COUNT(*) AS c FROM rh_temps_alertes WHERE statut = 'ouverte'`).get() as { c: number };
    alertesCrees += after.c - before.c;
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'PROCESS',
    module: 'rh',
    description: `Réconciliation temps ${dateDebut} → ${dateFin} : ${reconciliees} jour(s), ${alertesCrees} alerte(s)`,
  });
  return { reconciliees, alertesCrees };
}

export function listReconciliationsTemps(
  actorUserId: number,
  opts?: { dateDebut?: string; dateFin?: string; hotelId?: number; statut?: StatutReconciliation },
): RhReconciliationJour[] {
  assertRhTeam(actorUserId);
  const team = getTeamEmployeIds(actorUserId);
  const teamClause = teamFilterSql(team, 'r.employe_id');
  const conditions = [teamClause.sql];
  const params: unknown[] = [...teamClause.params];
  if (opts?.dateDebut) { conditions.push('r.date >= ?'); params.push(opts.dateDebut); }
  if (opts?.dateFin) { conditions.push('r.date <= ?'); params.push(opts.dateFin); }
  if (opts?.hotelId) { conditions.push('r.hotel_id = ?'); params.push(opts.hotelId); }
  if (opts?.statut) { conditions.push('r.statut = ?'); params.push(opts.statut); }

  return getDatabase()
    .prepare(`
      SELECT r.*, e.prenom || ' ' || e.nom AS employe_nom, h.name AS hotel_name
      FROM rh_reconciliations_jour r
      INNER JOIN rh_employes e ON e.id = r.employe_id AND e.deleted_at IS NULL
      LEFT JOIN hotels h ON h.id = r.hotel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.date DESC, employe_nom
    `)
    .all(...params)
    .map((r) => mapReconciliation(r as Record<string, unknown>));
}

export function listTempsAlertes(
  actorUserId: number,
  statut?: StatutTempsAlerte,
): RhTempsAlerte[] {
  assertRhTeam(actorUserId);
  const team = getTeamEmployeIds(actorUserId);
  const teamClause = teamFilterSql(team, 'a.employe_id');
  const conditions = [teamClause.sql];
  const params: unknown[] = [...teamClause.params];
  if (statut) { conditions.push('a.statut = ?'); params.push(statut); }

  return getDatabase()
    .prepare(`
      SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_temps_alertes a
      INNER JOIN rh_employes e ON e.id = a.employe_id AND e.deleted_at IS NULL
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.date DESC, a.created_at DESC
    `)
    .all(...params)
    .map((r) => mapAlerte(r as Record<string, unknown>));
}

export function traiterTempsAlerte(
  actorUserId: number,
  alerteId: number,
  action: 'traitee' | 'ignoree',
): RhTempsAlerte {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const row = db.prepare(`SELECT id FROM rh_temps_alertes WHERE id = ?`).get(alerteId);
  if (!row) throw new Error('Alerte introuvable.');
  db.prepare(`
    UPDATE rh_temps_alertes
    SET statut = ?, traite_par = ?, traite_at = datetime('now')
    WHERE id = ?
  `).run(action === 'traitee' ? 'traitee' : 'ignoree', actorUserId, alerteId);
  return listTempsAlertes(actorUserId).find((a) => a.id === alerteId)!;
}

export function validerReconciliationPaie(
  actorUserId: number,
  employeId: number,
  dateDebut: string,
  dateFin: string,
): number {
  assertPermission(actorUserId, 'rh.manage');
  const result = getDatabase().prepare(`
    UPDATE rh_reconciliations_jour
    SET paie_valide = 1, updated_at = datetime('now')
    WHERE employe_id = ? AND date BETWEEN ? AND ? AND statut IN ('ok','ecart')
  `).run(employeId, dateDebut, dateFin);
  return result.changes;
}

export function getReconciliationPaie(
  actorUserId: number,
  periode: string,
): RhReconciliationPaie[] {
  assertPermission(actorUserId, 'rh.manage');
  const [year, month] = periode.split('-');
  const dateDebut = `${year}-${month}-01`;
  const dateFin = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);

  const rows = getDatabase().prepare(`
    SELECT r.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
           SUM(r.heures_pointees) AS heures_pointees,
           SUM(r.heures_prevues) AS heures_prevues,
           SUM(CASE WHEN r.paie_valide = 1 THEN r.heures_pointees ELSE 0 END) AS heures_paie_validees,
           SUM(CASE WHEN r.statut IN ('alerte','sans_pointage') THEN 1 ELSE 0 END) AS jours_alerte,
           COUNT(*) AS jours_reconcilies
    FROM rh_reconciliations_jour r
    INNER JOIN rh_employes e ON e.id = r.employe_id AND e.deleted_at IS NULL
    WHERE r.date BETWEEN ? AND ?
    GROUP BY r.employe_id
    ORDER BY employe_nom
  `).all(dateDebut, dateFin) as Record<string, unknown>[];

  return rows.map((r) => ({
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    heuresPrevues: Math.round(Number(r.heures_prevues) * 100) / 100,
    heuresPointees: Math.round(Number(r.heures_pointees) * 100) / 100,
    heuresPaieValidees: Math.round(Number(r.heures_paie_validees) * 100) / 100,
    joursAlerte: Number(r.jours_alerte),
    joursReconcilies: Number(r.jours_reconcilies),
    pretPaie: Number(r.jours_alerte) === 0 && Number(r.heures_pointees) > 0,
  }));
}

export async function exportReconciliationCsv(
  actorUserId: number,
  dateDebut: string,
  dateFin: string,
): Promise<RhExportResult> {
  const rows = listReconciliationsTemps(actorUserId, { dateDebut, dateFin });
  const lines = [
    csvLine(['Réconciliation temps', dateDebut, dateFin]),
    csvLine(['Employé', 'Date', 'Hôtel', 'Prévu (h)', 'Pointé (h)', 'Écart (h)', 'Retard (min)', 'Statut', 'Paie validée']),
  ];
  for (const r of rows) {
    lines.push(csvLine([
      r.employeNom, r.date, r.hotelName ?? '', r.heuresPrevues, r.heuresPointees,
      r.ecartHeures, r.retardMinutes, r.statut, r.paieValide ? 'oui' : 'non',
    ]));
  }
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rh', description: `Export réconciliation ${dateDebut}-${dateFin}` });
  return saveRhExportFile(Buffer.from(lines.join('\n'), 'utf-8'), `reconciliation_${dateDebut}_${dateFin}.csv`, 'csv');
}
