import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';

export type CreanceStatut = 'ouverte' | 'partielle' | 'reglee' | 'litige' | 'irrecouvrable' | 'annulee';
export type NiveauRisque = 'faible' | 'normal' | 'eleve' | 'critique';

export interface GlobalCreance {
  id: number;
  sourceModule: string;
  sourceEntityType: string | null;
  sourceEntityId: number | null;
  hotelId: number | null;
  clientLabel: string;
  referencePiece: string | null;
  datePiece: string | null;
  dateEcheance: string | null;
  montantTotal: number;
  montantRegle: number;
  montantRestant: number;
  statut: CreanceStatut;
  niveauRisque: NiveauRisque;
  lastRelanceAt: string | null;
}

export interface CreanceRelance {
  id: number;
  creanceId: number;
  niveau: number;
  canal: string;
  statut: string;
  objet: string | null;
  createdAt: string;
}

export interface BalanceAgeeLigne {
  tranche: string;
  montant: number;
  count: number;
}

function mapCreance(row: Record<string, unknown>): GlobalCreance {
  return {
    id: Number(row.id),
    sourceModule: String(row.source_module),
    sourceEntityType: row.source_entity_type ? String(row.source_entity_type) : null,
    sourceEntityId: row.source_entity_id ? Number(row.source_entity_id) : null,
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    clientLabel: String(row.client_label),
    referencePiece: row.reference_piece ? String(row.reference_piece) : null,
    datePiece: row.date_piece ? String(row.date_piece) : null,
    dateEcheance: row.date_echeance ? String(row.date_echeance) : null,
    montantTotal: Number(row.montant_total),
    montantRegle: Number(row.montant_regle),
    montantRestant: Number(row.montant_restant),
    statut: row.statut as CreanceStatut,
    niveauRisque: row.niveau_risque as NiveauRisque,
    lastRelanceAt: row.last_relance_at ? String(row.last_relance_at) : null,
  };
}

function computeRisque(montant: number, joursRetard: number): NiveauRisque {
  if (joursRetard > 90 || montant > 500000) return 'critique';
  if (joursRetard > 60 || montant > 200000) return 'eleve';
  if (joursRetard > 30) return 'normal';
  return 'faible';
}

export function listCreances(actorUserId: number, filters: { hotelId?: number; statut?: CreanceStatut } = {}): GlobalCreance[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (filters.hotelId) { conds.push('hotel_id = ?'); params.push(filters.hotelId); }
  if (filters.statut) { conds.push('statut = ?'); params.push(filters.statut); }
  if (!isGlobalAdminRole(actor.roleCode) && actor.hotelIds.length) {
    conds.push(`hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }
  return (getDatabase().prepare(`SELECT * FROM global_creances WHERE ${conds.join(' AND ')} ORDER BY date_echeance, id DESC LIMIT 500`).all(...params) as Record<string, unknown>[]).map(mapCreance);
}

export function createCreanceFromFacture(actorUserId: number, factureId: number): GlobalCreance {
  const db = getDatabase();
  const f = db.prepare(`
    SELECT id, hotel_id, client_nom, numero, date_emission, date_echeance, montant_ttc, montant_paye, statut
    FROM factures WHERE id=? AND deleted_at IS NULL
  `).get(factureId) as Record<string, unknown> | undefined;
  if (!f) throw new Error('Facture introuvable.');
  if (!['validee', 'payee_partielle', 'envoyee'].includes(String(f.statut))) {
    throw new Error('Seule une facture validée impayée peut générer une créance.');
  }
  const restant = Number(f.montant_ttc) - Number(f.montant_paye);
  if (restant <= 0) throw new Error('Facture déjà soldée.');

  const existing = db.prepare(`
    SELECT id FROM global_creances WHERE source_module='facturation' AND source_entity_id=?
  `).get(factureId) as { id: number } | undefined;
  if (existing) return mapCreance(db.prepare('SELECT * FROM global_creances WHERE id=?').get(existing.id) as Record<string, unknown>);

  const echeance = f.date_echeance ? String(f.date_echeance) : String(f.date_emission);
  const jours = Math.max(0, Math.floor((Date.now() - new Date(echeance).getTime()) / 86400000));
  const risque = computeRisque(restant, jours);

  const r = db.prepare(`
    INSERT INTO global_creances (source_module, source_entity_type, source_entity_id, hotel_id, client_label, reference_piece, date_piece, date_echeance, montant_total, montant_regle, montant_restant, statut, niveau_risque)
    VALUES ('facturation', 'facture', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ouverte', ?)
  `).run(factureId, f.hotel_id, f.client_nom, f.numero, f.date_emission, echeance, f.montant_ttc, f.montant_paye, restant, risque);

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'creances', description: `Créance depuis facture ${f.numero}` });
  return mapCreance(db.prepare('SELECT * FROM global_creances WHERE id=?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function updateCreanceStatut(actorUserId: number, creanceId: number, statut: CreanceStatut): GlobalCreance {
  getDatabase().prepare(`UPDATE global_creances SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, creanceId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'creances', description: `Créance #${creanceId} → ${statut}` });
  return mapCreance(getDatabase().prepare('SELECT * FROM global_creances WHERE id=?').get(creanceId) as Record<string, unknown>);
}

export function enregistrerPaiementCreance(actorUserId: number, creanceId: number, montant: number): GlobalCreance {
  const db = getDatabase();
  const c = mapCreance(db.prepare('SELECT * FROM global_creances WHERE id=?').get(creanceId) as Record<string, unknown>);
  const regle = Math.round((c.montantRegle + montant) * 100) / 100;
  const restant = Math.max(0, Math.round((c.montantTotal - regle) * 100) / 100);
  const statut: CreanceStatut = restant <= 0 ? 'reglee' : 'partielle';
  db.prepare(`UPDATE global_creances SET montant_regle=?, montant_restant=?, statut=?, updated_at=datetime('now') WHERE id=?`).run(regle, restant, statut, creanceId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'creances', description: `Paiement ${montant} DA sur créance #${creanceId}` });
  return mapCreance(db.prepare('SELECT * FROM global_creances WHERE id=?').get(creanceId) as Record<string, unknown>);
}

export function addCreanceRelance(actorUserId: number, creanceId: number, input: { canal: string; objet?: string; contenu?: string }): CreanceRelance {
  const db = getDatabase();
  const niveauRow = db.prepare(`SELECT COALESCE(MAX(niveau),0)+1 as n FROM global_creance_relances WHERE creance_id=?`).get(creanceId) as { n: number };
  const r = db.prepare(`
    INSERT INTO global_creance_relances (creance_id, niveau, canal, objet, contenu, created_by, statut)
    VALUES (?, ?, ?, ?, ?, ?, 'preparee')
  `).run(creanceId, niveauRow.n, input.canal, input.objet ?? null, input.contenu ?? null, actorUserId);
  db.prepare(`UPDATE global_creances SET last_relance_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(creanceId);
  const row = db.prepare('SELECT * FROM global_creance_relances WHERE id=?').get(Number(r.lastInsertRowid)) as Record<string, unknown>;
  return { id: Number(row.id), creanceId, niveau: Number(row.niveau), canal: String(row.canal), statut: String(row.statut), objet: row.objet ? String(row.objet) : null, createdAt: String(row.created_at) };
}

export function getBalanceAgee(actorUserId: number, hotelId?: number): BalanceAgeeLigne[] {
  void actorUserId;
  const db = getDatabase();
  const cond = hotelId ? 'AND hotel_id = ?' : '';
  const params = hotelId ? [hotelId] : [];
  const rows = db.prepare(`
    SELECT montant_restant, date_echeance FROM global_creances
    WHERE statut IN ('ouverte','partielle') ${cond}
  `).all(...params) as { montant_restant: number; date_echeance: string | null }[];

  const tranches: Record<string, { montant: number; count: number }> = {
    '0-30': { montant: 0, count: 0 }, '31-60': { montant: 0, count: 0 },
    '61-90': { montant: 0, count: 0 }, '90+': { montant: 0, count: 0 },
  };
  const today = Date.now();
  for (const r of rows) {
    const echeance = r.date_echeance ? new Date(r.date_echeance).getTime() : today;
    const jours = Math.max(0, Math.floor((today - echeance) / 86400000));
    const key = jours <= 30 ? '0-30' : jours <= 60 ? '31-60' : jours <= 90 ? '61-90' : '90+';
    tranches[key].montant += r.montant_restant;
    tranches[key].count += 1;
  }
  return Object.entries(tranches).map(([tranche, v]) => ({ tranche, montant: Math.round(v.montant * 100) / 100, count: v.count }));
}

function getAppSetting(key: string, fallback: string): string {
  const row = getDatabase().prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function isRelancesAutomatiquesActives(): boolean {
  return getAppSetting('creances_relances_auto', '1') === '1';
}

export function setRelancesAutomatiquesActives(actorUserId: number, actif: boolean): boolean {
  getDatabase().prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('creances_relances_auto', ?, datetime('now'))`).run(actif ? '1' : '0');
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'creances', description: `Relances automatiques ${actif ? 'activées' : 'désactivées'}` });
  return actif;
}

function joursDepuisEcheance(dateEcheance: string | null): number {
  if (!dateEcheance) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateEcheance).getTime()) / 86400000));
}

/** Relances programmées : 30j téléphone, 60j email, 90j mise en demeure. */
export function runRelancesAutomatiques(actorUserId: number): { traitees: number } {
  if (!isRelancesAutomatiquesActives()) return { traitees: 0 };

  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM global_creances WHERE statut IN ('ouverte','partielle') AND montant_restant > 0
  `).all() as Record<string, unknown>[];

  let traitees = 0;
  for (const row of rows) {
    const creanceId = Number(row.id);
    const jours = joursDepuisEcheance(row.date_echeance ? String(row.date_echeance) : null);
    const canal = jours >= 90 ? 'mise_en_demeure' : jours >= 60 ? 'email' : jours >= 30 ? 'telephone' : null;
    if (!canal) continue;

    const existing = db.prepare(`
      SELECT id FROM global_creance_relances WHERE creance_id = ? AND canal = ? AND statut != 'annulee'
    `).get(creanceId, canal) as { id: number } | undefined;
    if (existing) continue;

    addCreanceRelance(actorUserId, creanceId, {
      canal,
      objet: `Relance automatique (${canal.replace('_', ' ')})`,
      contenu: `Créance impayée depuis ${jours} jours — montant restant ${Number(row.montant_restant)} DA.`,
    });
    traitees += 1;
  }

  if (traitees > 0) {
    writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'creances', description: `Relances automatiques — ${traitees} relance(s)` });
  }
  return { traitees };
}
