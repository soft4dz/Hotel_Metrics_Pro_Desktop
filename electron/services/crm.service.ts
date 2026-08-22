import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { writeAuditLog } from './audit.service';
import { consentPurpose, loyaltyLevel, npsCategory, npsScore } from './crm.rules';

type Row = Record<string, unknown>;
type Channel = 'email' | 'sms' | 'whatsapp';
type ConsentPurpose = ReturnType<typeof consentPurpose> | 'profilage' | 'enquete' | 'portail';

function db() { return getDatabase(); }
function actor(actorId: number) {
  const value = getActorContext(actorId);
  if (!isGlobalAdminRole(value.roleCode)) throw new Error('Accès CRM refusé — administrateur requis.');
  return value;
}
function audit(actorId: number, action: string, description: string) {
  writeAuditLog({ userId: actorId, action, module: 'crm', page: '/crm', description });
}
function required(value: string | undefined, label: string) {
  const clean = value?.trim();
  if (!clean) throw new Error(`${label} requis.`);
  return clean;
}
function token() { return randomBytes(32).toString('base64url'); }
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function plusHours(hours: number) { return new Date(Date.now() + hours * 3_600_000).toISOString(); }

export function crmDashboard(actorId: number, hotelId?: number) {
  const a = actor(actorId);
  if (hotelId && !a.allHotelsAccess && !a.hotelIds.includes(hotelId)) throw new Error('Accès hôtel refusé.');
  const hotelClause = hotelId ? 'WHERE hotel_id=?' : '';
  const hotelParams = hotelId ? [hotelId] : [];
  const clients = db().prepare(`SELECT COUNT(*) total,SUM(vip=1) vip FROM clients_facturation WHERE deleted_at IS NULL AND actif=1`).get() as Row;
  const campaigns = db().prepare(`SELECT COUNT(*) total,SUM(statut='en_cours') actives FROM crm_campagnes`).get() as Row;
  const messages = db().prepare(`SELECT COUNT(*) total,SUM(statut IN ('sent','delivered','read')) envoyes,SUM(statut IN ('failed','dead')) echecs FROM crm_messages`).get() as Row;
  const loyalty = db().prepare(`SELECT COUNT(*) membres,COALESCE(SUM(points_solde),0) points FROM crm_fidelite_comptes WHERE statut='actif'`).get() as Row;
  const notes = (db().prepare(`SELECT rr.note_nps FROM crm_reponses_enquete rr JOIN crm_enquetes e ON e.id=rr.enquete_id ${hotelId ? 'WHERE e.hotel_id=? AND' : 'WHERE'} rr.statut='repondu' AND rr.note_nps IS NOT NULL`).all(...hotelParams) as Row[]).map(r => Number(r.note_nps));
  const reputation = db().prepare(`SELECT COUNT(*) avis,COALESCE(AVG(note),0) moyenne,SUM(reponse IS NULL) sans_reponse FROM crm_reputation_avis ${hotelClause}`).get(...hotelParams) as Row;
  const precheckins = db().prepare(`SELECT COUNT(*) total,SUM(p.statut='soumis') a_valider FROM crm_precheckins p JOIN reservations r ON r.id=p.reservation_id ${hotelId ? 'WHERE r.hotel_id=?' : ''}`).get(...hotelParams) as Row;
  return { clients, campaigns, messages, loyalty, nps: { score: npsScore(notes), responses: notes.length }, reputation, precheckins };
}

export function client360(actorId: number, clientId: number) {
  actor(actorId);
  const client = db().prepare(`SELECT * FROM clients_facturation WHERE id=? AND deleted_at IS NULL`).get(clientId) as Row | undefined;
  if (!client) throw new Error('Client introuvable.');
  const reservations = db().prepare(`SELECT r.*,h.name hotel_name,c.numero chambre_numero FROM reservations r JOIN hotels h ON h.id=r.hotel_id LEFT JOIN chambres c ON c.id=r.chambre_id WHERE r.client_id=? AND r.deleted_at IS NULL ORDER BY r.date_arrivee DESC LIMIT 100`).all(clientId);
  const invoices = db().prepare(`SELECT id,hotel_id,numero,date_emission,statut,montant_ttc,montant_paye FROM factures WHERE client_id=? AND deleted_at IS NULL ORDER BY date_emission DESC LIMIT 100`).all(clientId);
  const messages = db().prepare(`SELECT * FROM crm_messages WHERE client_id=? ORDER BY id DESC LIMIT 100`).all(clientId);
  const loyalty = db().prepare(`SELECT * FROM crm_fidelite_comptes WHERE client_id=?`).get(clientId) as Row | undefined;
  const loyaltyMovements = loyalty ? db().prepare(`SELECT * FROM crm_fidelite_mouvements WHERE compte_id=? ORDER BY id DESC LIMIT 100`).all(loyalty.id) : [];
  const consents = listConsents(actorId, clientId);
  const surveys = db().prepare(`SELECT rr.*,e.nom enquete_nom,e.hotel_id FROM crm_reponses_enquete rr JOIN crm_enquetes e ON e.id=rr.enquete_id WHERE rr.client_id=? ORDER BY rr.id DESC`).all(clientId);
  const totals = db().prepare(`SELECT COUNT(*) sejours,MAX(date_depart) dernier_sejour,COALESCE(SUM(montant_total),0) ca_pms FROM reservations WHERE client_id=? AND deleted_at IS NULL AND statut NOT IN ('annulee','no_show')`).get(clientId);
  return { client, totals, reservations, invoices, messages, loyalty, loyaltyMovements, consents, surveys };
}

export function listConsents(actorId: number, clientId: number) {
  actor(actorId);
  return db().prepare(`SELECT c.* FROM crm_consentements c JOIN (SELECT finalite,MAX(id) id FROM crm_consentements WHERE client_id=? GROUP BY finalite) latest ON latest.id=c.id ORDER BY c.finalite`).all(clientId);
}

export function recordConsent(actorId: number, input: { clientId: number; finalite: ConsentPurpose; accorde: boolean; source: string; preuve?: string; adresseIp?: string; versionNotice?: string }) {
  actor(actorId);
  const allowed = ['marketing_email', 'marketing_sms', 'marketing_whatsapp', 'profilage', 'enquete', 'portail'];
  if (!allowed.includes(input.finalite)) throw new Error('Finalité de consentement invalide.');
  const result = db().prepare(`INSERT INTO crm_consentements(client_id,finalite,accorde,source,preuve,adresse_ip,version_notice,withdrawn_at) VALUES(?,?,?,?,?,?,?,CASE WHEN ?=0 THEN datetime('now') END)`).run(input.clientId, input.finalite, input.accorde ? 1 : 0, required(input.source, 'Source'), input.preuve?.trim() || null, input.adresseIp?.trim() || null, input.versionNotice?.trim() || null, input.accorde ? 1 : 0);
  audit(actorId, input.accorde ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', `Consentement ${input.finalite} du client #${input.clientId}`);
  return { id: Number(result.lastInsertRowid) };
}

export interface SegmentCriteria { minStays?: number; minRevenue?: number; maxDaysSinceStay?: number; vip?: boolean; wilaya?: string; source?: string }
export function listSegments(actorId: number) {
  actor(actorId);
  return db().prepare(`SELECT s.*,COUNT(m.client_id) membres FROM crm_segments s LEFT JOIN crm_segment_membres m ON m.segment_id=s.id GROUP BY s.id ORDER BY s.nom`).all();
}
export function createSegment(actorId: number, input: { code: string; nom: string; description?: string; criteres: SegmentCriteria; dynamique?: boolean }) {
  actor(actorId);
  const result = db().prepare(`INSERT INTO crm_segments(code,nom,description,criteres_json,dynamique,created_by) VALUES(?,?,?,?,?,?)`).run(required(input.code, 'Code').toUpperCase(), required(input.nom, 'Nom'), input.description?.trim() || null, JSON.stringify(input.criteres ?? {}), input.dynamique === false ? 0 : 1, actorId);
  const id = Number(result.lastInsertRowid);
  recomputeSegment(actorId, id);
  audit(actorId, 'CREATE', `Segment CRM #${id}`);
  return { id };
}
export function recomputeSegment(actorId: number, segmentId: number) {
  actor(actorId);
  const segment = db().prepare(`SELECT * FROM crm_segments WHERE id=? AND actif=1`).get(segmentId) as Row | undefined;
  if (!segment) throw new Error('Segment introuvable ou inactif.');
  let criteria: SegmentCriteria;
  try { criteria = JSON.parse(String(segment.criteres_json || '{}')) as SegmentCriteria; } catch { throw new Error('Critères du segment invalides.'); }
  const profiles = db().prepare(`SELECT c.id,c.vip,c.wilaya,c.source_acquisition,(SELECT COUNT(*) FROM reservations r WHERE r.client_id=c.id AND r.deleted_at IS NULL AND r.statut NOT IN('annulee','no_show')) sejours,(SELECT MAX(r.date_depart) FROM reservations r WHERE r.client_id=c.id AND r.deleted_at IS NULL AND r.statut NOT IN('annulee','no_show')) dernier_sejour,(SELECT COALESCE(SUM(f.montant_ttc),0) FROM factures f WHERE f.client_id=c.id AND f.deleted_at IS NULL AND f.statut!='annulee') revenu FROM clients_facturation c WHERE c.deleted_at IS NULL AND c.actif=1`).all() as Row[];
  const now = Date.now();
  const matches = profiles.filter(p => {
    const days = p.dernier_sejour ? Math.floor((now - new Date(String(p.dernier_sejour)).getTime()) / 86_400_000) : Number.POSITIVE_INFINITY;
    return !(criteria.minStays != null && Number(p.sejours) < criteria.minStays)
      && !(criteria.minRevenue != null && Number(p.revenu) < criteria.minRevenue)
      && !(criteria.maxDaysSinceStay != null && days > criteria.maxDaysSinceStay)
      && !(criteria.vip != null && Boolean(p.vip) !== criteria.vip)
      && !(criteria.wilaya && String(p.wilaya || '').toLowerCase() !== criteria.wilaya.toLowerCase())
      && !(criteria.source && String(p.source_acquisition || '').toLowerCase() !== criteria.source.toLowerCase());
  });
  db().transaction(() => {
    db().prepare(`DELETE FROM crm_segment_membres WHERE segment_id=?`).run(segmentId);
    const insert = db().prepare(`INSERT INTO crm_segment_membres(segment_id,client_id,score) VALUES(?,?,?)`);
    for (const profile of matches) insert.run(segmentId, profile.id, Number(profile.revenu || 0));
  })();
  return { segmentId, membres: matches.length };
}

export function enrollLoyalty(actorId: number, clientId: number) {
  actor(actorId);
  const existing = db().prepare(`SELECT * FROM crm_fidelite_comptes WHERE client_id=?`).get(clientId);
  if (existing) return existing;
  const numero = `HMP-${new Date().getFullYear()}-${randomUUID().slice(0, 10).toUpperCase()}`;
  const result = db().prepare(`INSERT INTO crm_fidelite_comptes(client_id,numero) VALUES(?,?)`).run(clientId, numero);
  audit(actorId, 'CREATE', `Adhésion fidélité ${numero}`);
  return db().prepare(`SELECT * FROM crm_fidelite_comptes WHERE id=?`).get(result.lastInsertRowid);
}
export function moveLoyaltyPoints(actorId: number, input: { clientId: number; type: 'gain' | 'utilisation' | 'expiration' | 'ajustement'; points: number; motif: string; sourceType?: string; sourceId?: number; expiresAt?: string }) {
  actor(actorId);
  if (!Number.isInteger(input.points) || input.points === 0) throw new Error('Nombre de points invalide.');
  const account = (db().prepare(`SELECT * FROM crm_fidelite_comptes WHERE client_id=?`).get(input.clientId) || enrollLoyalty(actorId, input.clientId)) as Row;
  if (account.statut !== 'actif') throw new Error('Compte fidélité inactif.');
  let delta = Math.abs(input.points);
  if (input.type === 'utilisation' || input.type === 'expiration') delta *= -1;
  if (input.type === 'ajustement') delta = input.points;
  const next = Number(account.points_solde) + delta;
  if (next < 0) throw new Error('Solde de points insuffisant.');
  const life = Number(account.points_vie) + (input.type === 'gain' ? Math.max(0, delta) : 0);
  db().transaction(() => {
    db().prepare(`INSERT INTO crm_fidelite_mouvements(compte_id,type,points,motif,source_type,source_id,expires_at,created_by) VALUES(?,?,?,?,?,?,?,?)`).run(account.id, input.type, delta, required(input.motif, 'Motif'), input.sourceType?.trim() || null, input.sourceId ?? null, input.expiresAt ?? null, actorId);
    db().prepare(`UPDATE crm_fidelite_comptes SET points_solde=?,points_vie=?,niveau=? WHERE id=?`).run(next, life, loyaltyLevel(life), account.id);
  })();
  audit(actorId, 'UPDATE', `Fidélité client #${input.clientId}: ${delta > 0 ? '+' : ''}${delta} points`);
  return db().prepare(`SELECT * FROM crm_fidelite_comptes WHERE id=?`).get(account.id);
}

export function createCampaign(actorId: number, input: { nom: string; segmentId: number; canal: Channel | 'multicanal'; objet?: string; contenu: string; datePlanifiee?: string }) {
  actor(actorId);
  const result = db().prepare(`INSERT INTO crm_campagnes(nom,segment_id,canal,objet,contenu,date_planifiee,statut,created_by) VALUES(?,?,?,?,?,?,?,?)`).run(required(input.nom, 'Nom'), input.segmentId, input.canal, input.objet?.trim() || null, required(input.contenu, 'Contenu'), input.datePlanifiee ?? null, input.datePlanifiee ? 'planifiee' : 'brouillon', actorId);
  return { id: Number(result.lastInsertRowid) };
}
function destination(client: Row, channel: Channel) {
  if (channel === 'email') return String(client.email || '').trim();
  return String(client.mobile || client.telephone || '').trim();
}
function hasConsent(clientId: number, channel: Channel) {
  const row = db().prepare(`SELECT accorde,withdrawn_at FROM crm_consentements WHERE client_id=? AND finalite=? ORDER BY id DESC LIMIT 1`).get(clientId, consentPurpose(channel)) as Row | undefined;
  return Boolean(row && Number(row.accorde) === 1 && !row.withdrawn_at);
}
export function prepareCampaign(actorId: number, campaignId: number) {
  actor(actorId);
  const campaign = db().prepare(`SELECT * FROM crm_campagnes WHERE id=?`).get(campaignId) as Row | undefined;
  if (!campaign || !['brouillon', 'planifiee'].includes(String(campaign.statut))) throw new Error('Campagne non préparée dans cet état.');
  recomputeSegment(actorId, Number(campaign.segment_id));
  const members = db().prepare(`SELECT c.* FROM crm_segment_membres sm JOIN clients_facturation c ON c.id=sm.client_id WHERE sm.segment_id=? AND c.actif=1 AND c.deleted_at IS NULL`).all(campaign.segment_id) as Row[];
  const configured = String(campaign.canal) === 'multicanal' ? ['email', 'sms', 'whatsapp'] as Channel[] : [campaign.canal as Channel];
  let queued = 0; let skipped = 0;
  db().transaction(() => {
    const insert = db().prepare(`INSERT OR IGNORE INTO crm_messages(client_id,campagne_id,canal,destinataire,contenu,idempotency_key,next_retry_at) VALUES(?,?,?,?,?,?,datetime('now'))`);
    for (const client of members) {
      let clientQueued = false;
      for (const channel of configured) {
        const to = destination(client, channel);
        if (!to || !hasConsent(Number(client.id), channel)) continue;
        const result = insert.run(client.id, campaignId, channel, to, campaign.contenu, `campaign:${campaignId}:client:${client.id}:channel:${channel}`);
        if (result.changes) { queued += 1; clientQueued = true; }
      }
      if (!clientQueued) skipped += 1;
    }
    db().prepare(`UPDATE crm_campagnes SET statut='en_cours' WHERE id=?`).run(campaignId);
  })();
  audit(actorId, 'CAMPAIGN_PREPARED', `Campagne #${campaignId}: ${queued} messages, ${skipped} clients sans consentement/destination`);
  return { queued, skipped };
}
export function queueMessage(actorId: number, input: { clientId?: number; reservationId?: number; channel: Channel | 'portail'; destinataire: string; contenu: string; provider?: string; transactional?: boolean }) {
  actor(actorId);
  if (input.clientId && input.channel !== 'portail' && !input.transactional && !hasConsent(input.clientId, input.channel)) throw new Error(`Consentement ${input.channel} absent ou retiré.`);
  const key = `direct:${randomUUID()}`;
  const result = db().prepare(`INSERT INTO crm_messages(client_id,reservation_id,canal,destinataire,contenu,provider,idempotency_key,next_retry_at) VALUES(?,?,?,?,?,?,?,datetime('now'))`).run(input.clientId ?? null, input.reservationId ?? null, input.channel, required(input.destinataire, 'Destinataire'), required(input.contenu, 'Contenu'), input.provider?.trim() || null, key);
  return { id: Number(result.lastInsertRowid) };
}
export function nextMessages(actorId: number, limit = 50) {
  actor(actorId);
  return db().prepare(`SELECT * FROM crm_messages WHERE statut IN('pending','failed') AND (next_retry_at IS NULL OR next_retry_at<=datetime('now')) AND attempts<5 ORDER BY id LIMIT ?`).all(Math.min(Math.max(limit, 1), 200));
}
export function completeMessage(actorId: number, input: { id: number; success: boolean; providerReference?: string; error?: string; delivered?: boolean }) {
  actor(actorId);
  const message = db().prepare(`SELECT * FROM crm_messages WHERE id=?`).get(input.id) as Row | undefined;
  if (!message) throw new Error('Message introuvable.');
  const attempts = Number(message.attempts) + 1;
  if (input.success) {
    db().prepare(`UPDATE crm_messages SET statut=?,attempts=?,provider_reference=?,last_error=NULL,sent_at=COALESCE(sent_at,datetime('now')),delivered_at=CASE WHEN ?=1 THEN datetime('now') ELSE delivered_at END WHERE id=?`).run(input.delivered ? 'delivered' : 'sent', attempts, input.providerReference?.trim() || null, input.delivered ? 1 : 0, input.id);
  } else {
    const status = attempts >= 5 ? 'dead' : 'failed';
    const delay = Math.min(60, 2 ** attempts);
    db().prepare(`UPDATE crm_messages SET statut=?,attempts=?,last_error=?,next_retry_at=datetime('now',?) WHERE id=?`).run(status, attempts, input.error?.trim() || 'Erreur fournisseur', `+${delay} minutes`, input.id);
  }
  if (message.campagne_id) {
    const waiting = db().prepare(`SELECT COUNT(*) n FROM crm_messages WHERE campagne_id=? AND statut IN('pending','failed')`).get(message.campagne_id) as Row;
    if (Number(waiting.n) === 0) db().prepare(`UPDATE crm_campagnes SET statut='terminee' WHERE id=?`).run(message.campagne_id);
  }
  return db().prepare(`SELECT * FROM crm_messages WHERE id=?`).get(input.id);
}

export function createSurvey(actorId: number, input: { hotelId: number; nom: string; declencheur: 'checkout' | 'manuel' | 'reclamation'; questions: unknown[] }) {
  const a = actor(actorId); if (!a.allHotelsAccess && !a.hotelIds.includes(input.hotelId)) throw new Error('Accès hôtel refusé.');
  const result = db().prepare(`INSERT INTO crm_enquetes(hotel_id,nom,declencheur,questions_json) VALUES(?,?,?,?)`).run(input.hotelId, required(input.nom, 'Nom'), input.declencheur, JSON.stringify(input.questions ?? []));
  return { id: Number(result.lastInsertRowid) };
}
export function inviteSurvey(actorId: number, input: { enqueteId: number; clientId?: number; reservationId?: number }) {
  actor(actorId);
  if (input.clientId) {
    const consent = db().prepare(`SELECT accorde,withdrawn_at FROM crm_consentements WHERE client_id=? AND finalite='enquete' ORDER BY id DESC LIMIT 1`).get(input.clientId) as Row | undefined;
    if (!consent || Number(consent.accorde) !== 1 || consent.withdrawn_at) throw new Error('Consentement enquête absent ou retiré.');
  }
  const plain = token();
  const result = db().prepare(`INSERT INTO crm_reponses_enquete(enquete_id,client_id,reservation_id,token_hash) VALUES(?,?,?,?)`).run(input.enqueteId, input.clientId ?? null, input.reservationId ?? null, hash(plain));
  return { id: Number(result.lastInsertRowid), token: plain };
}
export function submitSurvey(input: { token: string; noteNps?: number; noteGlobale?: number; commentaire?: string; reponses?: unknown }) {
  if (input.noteNps != null) npsCategory(input.noteNps);
  const row = db().prepare(`SELECT id,statut FROM crm_reponses_enquete WHERE token_hash=?`).get(hash(required(input.token, 'Jeton'))) as Row | undefined;
  if (!row || row.statut !== 'invite') throw new Error('Invitation invalide ou déjà utilisée.');
  db().prepare(`UPDATE crm_reponses_enquete SET note_nps=?,note_globale=?,commentaire=?,reponses_json=?,statut='repondu',responded_at=datetime('now') WHERE id=?`).run(input.noteNps ?? null, input.noteGlobale ?? null, input.commentaire?.trim() || null, input.reponses == null ? null : JSON.stringify(input.reponses), row.id);
  return { id: Number(row.id), category: input.noteNps == null ? null : npsCategory(input.noteNps) };
}
export function npsDashboard(actorId: number, hotelId: number) {
  const a = actor(actorId); if (!a.allHotelsAccess && !a.hotelIds.includes(hotelId)) throw new Error('Accès hôtel refusé.');
  const rows = db().prepare(`SELECT rr.note_nps,rr.note_globale,rr.commentaire,rr.responded_at,c.nom,c.prenom FROM crm_reponses_enquete rr JOIN crm_enquetes e ON e.id=rr.enquete_id LEFT JOIN clients_facturation c ON c.id=rr.client_id WHERE e.hotel_id=? AND rr.statut='repondu' ORDER BY rr.responded_at DESC`).all(hotelId) as Row[];
  const notes = rows.filter(r => r.note_nps != null).map(r => Number(r.note_nps));
  return { score: npsScore(notes), promoteurs: notes.filter(n => n >= 9).length, passifs: notes.filter(n => n >= 7 && n <= 8).length, detracteurs: notes.filter(n => n <= 6).length, responses: rows };
}

export function ingestReview(actorId: number, input: { hotelId: number; clientId?: number; source: string; externalId?: string; auteur: string; note: number; titre?: string; commentaire?: string; publieAt?: string }) {
  const a = actor(actorId); if (!a.allHotelsAccess && !a.hotelIds.includes(input.hotelId)) throw new Error('Accès hôtel refusé.');
  if (input.note < 0 || input.note > 5) throw new Error('Note invalide.');
  const sentiment = input.note >= 4 ? 'positif' : input.note >= 3 ? 'neutre' : 'negatif';
  const result = db().prepare(`INSERT INTO crm_reputation_avis(hotel_id,client_id,source,external_id,auteur,note,titre,commentaire,sentiment,publie_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source,external_id) DO UPDATE SET note=excluded.note,titre=excluded.titre,commentaire=excluded.commentaire,sentiment=excluded.sentiment,publie_at=excluded.publie_at`).run(input.hotelId, input.clientId ?? null, required(input.source, 'Source'), input.externalId?.trim() || null, required(input.auteur, 'Auteur'), input.note, input.titre?.trim() || null, input.commentaire?.trim() || null, sentiment, input.publieAt ?? new Date().toISOString());
  return { id: Number(result.lastInsertRowid) };
}
export function listReviews(actorId: number, hotelId: number) {
  const a = actor(actorId); if (!a.allHotelsAccess && !a.hotelIds.includes(hotelId)) throw new Error('Accès hôtel refusé.');
  return db().prepare(`SELECT * FROM crm_reputation_avis WHERE hotel_id=? ORDER BY publie_at DESC,id DESC`).all(hotelId);
}
export function respondReview(actorId: number, id: number, response: string) {
  actor(actorId);
  const result = db().prepare(`UPDATE crm_reputation_avis SET reponse=?,repondu_par=?,repondu_at=datetime('now') WHERE id=?`).run(required(response, 'Réponse'), actorId, id);
  if (!result.changes) throw new Error('Avis introuvable.');
  audit(actorId, 'REVIEW_RESPONSE', `Réponse à l’avis #${id}`);
  return true;
}

export function invitePortal(actorId: number, clientId: number, email?: string) {
  actor(actorId);
  const client = db().prepare(`SELECT email FROM clients_facturation WHERE id=? AND deleted_at IS NULL`).get(clientId) as Row | undefined;
  if (!client) throw new Error('Client introuvable.');
  const plain = token(); const target = required(email || String(client.email || ''), 'E-mail');
  db().prepare(`INSERT INTO crm_portail_comptes(client_id,email,statut,activation_token_hash,activation_expires_at) VALUES(?,?,'invite',?,?) ON CONFLICT(client_id) DO UPDATE SET email=excluded.email,statut='invite',activation_token_hash=excluded.activation_token_hash,activation_expires_at=excluded.activation_expires_at`).run(clientId, target, hash(plain), plusHours(48));
  audit(actorId, 'PORTAL_INVITE', `Invitation portail client #${clientId}`);
  return { token: plain, expiresAt: plusHours(48) };
}
export function activatePortal(input: { token: string }) {
  const result = db().prepare(`UPDATE crm_portail_comptes SET statut='actif',activation_token_hash=NULL,activation_expires_at=NULL WHERE activation_token_hash=? AND statut='invite' AND activation_expires_at>datetime('now')`).run(hash(required(input.token, 'Jeton')));
  if (!result.changes) throw new Error('Invitation portail invalide ou expirée.');
  return true;
}
export function portalOverview(input: { clientId: number }) {
  const account = db().prepare(`SELECT id,client_id,email,statut,last_login_at,created_at FROM crm_portail_comptes WHERE client_id=? AND statut='actif'`).get(input.clientId);
  if (!account) throw new Error('Portail client inactif.');
  const reservations = db().prepare(`SELECT id,hotel_id,date_arrivee,date_depart,client_nom,montant_total,montant_paye,statut FROM reservations WHERE client_id=? AND deleted_at IS NULL ORDER BY date_arrivee DESC`).all(input.clientId);
  const invoices = db().prepare(`SELECT id,numero,date_emission,statut,montant_ttc,montant_paye FROM factures WHERE client_id=? AND deleted_at IS NULL ORDER BY date_emission DESC`).all(input.clientId);
  return { account, reservations, invoices };
}
export function invitePrecheckin(actorId: number, reservationId: number) {
  actor(actorId);
  const reservation = db().prepare(`SELECT r.*,c.email client_account_email,c.mobile client_mobile FROM reservations r LEFT JOIN clients_facturation c ON c.id=r.client_id WHERE r.id=? AND r.deleted_at IS NULL`).get(reservationId) as Row | undefined;
  if (!reservation || !['provisoire', 'confirmee'].includes(String(reservation.statut))) throw new Error('Réservation non éligible au pré-check-in.');
  const plain = token(); const expires = `${String(reservation.date_arrivee)}T23:59:59.000Z`;
  db().prepare(`INSERT INTO crm_precheckins(reservation_id,client_id,token_hash,expires_at) VALUES(?,?,?,?) ON CONFLICT(reservation_id) DO UPDATE SET client_id=excluded.client_id,token_hash=excluded.token_hash,expires_at=excluded.expires_at,statut='invite',submitted_at=NULL`).run(reservationId, reservation.client_id ?? null, hash(plain), expires);
  audit(actorId, 'PRECHECKIN_INVITE', `Pré-check-in réservation #${reservationId}`);
  return { token: plain, expiresAt: expires };
}
export function submitPrecheckin(input: { token: string; heureArriveePrevue?: string; adresse?: string; nationalite?: string; typeDocument?: string; numeroDocument?: string; documentPath?: string; consentementFichePolice: boolean }) {
  const row = db().prepare(`SELECT id FROM crm_precheckins WHERE token_hash=? AND statut='invite' AND expires_at>datetime('now')`).get(hash(required(input.token, 'Jeton'))) as Row | undefined;
  if (!row) throw new Error('Lien de pré-check-in invalide ou expiré.');
  db().prepare(`UPDATE crm_precheckins SET heure_arrivee_prevue=?,adresse=?,nationalite=?,type_document=?,numero_document=?,document_path=?,consentement_fiche_police=?,statut='soumis',submitted_at=datetime('now') WHERE id=?`).run(input.heureArriveePrevue ?? null, input.adresse?.trim() || null, input.nationalite?.trim() || null, input.typeDocument?.trim() || null, input.numeroDocument?.trim() || null, input.documentPath?.trim() || null, input.consentementFichePolice ? 1 : 0, row.id);
  return { id: Number(row.id) };
}
export function validatePrecheckin(actorId: number, id: number, approved: boolean) {
  actor(actorId);
  const result = db().prepare(`UPDATE crm_precheckins SET statut=?,validated_by=?,validated_at=datetime('now') WHERE id=? AND statut='soumis'`).run(approved ? 'valide' : 'rejete', actorId, id);
  if (!result.changes) throw new Error('Pré-check-in introuvable ou déjà traité.');
  audit(actorId, 'PRECHECKIN_REVIEW', `Pré-check-in #${id}: ${approved ? 'validé' : 'rejeté'}`);
  return true;
}
