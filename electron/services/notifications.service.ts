import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';

export type NotificationType =
  | 'facture_echeue'
  | 'cloture_retard'
  | 'stock_seuil'
  | 'workflow_attente'
  | 'backup_retard'
  | 'info';

export interface NotificationItem {
  id: number;
  userId: number;
  type: NotificationType | string;
  titre: string;
  message: string;
  lien: string | null;
  lu: boolean;
  createdAt: string;
}

export interface NotificationRule {
  code: string;
  module: string;
  conditionLabel: string;
  actif: boolean;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType | string;
  titre: string;
  message: string;
  lien?: string;
}

function mapNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    type: String(row.type),
    titre: String(row.titre),
    message: String(row.message),
    lien: row.lien ? String(row.lien) : null,
    lu: Boolean(row.lu),
    createdAt: String(row.created_at),
  };
}

function isRuleActive(code: string): boolean {
  const row = getDatabase()
    .prepare(`SELECT actif FROM notification_rules WHERE code = ?`)
    .get(code) as { actif: number } | undefined;
  return row ? Boolean(row.actif) : true;
}

export function createNotification(input: CreateNotificationInput): NotificationItem {
  const db = getDatabase();
  const r = db.prepare(`
    INSERT INTO notifications (user_id, type, titre, message, lien)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.userId, input.type, input.titre, input.message, input.lien ?? null);
  const id = Number(r.lastInsertRowid);
  db.prepare(`
    INSERT INTO notification_deliveries (notification_id, canal, statut)
    VALUES (?, 'in_app', 'delivered')
  `).run(id);
  return mapNotification(db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(id) as Record<string, unknown>);
}

export function notifyUserIfRule(userId: number, ruleCode: string, payload: Omit<CreateNotificationInput, 'userId'>): NotificationItem | null {
  if (!isRuleActive(ruleCode)) return null;
  return createNotification({ userId, ...payload, type: payload.type ?? ruleCode });
}

export function listNotifications(userId: number, unreadOnly = false, limit = 50): NotificationItem[] {
  const cond = unreadOnly ? 'AND lu = 0' : '';
  const rows = getDatabase().prepare(`
    SELECT * FROM notifications WHERE user_id = ? ${cond} ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit) as Record<string, unknown>[];
  return rows.map(mapNotification);
}

export function countUnreadNotifications(userId: number): number {
  const row = getDatabase().prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND lu = 0`).get(userId) as { c: number };
  return row.c;
}

export function markNotificationRead(userId: number, id: number): NotificationItem {
  const db = getDatabase();
  const existing = db.prepare(`SELECT * FROM notifications WHERE id = ? AND user_id = ?`).get(id, userId) as Record<string, unknown> | undefined;
  if (!existing) throw new Error('Notification introuvable.');
  db.prepare(`UPDATE notifications SET lu = 1 WHERE id = ?`).run(id);
  return mapNotification(db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(id) as Record<string, unknown>);
}

export function markAllNotificationsRead(userId: number): number {
  const r = getDatabase().prepare(`UPDATE notifications SET lu = 1 WHERE user_id = ? AND lu = 0`).run(userId);
  return r.changes;
}

export function getNotificationRules(): NotificationRule[] {
  const rows = getDatabase().prepare(`SELECT code, module, condition_label, actif FROM notification_rules ORDER BY module, code`).all() as Record<string, unknown>[];
  return rows.map((r) => ({
    code: String(r.code),
    module: String(r.module),
    conditionLabel: String(r.condition_label),
    actif: Boolean(r.actif),
  }));
}

export function updateNotificationRule(actorUserId: number, code: string, actif: boolean): NotificationRule {
  getDatabase().prepare(`UPDATE notification_rules SET actif = ?, updated_at = datetime('now') WHERE code = ?`).run(actif ? 1 : 0, code);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'notifications', description: `Règle ${code} → ${actif ? 'actif' : 'inactif'}` });
  return getNotificationRules().find((r) => r.code === code)!;
}

/** Générateurs MVP — appelables au démarrage ou depuis services métier. */
export function generateSystemNotifications(actorUserId: number): number {
  const db = getDatabase();
  let created = 0;

  const admins = db.prepare(`
    SELECT u.id FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.deleted_at IS NULL AND u.is_active = 1 AND r.code IN ('super_admin', 'admin_systeme', 'admin')
  `).all() as { id: number }[];

  const notifyAdmins = (ruleCode: NotificationType, titre: string, message: string, lien?: string) => {
    for (const a of admins) {
      const n = notifyUserIfRule(a.id, ruleCode, { type: ruleCode, titre, message, lien });
      if (n) created += 1;
    }
  };

  const overdueFactures = db.prepare(`
    SELECT COUNT(*) AS c FROM factures
    WHERE deleted_at IS NULL AND statut IN ('validee','envoyee','payee_partielle')
      AND date_echeance IS NOT NULL AND date_echeance < date('now', '-30 day')
  `).get() as { c: number };
  if (overdueFactures.c > 0 && isRuleActive('facture_echeue')) {
    notifyAdmins('facture_echeue', 'Factures échues', `${overdueFactures.c} facture(s) impayée(s) depuis plus de 30 jours.`, '/facturation');
  }

  const lowStock = db.prepare(`
    SELECT COUNT(*) AS c FROM stock_niveaux sn
    JOIN stock_produits p ON p.id = sn.produit_id
    WHERE sn.quantite <= p.seuil_alerte AND p.seuil_alerte > 0
  `).get() as { c: number };
  if (lowStock.c > 0 && isRuleActive('stock_seuil')) {
    notifyAdmins('stock_seuil', 'Stocks sous seuil', `${lowStock.c} produit(s) sous le seuil d'alerte.`, '/stocks');
  }

  const pendingWf = db.prepare(`
    SELECT COUNT(*) AS c FROM workflow_instances WHERE statut IN ('soumis','en_validation','valide_unite')
  `).get() as { c: number };
  if (pendingWf.c > 0 && isRuleActive('workflow_attente')) {
    notifyAdmins('workflow_attente', 'Workflows en attente', `${pendingWf.c} workflow(s) en attente de validation.`, '/workflows');
  }

  writeAuditLog({ userId: actorUserId, action: 'READ', module: 'notifications', description: `Génération alertes système — ${created} notification(s)` });
  return created;
}
