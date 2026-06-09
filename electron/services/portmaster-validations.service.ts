import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { validateFacture, rejectFacture } from './portmaster-factures.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

export interface ValidationQueueItem {
  id: number;
  entityType: string;
  entityId: number;
  label: string;
  actionDemandee: string;
  submittedAt: string;
  motifSoumission: string | null;
}

export function listValidationsEnAttente(actorUserId: number): ValidationQueueItem[] {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const items: ValidationQueueItem[] = [];

  const factures = db
    .prepare(
      `
    SELECT f.id, f.numero, f.statut, f.created_at
    FROM port_factures f
    WHERE f.deleted_at IS NULL AND f.statut = 'soumise'
    ORDER BY f.created_at
  `,
    )
    .all() as Array<{ id: number; numero: string }>;

  for (const f of factures) {
    items.push({
      id: 0,
      entityType: 'facture',
      entityId: f.id,
      label: `Facture ${f.numero}`,
      actionDemandee: 'validation',
      submittedAt: '',
      motifSoumission: null,
    });
  }

  const contrats = db
    .prepare(
      `
    SELECT c.id, c.numero FROM port_contrats c
    WHERE c.deleted_at IS NULL AND c.statut = 'soumis'
  `,
    )
    .all() as Array<{ id: number; numero: string }>;

  for (const c of contrats) {
    items.push({
      id: 0,
      entityType: 'contrat',
      entityId: c.id,
      label: `Contrat ${c.numero}`,
      actionDemandee: 'validation',
      submittedAt: '',
      motifSoumission: null,
    });
  }

  const validations = db
    .prepare(
      `
    SELECT v.id, v.entity_type AS entityType, v.entity_id AS entityId, v.action_demandee AS actionDemandee,
      v.submitted_at AS submittedAt, v.motif_soumission AS motifSoumission
    FROM port_validations v WHERE v.statut = 'en_attente'
  `,
    )
    .all() as ValidationQueueItem[];

  for (const v of validations) {
    if (v.entityType === 'facture') {
      const f = db.prepare(`SELECT numero FROM port_factures WHERE id = ?`).get(v.entityId) as
        | { numero: string }
        | undefined;
      v.label = f ? `Facture ${f.numero}` : `Facture #${v.entityId}`;
    }
    items.push(v);
  }

  return items;
}

export function validerEntite(
  actorUserId: number,
  entityType: string,
  entityId: number,
  motif?: string,
): void {
  assertPortmaster(actorUserId);
  if (entityType === 'facture') {
    validateFacture(actorUserId, entityId, motif);
    return;
  }
  if (entityType === 'contrat') {
    const actor = getActorContext(actorUserId);
    getDatabase()
      .prepare(
        `UPDATE port_contrats SET statut = 'actif', validated_at = datetime('now'), validated_by = ? WHERE id = ?`,
      )
      .run(actor.userId, entityId);
    writeAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      roleCode: actor.roleCode,
      action: 'VALIDATE',
      module: 'portmaster',
      page: 'ValidationsPortPage',
      description: `Contrat #${entityId} validé`,
    });
    return;
  }
  throw new Error('Type non géré.');
}

export function rejeterEntite(
  actorUserId: number,
  entityType: string,
  entityId: number,
  motif: string,
): void {
  assertPortmaster(actorUserId);
  if (entityType === 'facture') {
    rejectFacture(actorUserId, entityId, motif);
    return;
  }
  if (entityType === 'contrat') {
    const actor = getActorContext(actorUserId);
    getDatabase()
      .prepare(
        `UPDATE port_contrats SET statut = 'brouillon', motif_rejet = ? WHERE id = ?`,
      )
      .run(motif, entityId);
    writeAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      roleCode: actor.roleCode,
      action: 'REJECT',
      module: 'portmaster',
      page: 'ValidationsPortPage',
      description: `Contrat #${entityId} rejeté`,
    });
    return;
  }
  throw new Error('Type non géré.');
}
