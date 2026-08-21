import { getDatabase } from '../database/sqlite';
import { actorCanAccessHotel, getActorContext, isGlobalAdminRole } from './actorContext';
import { writeAuditLog } from './audit.service';
import { getPosClosureStatusForHotel } from './pos-recettes-sync.service';
import { findWorkflow, syncWorkflowStatutOnly } from './workflow.service';

export type NightAuditSeverity = 'blocking' | 'warning' | 'info';
export type NightAuditControlStatus = 'ok' | 'failed';

export interface NightAuditControl {
  code: string;
  libelle: string;
  severity: NightAuditSeverity;
  statut: NightAuditControlStatus;
  occurrences: number;
  details: string[];
}

export interface NightAuditSnapshot {
  expectedBusinessDate: string;
  requestedBusinessDate: string;
  pendingArrivals: string[];
  pendingDepartures: string[];
  incompletePoliceSheets: string[];
  openPosPoints: string[];
  missingFolios: string[];
  roomStatusMismatches: string[];
  cashGap: number;
  cashGapJustified: boolean;
}

export interface HotelBusinessDate {
  hotelId: number;
  currentBusinessDate: string;
  lastClosedDate: string | null;
}

export interface NightAuditEvent {
  id: number;
  action: 'controle' | 'cloture' | 'reouverture';
  actorUserId: number | null;
  motif: string | null;
  createdAt: string;
}

export interface NightAuditReport {
  id: number;
  closureId: number;
  hotelId: number;
  businessDate: string;
  statut: 'controle' | 'bloque' | 'cloture' | 'rouvert';
  blockersCount: number;
  warningsCount: number;
  occupiedRooms: number;
  roomChargesPosted: number;
  roomRevenue: number;
  stayTaxTotal: number;
  generatedAt: string;
  closedAt: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  controls: NightAuditControl[];
  events: NightAuditEvent[];
}

type ClosureRef = {
  id: number;
  hotelId: number;
  dateJournal: string;
  statut: string;
  ecartCaisse: number;
  observations: string | null;
  reconciliationId: number | null;
};

function assertHotelAccess(actorUserId: number, hotelId: number): void {
  if (!actorCanAccessHotel(getActorContext(actorUserId), hotelId)) throw new Error('Accès hôtel refusé.');
}

function getClosureRef(closureId: number): ClosureRef {
  const row = getDatabase().prepare(`
    SELECT id, hotel_id, date_journal, statut, ecart_caisse, observations, reconciliation_id
    FROM daily_closures WHERE id=?
  `).get(closureId) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Clôture ${closureId} introuvable.`);
  return {
    id: Number(row.id), hotelId: Number(row.hotel_id), dateJournal: String(row.date_journal),
    statut: String(row.statut), ecartCaisse: Number(row.ecart_caisse ?? 0),
    observations: row.observations ? String(row.observations) : null,
    reconciliationId: row.reconciliation_id ? Number(row.reconciliation_id) : null,
  };
}

function ensureBusinessDate(hotelId: number, fallbackDate: string): HotelBusinessDate {
  const db = getDatabase();
  db.prepare(`
    INSERT OR IGNORE INTO hotel_business_dates (hotel_id, current_business_date, last_closed_date)
    VALUES (?, ?, (SELECT MAX(date_journal) FROM daily_closures WHERE hotel_id=? AND statut='cloture'))
  `).run(hotelId, fallbackDate, hotelId);
  const row = db.prepare(`SELECT * FROM hotel_business_dates WHERE hotel_id=?`).get(hotelId) as Record<string, unknown>;
  return {
    hotelId,
    currentBusinessDate: String(row.current_business_date),
    lastClosedDate: row.last_closed_date ? String(row.last_closed_date) : null,
  };
}

export function getHotelBusinessDate(actorUserId: number, hotelId: number): HotelBusinessDate {
  assertHotelAccess(actorUserId, hotelId);
  const fallback = (getDatabase().prepare(`
    SELECT COALESCE(
      (SELECT date(MIN(date_journal)) FROM daily_closures
        WHERE hotel_id=? AND statut IN ('brouillon','soumis','valide_unite','valide_dec')),
      (SELECT date(MAX(date_journal), '+1 day') FROM daily_closures WHERE hotel_id=? AND statut='cloture'),
      date('now')
    ) AS d
  `).get(hotelId, hotelId) as { d: string }).d;
  return ensureBusinessDate(hotelId, fallback);
}

function control(code: string, libelle: string, severity: NightAuditSeverity, details: string[]): NightAuditControl {
  return { code, libelle, severity, statut: details.length ? 'failed' : 'ok', occurrences: details.length, details };
}

export function evaluateNightAuditControls(snapshot: NightAuditSnapshot): NightAuditControl[] {
  const dateMismatch = snapshot.expectedBusinessDate === snapshot.requestedBusinessDate
    ? [] : [`Date attendue ${snapshot.expectedBusinessDate}, date demandée ${snapshot.requestedBusinessDate}`];
  const cashGap = Math.abs(snapshot.cashGap) > 0.01 && !snapshot.cashGapJustified
    ? [`Écart non justifié de ${snapshot.cashGap.toFixed(2)} DA`] : [];
  return [
    control('BUSINESS_DATE', 'Séquence de la date hôtelière', 'blocking', dateMismatch),
    control('PENDING_ARRIVALS', 'Arrivées non traitées', 'blocking', snapshot.pendingArrivals),
    control('PENDING_DEPARTURES', 'Départs non traités', 'blocking', snapshot.pendingDepartures),
    control('POLICE_INCOMPLETE', 'Fiches de police incomplètes', 'blocking', snapshot.incompletePoliceSheets),
    control('POS_OPEN', 'Points de vente ou sessions POS ouverts', 'blocking', snapshot.openPosPoints),
    control('MISSING_FOLIOS', 'Séjours sans folio', 'blocking', snapshot.missingFolios),
    control('ROOM_STATUS', 'Incohérences réservation / état chambre', 'warning', snapshot.roomStatusMismatches),
    control('CASH_GAP', 'Écart de caisse non justifié', 'warning', cashGap),
  ];
}

function labels(rows: Record<string, unknown>[], formatter: (row: Record<string, unknown>) => string): string[] {
  return rows.map(formatter);
}

function collectSnapshot(closure: ClosureRef): NightAuditSnapshot {
  const db = getDatabase();
  const businessDate = ensureBusinessDate(closure.hotelId, closure.dateJournal);
  const pendingArrivals = db.prepare(`
    SELECT id, client_nom, chambre_id FROM reservations
    WHERE hotel_id=? AND date_arrivee<=? AND statut IN ('provisoire','confirmee') AND deleted_at IS NULL
    ORDER BY date_arrivee, id
  `).all(closure.hotelId, closure.dateJournal) as Record<string, unknown>[];
  const pendingDepartures = db.prepare(`
    SELECT id, client_nom, chambre_id FROM reservations
    WHERE hotel_id=? AND date_depart<=? AND statut='arrivee' AND deleted_at IS NULL
    ORDER BY date_depart, id
  `).all(closure.hotelId, closure.dateJournal) as Record<string, unknown>[];
  const incompletePolice = db.prepare(`
    SELECT id, nom, prenom FROM fiche_police
    WHERE hotel_id=? AND statut='present'
      AND (numero_piece='A COMPLETER' OR TRIM(numero_piece)='' OR date_naissance IS NULL OR nationalite IS NULL OR TRIM(nationalite)='')
    ORDER BY id
  `).all(closure.hotelId) as Record<string, unknown>[];
  const missingFolios = db.prepare(`
    SELECT r.id, r.client_nom FROM reservations r
    LEFT JOIN hebergement_folios f ON f.reservation_id=r.id
    WHERE r.hotel_id=? AND r.statut='arrivee' AND r.date_arrivee<=? AND r.date_depart>?
      AND r.deleted_at IS NULL AND f.id IS NULL
    ORDER BY r.id
  `).all(closure.hotelId, closure.dateJournal, closure.dateJournal) as Record<string, unknown>[];
  const roomMismatches = db.prepare(`
    SELECT r.id, r.client_nom, c.numero, c.statut AS chambre_statut
    FROM reservations r LEFT JOIN chambres c ON c.id=r.chambre_id
    WHERE r.hotel_id=? AND r.statut='arrivee' AND r.date_arrivee<=? AND r.date_depart>?
      AND r.deleted_at IS NULL AND (r.chambre_id IS NULL OR c.statut!='occupee')
    ORDER BY r.id
  `).all(closure.hotelId, closure.dateJournal, closure.dateJournal) as Record<string, unknown>[];
  const pos = getPosClosureStatusForHotel(closure.hotelId, closure.dateJournal);
  return {
    expectedBusinessDate: businessDate.currentBusinessDate,
    requestedBusinessDate: closure.dateJournal,
    pendingArrivals: labels(pendingArrivals, (r) => `Réservation #${r.id} — ${r.client_nom}`),
    pendingDepartures: labels(pendingDepartures, (r) => `Réservation #${r.id} — ${r.client_nom}`),
    incompletePoliceSheets: labels(incompletePolice, (r) => `Fiche #${r.id} — ${r.nom} ${r.prenom}`),
    openPosPoints: pos.required ? pos.points.filter((p) => !p.closed || p.openSessions > 0).map((p) => `${p.nom} — ${p.openSessions} session(s) ouverte(s)`) : [],
    missingFolios: labels(missingFolios, (r) => `Réservation #${r.id} — ${r.client_nom}`),
    roomStatusMismatches: labels(roomMismatches, (r) => `Réservation #${r.id} — chambre ${r.numero ?? 'non affectée'} (${r.chambre_statut ?? 'absente'})`),
    cashGap: closure.ecartCaisse,
    cashGapJustified: Boolean(closure.observations?.trim() || closure.reconciliationId),
  };
}

function mapReport(row: Record<string, unknown>): NightAuditReport {
  const db = getDatabase();
  const controls = (db.prepare(`SELECT * FROM night_audit_controls WHERE run_id=? ORDER BY id`).all(row.id) as Record<string, unknown>[]).map((c) => ({
    code: String(c.code), libelle: String(c.libelle), severity: c.severity as NightAuditSeverity,
    statut: c.statut as NightAuditControlStatus, occurrences: Number(c.occurrences),
    details: (() => { try { return JSON.parse(String(c.details_json ?? '[]')) as string[]; } catch { return []; } })(),
  }));
  const events = (db.prepare(`SELECT * FROM night_audit_events WHERE run_id=? ORDER BY id DESC`).all(row.id) as Record<string, unknown>[]).map((e) => ({
    id: Number(e.id), action: e.action as NightAuditEvent['action'],
    actorUserId: e.actor_user_id ? Number(e.actor_user_id) : null,
    motif: e.motif ? String(e.motif) : null, createdAt: String(e.created_at),
  }));
  return {
    id: Number(row.id), closureId: Number(row.closure_id), hotelId: Number(row.hotel_id),
    businessDate: String(row.business_date), statut: row.statut as NightAuditReport['statut'],
    blockersCount: Number(row.blockers_count), warningsCount: Number(row.warnings_count),
    occupiedRooms: Number(row.occupied_rooms), roomChargesPosted: Number(row.room_charges_posted),
    roomRevenue: Number(row.room_revenue), stayTaxTotal: Number(row.stay_tax_total),
    generatedAt: String(row.generated_at), closedAt: row.closed_at ? String(row.closed_at) : null,
    reopenedAt: row.reopened_at ? String(row.reopened_at) : null,
    reopenReason: row.reopen_reason ? String(row.reopen_reason) : null, controls, events,
  };
}

export function getNightAuditReport(actorUserId: number, closureId: number): NightAuditReport | null {
  const closure = getClosureRef(closureId);
  assertHotelAccess(actorUserId, closure.hotelId);
  const row = getDatabase().prepare(`SELECT * FROM night_audit_runs WHERE closure_id=?`).get(closureId) as Record<string, unknown> | undefined;
  return row ? mapReport(row) : null;
}

export function runNightAuditControls(actorUserId: number, closureId: number): NightAuditReport {
  const closure = getClosureRef(closureId);
  assertHotelAccess(actorUserId, closure.hotelId);
  if (closure.statut === 'cloture') throw new Error('La journée est déjà clôturée.');
  const controls = evaluateNightAuditControls(collectSnapshot(closure));
  const blockers = controls.filter((c) => c.severity === 'blocking' && c.statut === 'failed').length;
  const warnings = controls.filter((c) => c.severity === 'warning' && c.statut === 'failed').length;
  const db = getDatabase();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO night_audit_runs (closure_id, hotel_id, business_date, statut, blockers_count, warnings_count, generated_by, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(closure_id) DO UPDATE SET business_date=excluded.business_date, statut=excluded.statut,
        blockers_count=excluded.blockers_count, warnings_count=excluded.warnings_count,
        generated_by=excluded.generated_by, generated_at=datetime('now')
    `).run(closure.id, closure.hotelId, closure.dateJournal, blockers ? 'bloque' : 'controle', blockers, warnings, actorUserId);
    const run = db.prepare(`SELECT id FROM night_audit_runs WHERE closure_id=?`).get(closure.id) as { id: number };
    db.prepare(`DELETE FROM night_audit_controls WHERE run_id=?`).run(run.id);
    const insert = db.prepare(`
      INSERT INTO night_audit_controls (run_id, code, libelle, severity, statut, occurrences, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of controls) insert.run(run.id, c.code, c.libelle, c.severity, c.statut, c.occurrences, JSON.stringify(c.details));
    db.prepare(`INSERT INTO night_audit_events (run_id, action, actor_user_id) VALUES (?, 'controle', ?)`).run(run.id, actorUserId);
  })();
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'night_audit', description: `Contrôle Night Audit ${closure.dateJournal} — ${blockers} blocage(s)` });
  return getNightAuditReport(actorUserId, closureId)!;
}

/** Appelé dans la transaction de clôture après un contrôle sans blocage. */
export function applyNightAuditClosure(actorUserId: number, closureId: number): NightAuditReport {
  const closure = getClosureRef(closureId);
  assertHotelAccess(actorUserId, closure.hotelId);
  const report = runNightAuditControls(actorUserId, closureId);
  if (report.blockersCount > 0) {
    const failed = report.controls.filter((c) => c.severity === 'blocking' && c.statut === 'failed').map((c) => c.libelle);
    throw new Error(`Night Audit bloqué : ${failed.join(', ')}.`);
  }

  const db = getDatabase();
  const taxSetting = db.prepare(`SELECT value FROM app_settings WHERE key='night_audit_taxe_sejour_par_adulte'`).get() as { value: string } | undefined;
  const taxPerAdult = Math.max(0, Number(taxSetting?.value ?? 200) || 0);
  const stays = db.prepare(`
    SELECT id, montant_total, nb_nuits, nb_adultes FROM reservations
    WHERE hotel_id=? AND statut='arrivee' AND date_arrivee<=? AND date_depart>?
      AND deleted_at IS NULL ORDER BY id
  `).all(closure.hotelId, closure.dateJournal, closure.dateJournal) as { id: number; montant_total: number; nb_nuits: number; nb_adultes: number }[];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO night_audit_room_postings
      (run_id, reservation_id, hotel_id, business_date, room_amount, stay_tax_amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const stay of stays) {
    const nightly = stay.nb_nuits > 0 ? Math.round((stay.montant_total / stay.nb_nuits) * 100) / 100 : stay.montant_total;
    insert.run(report.id, stay.id, closure.hotelId, closure.dateJournal, nightly, Math.max(0, stay.nb_adultes) * taxPerAdult);
  }
  const totals = db.prepare(`
    SELECT COUNT(*) AS c, COALESCE(SUM(room_amount),0) AS room_revenue,
      COALESCE(SUM(stay_tax_amount),0) AS stay_tax FROM night_audit_room_postings WHERE run_id=?
  `).get(report.id) as { c: number; room_revenue: number; stay_tax: number };
  db.prepare(`
    UPDATE night_audit_runs SET statut='cloture', occupied_rooms=?, room_charges_posted=?,
      room_revenue=?, stay_tax_total=?, closed_by=?, closed_at=datetime('now'), reopened_by=NULL,
      reopened_at=NULL, reopen_reason=NULL WHERE id=?
  `).run(stays.length, totals.c, totals.room_revenue, totals.stay_tax, actorUserId, report.id);
  db.prepare(`
    UPDATE hotel_business_dates SET current_business_date=date(?, '+1 day'), last_closed_date=?, updated_at=datetime('now')
    WHERE hotel_id=?
  `).run(closure.dateJournal, closure.dateJournal, closure.hotelId);
  db.prepare(`INSERT INTO night_audit_events (run_id, action, actor_user_id) VALUES (?, 'cloture', ?)`).run(report.id, actorUserId);
  return getNightAuditReport(actorUserId, closureId)!;
}

export function reopenNightAudit(actorUserId: number, closureId: number, motif: string): NightAuditReport {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Réouverture réservée aux administrateurs.');
  const closure = getClosureRef(closureId);
  if (closure.statut !== 'cloture') throw new Error('Seule une journée clôturée peut être réouverte.');
  const later = getDatabase().prepare(`
    SELECT id FROM daily_closures WHERE hotel_id=? AND date_journal>? AND statut='cloture' LIMIT 1
  `).get(closure.hotelId, closure.dateJournal);
  if (later) throw new Error('Réouvrez d’abord les journées clôturées ultérieures.');
  const report = getNightAuditReport(actorUserId, closureId);
  if (!report) throw new Error('Rapport Night Audit introuvable.');

  const db = getDatabase();
  db.transaction(() => {
    db.prepare(`UPDATE daily_closures SET statut='valide_dec', closed_at=NULL, observations=COALESCE(observations,'') || ?, updated_at=datetime('now') WHERE id=?`)
      .run(`\nRéouverture Night Audit: ${motif}`, closureId);
    db.prepare(`
      UPDATE night_audit_runs SET statut='rouvert', reopened_by=?, reopened_at=datetime('now'), reopen_reason=? WHERE id=?
    `).run(actorUserId, motif, report.id);
    db.prepare(`UPDATE hotel_business_dates SET current_business_date=?, last_closed_date=(
      SELECT MAX(date_journal) FROM daily_closures WHERE hotel_id=? AND statut='cloture'
    ), updated_at=datetime('now') WHERE hotel_id=?`).run(closure.dateJournal, closure.hotelId, closure.hotelId);
    db.prepare(`INSERT INTO night_audit_events (run_id, action, actor_user_id, motif) VALUES (?, 'reouverture', ?, ?)`)
      .run(report.id, actorUserId, motif);
  })();
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) syncWorkflowStatutOnly(actorUserId, wf.id, 'valide_dec');
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'night_audit', description: `Réouverture Night Audit ${closure.dateJournal} — ${motif}` });
  return getNightAuditReport(actorUserId, closureId)!;
}
