import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { listAlertes, type PortAlerte } from './portmaster-alertes.service';

function assertPortmaster(actorUserId: number): ReturnType<typeof getActorContext> {
  const actor = getActorContext(actorUserId);
  if (
    userHasPermission(actorUserId, 'portmaster.full') ||
    isGlobalAdminRole(actor.roleCode)
  ) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

function sumEncaissements(db: ReturnType<typeof getDatabase>, contratId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(montant), 0) AS total FROM port_encaissements WHERE contrat_id = ?`,
    )
    .get(contratId) as { total: number };
  return row.total;
}

export interface BateauListItem {
  id: number;
  nom: string;
  immatriculation: string | null;
  typeNavire: string | null;
  proprietaire: string;
  longueurM: number | null;
  statut: string;
  contratActif: string | null;
  emplacementCode: string | null;
}

export interface BateauDto {
  id: number;
  nom: string;
  immatriculation: string | null;
  typeNavire: string | null;
  proprietaire: string;
  contactEmail: string | null;
  contactTel: string | null;
  longueurM: number | null;
  largeurM: number | null;
  statut: string;
  notes: string | null;
}

export interface SaveBateauInput {
  nom: string;
  immatriculation?: string | null;
  typeNavire?: string | null;
  proprietaire: string;
  contactEmail?: string | null;
  contactTel?: string | null;
  longueurM?: number | null;
  largeurM?: number | null;
  statut?: string;
  notes?: string | null;
}

export interface EmplacementListItem {
  id: number;
  code: string;
  label: string;
  zone: string | null;
  longueurMaxM: number | null;
  statut: string;
  bateauNom: string | null;
  contratNumero: string | null;
}

export interface EmplacementOption {
  id: number;
  code: string;
  label: string;
  statut: string;
}

export interface ContratListItem {
  id: number;
  numero: string;
  bateauNom: string;
  emplacementCode: string;
  dateDebut: string;
  dateFin: string | null;
  montantTotal: number;
  encaisse: number;
  resteARecouvrer: number;
  statut: string;
}

export interface ContratDto {
  id: number;
  numero: string;
  bateauId: number;
  bateauNom: string;
  emplacementId: number;
  emplacementCode: string;
  dateDebut: string;
  dateFin: string | null;
  montantMensuel: number;
  montantTotal: number;
  encaisse: number;
  resteARecouvrer: number;
  statut: string;
  observation: string | null;
}

export interface SaveContratInput {
  numero: string;
  bateauId: number;
  emplacementId: number;
  dateDebut: string;
  dateFin?: string | null;
  montantMensuel: number;
  montantTotal: number;
  statut: string;
  observation?: string | null;
}

export interface AddEncaissementInput {
  contratId: number;
  dateEncaissement: string;
  montant: number;
  modePaiement?: string | null;
  reference?: string | null;
  observation?: string | null;
}

export interface PortDashboardDto {
  emplacementsTotal: number;
  emplacementsOccupes: number;
  emplacementsLibres: number;
  emplacementsReserves: number;
  contratsActifs: number;
  contratsExpiresProches: number;
  bateauxPresents: number;
  bateauxIrreguliers: number;
  caFacture: number;
  encaissementsRealises: number;
  creancesClients: number;
  validationsEnAttente: number;
  resteARecouvrer: number;
  encaissementsMois: number;
  repartitionTypes: Array<{ type: string; count: number }>;
  emplacements: EmplacementListItem[];
  contratsRecents: ContratListItem[];
  alertes: PortAlerte[];
}

export function listBateaux(actorUserId: number, search?: string): BateauListItem[] {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const conditions = ['b.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (search?.trim()) {
    conditions.push(
      '(b.nom LIKE ? OR b.immatriculation LIKE ? OR b.proprietaire LIKE ?)',
    );
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  const rows = db
    .prepare(
      `
    SELECT
      b.id, b.nom, b.immatriculation, b.type_navire AS typeNavire, b.proprietaire,
      b.longueur_m AS longueurM, b.statut,
      c.numero AS contratActif, e.code AS emplacementCode
    FROM port_bateaux b
    LEFT JOIN port_contrats c ON c.bateau_id = b.id AND c.statut = 'actif' AND c.deleted_at IS NULL
    LEFT JOIN port_emplacements e ON e.id = c.emplacement_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.nom
  `,
    )
    .all(...params) as BateauListItem[];

  return rows;
}

export function getBateau(actorUserId: number, id: number): BateauDto | null {
  assertPortmaster(actorUserId);
  const row = getDatabase()
    .prepare(`SELECT * FROM port_bateaux WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number,
    nom: row.nom as string,
    immatriculation: (row.immatriculation as string) ?? null,
    typeNavire: (row.type_navire as string) ?? null,
    proprietaire: row.proprietaire as string,
    contactEmail: (row.contact_email as string) ?? null,
    contactTel: (row.contact_tel as string) ?? null,
    longueurM: (row.longueur_m as number) ?? null,
    largeurM: (row.largeur_m as number) ?? null,
    statut: row.statut as string,
    notes: (row.notes as string) ?? null,
  };
}

export function createBateau(actorUserId: number, input: SaveBateauInput): BateauDto {
  const actor = assertPortmaster(actorUserId);
  if (!input.nom.trim() || !input.proprietaire.trim()) {
    throw new Error('Nom et propriétaire obligatoires.');
  }
  const db = getDatabase();
  const r = db
    .prepare(
      `
    INSERT INTO port_bateaux (
      uuid, nom, immatriculation, type_navire, proprietaire,
      contact_email, contact_tel, longueur_m, largeur_m, statut, notes, created_by, updated_by
    ) VALUES (
      @uuid, @nom, @immatriculation, @type_navire, @proprietaire,
      @contact_email, @contact_tel, @longueur_m, @largeur_m, @statut, @notes, @created_by, @updated_by
    )
  `,
    )
    .run({
      uuid: randomUUID(),
      nom: input.nom.trim(),
      immatriculation: input.immatriculation?.trim() || null,
      type_navire: input.typeNavire?.trim() || null,
      proprietaire: input.proprietaire.trim(),
      contact_email: input.contactEmail?.trim() || null,
      contact_tel: input.contactTel?.trim() || null,
      longueur_m: input.longueurM ?? null,
      largeur_m: input.largeurM ?? null,
      statut: input.statut ?? 'actif',
      notes: input.notes?.trim() || null,
      created_by: actor.userId,
      updated_by: actor.userId,
    });

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'BateauFormPage',
    description: `Bateau créé : ${input.nom}`,
  });

  return getBateau(actorUserId, Number(r.lastInsertRowid))!;
}

export function updateBateau(
  actorUserId: number,
  id: number,
  input: SaveBateauInput,
): BateauDto {
  const actor = assertPortmaster(actorUserId);
  if (!getBateau(actorUserId, id)) throw new Error('Bateau introuvable.');

  getDatabase()
    .prepare(
      `
    UPDATE port_bateaux SET
      nom = @nom, immatriculation = @immatriculation, type_navire = @type_navire,
      proprietaire = @proprietaire, contact_email = @contact_email, contact_tel = @contact_tel,
      longueur_m = @longueur_m, largeur_m = @largeur_m, statut = @statut, notes = @notes,
      updated_by = @updated_by, updated_at = datetime('now')
    WHERE id = @id
  `,
    )
    .run({
      id,
      nom: input.nom.trim(),
      immatriculation: input.immatriculation?.trim() || null,
      type_navire: input.typeNavire?.trim() || null,
      proprietaire: input.proprietaire.trim(),
      contact_email: input.contactEmail?.trim() || null,
      contact_tel: input.contactTel?.trim() || null,
      longueur_m: input.longueurM ?? null,
      largeur_m: input.largeurM ?? null,
      statut: input.statut ?? 'actif',
      notes: input.notes?.trim() || null,
      updated_by: actor.userId,
    });

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'UPDATE',
    module: 'portmaster',
    page: 'BateauFormPage',
    description: `Bateau modifié : ${input.nom}`,
  });

  return getBateau(actorUserId, id)!;
}

export function deactivateBateau(actorUserId: number, id: number): void {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();
  const actif = db
    .prepare(
      `SELECT 1 FROM port_contrats WHERE bateau_id = ? AND statut = 'actif' AND deleted_at IS NULL`,
    )
    .get(id);
  if (actif) throw new Error('Impossible : contrat actif sur ce bateau.');

  db.prepare(
    `UPDATE port_bateaux SET deleted_at = datetime('now'), statut = 'inactif' WHERE id = ?`,
  ).run(id);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'DELETE',
    module: 'portmaster',
    page: 'BateauxPage',
    description: `Bateau désactivé #${id}`,
  });
}

export function listEmplacements(actorUserId: number): EmplacementListItem[] {
  assertPortmaster(actorUserId);
  const rows = getDatabase()
    .prepare(
      `
    SELECT
      e.id, e.code, e.label, e.zone, e.longueur_max_m AS longueurMaxM, e.statut,
      b.nom AS bateauNom, c.numero AS contratNumero
    FROM port_emplacements e
    LEFT JOIN port_contrats c ON c.emplacement_id = e.id AND c.statut = 'actif' AND c.deleted_at IS NULL
    LEFT JOIN port_bateaux b ON b.id = c.bateau_id AND b.deleted_at IS NULL
    WHERE e.deleted_at IS NULL AND e.is_active = 1
    ORDER BY e.zone, e.code
  `,
    )
    .all() as EmplacementListItem[];
  return rows;
}

export function listEmplacementsLibres(actorUserId: number): EmplacementOption[] {
  assertPortmaster(actorUserId);
  return getDatabase()
    .prepare(
      `
    SELECT e.id, e.code, e.label, e.statut
    FROM port_emplacements e
    WHERE e.deleted_at IS NULL AND e.is_active = 1
      AND e.statut IN ('libre', 'disponible')
    ORDER BY e.code
  `,
    )
    .all() as EmplacementOption[];
}

export function listContrats(actorUserId: number, statut?: string): ContratListItem[] {
  assertPortmaster(actorUserId);
  const conditions = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (statut) {
    conditions.push('c.statut = ?');
    params.push(statut);
  }

  const rows = getDatabase()
    .prepare(
      `
    SELECT
      c.id, c.numero, b.nom AS bateauNom, e.code AS emplacementCode,
      c.date_debut AS dateDebut, c.date_fin AS dateFin,
      c.montant_total AS montantTotal, c.statut
    FROM port_contrats c
    INNER JOIN port_bateaux b ON b.id = c.bateau_id
    INNER JOIN port_emplacements e ON e.id = c.emplacement_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.date_debut DESC
  `,
    )
    .all(...params) as Array<{
    id: number;
    numero: string;
    bateauNom: string;
    emplacementCode: string;
    dateDebut: string;
    dateFin: string | null;
    montantTotal: number;
    statut: string;
  }>;

  return rows.map((r) => {
    const encaisse = sumEncaissements(getDatabase(), r.id);
    return {
      ...r,
      encaisse,
      resteARecouvrer: Math.max(0, r.montantTotal - encaisse),
    };
  });
}

export function getContrat(actorUserId: number, id: number): ContratDto | null {
  assertPortmaster(actorUserId);
  const row = getDatabase()
    .prepare(
      `
    SELECT c.*, b.nom AS bateau_nom, e.code AS emplacement_code
    FROM port_contrats c
    INNER JOIN port_bateaux b ON b.id = c.bateau_id
    INNER JOIN port_emplacements e ON e.id = c.emplacement_id
    WHERE c.id = ? AND c.deleted_at IS NULL
  `,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const encaisse = sumEncaissements(getDatabase(), id);
  const montantTotal = row.montant_total as number;
  return {
    id: row.id as number,
    numero: row.numero as string,
    bateauId: row.bateau_id as number,
    bateauNom: row.bateau_nom as string,
    emplacementId: row.emplacement_id as number,
    emplacementCode: row.emplacement_code as string,
    dateDebut: row.date_debut as string,
    dateFin: (row.date_fin as string) ?? null,
    montantMensuel: row.montant_mensuel as number,
    montantTotal,
    encaisse,
    resteARecouvrer: Math.max(0, montantTotal - encaisse),
    statut: row.statut as string,
    observation: (row.observation as string) ?? null,
  };
}

function syncEmplacementStatut(db: ReturnType<typeof getDatabase>, emplacementId: number): void {
  const actif = db
    .prepare(
      `SELECT 1 FROM port_contrats WHERE emplacement_id = ? AND statut = 'actif' AND deleted_at IS NULL`,
    )
    .get(emplacementId);
  const statut = actif ? 'occupe' : 'disponible';
  db.prepare(
    `UPDATE port_emplacements SET statut = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(statut, emplacementId);
}

export function saveContrat(actorUserId: number, input: SaveContratInput, id?: number): ContratDto {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();

  if (!input.numero.trim()) throw new Error('Numéro de contrat obligatoire.');

  const dup = db
    .prepare(`SELECT id FROM port_contrats WHERE numero = ? AND deleted_at IS NULL AND id != ?`)
    .get(input.numero.trim(), id ?? 0);
  if (dup) throw new Error('Ce numéro de contrat existe déjà.');

  if (input.statut === 'actif') {
    const conflit = db
      .prepare(
        `
      SELECT id FROM port_contrats
      WHERE emplacement_id = ? AND statut = 'actif' AND deleted_at IS NULL AND id != ?
    `,
      )
      .get(input.emplacementId, id ?? 0);
    if (conflit) throw new Error('Emplacement déjà occupé par un contrat actif.');
  }

  if (id) {
    db.prepare(
      `
      UPDATE port_contrats SET
        numero = @numero, bateau_id = @bateau_id, emplacement_id = @emplacement_id,
        date_debut = @date_debut, date_fin = @date_fin,
        montant_mensuel = @montant_mensuel, montant_total = @montant_total,
        statut = @statut, observation = @observation,
        updated_by = @updated_by, updated_at = datetime('now')
      WHERE id = @id
    `,
    ).run({
      id,
      numero: input.numero.trim(),
      bateau_id: input.bateauId,
      emplacement_id: input.emplacementId,
      date_debut: input.dateDebut,
      date_fin: input.dateFin ?? null,
      montant_mensuel: input.montantMensuel,
      montant_total: input.montantTotal,
      statut: input.statut,
      observation: input.observation?.trim() || null,
      updated_by: actor.userId,
    });
  } else {
    const r = db
      .prepare(
        `
      INSERT INTO port_contrats (
        uuid, numero, bateau_id, emplacement_id, date_debut, date_fin,
        montant_mensuel, montant_total, statut, observation, created_by, updated_by
      ) VALUES (
        @uuid, @numero, @bateau_id, @emplacement_id, @date_debut, @date_fin,
        @montant_mensuel, @montant_total, @statut, @observation, @created_by, @updated_by
      )
    `,
      )
      .run({
        uuid: randomUUID(),
        numero: input.numero.trim(),
        bateau_id: input.bateauId,
        emplacement_id: input.emplacementId,
        date_debut: input.dateDebut,
        date_fin: input.dateFin ?? null,
        montant_mensuel: input.montantMensuel,
        montant_total: input.montantTotal,
        statut: input.statut,
        observation: input.observation?.trim() || null,
        created_by: actor.userId,
        updated_by: actor.userId,
      });
    id = Number(r.lastInsertRowid);
  }

  syncEmplacementStatut(db, input.emplacementId);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: id ? 'UPDATE' : 'CREATE',
    module: 'portmaster',
    page: 'ContratFormPage',
    description: `Contrat ${input.numero}`,
  });

  return getContrat(actorUserId, id)!;
}

export function submitContratForValidation(actorUserId: number, id: number): void {
  const actor = assertPortmaster(actorUserId);
  const c = getContrat(actorUserId, id);
  if (!c) throw new Error('Contrat introuvable.');
  if (c.statut !== 'brouillon') {
    throw new Error('Seuls les contrats en brouillon peuvent être soumis à validation.');
  }
  getDatabase().prepare(`UPDATE port_contrats SET statut = 'soumis' WHERE id = ?`).run(id);
  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'SUBMIT',
    module: 'portmaster',
    page: 'ContratFormPage',
    description: `Contrat ${c.numero} soumis à validation`,
  });
}

export function addEncaissement(actorUserId: number, input: AddEncaissementInput): ContratDto {
  const actor = assertPortmaster(actorUserId);
  if (input.montant <= 0) throw new Error('Montant invalide.');
  const contrat = getContrat(actorUserId, input.contratId);
  if (!contrat) throw new Error('Contrat introuvable.');

  getDatabase()
    .prepare(
      `
    INSERT INTO port_encaissements (
      uuid, contrat_id, date_encaissement, montant, mode_paiement, reference, observation, created_by
    ) VALUES (@uuid, @contrat_id, @date_encaissement, @montant, @mode_paiement, @reference, @observation, @created_by)
  `,
    )
    .run({
      uuid: randomUUID(),
      contrat_id: input.contratId,
      date_encaissement: input.dateEncaissement,
      montant: input.montant,
      mode_paiement: input.modePaiement?.trim() || null,
      reference: input.reference?.trim() || null,
      observation: input.observation?.trim() || null,
      created_by: actor.userId,
    });

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'ContratFormPage',
    description: `Encaissement ${input.montant} — contrat ${contrat.numero}`,
  });

  return getContrat(actorUserId, input.contratId)!;
}

export function listBateauxOptions(actorUserId: number): Array<{ id: number; nom: string }> {
  assertPortmaster(actorUserId);
  return getDatabase()
    .prepare(
      `SELECT id, nom FROM port_bateaux WHERE deleted_at IS NULL AND statut = 'actif' ORDER BY nom`,
    )
    .all() as Array<{ id: number; nom: string }>;
}

export function getPortDashboard(actorUserId: number): PortDashboardDto {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const t = new Date().toISOString().slice(0, 10);
  const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const empStats = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN statut = 'occupe' THEN 1 ELSE 0 END) AS occupes,
      SUM(CASE WHEN statut IN ('libre', 'disponible') THEN 1 ELSE 0 END) AS libres,
      SUM(CASE WHEN statut = 'reserve' THEN 1 ELSE 0 END) AS reserves
    FROM port_emplacements WHERE deleted_at IS NULL AND is_active = 1
  `,
    )
    .get() as { total: number; occupes: number; libres: number; reserves: number };

  const contratsActifs = db
    .prepare(
      `SELECT COUNT(*) AS c FROM port_contrats WHERE statut = 'actif' AND deleted_at IS NULL`,
    )
    .get() as { c: number };

  const contratsExpiresProches = db
    .prepare(
      `
    SELECT COUNT(*) AS c FROM port_contrats
    WHERE deleted_at IS NULL AND statut = 'actif' AND date_fin IS NOT NULL
      AND date_fin BETWEEN ? AND ?
  `,
    )
    .get(t, limit30) as { c: number };

  const bateauxPresents = db
    .prepare(
      `SELECT COUNT(*) AS c FROM port_bateaux WHERE deleted_at IS NULL AND statut IN ('actif', 'irregulier')`,
    )
    .get() as { c: number };

  const bateauxIrreguliers = db
    .prepare(
      `SELECT COUNT(*) AS c FROM port_bateaux WHERE deleted_at IS NULL AND statut = 'irregulier'`,
    )
    .get() as { c: number };

  const contrats = listContrats(actorUserId, 'actif');
  const resteARecouvrer = contrats.reduce((s, c) => s + c.resteARecouvrer, 0);

  const caFactureTotal =
    (db.prepare(`SELECT COALESCE(SUM(montant_total), 0) AS t FROM port_contrats WHERE deleted_at IS NULL`).get() as { t: number }).t +
    (db.prepare(`SELECT COALESCE(SUM(montant_ttc), 0) AS t FROM port_factures WHERE deleted_at IS NULL`).get() as { t: number }).t;

  const encaissementsRealises = db
    .prepare(`SELECT COALESCE(SUM(montant), 0) AS total FROM port_encaissements`)
    .get() as { total: number };

  const creancesClients = db
    .prepare(`SELECT COALESCE(SUM(solde_creances), 0) AS t FROM port_clients WHERE deleted_at IS NULL`)
    .get() as { t: number };

  const validationsEnAttente =
    (db.prepare(`SELECT COUNT(*) AS c FROM port_contrats WHERE statut IN ('brouillon', 'soumis') AND deleted_at IS NULL`).get() as { c: number }).c +
    (db.prepare(`SELECT COUNT(*) AS c FROM port_validations WHERE statut = 'en_attente'`).get() as { c: number }).c;

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const encMois = db
    .prepare(
      `SELECT COALESCE(SUM(montant), 0) AS total FROM port_encaissements WHERE date_encaissement LIKE ?`,
    )
    .get(`${monthPrefix}%`) as { total: number };

  const repartition = db
    .prepare(
      `
    SELECT COALESCE(type_navire, 'Non renseigné') AS type, COUNT(*) AS count
    FROM port_bateaux WHERE deleted_at IS NULL AND statut IN ('actif', 'irregulier')
    GROUP BY type_navire
    ORDER BY count DESC
  `,
    )
    .all() as Array<{ type: string; count: number }>;

  return {
    emplacementsTotal: empStats.total,
    emplacementsOccupes: empStats.occupes,
    emplacementsLibres: empStats.libres,
    emplacementsReserves: empStats.reserves,
    contratsActifs: contratsActifs.c,
    contratsExpiresProches: contratsExpiresProches.c,
    bateauxPresents: bateauxPresents.c,
    bateauxIrreguliers: bateauxIrreguliers.c,
    caFacture: caFactureTotal,
    encaissementsRealises: encaissementsRealises.total,
    creancesClients: creancesClients.t + resteARecouvrer,
    validationsEnAttente,
    resteARecouvrer,
    encaissementsMois: encMois.total,
    repartitionTypes: repartition.map((r) => ({ type: r.type, count: r.count })),
    emplacements: listEmplacements(actorUserId),
    contratsRecents: listContrats(actorUserId).slice(0, 8),
    alertes: listAlertes(actorUserId).slice(0, 25),
  };
}
