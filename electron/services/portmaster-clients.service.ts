import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

export interface ClientListItem {
  id: number;
  typeClient: string;
  displayName: string;
  email: string | null;
  telephone: string | null;
  statutDossier: string;
  soldeCreances: number;
  bateauCount: number;
  isActive: boolean;
}

export interface ClientDto {
  id: number;
  typeClient: string;
  raisonSociale: string | null;
  nom: string | null;
  prenom: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  nin: string | null;
  nif: string | null;
  rc: string | null;
  pieceIdentite: string | null;
  representantLegal: string | null;
  statutDossier: string;
  soldeCreances: number;
  notes: string | null;
  isActive: boolean;
}

export interface SaveClientInput {
  typeClient: 'physique' | 'morale';
  raisonSociale?: string | null;
  nom?: string | null;
  prenom?: string | null;
  adresse?: string | null;
  ville?: string | null;
  telephone?: string | null;
  email?: string | null;
  nin?: string | null;
  nif?: string | null;
  rc?: string | null;
  pieceIdentite?: string | null;
  representantLegal?: string | null;
  statutDossier?: string;
  notes?: string | null;
  isActive?: boolean;
}

function displayName(row: {
  type_client: string;
  raison_sociale: string | null;
  nom: string | null;
  prenom: string | null;
}): string {
  if (row.type_client === 'morale' && row.raison_sociale) return row.raison_sociale;
  return [row.prenom, row.nom].filter(Boolean).join(' ') || '—';
}

export function listClients(actorUserId: number, search?: string): ClientListItem[] {
  assertPortmaster(actorUserId);
  const conditions = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (search?.trim()) {
    conditions.push(
      `(c.raison_sociale LIKE ? OR c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ? OR c.telephone LIKE ?)`,
    );
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q, q);
  }

  const rows = getDatabase()
    .prepare(
      `
    SELECT
      c.id, c.type_client AS typeClient, c.raison_sociale, c.nom, c.prenom,
      c.email, c.telephone, c.statut_dossier AS statutDossier, c.solde_creances AS soldeCreances,
      c.is_active AS isActive,
      (SELECT COUNT(*) FROM port_bateaux b WHERE b.client_id = c.id AND b.deleted_at IS NULL) AS bateauCount
    FROM port_clients c
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.raison_sociale, c.nom
  `,
    )
    .all(...params) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: r.id as number,
    typeClient: r.typeClient as string,
    displayName: displayName({
      type_client: r.typeClient as string,
      raison_sociale: r.raison_sociale as string | null,
      nom: r.nom as string | null,
      prenom: r.prenom as string | null,
    }),
    email: (r.email as string) ?? null,
    telephone: (r.telephone as string) ?? null,
    statutDossier: r.statutDossier as string,
    soldeCreances: r.soldeCreances as number,
    bateauCount: r.bateauCount as number,
    isActive: Boolean(r.isActive),
  }));
}

export function getClient(actorUserId: number, id: number): ClientDto | null {
  assertPortmaster(actorUserId);
  const row = getDatabase()
    .prepare(`SELECT * FROM port_clients WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapClient(row);
}

function mapClient(row: Record<string, unknown>): ClientDto {
  return {
    id: row.id as number,
    typeClient: row.type_client as string,
    raisonSociale: (row.raison_sociale as string) ?? null,
    nom: (row.nom as string) ?? null,
    prenom: (row.prenom as string) ?? null,
    adresse: (row.adresse as string) ?? null,
    ville: (row.ville as string) ?? null,
    telephone: (row.telephone as string) ?? null,
    email: (row.email as string) ?? null,
    nin: (row.nin as string) ?? null,
    nif: (row.nif as string) ?? null,
    rc: (row.rc as string) ?? null,
    pieceIdentite: (row.piece_identite as string) ?? null,
    representantLegal: (row.representant_legal as string) ?? null,
    statutDossier: row.statut_dossier as string,
    soldeCreances: row.solde_creances as number,
    notes: (row.notes as string) ?? null,
    isActive: Boolean(row.is_active),
  };
}

export function saveClient(
  actorUserId: number,
  input: SaveClientInput,
  id?: number,
): ClientDto {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();

  const payload = {
    type_client: input.typeClient,
    raison_sociale: input.raisonSociale?.trim() || null,
    nom: input.nom?.trim() || null,
    prenom: input.prenom?.trim() || null,
    adresse: input.adresse?.trim() || null,
    ville: input.ville?.trim() || null,
    telephone: input.telephone?.trim() || null,
    email: input.email?.trim() || null,
    nin: input.nin?.trim() || null,
    nif: input.nif?.trim() || null,
    rc: input.rc?.trim() || null,
    piece_identite: input.pieceIdentite?.trim() || null,
    representant_legal: input.representantLegal?.trim() || null,
    statut_dossier: input.statutDossier ?? 'incomplet',
    notes: input.notes?.trim() || null,
    is_active: input.isActive !== false ? 1 : 0,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    db.prepare(
      `
      UPDATE port_clients SET
        type_client = @type_client, raison_sociale = @raison_sociale, nom = @nom, prenom = @prenom,
        adresse = @adresse, ville = @ville, telephone = @telephone, email = @email,
        nin = @nin, nif = @nif, rc = @rc, piece_identite = @piece_identite,
        representant_legal = @representant_legal, statut_dossier = @statut_dossier,
        notes = @notes, is_active = @is_active, updated_at = @updated_at, updated_by = @updated_by
      WHERE id = @id
    `,
    ).run({ ...payload, id, updated_by: actor.userId });
  } else {
    const r = db
      .prepare(
        `
      INSERT INTO port_clients (
        uuid, type_client, raison_sociale, nom, prenom, adresse, ville, telephone, email,
        nin, nif, rc, piece_identite, representant_legal, statut_dossier, notes, is_active, created_by, updated_by
      ) VALUES (
        @uuid, @type_client, @raison_sociale, @nom, @prenom, @adresse, @ville, @telephone, @email,
        @nin, @nif, @rc, @piece_identite, @representant_legal, @statut_dossier, @notes, @is_active, @created_by, @updated_by
      )
    `,
      )
      .run({
        uuid: randomUUID(),
        ...payload,
        created_by: actor.userId,
        updated_by: actor.userId,
      });
    id = Number(r.lastInsertRowid);
  }

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: id ? 'UPDATE' : 'CREATE',
    module: 'portmaster',
    page: 'ClientFormPage',
    description: `Client port #${id}`,
  });

  return getClient(actorUserId, id)!;
}

export function listClientsOptions(
  actorUserId: number,
): Array<{ id: number; label: string }> {
  return listClients(actorUserId).map((c) => ({
    id: c.id,
    label: c.displayName,
  }));
}
