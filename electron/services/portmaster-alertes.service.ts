import { getDatabase } from '../database/sqlite';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';

export type AlerteSeverite = 'info' | 'warning' | 'danger';

export interface PortAlerte {
  id: string;
  categorie: string;
  severite: AlerteSeverite;
  message: string;
  entityType?: string;
  entityId?: number;
  link?: string;
}

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function listAlertes(actorUserId: number): PortAlerte[] {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const alertes: PortAlerte[] = [];
  const t = today();
  const limit30 = inDays(30);

  const contratsExpire = db
    .prepare(
      `
    SELECT c.id, c.numero, c.date_fin FROM port_contrats c
    WHERE c.deleted_at IS NULL AND c.statut = 'actif' AND c.date_fin IS NOT NULL
      AND c.date_fin <= ? AND c.date_fin >= ?
  `,
    )
    .all(limit30, t) as Array<{ id: number; numero: string; date_fin: string }>;

  for (const c of contratsExpire) {
    const severite: AlerteSeverite = c.date_fin < t ? 'danger' : 'warning';
    alertes.push({
      id: `contrat-exp-${c.id}`,
      categorie: 'Contrat',
      severite,
      message:
        c.date_fin < t
          ? `Contrat ${c.numero} expiré le ${c.date_fin}`
          : `Contrat ${c.numero} expire le ${c.date_fin}`,
      entityType: 'contrat',
      entityId: c.id,
      link: `/portmaster/contrats/${c.id}`,
    });
  }

  const contratsAttente = db
    .prepare(
      `SELECT COUNT(*) AS c FROM port_contrats WHERE statut IN ('brouillon', 'soumis') AND deleted_at IS NULL`,
    )
    .get() as { c: number };
  if (contratsAttente.c > 0) {
    alertes.push({
      id: 'valid-contrats',
      categorie: 'Validation',
      severite: 'warning',
      message: `${contratsAttente.c} contrat(s) en attente de validation`,
      link: '/portmaster/contrats',
    });
  }

  const validationsAttente = db
    .prepare(`SELECT COUNT(*) AS c FROM port_validations WHERE statut = 'en_attente'`)
    .get() as { c: number };
  if (validationsAttente.c > 0) {
    alertes.push({
      id: 'valid-queue',
      categorie: 'Validation',
      severite: 'info',
      message: `${validationsAttente.c} validation(s) en file d'attente`,
    });
  }

  const docsExpires = db
    .prepare(
      `
    SELECT d.id, d.entity_type, d.entity_id, d.doc_type, d.date_expiration
    FROM port_documents d
    WHERE d.deleted_at IS NULL AND d.date_expiration IS NOT NULL AND d.date_expiration < ?
  `,
    )
    .all(t) as Array<{
    id: number;
    entity_type: string;
    entity_id: number;
    doc_type: string;
    date_expiration: string;
  }>;

  for (const d of docsExpires.slice(0, 15)) {
    alertes.push({
      id: `doc-exp-${d.id}`,
      categorie: 'Document',
      severite: 'danger',
      message: `${d.doc_type} expiré (${d.date_expiration})`,
      entityType: d.entity_type,
      entityId: d.entity_id,
      link:
        d.entity_type === 'bateau'
          ? `/portmaster/bateaux/${d.entity_id}`
          : `/portmaster/clients/${d.entity_id}`,
    });
  }

  const bateauxIrreguliers = db
    .prepare(
      `
    SELECT b.id, b.nom FROM port_bateaux b
    WHERE b.deleted_at IS NULL AND b.statut = 'irregulier'
  `,
    )
    .all() as Array<{ id: number; nom: string }>;
  for (const b of bateauxIrreguliers) {
    alertes.push({
      id: `bateau-irr-${b.id}`,
      categorie: 'Situation irrégulière',
      severite: 'danger',
      message: `Bateau « ${b.nom} » en situation irrégulière`,
      entityType: 'bateau',
      entityId: b.id,
      link: `/portmaster/bateaux/${b.id}`,
    });
  }

  const sansContrat = db
    .prepare(
      `
    SELECT b.id, b.nom FROM port_bateaux b
    WHERE b.deleted_at IS NULL AND b.statut = 'actif'
      AND NOT EXISTS (
        SELECT 1 FROM port_contrats c
        WHERE c.bateau_id = b.id AND c.statut = 'actif' AND c.deleted_at IS NULL
      )
  `,
    )
    .all() as Array<{ id: number; nom: string }>;
  for (const b of sansContrat.slice(0, 10)) {
    alertes.push({
      id: `sans-contrat-${b.id}`,
      categorie: 'Situation irrégulière',
      severite: 'warning',
      message: `Bateau « ${b.nom} » sans contrat actif`,
      entityType: 'bateau',
      entityId: b.id,
      link: `/portmaster/bateaux/${b.id}`,
    });
  }

  const facturesImpayees = db
    .prepare(
      `
    SELECT f.id, f.numero, f.montant_ttc FROM port_factures f
    WHERE f.deleted_at IS NULL AND f.statut IN ('validee', 'soumise')
      AND f.montant_ttc > COALESCE((
        SELECT SUM(p.montant) FROM port_encaissements p
        WHERE p.facture_id = f.id AND COALESCE(p.statut, 'valide') = 'valide'
      ), 0)
  `,
    )
    .all() as Array<{ id: number; numero: string; montant_ttc: number }>;

  for (const f of facturesImpayees.slice(0, 10)) {
    alertes.push({
      id: `impaye-${f.id}`,
      categorie: 'Créance',
      severite: 'warning',
      message: `Facture ${f.numero} impayée (${f.montant_ttc} DZD)`,
      entityType: 'facture',
      entityId: f.id,
    });
  }

  const clientsIncomplets = db
    .prepare(
      `SELECT COUNT(*) AS c FROM port_clients WHERE deleted_at IS NULL AND statut_dossier = 'incomplet'`,
    )
    .get() as { c: number };
  if (clientsIncomplets.c > 0) {
    alertes.push({
      id: 'dossiers-incomplets',
      categorie: 'Client',
      severite: 'info',
      message: `${clientsIncomplets.c} dossier(s) client incomplet(s)`,
      link: '/portmaster/clients',
    });
  }

  const order = { danger: 0, warning: 1, info: 2 };
  return alertes.sort((a, b) => order[a.severite] - order[b.severite]);
}
