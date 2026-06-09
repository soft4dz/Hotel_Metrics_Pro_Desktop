import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { getContrat } from './portmaster.service';
import { simulerTarif } from './portmaster-tarifs.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

function nextFactureNumero(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();
  const key = `port_facture_seq_${year}`;
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  const seq = (row ? parseInt(row.value, 10) : 0) + 1;
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`).run(
    key,
    String(seq),
  );
  return `FAC-PORT-${year}-${String(seq).padStart(5, '0')}`;
}

function sumPaiementsFacture(db: ReturnType<typeof getDatabase>, factureId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(montant), 0) AS t FROM port_encaissements
       WHERE facture_id = ? AND COALESCE(statut, 'valide') = 'valide'`,
    )
    .get(factureId) as { t: number };
  return row.t;
}

export interface FactureListItem {
  id: number;
  numero: string;
  clientName: string;
  dateFacture: string;
  montantTtc: number;
  paye: number;
  reste: number;
  statut: string;
  typeFacture: string;
}

export interface FactureDto {
  id: number;
  numero: string;
  clientId: number;
  clientName: string;
  contratId: number | null;
  contratNumero: string | null;
  bateauId: number | null;
  bateauNom: string | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  paye: number;
  reste: number;
  statut: string;
  dateFacture: string;
  observation: string | null;
  typeFacture: string;
  canPrint: boolean;
}

export interface CreateFactureInput {
  clientId: number;
  contratId?: number | null;
  bateauId?: number | null;
  typePrestation?: string;
  tarifId?: number;
  periodeDebut?: string | null;
  periodeFin?: string | null;
  montantHt: number;
  tauxTva?: number;
  observation?: string | null;
  typeFacture?: 'contrat' | 'hors_contrat';
}

export interface AddPaiementFactureInput {
  factureId: number;
  dateEncaissement: string;
  montant: number;
  modePaiement?: string | null;
  reference?: string | null;
}

export function listFactures(actorUserId: number, statut?: string): FactureListItem[] {
  assertPortmaster(actorUserId);
  const conditions = ['f.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (statut) {
    conditions.push('f.statut = ?');
    params.push(statut);
  }

  const rows = getDatabase()
    .prepare(
      `
    SELECT
      f.id, f.numero, f.date_facture AS dateFacture, f.montant_ttc AS montantTtc, f.statut,
      COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS clientName,
      CASE WHEN f.contrat_id IS NOT NULL THEN 'contrat' ELSE 'hors_contrat' END AS typeFacture
    FROM port_factures f
    INNER JOIN port_clients cl ON cl.id = f.client_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY f.date_facture DESC, f.numero DESC
  `,
    )
    .all(...params) as Array<{
    id: number;
    numero: string;
    dateFacture: string;
    montantTtc: number;
    statut: string;
    clientName: string;
    typeFacture: string;
  }>;

  const db = getDatabase();
  return rows.map((r) => {
    const paye = sumPaiementsFacture(db, r.id);
    return {
      ...r,
      paye,
      reste: Math.max(0, r.montantTtc - paye),
    };
  });
}

export function getFacture(actorUserId: number, id: number): FactureDto | null {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT f.*,
      COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS client_name,
      c.numero AS contrat_numero, b.nom AS bateau_nom
    FROM port_factures f
    INNER JOIN port_clients cl ON cl.id = f.client_id
    LEFT JOIN port_contrats c ON c.id = f.contrat_id
    LEFT JOIN port_bateaux b ON b.id = f.bateau_id
    WHERE f.id = ? AND f.deleted_at IS NULL
  `,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;

  const paye = sumPaiementsFacture(db, id);
  const montantTtc = row.montant_ttc as number;
  const statut = row.statut as string;

  return {
    id: row.id as number,
    numero: row.numero as string,
    clientId: row.client_id as number,
    clientName: row.client_name as string,
    contratId: (row.contrat_id as number) ?? null,
    contratNumero: (row.contrat_numero as string) ?? null,
    bateauId: (row.bateau_id as number) ?? null,
    bateauNom: (row.bateau_nom as string) ?? null,
    periodeDebut: (row.periode_debut as string) ?? null,
    periodeFin: (row.periode_fin as string) ?? null,
    montantHt: row.montant_ht as number,
    montantTva: row.montant_tva as number,
    montantTtc,
    paye,
    reste: Math.max(0, montantTtc - paye),
    statut,
    dateFacture: row.date_facture as string,
    observation: (row.observation as string) ?? null,
    typeFacture: row.contrat_id ? 'contrat' : 'hors_contrat',
    canPrint: statut === 'validee' || statut === 'payee',
  };
}

export function createFacture(actorUserId: number, input: CreateFactureInput): FactureDto {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();

  if (!input.clientId) throw new Error('Client obligatoire.');
  const defaultTva = parseFloat(
    (db.prepare(`SELECT value FROM app_settings WHERE key = 'port_taux_tva_default'`).get() as
      | { value: string }
      | undefined)?.value ?? '19',
  );
  const tva = input.tauxTva ?? defaultTva;
  const montantTva = Math.round(input.montantHt * tva) / 100;
  const montantTtc = input.montantHt + montantTva;

  const numero = nextFactureNumero(db);
  const r = db
    .prepare(
      `
    INSERT INTO port_factures (
      uuid, numero, client_id, contrat_id, bateau_id, periode_debut, periode_fin,
      montant_ht, montant_tva, montant_ttc, statut, date_facture, observation, created_by
    ) VALUES (
      @uuid, @numero, @client_id, @contrat_id, @bateau_id, @periode_debut, @periode_fin,
      @montant_ht, @montant_tva, @montant_ttc, 'brouillon', @date_facture, @observation, @created_by
    )
  `,
    )
    .run({
      uuid: randomUUID(),
      numero,
      client_id: input.clientId,
      contrat_id: input.contratId ?? null,
      bateau_id: input.bateauId ?? null,
      periode_debut: input.periodeDebut ?? null,
      periode_fin: input.periodeFin ?? null,
      montant_ht: input.montantHt,
      montant_tva: montantTva,
      montant_ttc: montantTtc,
      date_facture: new Date().toISOString().slice(0, 10),
      observation: input.observation?.trim() || null,
      created_by: actor.userId,
    });

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'FactureFormPage',
    description: `Facture ${numero} créée`,
  });

  return getFacture(actorUserId, Number(r.lastInsertRowid))!;
}

export function createFactureFromContrat(
  actorUserId: number,
  contratId: number,
  tarifId?: number,
): FactureDto {
  const contrat = getContrat(actorUserId, contratId);
  if (!contrat) throw new Error('Contrat introuvable.');
  if (contrat.statut !== 'actif' && contrat.statut !== 'valide') {
    throw new Error('Le contrat doit être actif ou validé pour facturer.');
  }

  let montantHt = contrat.montantTotal;
  if (tarifId) {
    const bateau = getDatabase()
      .prepare(`SELECT longueur_m FROM port_bateaux WHERE id = ?`)
      .get(contrat.bateauId) as { longueur_m: number } | undefined;
    const sim = simulerTarif(actorUserId, tarifId, bateau?.longueur_m ?? 0);
    if (sim.montant > 0) montantHt = sim.montant;
  }

  const clientRow = getDatabase()
    .prepare(`SELECT client_id FROM port_contrats WHERE id = ?`)
    .get(contratId) as { client_id: number | null };
  const clientId =
    clientRow?.client_id ??
    (getDatabase()
      .prepare(`SELECT client_id FROM port_bateaux WHERE id = ?`)
      .get(contrat.bateauId) as { client_id: number } | undefined)?.client_id;

  if (!clientId) throw new Error('Aucun client rattaché au contrat.');

  return createFacture(actorUserId, {
    clientId,
    contratId,
    bateauId: contrat.bateauId,
    periodeDebut: contrat.dateDebut,
    periodeFin: contrat.dateFin,
    montantHt,
    typeFacture: 'contrat',
    observation: `Facture générée depuis contrat ${contrat.numero}`,
  });
}

export function submitFacture(actorUserId: number, id: number): void {
  const actor = assertPortmaster(actorUserId);
  const f = getFacture(actorUserId, id);
  if (!f) throw new Error('Facture introuvable.');
  if (f.statut !== 'brouillon') throw new Error('Seules les factures brouillon peuvent être soumises.');

  getDatabase()
    .prepare(`UPDATE port_factures SET statut = 'soumise', updated_at = datetime('now') WHERE id = ?`)
    .run(id);

  getDatabase()
    .prepare(
      `INSERT INTO port_validations (uuid, entity_type, entity_id, action_demandee, statut, submitted_by)
       VALUES (?, 'facture', ?, 'validation', 'en_attente', ?)`,
    )
    .run(randomUUID(), id, actor.userId);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'SUBMIT',
    module: 'portmaster',
    page: 'FacturesPage',
    description: `Facture ${f.numero} soumise`,
  });
}

export function validateFacture(actorUserId: number, id: number, motif?: string): void {
  const actor = assertPortmaster(actorUserId);
  const f = getFacture(actorUserId, id);
  if (!f) throw new Error('Facture introuvable.');
  if (f.statut !== 'soumise') throw new Error('Facture non soumise.');

  const db = getDatabase();
  db.prepare(
    `UPDATE port_factures SET statut = 'validee', validated_at = datetime('now'), validated_by = ? WHERE id = ?`,
  ).run(actor.userId, id);

  db.prepare(
    `UPDATE port_validations SET statut = 'accepte', decided_by = ?, decided_at = datetime('now'), motif_decision = ?
     WHERE entity_type = 'facture' AND entity_id = ? AND statut = 'en_attente'`,
  ).run(actor.userId, motif ?? null, id);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'VALIDATE',
    module: 'portmaster',
    page: 'ValidationsPortPage',
    description: `Facture ${f.numero} validée`,
  });
}

export function rejectFacture(actorUserId: number, id: number, motif: string): void {
  const actor = assertPortmaster(actorUserId);
  if (!motif.trim()) throw new Error('Motif de rejet obligatoire.');
  const f = getFacture(actorUserId, id);
  if (!f) throw new Error('Facture introuvable.');

  getDatabase()
    .prepare(`UPDATE port_factures SET statut = 'brouillon', updated_at = datetime('now') WHERE id = ?`)
    .run(id);

  getDatabase()
    .prepare(
      `UPDATE port_validations SET statut = 'rejete', decided_by = ?, decided_at = datetime('now'), motif_decision = ?
       WHERE entity_type = 'facture' AND entity_id = ? AND statut = 'en_attente'`,
    )
    .run(actor.userId, motif, id);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'REJECT',
    module: 'portmaster',
    page: 'ValidationsPortPage',
    description: `Facture ${f.numero} rejetée`,
  });
}

export function addPaiementFacture(actorUserId: number, input: AddPaiementFactureInput): FactureDto {
  const actor = assertPortmaster(actorUserId);
  const f = getFacture(actorUserId, input.factureId);
  if (!f) throw new Error('Facture introuvable.');
  if (f.statut !== 'validee' && f.statut !== 'payee_partiel') {
    throw new Error('Facture non validée — paiement refusé.');
  }
  if (input.montant <= 0) throw new Error('Montant invalide.');

  const db = getDatabase();
  const factureRow = db
    .prepare(`SELECT contrat_id FROM port_factures WHERE id = ?`)
    .get(input.factureId) as { contrat_id: number | null };

  db.prepare(
    `
    INSERT INTO port_encaissements (uuid, contrat_id, facture_id, date_encaissement, montant, mode_paiement, reference, statut, created_by)
    VALUES (@uuid, @contrat_id, @facture_id, @date, @montant, @mode, @ref, 'valide', @uid)
  `,
  ).run({
    uuid: randomUUID(),
    contrat_id: factureRow?.contrat_id ?? null,
    facture_id: input.factureId,
    date: input.dateEncaissement,
    montant: input.montant,
    mode: input.modePaiement ?? null,
    ref: input.reference ?? null,
    uid: actor.userId,
  });

  const updated = getFacture(actorUserId, input.factureId)!;
  const newStatut =
    updated.reste <= 0 ? 'payee' : updated.paye > 0 ? 'payee_partiel' : updated.statut;
  db.prepare(`UPDATE port_factures SET statut = ? WHERE id = ?`).run(newStatut, input.factureId);

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'CREATE',
    module: 'portmaster',
    page: 'FactureFormPage',
    description: `Paiement ${input.montant} sur facture ${f.numero}`,
  });

  return getFacture(actorUserId, input.factureId)!;
}
