import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { checkClosureDeadlineAlerts } from './daily-closure.service';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface DecAlert {
  id: number;
  sourceModule: string;
  hotelId: number | null;
  hotelName: string | null;
  severity: AlertSeverity;
  statut: string;
  titre: string;
  description: string | null;
  dueAt: string | null;
  createdAt: string;
}

export interface DecWidgetData {
  code: string;
  libelle: string;
  domaine: string;
  value: number | string;
  level: 'normal' | 'warning' | 'critical';
}

export interface DecCockpitDashboard {
  alerts: DecAlert[];
  widgets: DecWidgetData[];
  generatedAt: string;
}

export function createDecAlertIfMissing(input: {
  sourceModule: string;
  entityType?: string;
  entityId?: number;
  hotelId?: number;
  severity: AlertSeverity;
  titre: string;
  description?: string;
  dueAt?: string;
}): DecAlert | null {
  const db = getDatabase();
  const dup = db.prepare(`
    SELECT id FROM dec_cockpit_alerts
    WHERE source_module=? AND titre=? AND statut='ouverte' AND (hotel_id IS ? OR hotel_id=?)
    LIMIT 1
  `).get(input.sourceModule, input.titre, input.hotelId ?? null, input.hotelId ?? null) as { id: number } | undefined;
  if (dup) return null;

  const r = db.prepare(`
    INSERT INTO dec_cockpit_alerts (source_module, entity_type, entity_id, hotel_id, severity, titre, description, due_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.sourceModule, input.entityType ?? null, input.entityId ?? null, input.hotelId ?? null,
    input.severity, input.titre, input.description ?? null, input.dueAt ?? null,
  );
  return getAlertById(Number(r.lastInsertRowid));
}

function getAlertById(id: number): DecAlert {
  const row = getDatabase().prepare(`
    SELECT a.*, h.name as hotel_name FROM dec_cockpit_alerts a
    LEFT JOIN hotels h ON h.id = a.hotel_id WHERE a.id = ?
  `).get(id) as Record<string, unknown>;
  return mapAlert(row);
}

function mapAlert(row: Record<string, unknown>): DecAlert {
  return {
    id: Number(row.id),
    sourceModule: String(row.source_module),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    hotelName: row.hotel_name ? String(row.hotel_name) : null,
    severity: row.severity as AlertSeverity,
    statut: String(row.statut),
    titre: String(row.titre),
    description: row.description ? String(row.description) : null,
    dueAt: row.due_at ? String(row.due_at) : null,
    createdAt: String(row.created_at),
  };
}

export function listDecAlerts(actorUserId: number, statut = 'ouverte'): DecAlert[] {
  void actorUserId;
  return (getDatabase().prepare(`
    SELECT a.*, h.name as hotel_name FROM dec_cockpit_alerts a
    LEFT JOIN hotels h ON h.id = a.hotel_id WHERE a.statut = ? ORDER BY
      CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, a.created_at DESC LIMIT 100
  `).all(statut) as Record<string, unknown>[]).map(mapAlert);
}

export function closeDecAlert(actorUserId: number, alertId: number): DecAlert {
  getDatabase().prepare(`
    UPDATE dec_cockpit_alerts SET statut='cloturee', closed_by=?, closed_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(actorUserId, alertId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'dec_cockpit', description: `Alerte #${alertId} clôturée` });
  return getAlertById(alertId);
}

export function getDecCockpit(actorUserId: number, hotelId?: number): DecCockpitDashboard {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.length) {
    throw new Error('Accès cockpit DEC refusé.');
  }
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  checkClosureDeadlineAlerts(actorUserId, today);

  const hotelCond = hotelId ? 'AND hotel_id = ?' : '';
  const hotelParams = hotelId ? [hotelId] : [];

  const now = new Date();
  const after0930 = now >= new Date(`${today}T09:30:00`);

  const caJour = db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM recettes_journalieres WHERE date_journal=? ${hotelCond.replace('hotel_id', 'hotel_id')} AND deleted_at IS NULL
  `).get(today, ...hotelParams) as { v: number };

  const encJour = db.prepare(`
    SELECT COALESCE(SUM(montant),0) as v FROM encaissements WHERE date_encaissement=? AND statut='confirme' AND deleted_at IS NULL ${hotelCond}
  `).get(today, ...hotelParams) as { v: number };

  const anomalies = db.prepare(`
    SELECT COUNT(*) as c FROM anomalies WHERE statut IN ('ouverte','en_cours') AND deleted_at IS NULL ${hotelCond.replace('hotel_id', 'hotel_id')}
  `).get(...hotelParams) as { c: number };

  const reclamations = db.prepare(`SELECT COUNT(*) as c FROM reclamations WHERE statut NOT IN ('cloturee','resolue')`).get() as { c: number };
  const creancesCrit = db.prepare(`
    SELECT COALESCE(SUM(montant_restant),0) as v FROM global_creances WHERE niveau_risque IN ('eleve','critique') AND statut IN ('ouverte','partielle') ${hotelCond}
  `).get(...hotelParams) as { v: number };

  const retardCloture = after0930
    ? db.prepare(`
    SELECT COUNT(*) as c FROM daily_closures WHERE date_journal=? AND statut NOT IN ('valide_dec','cloture') ${hotelCond}
  `).get(today, ...hotelParams) as { c: number }
    : { c: 0 };

  const widgets: DecWidgetData[] = [
    { code: 'ca_jour', libelle: 'CA du jour', domaine: 'finance', value: caJour.v ?? 0, level: 'normal' },
    { code: 'encaissements', libelle: 'Encaissements', domaine: 'finance', value: encJour.v ?? 0, level: 'normal' },
    { code: 'retard_saisie_0930', libelle: 'Retards clôture (post 09h30)', domaine: 'controle', value: retardCloture.c ?? 0, level: after0930 && (retardCloture.c ?? 0) > 0 ? 'warning' : 'normal' },
    { code: 'anomalies', libelle: 'Anomalies ouvertes', domaine: 'controle', value: anomalies.c ?? 0, level: (anomalies.c ?? 0) > 5 ? 'critical' : (anomalies.c ?? 0) > 0 ? 'warning' : 'normal' },
    { code: 'reclamations', libelle: 'Réclamations', domaine: 'qualite', value: reclamations.c ?? 0, level: (reclamations.c ?? 0) > 3 ? 'warning' : 'normal' },
    { code: 'creances', libelle: 'Créances critiques', domaine: 'finance', value: creancesCrit.v ?? 0, level: (creancesCrit.v ?? 0) > 100000 ? 'critical' : 'normal' },
  ];

  void month;
  return { alerts: listDecAlerts(actorUserId), widgets, generatedAt: new Date().toISOString() };
}
