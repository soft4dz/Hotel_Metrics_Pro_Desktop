/**
 * Connecteur SIFEC — préparation et transmission factures électroniques DGI (Algérie).
 * Mode sandbox : simulation locale certifiable. Mode production : stub API extensible.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { hashDocument } from './comptabilite.service';
import { createWorkflow } from './workflow.service';

export type SifecMode = 'sandbox' | 'production';
export type SifecStatut = 'prepare' | 'soumis' | 'accepte' | 'rejete' | 'erreur';

export interface SifecConfig {
  mode: SifecMode;
  apiBaseUrl: string | null;
  apiKeyRef: string | null;
  nifDeclarant: string | null;
  actif: boolean;
  dernierTestAt: string | null;
  dernierTestOk: boolean | null;
}

export interface SifecDashboard {
  enAttente: number;
  soumis: number;
  acceptes: number;
  rejetes: number;
  erreurs: number;
  connectorActif: boolean;
  mode: SifecMode;
}

export interface SifecFactureItem {
  factureId: number;
  numero: string;
  dateEmission: string;
  montantTtc: number;
  clientNom: string;
  sifecStatut: string;
  documentHash: string | null;
  qrPayload: string | null;
  sifecUid: string | null;
  derniereErreur: string | null;
}

export interface SifecTransmission {
  id: number;
  factureId: number;
  numeroFacture: string;
  statut: SifecStatut;
  uidSifec: string | null;
  messageErreur: string | null;
  transmittedAt: string | null;
  createdAt: string;
}

export interface UpdateSifecConfigInput {
  mode?: SifecMode;
  apiBaseUrl?: string | null;
  apiKeyRef?: string | null;
  nifDeclarant?: string | null;
  actif?: boolean;
}

function assertCanSifec(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Permission refusée pour le connecteur SIFEC.');
  return actor;
}

function getCompanyNif(): string {
  const row = getDatabase().prepare(`SELECT value FROM app_settings WHERE key='company_nif'`).get() as { value: string } | undefined;
  return row?.value ?? '';
}

export function getSifecConfig(actorUserId: number): SifecConfig {
  assertCanSifec(actorUserId);
  const row = getDatabase().prepare('SELECT * FROM sifec_config WHERE id = 1').get() as Record<string, unknown>;
  return mapConfig(row);
}

function mapConfig(row: Record<string, unknown>): SifecConfig {
  return {
    mode: (row.mode as SifecMode) ?? 'sandbox',
    apiBaseUrl: row.api_base_url ? String(row.api_base_url) : null,
    apiKeyRef: row.api_key_ref ? String(row.api_key_ref) : null,
    nifDeclarant: row.nif_declarant ? String(row.nif_declarant) : null,
    actif: Boolean(row.actif),
    dernierTestAt: row.dernier_test_at ? String(row.dernier_test_at) : null,
    dernierTestOk: row.dernier_test_ok != null ? Boolean(row.dernier_test_ok) : null,
  };
}

export function updateSifecConfig(actorUserId: number, input: UpdateSifecConfigInput): SifecConfig {
  assertCanSifec(actorUserId);
  const db = getDatabase();
  const cur = mapConfig(db.prepare('SELECT * FROM sifec_config WHERE id = 1').get() as Record<string, unknown>);
  const next: SifecConfig = {
    mode: input.mode ?? cur.mode,
    apiBaseUrl: input.apiBaseUrl !== undefined ? input.apiBaseUrl : cur.apiBaseUrl,
    apiKeyRef: input.apiKeyRef !== undefined ? input.apiKeyRef : cur.apiKeyRef,
    nifDeclarant: input.nifDeclarant !== undefined ? input.nifDeclarant : cur.nifDeclarant,
    actif: input.actif ?? cur.actif,
    dernierTestAt: cur.dernierTestAt,
    dernierTestOk: cur.dernierTestOk,
  };
  db.prepare(`
    UPDATE sifec_config SET mode=?, api_base_url=?, api_key_ref=?, nif_declarant=?, actif=?, updated_at=datetime('now') WHERE id=1
  `).run(next.mode, next.apiBaseUrl, next.apiKeyRef, next.nifDeclarant, next.actif ? 1 : 0);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'sifec', description: `Config SIFEC — mode ${next.mode}, actif=${next.actif}` });
  return getSifecConfig(actorUserId);
}

export function testSifecConnection(actorUserId: number): { ok: boolean; message: string; latencyMs: number } {
  assertCanSifec(actorUserId);
  const cfg = getSifecConfig(actorUserId);
  const start = Date.now();
  let ok = false;
  let message = '';

  if (cfg.mode === 'sandbox') {
    ok = true;
    message = 'Connecteur sandbox opérationnel — simulation locale DGI.';
  } else if (!cfg.actif || !cfg.apiBaseUrl) {
    ok = false;
    message = 'Mode production : URL API et activation requises.';
  } else {
    ok = false;
    message = 'Mode production : intégration API DGI à finaliser avec les credentials officiels.';
  }

  const latencyMs = Date.now() - start;
  getDatabase().prepare(`
    UPDATE sifec_config SET dernier_test_at=datetime('now'), dernier_test_ok=?, updated_at=datetime('now') WHERE id=1
  `).run(ok ? 1 : 0);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'sifec', description: `Test connexion SIFEC — ${ok ? 'OK' : 'KO'} : ${message}` });
  return { ok, message, latencyMs };
}

export function getSifecDashboard(actorUserId: number): SifecDashboard {
  assertCanSifec(actorUserId);
  const db = getDatabase();
  const cfg = getSifecConfig(actorUserId);
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN m.sifec_statut IN ('prepare','soumis') THEN 1 ELSE 0 END) as en_attente,
      SUM(CASE WHEN m.sifec_statut = 'soumis' THEN 1 ELSE 0 END) as soumis,
      SUM(CASE WHEN m.sifec_statut = 'accepte' THEN 1 ELSE 0 END) as acceptes,
      SUM(CASE WHEN m.sifec_statut = 'rejete' THEN 1 ELSE 0 END) as rejetes,
      SUM(CASE WHEN m.sifec_statut = 'erreur' THEN 1 ELSE 0 END) as erreurs
    FROM factures_fiscales_metadata m
    JOIN factures f ON f.id = m.facture_id AND f.deleted_at IS NULL
  `).get() as Record<string, number>;

  return {
    enAttente: Number(counts.en_attente ?? 0),
    soumis: Number(counts.soumis ?? 0),
    acceptes: Number(counts.acceptes ?? 0),
    rejetes: Number(counts.rejetes ?? 0),
    erreurs: Number(counts.erreurs ?? 0),
    connectorActif: cfg.actif,
    mode: cfg.mode,
  };
}

export function listFacturesSifec(actorUserId: number, statut?: string): SifecFactureItem[] {
  assertCanSifec(actorUserId);
  const db = getDatabase();
  const conds = ['f.deleted_at IS NULL', "f.statut = 'validee'"];
  const params: unknown[] = [];
  if (statut) { conds.push('m.sifec_statut = ?'); params.push(statut); }
  return (db.prepare(`
    SELECT f.id as facture_id, f.numero, f.date_emission, f.montant_ttc, f.client_nom,
           m.sifec_statut, m.document_hash, m.qr_payload, m.sifec_uid, m.derniere_erreur
    FROM factures f
    JOIN factures_fiscales_metadata m ON m.facture_id = f.id
    WHERE ${conds.join(' AND ')}
    ORDER BY f.date_emission DESC, f.id DESC
    LIMIT 500
  `).all(...params) as Record<string, unknown>[]).map((r) => ({
    factureId: Number(r.facture_id),
    numero: String(r.numero),
    dateEmission: String(r.date_emission),
    montantTtc: Number(r.montant_ttc),
    clientNom: String(r.client_nom ?? ''),
    sifecStatut: String(r.sifec_statut),
    documentHash: r.document_hash ? String(r.document_hash) : null,
    qrPayload: r.qr_payload ? String(r.qr_payload) : null,
    sifecUid: r.sifec_uid ? String(r.sifec_uid) : null,
    derniereErreur: r.derniere_erreur ? String(r.derniere_erreur) : null,
  }));
}

export function buildSifecPayload(factureId: number): Record<string, unknown> {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT f.numero, f.date_emission, f.montant_ht, f.montant_tva, f.montant_ttc, f.type_document,
           m.nif_emetteur, m.nif_receveur, m.document_hash, m.horodatage
    FROM factures f
    JOIN factures_fiscales_metadata m ON m.facture_id = f.id
    WHERE f.id = ?
  `).get(factureId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Facture ou métadonnées fiscales introuvables.');

  const nifEmetteur = String(row.nif_emetteur ?? getCompanyNif());
  return {
    version: '1.0',
    schema: 'DGI-SIFEC-ALG',
    type_document: row.type_document === 'avoir' ? 'avoir' : 'facture',
    nif_emetteur: nifEmetteur,
    nif_receveur: row.nif_receveur ?? null,
    numero: row.numero,
    date_emission: row.date_emission,
    montant_ht: Number(row.montant_ht),
    montant_tva: Number(row.montant_tva),
    montant_ttc: Number(row.montant_ttc),
    document_hash: row.document_hash,
    horodatage: row.horodatage,
  };
}

export function buildQrPayload(payload: Record<string, unknown>): string {
  const compact = JSON.stringify(payload);
  return `SIFEC|${createHash('sha256').update(compact).digest('hex').slice(0, 16)}|${payload.numero}|${payload.montant_ttc}`;
}

function simulateSifecResponse(cfg: SifecConfig, _payload: Record<string, unknown>): { ok: boolean; uid?: string; error?: string } {
  if (cfg.mode === 'sandbox') {
    const uid = `SIFEC-SBX-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    return { ok: true, uid };
  }
  if (!cfg.actif || !cfg.apiBaseUrl) {
    return { ok: false, error: 'Connecteur production non configuré.' };
  }
  return { ok: false, error: 'API DGI production non implémentée — utiliser le mode sandbox pour les tests.' };
}

export function prepareFactureSifec(actorUserId: number, factureId: number): SifecFactureItem {
  assertCanSifec(actorUserId);
  const db = getDatabase();
  const payload = buildSifecPayload(factureId);
  const qr = buildQrPayload(payload);
  const meta = db.prepare('SELECT id FROM factures_fiscales_metadata WHERE facture_id = ?').get(factureId) as { id: number };
  const payloadJson = JSON.stringify(payload);

  db.prepare(`
    UPDATE factures_fiscales_metadata SET qr_payload=?, sifec_statut='prepare', derniere_erreur=NULL, updated_at=datetime('now') WHERE facture_id=?
  `).run(qr, factureId);

  db.prepare(`
    INSERT INTO sifec_transmissions (facture_id, metadata_id, statut, payload_json, qr_final)
    VALUES (?, ?, 'prepare', ?, ?)
  `).run(factureId, meta.id, payloadJson, qr);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'sifec', description: `Facture ${payload.numero} préparée SIFEC` });
  return listFacturesSifec(actorUserId).find((f) => f.factureId === factureId)!;
}

export function submitFactureSifec(actorUserId: number, factureId: number): SifecTransmission {
  assertCanSifec(actorUserId);
  const db = getDatabase();
  const cfg = getSifecConfig(actorUserId);
  const payload = buildSifecPayload(factureId);
  const payloadJson = JSON.stringify(payload);
  const qr = buildQrPayload(payload);
  const meta = db.prepare('SELECT id, sifec_statut FROM factures_fiscales_metadata WHERE facture_id = ?').get(factureId) as { id: number; sifec_statut: string };
  if (!meta) throw new Error('Métadonnées fiscales introuvables.');
  if (meta.sifec_statut === 'accepte') throw new Error('Facture déjà acceptée par SIFEC.');

  const now = new Date().toISOString();
  db.prepare(`UPDATE factures_fiscales_metadata SET sifec_statut='soumis', qr_payload=?, updated_at=datetime('now') WHERE facture_id=?`).run(qr, factureId);

  const result = simulateSifecResponse(cfg, payload);
  let statut: SifecStatut = 'soumis';
  let uid: string | null = null;
  let err: string | null = null;
  let signatureToken: string | null = null;

  if (result.ok && result.uid) {
    statut = 'accepte';
    uid = result.uid;
    signatureToken = hashDocument(`${uid}|${payloadJson}`);
    db.prepare(`
      UPDATE factures_fiscales_metadata SET sifec_statut='accepte', sifec_uid=?, date_transmission=?, qr_payload=?, derniere_erreur=NULL, updated_at=datetime('now') WHERE facture_id=?
    `).run(uid, now, qr, factureId);
  } else {
    statut = cfg.mode === 'production' ? 'erreur' : 'rejete';
    err = result.error ?? 'Transmission refusée.';
    db.prepare(`
      UPDATE factures_fiscales_metadata SET sifec_statut=?, derniere_erreur=?, updated_at=datetime('now') WHERE facture_id=?
    `).run(statut, err, factureId);
    if (statut === 'rejete' || statut === 'erreur') {
      createWorkflow(actorUserId, {
        module: 'sifec',
        entityType: 'facture',
        entityId: factureId,
        priorite: 'haute',
        commentaire: `Échec transmission facture ${payload.numero} — ${err}`,
      });
    }
  }

  const ins = db.prepare(`
    INSERT INTO sifec_transmissions (facture_id, metadata_id, statut, uid_sifec, payload_json, response_json, qr_final, signature_token, message_erreur, transmitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    factureId, meta.id, statut, uid, payloadJson,
    JSON.stringify(result), qr, signatureToken, err, now,
  );

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'sifec', description: `Transmission SIFEC facture ${payload.numero} — ${statut}${uid ? ` (${uid})` : ''}` });
  return mapTransmission(db.prepare(`
    SELECT t.*, f.numero as numero_facture FROM sifec_transmissions t
    JOIN factures f ON f.id = t.facture_id WHERE t.id = ?
  `).get(Number(ins.lastInsertRowid)) as Record<string, unknown>);
}

export function submitBatchFacturesSifec(actorUserId: number, factureIds: number[]): SifecTransmission[] {
  assertCanSifec(actorUserId);
  return factureIds.map((id) => {
    const cur = listFacturesSifec(actorUserId).find((f) => f.factureId === id);
    if (!cur || cur.sifecStatut === 'prepare' || cur.qrPayload?.startsWith('SIFEC-PENDING')) {
      prepareFactureSifec(actorUserId, id);
    }
    return submitFactureSifec(actorUserId, id);
  });
}

export function listSifecTransmissions(actorUserId: number, limit = 100): SifecTransmission[] {
  assertCanSifec(actorUserId);
  return (getDatabase().prepare(`
    SELECT t.*, f.numero as numero_facture FROM sifec_transmissions t
    JOIN factures f ON f.id = t.facture_id
    ORDER BY t.created_at DESC LIMIT ?
  `).all(limit) as Record<string, unknown>[]).map(mapTransmission);
}

function mapTransmission(row: Record<string, unknown>): SifecTransmission {
  return {
    id: Number(row.id),
    factureId: Number(row.facture_id),
    numeroFacture: String(row.numero_facture),
    statut: row.statut as SifecStatut,
    uidSifec: row.uid_sifec ? String(row.uid_sifec) : null,
    messageErreur: row.message_erreur ? String(row.message_erreur) : null,
    transmittedAt: row.transmitted_at ? String(row.transmitted_at) : null,
    createdAt: String(row.created_at),
  };
}
