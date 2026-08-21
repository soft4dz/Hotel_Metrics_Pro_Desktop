import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, applyActorHotelFilter, isGlobalAdminRole } from './actorContext';
import { simulerPrix } from './tarifs.service';
import { createFacture } from './facturation.service';
import { createFichePoliceFromReservation, checkoutFichePolice, calculerTaxeSejour } from './hotel-legal.service';
import { syncHebergementCaFromErp } from './recettes-auto-sync.service';
import { createTacheFromDepart, ensureTacheForChambreMenage, cancelOpenTachesForChambre } from './housekeeping.service';
import type {
  TypeChambre, Chambre, Reservation, OccupationKpis, OccupationPeriode,
  CreateTypeChambreInput, CreateChambreInput, CreateReservationInput,
  EstimateReservationPriceInput,
  StatutChambre, StatutReservation,
} from '../../src/shared/types/hebergement';

// ── Helpers ───────────────────────────────────────────────────────────────────

function diffNuits(dateArrivee: string, dateDepart: string): number {
  const a = new Date(dateArrivee).getTime();
  const d = new Date(dateDepart).getTime();
  return Math.max(1, Math.round((d - a) / 86_400_000));
}

export function estimateReservationPrice(actorUserId: number, input: EstimateReservationPriceInput): number {
  const db = getDatabase();
  let typeChambreId = input.typeChambreId;
  if (!typeChambreId && input.chambreId) {
    const ch = db.prepare(`SELECT type_chambre_id FROM chambres WHERE id = ?`).get(input.chambreId) as { type_chambre_id: number | null } | undefined;
    typeChambreId = ch?.type_chambre_id ?? undefined;
  }
  if (!typeChambreId) {
    const tc = db.prepare(`SELECT id, tarif_base FROM types_chambres WHERE hotel_id = ? AND actif = 1 ORDER BY id LIMIT 1`).get(input.hotelId) as { id: number; tarif_base: number } | undefined;
    if (!tc) return 0;
    return Math.round(tc.tarif_base * diffNuits(input.dateArrivee, input.dateDepart) * 100) / 100;
  }

  let planId = input.planId;
  if (!planId) {
    const plan = db.prepare(`SELECT id FROM plans_tarifaires WHERE hotel_id = ? AND actif = 1 ORDER BY id LIMIT 1`).get(input.hotelId) as { id: number } | undefined;
    planId = plan?.id;
  }
  if (!planId) {
    const tc = db.prepare(`SELECT tarif_base FROM types_chambres WHERE id = ?`).get(typeChambreId) as { tarif_base: number };
    return Math.round(tc.tarif_base * diffNuits(input.dateArrivee, input.dateDepart) * 100) / 100;
  }

  const result = simulerPrix(actorUserId, {
    hotelId: input.hotelId,
    typeChambreId,
    planId,
    formuleId: input.formuleId ?? undefined,
    dateArrivee: input.dateArrivee,
    dateDepart: input.dateDepart,
    nbAdultes: input.nbAdultes ?? 1,
    nbEnfants: input.nbEnfants ?? 0,
    clientId: input.clientId ?? undefined,
  });
  return result.prixTotal;
}

function resolveClientFields(db: ReturnType<typeof getDatabase>, clientId?: number | null) {
  if (!clientId) return null;
  return db.prepare(`
    SELECT nom, prenom, raison_sociale, type, email, telephone, mobile
    FROM clients_facturation WHERE id = ? AND deleted_at IS NULL
  `).get(clientId) as Record<string, unknown> | undefined;
}

// ── Types de chambres ─────────────────────────────────────────────────────────

export function listTypesChambre(actorUserId: number, hotelId?: number): TypeChambre[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conditions: string[] = ['tc.actif = 1'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'tc' });
  if (hotelId) { conditions.push('tc.hotel_id = ?'); params.push(hotelId); }

  const rows = db.prepare(`
    SELECT tc.*, h.name as hotel_name
    FROM types_chambres tc
    INNER JOIN hotels h ON h.id = tc.hotel_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY h.name, tc.label
  `).all(...params) as any[];

  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    code: r.code, label: r.label, capacite: r.capacite,
    tarifBase: r.tarif_base, description: r.description,
    actif: r.actif === 1, createdAt: r.created_at,
  }));
}

export function createTypeChambre(actorUserId: number, input: CreateTypeChambreInput): TypeChambre {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(input.hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO types_chambres (hotel_id, code, label, capacite, tarif_base, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.hotelId, input.code, input.label, input.capacite ?? 2, input.tarifBase ?? 0, input.description ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hebergement', description: `Type chambre "${input.label}" créé` });
  return listTypesChambre(actorUserId).find((t) => t.id === Number(result.lastInsertRowid))!;
}

export function deleteTypeChambre(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const hasChambres = db.prepare(
    `SELECT COUNT(*) as cnt FROM chambres WHERE type_chambre_id=? AND actif=1`
  ).get(id) as { cnt: number };
  if (hasChambres.cnt > 0) throw new Error('Ce type est utilisé par des chambres actives.');
  db.prepare(`UPDATE types_chambres SET actif=0, updated_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'hebergement', description: `Type chambre ${id} désactivé` });
  return true;
}

// ── Chambres ──────────────────────────────────────────────────────────────────

export function listChambres(actorUserId: number, hotelId?: number, statut?: StatutChambre): Chambre[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conditions: string[] = ['c.actif = 1'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'c' });
  if (hotelId) { conditions.push('c.hotel_id = ?'); params.push(hotelId); }
  if (statut)  { conditions.push('c.statut = ?');   params.push(statut); }

  const rows = db.prepare(`
    SELECT c.*, h.name as hotel_name, tc.label as type_label
    FROM chambres c
    INNER JOIN hotels h ON h.id = c.hotel_id
    LEFT JOIN types_chambres tc ON tc.id = c.type_chambre_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY h.name, c.etage, c.numero
  `).all(...params) as any[];

  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    typeChambreId: r.type_chambre_id, typeChambreLabel: r.type_label,
    numero: r.numero, etage: r.etage, statut: r.statut as StatutChambre,
    description: r.description, actif: r.actif === 1, createdAt: r.created_at,
  }));
}

export function createChambre(actorUserId: number, input: CreateChambreInput): Chambre {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(input.hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO chambres (hotel_id, type_chambre_id, numero, etage, statut, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.hotelId, input.typeChambreId ?? null, input.numero,
    input.etage ?? 0, input.statut ?? 'libre', input.description ?? null,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hebergement', description: `Chambre ${input.numero} créée` });
  return listChambres(actorUserId).find((c) => c.id === Number(result.lastInsertRowid))!;
}

export function updateStatutChambre(actorUserId: number, id: number, statut: StatutChambre): Chambre {
  const db = getDatabase();
  const before = db.prepare(`SELECT statut FROM chambres WHERE id = ?`).get(id) as { statut: StatutChambre } | undefined;

  db.prepare(`UPDATE chambres SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, id);

  if (statut === 'menage') {
    try {
      ensureTacheForChambreMenage(actorUserId, id);
    } catch {
      /* tâche déjà ouverte ou module non initialisé */
    }
  } else if (before?.statut === 'menage') {
    try {
      cancelOpenTachesForChambre(actorUserId, id);
    } catch {
      /* ignore */
    }
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Chambre ${id} → ${statut}` });
  return listChambres(actorUserId).find((c) => c.id === id)!;
}

export function updateChambre(actorUserId: number, id: number, input: Partial<CreateChambreInput>): Chambre {
  const db = getDatabase();
  const before = input.statut !== undefined
    ? (db.prepare(`SELECT statut FROM chambres WHERE id = ?`).get(id) as { statut: StatutChambre } | undefined)
    : undefined;
  const sets: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];
  if (input.typeChambreId !== undefined) { sets.push('type_chambre_id = ?'); params.push(input.typeChambreId ?? null); }
  if (input.numero !== undefined)        { sets.push('numero = ?');           params.push(input.numero); }
  if (input.etage !== undefined)         { sets.push('etage = ?');            params.push(input.etage); }
  if (input.statut !== undefined)        { sets.push('statut = ?');           params.push(input.statut); }
  if (input.description !== undefined)   { sets.push('description = ?');      params.push(input.description ?? null); }
  params.push(id);
  db.prepare(`UPDATE chambres SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  if (input.statut === 'menage') {
    try { ensureTacheForChambreMenage(actorUserId, id); } catch { /* ignore */ }
  } else if (before?.statut === 'menage' && input.statut !== undefined) {
    try { cancelOpenTachesForChambre(actorUserId, id); } catch { /* ignore */ }
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Chambre ${id} modifiée` });
  return listChambres(actorUserId).find((c) => c.id === id)!;
}

export function deleteChambre(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const hasActive = db.prepare(
    `SELECT COUNT(*) as cnt FROM reservations WHERE chambre_id=? AND deleted_at IS NULL AND statut NOT IN ('annulee','depart','no_show')`
  ).get(id) as { cnt: number };
  if (hasActive.cnt > 0) throw new Error('Chambre occupée par une réservation active.');
  db.prepare(`UPDATE chambres SET actif=0, updated_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'hebergement', description: `Chambre ${id} désactivée` });
  return true;
}

// ── Réservations ──────────────────────────────────────────────────────────────

export function listReservations(
  actorUserId: number,
  hotelId?: number,
  dateDebut?: string,
  dateFin?: string,
  statut?: StatutReservation,
): Reservation[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conditions: string[] = ['r.deleted_at IS NULL'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'r' });
  if (hotelId)   { conditions.push('r.hotel_id = ?');              params.push(hotelId); }
  if (dateDebut) { conditions.push('r.date_depart >= ?');          params.push(dateDebut); }
  if (dateFin)   { conditions.push('r.date_arrivee <= ?');         params.push(dateFin); }
  if (statut)    { conditions.push('r.statut = ?');                params.push(statut); }

  const rows = db.prepare(`
    SELECT r.*, h.name as hotel_name, c.numero as chambre_numero, tc.label as type_label
    FROM reservations r
    INNER JOIN hotels h ON h.id = r.hotel_id
    LEFT JOIN chambres c ON c.id = r.chambre_id
    LEFT JOIN types_chambres tc ON tc.id = c.type_chambre_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.date_arrivee DESC
  `).all(...params) as any[];

  return rows.map(mapReservation);
}

export function getReservation(actorUserId: number, id: number): Reservation {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT r.*, h.name as hotel_name, c.numero as chambre_numero, tc.label as type_label
    FROM reservations r
    INNER JOIN hotels h ON h.id = r.hotel_id
    LEFT JOIN chambres c ON c.id = r.chambre_id
    LEFT JOIN types_chambres tc ON tc.id = c.type_chambre_id
    WHERE r.id = ? AND r.deleted_at IS NULL
  `).get(id) as any;
  if (!row) throw new Error(`Réservation ${id} introuvable.`);
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(Number(row.hotel_id))) {
    throw new Error('Accès hôtel refusé.');
  }
  return mapReservation(row);
}

export function createReservation(actorUserId: number, input: CreateReservationInput): Reservation {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(input.hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }

  const db = getDatabase();

  // Vérif disponibilité chambre
  if (input.chambreId) {
    const conflict = db.prepare(`
      SELECT COUNT(*) as cnt FROM reservations
      WHERE chambre_id = ? AND deleted_at IS NULL
        AND statut NOT IN ('annulee','no_show')
        AND date_arrivee < ? AND date_depart > ?
    `).get(input.chambreId, input.dateDepart, input.dateArrivee) as { cnt: number };
    if (conflict.cnt > 0 && !input.surbookingAutorise) throw new Error('Chambre déjà occupée sur cette période.');
    if (conflict.cnt > 0 && input.surbookingAutorise && !input.surbookingMotif?.trim()) {
      throw new Error('Le motif du surbooking autorisé est obligatoire.');
    }
  }

  let clientNom = input.clientNom ?? '';
  let clientPrenom = input.clientPrenom ?? null;
  let clientEmail = input.clientEmail ?? null;
  let clientTelephone = input.clientTelephone ?? null;

  if (input.clientId) {
    const c = resolveClientFields(db, input.clientId);
    if (!c) throw new Error('Client introuvable.');
    if (c.type === 'entreprise' && c.raison_sociale) {
      clientNom = String(c.raison_sociale);
      clientPrenom = null;
    } else {
      clientNom = String(c.nom ?? c.raison_sociale ?? '');
      clientPrenom = c.prenom ? String(c.prenom) : null;
    }
    clientEmail = input.clientEmail ?? (c.email ? String(c.email) : null);
    clientTelephone = input.clientTelephone ?? (c.telephone ?? c.mobile ? String(c.telephone ?? c.mobile) : null);
  }

  if (!clientNom.trim()) throw new Error('Nom client requis.');

  const nbNuits = diffNuits(input.dateArrivee, input.dateDepart);
  const montantTotal = input.montantTotal ?? estimateReservationPrice(actorUserId, {
    hotelId: input.hotelId,
    chambreId: input.chambreId,
    planId: input.planId,
    formuleId: input.formuleId,
    dateArrivee: input.dateArrivee,
    dateDepart: input.dateDepart,
    nbAdultes: input.nbAdultes,
    nbEnfants: input.nbEnfants,
    clientId: input.clientId,
  });

  const result = db.prepare(`
    INSERT INTO reservations
      (hotel_id, chambre_id, client_id, plan_id, formule_id,
       date_arrivee, date_depart, nb_nuits,
       nb_adultes, nb_enfants, client_nom, client_prenom,
       client_email, client_telephone, montant_total, statut, source, notes, created_by,
       surbooking_autorise, surbooking_motif, politique_annulation_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    input.hotelId, input.chambreId ?? null,
    input.clientId ?? null, input.planId ?? null, input.formuleId ?? null,
    input.dateArrivee, input.dateDepart, nbNuits,
    input.nbAdultes ?? 1, input.nbEnfants ?? 0,
    clientNom.trim(), clientPrenom,
    clientEmail, clientTelephone,
    montantTotal,
    input.statut ?? 'confirmee', input.source ?? 'direct',
    input.notes ?? null, actorUserId,
    input.surbookingAutorise ? 1 : 0, input.surbookingMotif?.trim() || null,
    input.politiqueAnnulationId ?? null,
  );

  // Marquer la chambre occupée si arrivée aujourd'hui
  if (input.chambreId && input.statut === 'arrivee') {
    db.prepare(`UPDATE chambres SET statut='occupee', updated_at=datetime('now') WHERE id=?`).run(input.chambreId);
  }

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hebergement', description: `Réservation ${clientNom} du ${input.dateArrivee} créée` });
  return getReservation(actorUserId, Number(result.lastInsertRowid));
}

export function createFactureFromReservation(actorUserId: number, reservationId: number) {
  const res = getReservation(actorUserId, reservationId);
  if (res.factureId) throw new Error('Une facture existe déjà pour cette réservation.');
  if (res.montantTotal <= 0) throw new Error('Montant de réservation invalide.');

  const prixUnitaire = res.nbNuits > 0
    ? Math.round((res.montantTotal / res.nbNuits) * 100) / 100
    : res.montantTotal;
  const chambreLabel = res.chambreNumero ? `ch. ${res.chambreNumero}` : 'hébergement';
  const clientLabel = res.clientPrenom ? `${res.clientNom} ${res.clientPrenom}` : res.clientNom;

  const facture = createFacture(actorUserId, {
    hotelId: res.hotelId,
    clientId: res.clientId ?? undefined,
    clientNom: res.clientId ? undefined : clientLabel,
    dateEmission: res.dateArrivee,
    notes: `Réservation #${res.id}`,
    lignes: [{
      designation: `Séjour ${chambreLabel} (${res.dateArrivee} → ${res.dateDepart})`,
      quantite: res.nbNuits,
      prixUnitaire,
      tauxTva: 19,
    }],
  });

  const db = getDatabase();
  db.prepare(`UPDATE factures SET reservation_id = ? WHERE id = ?`).run(reservationId, facture.id);
  db.prepare(`UPDATE reservations SET facture_id = ?, updated_at = datetime('now') WHERE id = ?`).run(facture.id, reservationId);

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'hebergement',
    description: `Facture ${facture.numero} générée depuis réservation #${reservationId}`,
  });
  return facture;
}

export function updateReservationStatut(actorUserId: number, id: number, statut: StatutReservation): Reservation {
  const db = getDatabase();
  const res = getReservation(actorUserId, id);

  // Une arrivée ne doit jamais être validée sans registre hôtelier. La fiche est
  // créée avant le changement de statut afin qu'une erreur légale bloque le
  // check-in au lieu d'être masquée et de laisser une réservation partiellement traitée.
  if (statut === 'arrivee') {
    createFichePoliceFromReservation(actorUserId, id);
  }
  if (statut === 'depart') {
    const fiche = db.prepare(`SELECT id FROM fiche_police WHERE reservation_id=? LIMIT 1`).get(id) as { id: number } | undefined;
    const ficheId = fiche?.id ?? createFichePoliceFromReservation(actorUserId, id).id;
    checkoutFichePolice(actorUserId, ficheId, res.dateDepart);
  }

  db.prepare(`UPDATE reservations SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, id);

  // Sync statut chambre
  if (res.chambreId) {
    const newStatutChambre: StatutChambre =
      statut === 'arrivee'  ? 'occupee' :
      statut === 'depart'   ? 'menage'  :
      statut === 'annulee'  ? 'libre'   : 'libre';
    db.prepare(`UPDATE chambres SET statut=?, updated_at=datetime('now') WHERE id=?`).run(newStatutChambre, res.chambreId);
  }

  if (statut === 'arrivee') {
    try { createFolioFromReservation(actorUserId, id); } catch { /* folio existant */ }
  }
  if (statut === 'depart') {
    try {
      if (res.chambreId) createTacheFromDepart(actorUserId, res.hotelId, res.chambreId, id);
    } catch { /* tâche déjà ouverte */ }
    try {
      const periode = res.dateDepart.slice(0, 7);
      calculerTaxeSejour(actorUserId, res.hotelId, periode);
    } catch { /* ignore */ }
    try { closeFolio(actorUserId, id); } catch { /* pas de folio */ }
    try { syncHebergementCaFromErp(actorUserId, res.hotelId, res.dateDepart); } catch { /* sync CA */ }
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Réservation ${id} → ${statut}` });
  return getReservation(actorUserId, id);
}

export function deleteReservation(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const res = getReservation(actorUserId, id);
  if (['arrivee'].includes(res.statut)) throw new Error('Impossible de supprimer une réservation en cours.');
  db.prepare(`UPDATE reservations SET deleted_at=datetime('now') WHERE id=?`).run(id);
  if (res.chambreId) {
    db.prepare(`UPDATE chambres SET statut='libre', updated_at=datetime('now') WHERE id=?`).run(res.chambreId);
  }
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'hebergement', description: `Réservation ${id} supprimée` });
  return true;
}

// ── KPIs Occupation ───────────────────────────────────────────────────────────

export function getOccupationKpis(
  actorUserId: number,
  dateDebut: string,
  dateFin: string,
  hotelId?: number,
): OccupationPeriode {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const hotelConditions: string[] = ['h.active = 1'];
  const hotelParams: unknown[] = [];
  applyActorHotelFilter(actor, hotelConditions, hotelParams, { column: 'id', alias: 'h' });
  if (hotelId) { hotelConditions.push('h.id = ?'); hotelParams.push(hotelId); }

  const hotels = db.prepare(`
    SELECT h.id, h.name FROM hotels h WHERE ${hotelConditions.join(' AND ')}
  `).all(...hotelParams) as { id: number; name: string }[];

  const kpis: OccupationKpis[] = hotels.map((h) => {
    const totalChambres = (db.prepare(
      `SELECT COUNT(*) as cnt FROM chambres WHERE hotel_id=? AND actif=1`
    ).get(h.id) as { cnt: number }).cnt;

    const horsService = (db.prepare(
      `SELECT COUNT(*) as cnt FROM chambres WHERE hotel_id=? AND actif=1 AND statut='hors_service'`
    ).get(h.id) as { cnt: number }).cnt;

    const disponibles = totalChambres - horsService;

    // Nuitées occupées sur la période
    const nuitees = db.prepare(`
      SELECT COUNT(*) as cnt FROM reservations
      WHERE hotel_id=? AND deleted_at IS NULL
        AND statut NOT IN ('annulee','no_show','provisoire')
        AND date_arrivee < ? AND date_depart > ?
    `).get(h.id, dateFin, dateDebut) as { cnt: number };

    // Revenu sur la période
    const revenu = db.prepare(`
      SELECT COALESCE(SUM(montant_total),0) as total FROM reservations
      WHERE hotel_id=? AND deleted_at IS NULL
        AND statut NOT IN ('annulee','no_show')
        AND date_arrivee >= ? AND date_arrivee < ?
    `).get(h.id, dateDebut, dateFin) as { total: number };

    const arrivees = (db.prepare(`
      SELECT COUNT(*) as cnt FROM reservations
      WHERE hotel_id=? AND deleted_at IS NULL AND date_arrivee BETWEEN ? AND ?
        AND statut NOT IN ('annulee','no_show')
    `).get(h.id, dateDebut, dateFin) as { cnt: number }).cnt;

    const departs = (db.prepare(`
      SELECT COUNT(*) as cnt FROM reservations
      WHERE hotel_id=? AND deleted_at IS NULL AND date_depart BETWEEN ? AND ?
        AND statut NOT IN ('annulee','no_show')
    `).get(h.id, dateDebut, dateFin) as { cnt: number }).cnt;

    const nbJours = diffNuits(dateDebut, dateFin) || 1;
    const chambresDispo = disponibles * nbJours;
    const to = chambresDispo > 0 ? (nuitees.cnt / chambresDispo) * 100 : 0;
    const adr = nuitees.cnt > 0 ? revenu.total / nuitees.cnt : 0;
    const revpar = chambresDispo > 0 ? revenu.total / chambresDispo : 0;

    return {
      hotelId: h.id, hotelName: h.name, date: dateDebut,
      totalChambres, chambresDisponibles: disponibles,
      chambresOccupees: nuitees.cnt, chambresHorsService: horsService,
      tauxOccupation: Math.round(to * 10) / 10,
      adr: Math.round(adr * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
      arrivees, departs, nbNuiteesVendues: nuitees.cnt,
    };
  });

  const totalChambres = kpis.reduce((s, k) => s + k.totalChambres, 0);
  const totalRevenu   = kpis.reduce((s, k) => s + k.revpar * k.chambresDisponibles, 0);
  const avgTo   = kpis.length ? kpis.reduce((s, k) => s + k.tauxOccupation, 0) / kpis.length : 0;
  const avgAdr  = kpis.length ? kpis.reduce((s, k) => s + k.adr, 0) / kpis.length : 0;
  const avgRevpar = kpis.length ? kpis.reduce((s, k) => s + k.revpar, 0) / kpis.length : 0;

  return {
    dateDebut, dateFin, hotels: kpis,
    totalChambres,
    tauxOccupationMoyen: Math.round(avgTo * 10) / 10,
    revparMoyen: Math.round(avgRevpar * 100) / 100,
    adrMoyen: Math.round(avgAdr * 100) / 100,
    totalRevenu: Math.round(totalRevenu * 100) / 100,
  };
}

// ── Folios client ─────────────────────────────────────────────────────────────

export interface FolioLigne {
  id: number;
  folioId: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTva: number;
  montantHt: number;
  montantTtc: number;
  categorie: string;
  ordre: number;
}

export interface HebergementFolio {
  id: number;
  reservationId: number;
  hotelId: number;
  statut: 'ouvert' | 'clos' | 'facture';
  totalHt: number;
  totalTtc: number;
  factureId: number | null;
  lignes: FolioLigne[];
}

function mapFolioLigne(row: Record<string, unknown>): FolioLigne {
  return {
    id: Number(row.id),
    folioId: Number(row.folio_id),
    designation: String(row.designation),
    quantite: Number(row.quantite),
    prixUnitaire: Number(row.prix_unitaire),
    tauxTva: Number(row.taux_tva),
    montantHt: Number(row.montant_ht),
    montantTtc: Number(row.montant_ttc),
    categorie: String(row.categorie),
    ordre: Number(row.ordre),
  };
}

function recalcFolioTotals(db: ReturnType<typeof getDatabase>, folioId: number): void {
  const totals = db.prepare(`
    SELECT COALESCE(SUM(montant_ht),0) AS ht, COALESCE(SUM(montant_ttc),0) AS ttc
    FROM hebergement_folio_lignes WHERE folio_id = ?
  `).get(folioId) as { ht: number; ttc: number };
  db.prepare(`UPDATE hebergement_folios SET total_ht=?, total_ttc=?, updated_at=datetime('now') WHERE id=?`).run(totals.ht, totals.ttc, folioId);
}

export function getFolioByReservation(actorUserId: number, reservationId: number): HebergementFolio | null {
  void actorUserId;
  const db = getDatabase();
  const folio = db.prepare(`SELECT * FROM hebergement_folios WHERE reservation_id = ?`).get(reservationId) as Record<string, unknown> | undefined;
  if (!folio) return null;
  const lignes = db.prepare(`SELECT * FROM hebergement_folio_lignes WHERE folio_id = ? ORDER BY ordre, id`).all(Number(folio.id)) as Record<string, unknown>[];
  return {
    id: Number(folio.id),
    reservationId: Number(folio.reservation_id),
    hotelId: Number(folio.hotel_id),
    statut: folio.statut as HebergementFolio['statut'],
    totalHt: Number(folio.total_ht),
    totalTtc: Number(folio.total_ttc),
    factureId: folio.facture_id ? Number(folio.facture_id) : null,
    lignes: lignes.map(mapFolioLigne),
  };
}

export function createFolioFromReservation(actorUserId: number, reservationId: number): HebergementFolio {
  const res = getReservation(actorUserId, reservationId);
  const existing = getFolioByReservation(actorUserId, reservationId);
  if (existing) return existing;

  const db = getDatabase();
  const prixNuit = res.nbNuits > 0 ? res.montantTotal / res.nbNuits : res.montantTotal;
  const r = db.prepare(`
    INSERT INTO hebergement_folios (reservation_id, hotel_id, statut, total_ht, total_ttc)
    VALUES (?, ?, 'ouvert', ?, ?)
  `).run(reservationId, res.hotelId, res.montantTotal, res.montantTotal);
  const folioId = Number(r.lastInsertRowid);

  db.prepare(`
    INSERT INTO hebergement_folio_lignes (folio_id, designation, quantite, prix_unitaire, taux_tva, montant_ht, montant_ttc, categorie, ordre)
    VALUES (?, ?, ?, ?, 0, ?, ?, 'hebergement', 0)
  `).run(folioId, `Nuitées ch. ${res.chambreNumero ?? '—'}`, res.nbNuits, prixNuit, res.montantTotal, res.montantTotal);

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hebergement', description: `Folio réservation #${reservationId}` });
  return getFolioByReservation(actorUserId, reservationId)!;
}

export function addFolioLine(actorUserId: number, folioId: number, input: { designation: string; quantite?: number; prixUnitaire: number; tauxTva?: number; categorie?: string }): HebergementFolio {
  const db = getDatabase();
  const folio = db.prepare(`SELECT * FROM hebergement_folios WHERE id = ?`).get(folioId) as Record<string, unknown> | undefined;
  if (!folio) throw new Error('Folio introuvable.');
  if (folio.statut !== 'ouvert') throw new Error('Folio non modifiable.');

  const qte = input.quantite ?? 1;
  const ht = Math.round(qte * input.prixUnitaire * 100) / 100;
  const tva = input.tauxTva ?? 0;
  const ttc = Math.round(ht * (1 + tva / 100) * 100) / 100;
  db.prepare(`
    INSERT INTO hebergement_folio_lignes (folio_id, designation, quantite, prix_unitaire, taux_tva, montant_ht, montant_ttc, categorie, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordre),0)+1 FROM hebergement_folio_lignes WHERE folio_id = ?))
  `).run(folioId, input.designation, qte, input.prixUnitaire, tva, ht, ttc, input.categorie ?? 'extra', folioId);
  recalcFolioTotals(db, folioId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Ligne folio #${folioId}` });
  return getFolioByReservation(actorUserId, Number(folio.reservation_id))!;
}

export function closeFolio(actorUserId: number, reservationId: number): HebergementFolio {
  const db = getDatabase();
  const folio = getFolioByReservation(actorUserId, reservationId);
  if (!folio) throw new Error('Folio introuvable.');
  db.prepare(`UPDATE hebergement_folios SET statut='clos', updated_at=datetime('now') WHERE id=?`).run(folio.id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Folio #${folio.id} clos` });
  return getFolioByReservation(actorUserId, reservationId)!;
}

export function closeFolioToFacture(actorUserId: number, reservationId: number): { folio: HebergementFolio; factureId: number } {
  let folio = getFolioByReservation(actorUserId, reservationId);
  if (!folio) folio = createFolioFromReservation(actorUserId, reservationId);
  if (folio.factureId) return { folio, factureId: folio.factureId };

  const facture = createFactureFromReservation(actorUserId, reservationId);
  getDatabase().prepare(`
    UPDATE hebergement_folios SET statut='facture', facture_id=?, updated_at=datetime('now') WHERE id=?
  `).run(facture.id, folio.id);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Folio facturé — facture ${facture.numero}` });
  return { folio: getFolioByReservation(actorUserId, reservationId)!, factureId: facture.id };
}

function mapReservation(r: any): Reservation {
  return {
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    chambreId: r.chambre_id, chambreNumero: r.chambre_numero, typeChambreLabel: r.type_label,
    clientId: r.client_id ?? null, planId: r.plan_id ?? null, formuleId: r.formule_id ?? null,
    factureId: r.facture_id ?? null,
    dateArrivee: r.date_arrivee, dateDepart: r.date_depart, nbNuits: r.nb_nuits,
    nbAdultes: r.nb_adultes, nbEnfants: r.nb_enfants,
    clientNom: r.client_nom, clientPrenom: r.client_prenom,
    clientEmail: r.client_email, clientTelephone: r.client_telephone,
    montantTotal: r.montant_total, montantPaye: r.montant_paye,
    statut: r.statut as StatutReservation,
    source: r.source as any,
    notes: r.notes, createdAt: r.created_at,
    surbookingAutorise: Number(r.surbooking_autorise ?? 0) === 1,
    surbookingMotif: r.surbooking_motif ?? null,
    politiqueAnnulationId: r.politique_annulation_id ?? null,
  };
}
