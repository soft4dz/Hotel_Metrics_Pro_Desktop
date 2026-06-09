import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { enqueueSync } from './sync.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

export interface CreanceItem {
  kind: 'facture' | 'contrat';
  id: number;
  reference: string;
  clientName: string;
  montantDu: number;
  paye: number;
  reste: number;
  dateEcheance: string;
  joursRetard: number;
  tranche: '0-30' | '31-60' | '60+';
}

export interface RecouvrementSummary {
  totalCreances: number;
  nombreFactures: number;
  nombreContrats: number;
  tranche030: number;
  tranche3160: number;
  tranche60plus: number;
}

export interface RelanceListItem {
  id: number;
  clientName: string;
  reference: string;
  typeRelance: string;
  niveau: number;
  dateRelance: string;
  statut: string;
  commentaire: string | null;
}

export interface CreateRelanceInput {
  clientId?: number | null;
  factureId?: number | null;
  contratId?: number | null;
  typeRelance?: string;
  niveau?: number;
  dateRelance: string;
  commentaire?: string | null;
}

function joursRetard(dateRef: string): number {
  const d = new Date(dateRef);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function tranche(jours: number): CreanceItem['tranche'] {
  if (jours <= 30) return '0-30';
  if (jours <= 60) return '31-60';
  return '60+';
}

function clientLabel(db: ReturnType<typeof getDatabase>, clientId: number): string {
  const c = db
    .prepare(
      `SELECT type_client, raison_sociale, nom, prenom FROM port_clients WHERE id = ?`,
    )
    .get(clientId) as {
      type_client: string;
      raison_sociale: string | null;
      nom: string | null;
      prenom: string | null;
    };
  if (!c) return '—';
  if (c.type_client === 'morale' && c.raison_sociale) return c.raison_sociale;
  return [c.prenom, c.nom].filter(Boolean).join(' ') || '—';
}

export function getRecouvrementSummary(actorUserId: number): RecouvrementSummary {
  const items = listCreances(actorUserId);
  return {
    totalCreances: items.reduce((s, i) => s + i.reste, 0),
    nombreFactures: items.filter((i) => i.kind === 'facture').length,
    nombreContrats: items.filter((i) => i.kind === 'contrat').length,
    tranche030: items.filter((i) => i.tranche === '0-30').reduce((s, i) => s + i.reste, 0),
    tranche3160: items.filter((i) => i.tranche === '31-60').reduce((s, i) => s + i.reste, 0),
    tranche60plus: items.filter((i) => i.tranche === '60+').reduce((s, i) => s + i.reste, 0),
  };
}

export function listCreances(actorUserId: number): CreanceItem[] {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const out: CreanceItem[] = [];

  const factures = db
    .prepare(
      `
    SELECT f.id, f.numero, f.client_id, f.date_facture, f.montant_ttc,
           COALESCE((
             SELECT SUM(e.montant) FROM port_encaissements e
             WHERE e.facture_id = f.id AND COALESCE(e.statut, 'valide') = 'valide'
           ), 0) AS paye
    FROM port_factures f
    WHERE f.deleted_at IS NULL AND f.statut IN ('validee', 'soumise')
      AND f.montant_ttc > COALESCE((
        SELECT SUM(e.montant) FROM port_encaissements e
        WHERE e.facture_id = f.id AND COALESCE(e.statut, 'valide') = 'valide'
      ), 0) + 0.01
  `,
    )
    .all() as Array<{
      id: number;
      numero: string;
      client_id: number;
      date_facture: string;
      montant_ttc: number;
      paye: number;
    }>;

  for (const f of factures) {
    const reste = f.montant_ttc - f.paye;
    const j = joursRetard(f.date_facture);
    out.push({
      kind: 'facture',
      id: f.id,
      reference: f.numero,
      clientName: clientLabel(db, f.client_id),
      montantDu: f.montant_ttc,
      paye: f.paye,
      reste,
      dateEcheance: f.date_facture,
      joursRetard: j,
      tranche: tranche(j),
    });
  }

  const contrats = db
    .prepare(
      `
    SELECT c.id, c.numero, c.date_debut, c.montant_total,
           COALESCE((
             SELECT SUM(e.montant) FROM port_encaissements e
             WHERE e.contrat_id = c.id AND e.facture_id IS NULL AND COALESCE(e.statut, 'valide') = 'valide'
           ), 0) AS encaisse,
           c.client_id, b.nom AS bateau_nom
    FROM port_contrats c
    JOIN port_bateaux b ON b.id = c.bateau_id
    WHERE c.deleted_at IS NULL AND c.statut = 'actif'
  `,
    )
    .all() as Array<{
      id: number;
      numero: string;
      date_debut: string;
      montant_total: number;
      encaisse: number;
      client_id: number | null;
      bateau_nom: string;
    }>;

  for (const c of contrats) {
    const reste = c.montant_total - c.encaisse;
    if (reste <= 0.01) continue;
    const j = joursRetard(c.date_debut);
    const name = c.client_id ? clientLabel(db, c.client_id) : c.bateau_nom;
    out.push({
      kind: 'contrat',
      id: c.id,
      reference: c.numero,
      clientName: name,
      montantDu: c.montant_total,
      paye: c.encaisse,
      reste,
      dateEcheance: c.date_debut,
      joursRetard: j,
      tranche: tranche(j),
    });
  }

  return out.sort((a, b) => b.joursRetard - a.joursRetard);
}

export function listRelances(actorUserId: number, limit = 80): RelanceListItem[] {
  assertPortmaster(actorUserId);
  const rows = getDatabase()
    .prepare(
      `
    SELECT r.id, r.type_relance, r.niveau, r.date_relance, r.statut, r.commentaire,
           COALESCE(
             c.raison_sociale,
             trim(COALESCE(c.prenom,'') || ' ' || COALESCE(c.nom,''))
           ) AS client_name,
           COALESCE(f.numero, pc.numero, '—') AS ref_label
    FROM port_relances r
    LEFT JOIN port_clients c ON c.id = r.client_id
    LEFT JOIN port_factures f ON f.id = r.facture_id
    LEFT JOIN port_contrats pc ON pc.id = r.contrat_id
    ORDER BY r.date_relance DESC, r.id DESC
    LIMIT ?
  `,
    )
    .all(limit) as Array<{
      id: number;
      type_relance: string;
      niveau: number;
      date_relance: string;
      statut: string;
      commentaire: string | null;
      client_name: string | null;
      ref_label: string;
    }>;

  return rows.map((r) => ({
    id: r.id,
    clientName: r.client_name || '—',
    reference: r.ref_label,
    typeRelance: r.type_relance,
    niveau: r.niveau,
    dateRelance: r.date_relance,
    statut: r.statut,
    commentaire: r.commentaire,
  }));
}

export function createRelance(actorUserId: number, input: CreateRelanceInput): RelanceListItem {
  const actor = assertPortmaster(actorUserId);
  if (!input.clientId && !input.factureId && !input.contratId) {
    throw new Error('Rattachez la relance à un client, une facture ou un contrat.');
  }

  const db = getDatabase();
  let clientId = input.clientId ?? null;
  if (!clientId && input.factureId) {
    const f = db.prepare(`SELECT client_id FROM port_factures WHERE id = ?`).get(input.factureId) as
      | { client_id: number }
      | undefined;
    clientId = f?.client_id ?? null;
  }
  if (!clientId && input.contratId) {
    const c = db.prepare(`SELECT client_id FROM port_contrats WHERE id = ?`).get(input.contratId) as
      | { client_id: number | null }
      | undefined;
    clientId = c?.client_id ?? null;
  }

  const uuid = randomUUID();
  const r = db
    .prepare(
      `
    INSERT INTO port_relances (
      uuid, client_id, facture_id, contrat_id, type_relance, niveau,
      date_relance, commentaire, statut, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planifiee', ?)
  `,
    )
    .run(
      uuid,
      clientId,
      input.factureId ?? null,
      input.contratId ?? null,
      input.typeRelance ?? 'courrier',
      input.niveau ?? 1,
      input.dateRelance,
      input.commentaire?.trim() || null,
      actor.userId,
    );

  try {
    enqueueSync('port_relance', 'create', Number(r.lastInsertRowid), { uuid, clientId });
  } catch {
    /* ignore */
  }

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'RecouvrementPage',
    description: 'Relance recouvrement créée',
  });

  return listRelances(actorUserId, 1)[0]!;
}

export function marquerRelanceEnvoyee(actorUserId: number, id: number): void {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();
  const n = db
    .prepare(`UPDATE port_relances SET statut = 'envoyee' WHERE id = ? AND statut = 'planifiee'`)
    .run(id).changes;
  if (!n) throw new Error('Relance introuvable ou déjà traitée.');
  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'UPDATE',
    module: 'portmaster',
    page: 'RecouvrementPage',
    description: `Relance #${id} marquée envoyée`,
  });
}
