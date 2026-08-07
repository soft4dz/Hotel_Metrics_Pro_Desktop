/**
 * Inventaire légal annuel — stocks comptables vs physiques (obligation comptable).
 */
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { csvLine } from './rh-legal-export.util';
import { createWorkflow } from './workflow.service';
import { evaluateProcedureTrigger, resolveProcedureForEntity } from './workflow-procedure.service';

export type InventaireStatut = 'en_cours' | 'cloture' | 'valide';

export interface InventaireSession {
  id: number;
  exercice: number;
  hotelId: number;
  dateInventaire: string;
  statut: InventaireStatut;
  totalValeurComptable: number;
  totalValeurPhysique: number;
  ecartTotal: number;
  commentaire: string | null;
}

export interface InventaireLigne {
  id: number;
  sessionId: number;
  produitId: number | null;
  reference: string | null;
  designation: string;
  quantiteComptable: number;
  quantitePhysique: number;
  prixUnitaire: number;
  valeurComptable: number;
  valeurPhysique: number;
  ecartQuantite: number;
  ecartValeur: number;
  motifEcart: string | null;
}

function assertCan(actorUserId: number) {
  if (!isGlobalAdminRole(getActorContext(actorUserId).roleCode)) throw new Error('Permission refusée.');
}

function mapSession(row: Record<string, unknown>): InventaireSession {
  return {
    id: Number(row.id),
    exercice: Number(row.exercice),
    hotelId: Number(row.hotel_id),
    dateInventaire: String(row.date_inventaire),
    statut: row.statut as InventaireStatut,
    totalValeurComptable: Number(row.total_valeur_comptable),
    totalValeurPhysique: Number(row.total_valeur_physique),
    ecartTotal: Number(row.ecart_total),
    commentaire: row.commentaire ? String(row.commentaire) : null,
  };
}

function recalcSessionTotals(db: ReturnType<typeof getDatabase>, sessionId: number): void {
  const t = db.prepare(`
    SELECT COALESCE(SUM(valeur_comptable),0) as vc, COALESCE(SUM(valeur_physique),0) as vp, COALESCE(SUM(ecart_valeur),0) as ev
    FROM inventaire_legal_lignes WHERE session_id=?
  `).get(sessionId) as { vc: number; vp: number; ev: number };
  db.prepare(`
    UPDATE inventaire_legal_sessions SET total_valeur_comptable=?, total_valeur_physique=?, ecart_total=? WHERE id=?
  `).run(t.vc, t.vp, t.ev, sessionId);
}

export function listInventaireSessions(actorUserId: number, exercice?: number): InventaireSession[] {
  assertCan(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (exercice) { conds.push('exercice = ?'); params.push(exercice); }
  return (getDatabase().prepare(`SELECT * FROM inventaire_legal_sessions WHERE ${conds.join(' AND ')} ORDER BY exercice DESC, id DESC`).all(...params) as Record<string, unknown>[]).map(mapSession);
}

export function createInventaireSession(actorUserId: number, input: { exercice: number; hotelId: number; dateInventaire: string; commentaire?: string }): InventaireSession {
  assertCan(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM inventaire_legal_sessions WHERE exercice=? AND hotel_id=? AND statut='en_cours'`).get(input.exercice, input.hotelId);
  if (existing) throw new Error('Session inventaire en cours déjà ouverte pour cet exercice et cette unité.');

  const r = db.prepare(`
    INSERT INTO inventaire_legal_sessions (exercice, hotel_id, date_inventaire, responsable_user_id, commentaire)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.exercice, input.hotelId, input.dateInventaire, actorUserId, input.commentaire ?? null);
  const sessionId = Number(r.lastInsertRowid);

  const stocks = db.prepare(`
    SELECT sn.produit_id, p.code, p.designation, sn.quantite, p.prix_unitaire
    FROM stock_niveaux sn JOIN stock_produits p ON p.id = sn.produit_id
    WHERE sn.hotel_id = ? AND p.is_active = 1
  `).all(input.hotelId) as Record<string, unknown>[];

  for (const s of stocks) {
    const qte = Number(s.quantite);
    const pu = Number(s.prix_unitaire);
    const val = Math.round(qte * pu * 100) / 100;
    db.prepare(`
      INSERT INTO inventaire_legal_lignes (session_id, produit_id, reference, designation, quantite_comptable, quantite_physique, prix_unitaire, valeur_comptable, valeur_physique, ecart_quantite, ecart_valeur)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `).run(sessionId, s.produit_id, s.code, s.designation, qte, qte, pu, val, val);
  }

  recalcSessionTotals(db, sessionId);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'inventaire_legal', description: `Inventaire légal ${input.exercice} hôtel ${input.hotelId}` });
  return mapSession(db.prepare('SELECT * FROM inventaire_legal_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>);
}

export function listInventaireLignes(actorUserId: number, sessionId: number): InventaireLigne[] {
  assertCan(actorUserId);
  return (getDatabase().prepare('SELECT * FROM inventaire_legal_lignes WHERE session_id = ? ORDER BY designation').all(sessionId) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    sessionId: Number(r.session_id),
    produitId: r.produit_id ? Number(r.produit_id) : null,
    reference: r.reference ? String(r.reference) : null,
    designation: String(r.designation),
    quantiteComptable: Number(r.quantite_comptable),
    quantitePhysique: Number(r.quantite_physique),
    prixUnitaire: Number(r.prix_unitaire),
    valeurComptable: Number(r.valeur_comptable),
    valeurPhysique: Number(r.valeur_physique),
    ecartQuantite: Number(r.ecart_quantite),
    ecartValeur: Number(r.ecart_valeur),
    motifEcart: r.motif_ecart ? String(r.motif_ecart) : null,
  }));
}

export function updateInventaireLigne(actorUserId: number, ligneId: number, quantitePhysique: number, motifEcart?: string): InventaireLigne {
  assertCan(actorUserId);
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM inventaire_legal_lignes WHERE id = ?').get(ligneId) as Record<string, unknown>;
  if (!row) throw new Error('Ligne introuvable.');
  const session = mapSession(db.prepare('SELECT * FROM inventaire_legal_sessions WHERE id = ?').get(row.session_id) as Record<string, unknown>);
  if (session.statut !== 'en_cours') throw new Error('Session clôturée — modification impossible.');

  const qteC = Number(row.quantite_comptable);
  const pu = Number(row.prix_unitaire);
  const valP = Math.round(quantitePhysique * pu * 100) / 100;
  const valC = Number(row.valeur_comptable);
  const ecartQ = quantitePhysique - qteC;
  const ecartV = Math.round((valP - valC) * 100) / 100;

  db.prepare(`
    UPDATE inventaire_legal_lignes SET quantite_physique=?, valeur_physique=?, ecart_quantite=?, ecart_valeur=?, motif_ecart=? WHERE id=?
  `).run(quantitePhysique, valP, ecartQ, ecartV, motifEcart ?? null, ligneId);

  recalcSessionTotals(db, session.id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'inventaire_legal', description: `Ligne inventaire ${row.designation} mise à jour` });
  return listInventaireLignes(actorUserId, session.id).find((l) => l.id === ligneId)!;
}

export function cloturerInventaireSession(actorUserId: number, sessionId: number): InventaireSession {
  assertCan(actorUserId);
  const db = getDatabase();
  const session = mapSession(db.prepare('SELECT * FROM inventaire_legal_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>);
  if (session.statut !== 'en_cours') throw new Error('Session déjà clôturée.');

  db.prepare(`UPDATE inventaire_legal_sessions SET statut='cloture', closed_at=datetime('now') WHERE id=?`).run(sessionId);
  const fresh = mapSession(db.prepare('SELECT * FROM inventaire_legal_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>);

  if (Math.abs(fresh.ecartTotal) > 0.01) {
    const procedure = resolveProcedureForEntity('inventaire_legal', 'session', fresh.hotelId);
    if (!procedure || evaluateProcedureTrigger(procedure, { ecartAmount: fresh.ecartTotal })) {
      createWorkflow(actorUserId, {
        module: 'inventaire_legal',
        entityType: 'session',
        entityId: sessionId,
        priorite: 'normale',
        commentaire: `Écart inventaire légal ${fresh.ecartTotal.toFixed(2)} DA — exercice ${fresh.exercice}`,
        hotelId: fresh.hotelId,
      });
    }
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'inventaire_legal', description: `Inventaire légal clôturé #${sessionId}` });
  return fresh;
}

export function exportInventaireLegalCsv(actorUserId: number, sessionId: number): string {
  assertCan(actorUserId);
  const session = mapSession(getDatabase().prepare('SELECT * FROM inventaire_legal_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>);
  const lignes = listInventaireLignes(actorUserId, sessionId);
  const lines = [
    csvLine(['Exercice', 'Unité', 'Date inventaire', 'Réf', 'Désignation', 'Qté comptable', 'Qté physique', 'Valeur comptable', 'Valeur physique', 'Écart valeur', 'Motif']),
    ...lignes.map((l) => csvLine([session.exercice, session.hotelId, session.dateInventaire, l.reference ?? '', l.designation, l.quantiteComptable, l.quantitePhysique, l.valeurComptable.toFixed(2), l.valeurPhysique.toFixed(2), l.ecartValeur.toFixed(2), l.motifEcart ?? ''])),
    csvLine(['TOTAL', '', '', '', '', '', '', session.totalValeurComptable.toFixed(2), session.totalValeurPhysique.toFixed(2), session.ecartTotal.toFixed(2), '']),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'inventaire_legal', description: `Export inventaire légal #${sessionId}` });
  return lines.join('\n');
}

export function getModulesLegauxDashboard(actorUserId: number): {
  immobilisationsActives: number;
  amortissementsPrevus: number;
  casnosAffiliesActifs: number;
  casnosDeclarationsEnAttente: number;
  inventairesEnCours: number;
  inventairesEcarts: number;
} {
  assertCan(actorUserId);
  const db = getDatabase();
  const immo = db.prepare(`SELECT COUNT(*) as n FROM immobilisations WHERE statut='actif'`).get() as { n: number };
  const amort = db.prepare(`SELECT COUNT(*) as n FROM immobilisations_amortissements WHERE statut='prevu'`).get() as { n: number };
  const casnos = db.prepare(`SELECT COUNT(*) as n FROM casnos_affilies WHERE actif=1`).get() as { n: number };
  const casnosDecl = db.prepare(`SELECT COUNT(*) as n FROM casnos_declarations WHERE statut IN ('brouillon','calculee')`).get() as { n: number };
  const invCours = db.prepare(`SELECT COUNT(*) as n FROM inventaire_legal_sessions WHERE statut='en_cours'`).get() as { n: number };
  const invEcart = db.prepare(`SELECT COUNT(*) as n FROM inventaire_legal_sessions WHERE ABS(ecart_total) > 0.01 AND statut != 'valide'`).get() as { n: number };
  return {
    immobilisationsActives: Number(immo.n),
    amortissementsPrevus: Number(amort.n),
    casnosAffiliesActifs: Number(casnos.n),
    casnosDeclarationsEnAttente: Number(casnosDecl.n),
    inventairesEnCours: Number(invCours.n),
    inventairesEcarts: Number(invEcart.n),
  };
}
