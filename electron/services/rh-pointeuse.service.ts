import { createHash } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { userHasPermission } from './permissions.service';
import { emitErpEvent } from './event-bus.service';

export interface RhPointeuse {
  id: number;
  hotelId: number;
  nom: string;
  marque: string;
  adresseIp: string | null;
  port: number;
  actif: boolean;
  derniereSync: string | null;
}

export interface RhRawPunch {
  id: number;
  pointeuseId: number | null;
  hotelId: number;
  badgeId: string;
  punchAt: string;
  typePunch: 'entree' | 'sortie' | 'autre' | null;
  traite: boolean;
  pointageId: number | null;
  employeNom?: string;
}

export interface UpsertPointeuseInput {
  hotelId: number;
  nom: string;
  marque?: string;
  adresseIp?: string | null;
  port?: number;
  actif?: boolean;
}

export interface ImportPunchRow {
  badgeId: string;
  punchAt: string;
  typePunch?: 'entree' | 'sortie' | 'autre';
}

export interface TraiterPunchesResult {
  joursTraites: number;
  pointagesCrees: number;
  pointagesMisAJour: number;
  ignorés: number;
}

function assertRhPointeuse(actorUserId: number): void {
  if (!userHasPermission(actorUserId, 'rh.manage')) {
    throw new Error('Accès refusé — droits RH requis.');
  }
}

function hashPunch(hotelId: number, badgeId: string, punchAt: string): string {
  return createHash('sha256').update(`${hotelId}|${badgeId}|${punchAt}`).digest('hex');
}

function mapPointeuse(row: Record<string, unknown>): RhPointeuse {
  return {
    id: row.id as number,
    hotelId: row.hotel_id as number,
    nom: row.nom as string,
    marque: row.marque as string,
    adresseIp: (row.adresse_ip as string | null) ?? null,
    port: (row.port as number) ?? 4370,
    actif: Boolean(row.actif),
    derniereSync: (row.derniere_sync as string | null) ?? null,
  };
}

function mapRawPunch(row: Record<string, unknown>): RhRawPunch {
  return {
    id: row.id as number,
    pointeuseId: (row.pointeuse_id as number | null) ?? null,
    hotelId: row.hotel_id as number,
    badgeId: row.badge_id as string,
    punchAt: row.punch_at as string,
    typePunch: (row.type_punch as RhRawPunch['typePunch']) ?? null,
    traite: Boolean(row.traite),
    pointageId: (row.pointage_id as number | null) ?? null,
    employeNom: (row.employe_nom as string | undefined) ?? undefined,
  };
}

export function listPointeuses(hotelId: number): RhPointeuse[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM rh_pointeuses WHERE hotel_id = ? ORDER BY nom
  `).all(hotelId) as Record<string, unknown>[];
  return rows.map(mapPointeuse);
}

export function upsertPointeuse(actorUserId: number, input: UpsertPointeuseInput, id?: number): RhPointeuse {
  assertRhPointeuse(actorUserId);
  const db = getDatabase();
  if (id) {
    db.prepare(`
      UPDATE rh_pointeuses
      SET nom = ?, marque = ?, adresse_ip = ?, port = ?, actif = ?
      WHERE id = ? AND hotel_id = ?
    `).run(
      input.nom,
      input.marque ?? 'ZKTeco',
      input.adresseIp ?? null,
      input.port ?? 4370,
      input.actif === false ? 0 : 1,
      id,
      input.hotelId,
    );
    return listPointeuses(input.hotelId).find((p) => p.id === id)!;
  }
  const res = db.prepare(`
    INSERT INTO rh_pointeuses (hotel_id, nom, marque, adresse_ip, port, actif)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).get(
    input.hotelId,
    input.nom,
    input.marque ?? 'ZKTeco',
    input.adresseIp ?? null,
    input.port ?? 4370,
    input.actif === false ? 0 : 1,
  ) as { id: number };
  writeAuditLog(actorUserId, 'rh.pointeuse.create', `pointeuse:${res.id}`, input.nom);
  return listPointeuses(input.hotelId).find((p) => p.id === res.id)!;
}

export function setEmployeBadge(actorUserId: number, employeId: number, badgeId: string | null): void {
  assertRhPointeuse(actorUserId);
  getDatabase().prepare(`UPDATE rh_employes SET pointeuse_badge_id = ? WHERE id = ?`).run(badgeId, employeId);
  writeAuditLog(actorUserId, 'rh.employe.badge', `employe:${employeId}`, badgeId ?? '—');
}

function parseCsvLine(line: string): string[] {
  return line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
}

function normalizeDateTime(raw: string, heure?: string): string | null {
  const combined = heure ? `${raw} ${heure}` : raw;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(combined)) {
    return combined.replace('T', ' ').slice(0, 16);
  }
  const m = combined.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const [, d, mo, y, h, mi] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')} ${h.padStart(2, '0')}:${mi}`;
  }
  return null;
}

export function parseCsvPunches(csvContent: string): ImportPunchRow[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => h.includes('badge') || h.includes('matricule') || h.includes('date'));
  const rows: ImportPunchRow[] = [];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 2) continue;
    let badgeId: string;
    let punchAt: string | null;
    let typePunch: ImportPunchRow['typePunch'];
    if (hasHeader) {
      const badgeIdx = header.findIndex((h) => h.includes('badge') || h.includes('matricule') || h.includes('id'));
      const dateIdx = header.findIndex((h) => h === 'date' || h.includes('datetime') || h.includes('horodatage'));
      const timeIdx = header.findIndex((h) => h === 'heure' || h === 'time');
      const typeIdx = header.findIndex((h) => h.includes('type') || h.includes('sens'));
      badgeId = cols[badgeIdx >= 0 ? badgeIdx : 0];
      const dateRaw = cols[dateIdx >= 0 ? dateIdx : 1];
      const timeRaw = timeIdx >= 0 ? cols[timeIdx] : undefined;
      punchAt = normalizeDateTime(dateRaw, timeRaw);
      if (typeIdx >= 0) {
        const t = cols[typeIdx].toLowerCase();
        typePunch = t.includes('out') || t.includes('sortie') ? 'sortie' : t.includes('in') || t.includes('entree') ? 'entree' : 'autre';
      }
    } else {
      badgeId = cols[0];
      punchAt = normalizeDateTime(cols[1], cols[2]);
    }
    if (!badgeId || !punchAt) continue;
    rows.push({ badgeId, punchAt, typePunch });
  }
  return rows;
}

export function importPunches(
  actorUserId: number,
  hotelId: number,
  rows: ImportPunchRow[],
  pointeuseId?: number,
): { imported: number; duplicates: number } {
  assertRhPointeuse(actorUserId);
  const db = getDatabase();
  let imported = 0;
  let duplicates = 0;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO rh_raw_punches (pointeuse_id, hotel_id, badge_id, punch_at, type_punch, hash_ligne)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const row of rows) {
    const hash = hashPunch(hotelId, row.badgeId, row.punchAt);
    const res = insert.run(pointeuseId ?? null, hotelId, row.badgeId, row.punchAt, row.typePunch ?? null, hash);
    if (res.changes > 0) imported++;
    else duplicates++;
  }
  if (pointeuseId) {
    db.prepare(`UPDATE rh_pointeuses SET derniere_sync = datetime('now') WHERE id = ?`).run(pointeuseId);
  }
  writeAuditLog(actorUserId, 'rh.pointeuse.import', `hotel:${hotelId}`, `${imported} pointages importés`);
  emitErpEvent({ type: 'POINTEUSE_IMPORTED', entiteType: 'hotel', entiteId: hotelId, data: { imported, duplicates } });
  return { imported, duplicates };
}

export function listRawPunches(hotelId: number, traite?: boolean, limit = 200): RhRawPunch[] {
  const db = getDatabase();
  const sql = traite === undefined
    ? `SELECT rp.*, e.prenom || ' ' || e.nom AS employe_nom
       FROM rh_raw_punches rp
       LEFT JOIN rh_employes e ON e.pointeuse_badge_id = rp.badge_id
       WHERE rp.hotel_id = ? ORDER BY rp.punch_at DESC LIMIT ?`
    : `SELECT rp.*, e.prenom || ' ' || e.nom AS employe_nom
       FROM rh_raw_punches rp
       LEFT JOIN rh_employes e ON e.pointeuse_badge_id = rp.badge_id
       WHERE rp.hotel_id = ? AND rp.traite = ? ORDER BY rp.punch_at DESC LIMIT ?`;
  const rows = traite === undefined
    ? db.prepare(sql).all(hotelId, limit)
    : db.prepare(sql).all(hotelId, traite ? 1 : 0, limit);
  return (rows as Record<string, unknown>[]).map(mapRawPunch);
}

function calcHeures(entree: string | null, sortie: string | null): number | null {
  if (!entree || !sortie) return null;
  const [eh, em] = entree.split(':').map(Number);
  const [sh, sm] = sortie.split(':').map(Number);
  const mins = sh * 60 + sm - (eh * 60 + em);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
}

export function traiterRawPunches(
  actorUserId: number,
  hotelId: number,
  dateDebut?: string,
  dateFin?: string,
): TraiterPunchesResult {
  assertRhPointeuse(actorUserId);
  const db = getDatabase();
  const conditions = ['rp.hotel_id = ?', 'rp.traite = 0'];
  const params: unknown[] = [hotelId];
  if (dateDebut) { conditions.push('date(rp.punch_at) >= ?'); params.push(dateDebut); }
  if (dateFin) { conditions.push('date(rp.punch_at) <= ?'); params.push(dateFin); }
  const punches = db.prepare(`
    SELECT rp.*, e.id AS employe_id
    FROM rh_raw_punches rp
    INNER JOIN rh_employes e ON e.pointeuse_badge_id = rp.badge_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.id, rp.punch_at
  `).all(...params) as Record<string, unknown>[];

  const byDay = new Map<string, Map<number, RhRawPunch[]>>();
  for (const p of punches) {
    const employeId = p.employe_id as number;
    const date = (p.punch_at as string).slice(0, 10);
    const punch = mapRawPunch(p);
    if (!byDay.has(date)) byDay.set(date, new Map());
    const dayMap = byDay.get(date)!;
    if (!dayMap.has(employeId)) dayMap.set(employeId, []);
    dayMap.get(employeId)!.push(punch);
  }

  let pointagesCrees = 0;
  let pointagesMisAJour = 0;
  let ignorés = 0;

  for (const [date, employes] of byDay) {
    for (const [employeId, dayPunches] of employes) {
      dayPunches.sort((a, b) => a.punchAt.localeCompare(b.punchAt));
      const entree = dayPunches.find((p) => p.typePunch === 'entree') ?? dayPunches[0];
      const sortie = [...dayPunches].reverse().find((p) => p.typePunch === 'sortie') ?? dayPunches[dayPunches.length - 1];
      const heureEntree = entree.punchAt.slice(11, 16);
      const heureSortie = sortie.id !== entree.id ? sortie.punchAt.slice(11, 16) : null;
      const heures = calcHeures(heureEntree, heureSortie);
      const punchIds = dayPunches.map((p) => p.id).join(',');
      const existing = db.prepare(`SELECT id, statut FROM rh_pointages WHERE employe_id = ? AND date = ?`).get(employeId, date) as
        | { id: number; statut: string }
        | undefined;
      if (existing?.statut === 'valide') {
        ignorés++;
        continue;
      }
      let pointageId: number;
      if (existing) {
        db.prepare(`
          UPDATE rh_pointages
          SET heure_entree = ?, heure_sortie = ?, heures_travaillees = ?, source = 'pointeuse',
              raw_punch_ids = ?, statut = 'brouillon', updated_at = datetime('now')
          WHERE id = ?
        `).run(heureEntree, heureSortie, heures, punchIds, existing.id);
        pointageId = existing.id;
        pointagesMisAJour++;
      } else {
        const res = db.prepare(`
          INSERT INTO rh_pointages (employe_id, date, heure_entree, heure_sortie, heures_travaillees, statut, source, raw_punch_ids)
          VALUES (?, ?, ?, ?, ?, 'brouillon', 'pointeuse', ?) RETURNING id
        `).get(employeId, date, heureEntree, heureSortie, heures, punchIds) as { id: number };
        pointageId = res.id;
        pointagesCrees++;
      }
      for (const p of dayPunches) {
        db.prepare(`UPDATE rh_raw_punches SET traite = 1, pointage_id = ? WHERE id = ?`).run(pointageId, p.id);
      }
    }
  }

  writeAuditLog(actorUserId, 'rh.pointeuse.traiter', `hotel:${hotelId}`, `${pointagesCrees} créés, ${pointagesMisAJour} MAJ`);
  emitErpEvent({
    type: 'POINTAGES_GENERATED',
    entiteType: 'hotel',
    entiteId: hotelId,
    data: { pointagesCrees, pointagesMisAJour, ignorés },
  });
  return { joursTraites: byDay.size, pointagesCrees, pointagesMisAJour, ignorés };
}
