import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, applyActorHotelFilter, isGlobalAdminRole } from './actorContext';
import { getOccupationKpis } from './hebergement.service';
import { upsertTarif } from './tarifs.service';
import type {
  YieldRule, CreateYieldRuleInput, UpdateYieldRuleInput,
  ComputeYieldSuggestionsInput, YieldSuggestion, ApplyYieldSuggestionsInput,
} from '../../src/shared/types/yield';

function checkHotelAccess(actor: ReturnType<typeof getActorContext>, hotelId: number) {
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }
}

function mapRule(r: any): YieldRule {
  return {
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    typeChambreId: r.type_chambre_id, typeChambreLabel: r.type_chambre_label,
    nom: r.nom,
    occupationMin: r.occupation_min, occupationMax: r.occupation_max,
    joursAvantMax: r.jours_avant_max,
    ajustementType: r.ajustement_type, ajustementValeur: r.ajustement_valeur,
    priorite: r.priorite, actif: r.actif === 1, createdAt: r.created_at,
  };
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ── Règles ────────────────────────────────────────────────────────────────────

export function listYieldRules(actorUserId: number, hotelId?: number): YieldRule[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'yr' });
  if (hotelId) { conditions.push('yr.hotel_id = ?'); params.push(hotelId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT yr.*, h.name as hotel_name, tc.label as type_chambre_label
    FROM yield_rules yr
    INNER JOIN hotels h ON h.id = yr.hotel_id
    LEFT JOIN types_chambres tc ON tc.id = yr.type_chambre_id
    ${where}
    ORDER BY h.name, yr.priorite DESC, yr.nom
  `).all(...params) as any[];
  return rows.map(mapRule);
}

export function createYieldRule(actorUserId: number, input: CreateYieldRuleInput): YieldRule {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  if (input.occupationMin != null && input.occupationMax != null && input.occupationMin > input.occupationMax) {
    throw new Error('Occupation min doit être inférieure ou égale à occupation max.');
  }
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO yield_rules
      (hotel_id, type_chambre_id, nom, occupation_min, occupation_max, jours_avant_max,
       ajustement_type, ajustement_valeur, priorite)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(
    input.hotelId, input.typeChambreId ?? null, input.nom,
    input.occupationMin ?? null, input.occupationMax ?? null, input.joursAvantMax ?? null,
    input.ajustementType, input.ajustementValeur, input.priorite ?? 10,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Règle de yield "${input.nom}" créée` });
  return listYieldRules(actorUserId, input.hotelId).find((r) => r.id === Number(result.lastInsertRowid))!;
}

export function updateYieldRule(actorUserId: number, id: number, input: UpdateYieldRuleInput): YieldRule {
  const db = getDatabase();
  const existing = db.prepare(`SELECT * FROM yield_rules WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) throw new Error('Règle introuvable.');
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, existing.hotel_id as number);

  const occupationMin = input.occupationMin !== undefined ? input.occupationMin : (existing.occupation_min as number | null);
  const occupationMax = input.occupationMax !== undefined ? input.occupationMax : (existing.occupation_max as number | null);
  if (occupationMin != null && occupationMax != null && occupationMin > occupationMax) {
    throw new Error('Occupation min doit être inférieure ou égale à occupation max.');
  }

  db.prepare(`
    UPDATE yield_rules SET
      type_chambre_id = ?, nom = ?, occupation_min = ?, occupation_max = ?, jours_avant_max = ?,
      ajustement_type = ?, ajustement_valeur = ?, priorite = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.typeChambreId !== undefined ? input.typeChambreId : (existing.type_chambre_id as number | null),
    input.nom ?? (existing.nom as string),
    occupationMin, occupationMax,
    input.joursAvantMax !== undefined ? input.joursAvantMax : (existing.jours_avant_max as number | null),
    input.ajustementType ?? (existing.ajustement_type as string),
    input.ajustementValeur !== undefined ? input.ajustementValeur : (existing.ajustement_valeur as number),
    input.priorite !== undefined ? input.priorite : (existing.priorite as number),
    id,
  );
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'tarifs', description: `Règle de yield ${id} modifiée` });
  return listYieldRules(actorUserId, existing.hotel_id as number).find((r) => r.id === id)!;
}

export function toggleYieldRule(actorUserId: number, id: number, actif: boolean): boolean {
  const db = getDatabase();
  db.prepare(`UPDATE yield_rules SET actif = ?, updated_at = datetime('now') WHERE id = ?`).run(actif ? 1 : 0, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'tarifs', description: `Règle de yield ${id} ${actif ? 'activée' : 'désactivée'}` });
  return true;
}

export function deleteYieldRule(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  db.prepare(`DELETE FROM yield_rules WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Règle de yield ${id} supprimée` });
  return true;
}

// ── Suggestions ───────────────────────────────────────────────────────────────

interface MatchableRule {
  id: number; nom: string; typeChambreId: number | null;
  occupationMin: number | null; occupationMax: number | null; joursAvantMax: number | null;
  ajustementType: 'POURCENTAGE' | 'MONTANT_FIXE'; ajustementValeur: number; priorite: number;
}

function findMatchingRule(
  rules: MatchableRule[], typeChambreId: number, occupationPct: number, joursAvant: number,
): MatchableRule | null {
  const candidates = rules.filter((r) => {
    if (r.typeChambreId != null && r.typeChambreId !== typeChambreId) return false;
    if (r.occupationMin != null && occupationPct < r.occupationMin) return false;
    if (r.occupationMax != null && occupationPct > r.occupationMax) return false;
    if (r.joursAvantMax != null && joursAvant > r.joursAvantMax) return false;
    return true;
  });
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.priorite - a.priorite)[0];
}

export function computeYieldSuggestions(actorUserId: number, input: ComputeYieldSuggestionsInput): YieldSuggestion[] {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();

  const rules = listYieldRules(actorUserId, input.hotelId)
    .filter((r) => r.actif)
    .map((r): MatchableRule => ({
      id: r.id, nom: r.nom, typeChambreId: r.typeChambreId,
      occupationMin: r.occupationMin, occupationMax: r.occupationMax, joursAvantMax: r.joursAvantMax,
      ajustementType: r.ajustementType, ajustementValeur: r.ajustementValeur, priorite: r.priorite,
    }));
  if (!rules.length) return [];

  const types = (db.prepare(`
    SELECT id, label, tarif_base FROM types_chambres
    WHERE hotel_id = ? AND actif = 1 ${input.typeChambreId ? 'AND id = ?' : ''}
  `).all(...(input.typeChambreId ? [input.hotelId, input.typeChambreId] : [input.hotelId])) as
    { id: number; label: string; tarif_base: number }[]);
  if (!types.length) return [];

  const today = new Date().toISOString().slice(0, 10);
  const suggestions: YieldSuggestion[] = [];

  for (const date of dateRange(input.dateDebut, input.dateFin)) {
    const occupation = getOccupationKpis(actorUserId, date, addDays(date, 1), input.hotelId);
    const occupationPct = occupation.hotels[0]?.tauxOccupation ?? 0;
    const joursAvant = Math.max(0, diffDays(today, date));

    for (const tc of types) {
      const rule = findMatchingRule(rules, tc.id, occupationPct, joursAvant);
      if (!rule) continue;

      const existing = db.prepare(`
        SELECT prix_base FROM tarifs_journaliers
        WHERE hotel_id = ? AND type_chambre_id = ? AND plan_id = ? AND date_application = ?
          ${input.formuleId ? 'AND formule_id = ?' : 'AND formule_id IS NULL'}
      `).get(...([input.hotelId, tc.id, input.planId, date, ...(input.formuleId ? [input.formuleId] : [])])) as
        { prix_base: number } | undefined;

      const prixActuel = existing?.prix_base ?? tc.tarif_base ?? 0;
      const prixBrut = rule.ajustementType === 'POURCENTAGE'
        ? prixActuel * (1 + rule.ajustementValeur / 100)
        : prixActuel + rule.ajustementValeur;
      const prixSuggere = Math.max(0, Math.round(prixBrut * 100) / 100);

      if (prixSuggere === prixActuel) continue;

      suggestions.push({
        hotelId: input.hotelId, typeChambreId: tc.id, typeChambreLabel: tc.label,
        planId: input.planId, formuleId: input.formuleId ?? null,
        dateApplication: date, occupationPct,
        prixActuel, prixSuggere,
        ruleId: rule.id, ruleNom: rule.nom,
      });
    }
  }

  return suggestions;
}

export function applyYieldSuggestions(actorUserId: number, input: ApplyYieldSuggestionsInput): number {
  const db = getDatabase();
  let count = 0;
  for (const s of input.suggestions) {
    const existing = db.prepare(`
      SELECT * FROM tarifs_journaliers
      WHERE hotel_id = ? AND type_chambre_id = ? AND plan_id = ? AND date_application = ?
        ${s.formuleId ? 'AND formule_id = ?' : 'AND formule_id IS NULL'}
    `).get(...([s.hotelId, s.typeChambreId, s.planId, s.dateApplication, ...(s.formuleId ? [s.formuleId] : [])])) as
      Record<string, unknown> | undefined;

    upsertTarif(actorUserId, {
      hotelId: s.hotelId, typeChambreId: s.typeChambreId, planId: s.planId,
      formuleId: s.formuleId ?? undefined, dateApplication: s.dateApplication,
      prixBase: s.prixSuggere,
      prixPersonneSupp: existing ? (existing.prix_personne_supp as number) : undefined,
      minSejour: existing ? (existing.min_sejour as number) : undefined,
      maxSejour: existing ? (existing.max_sejour as number | null) ?? undefined : undefined,
      fermetureVente: existing ? existing.fermeture_vente === 1 : undefined,
      restrictionArrivee: existing ? (existing.restriction_arrivee as 'AUCUNE' | 'CDA') : undefined,
      restrictionDepart: existing ? (existing.restriction_depart as 'AUCUNE' | 'CDD') : undefined,
    });
    count++;
  }
  writeAuditLog({
    userId: actorUserId, action: 'UPDATE', module: 'tarifs',
    description: `${count} tarif(s) ajusté(s) via yield management`,
  });
  return count;
}
