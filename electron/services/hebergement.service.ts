import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, applyActorHotelFilter, isGlobalAdminRole } from './actorContext';
import { simulerPrix } from './tarifs.service';
import { createFacture } from './facturation.service';
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
  db.prepare(`UPDATE chambres SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hebergement', description: `Chambre ${id} → ${statut}` });
  return listChambres(actorUserId).find((c) => c.id === id)!;
}

export function updateChambre(actorUserId: number, id: number, input: Partial<CreateChambreInput>): Chambre {
  const db = getDatabase();
  const sets: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];
  if (input.typeChambreId !== undefined) { sets.push('type_chambre_id = ?'); params.push(input.typeChambreId ?? null); }
  if (input.numero !== undefined)        { sets.push('numero = ?');           params.push(input.numero); }
  if (input.etage !== undefined)         { sets.push('etage = ?');            params.push(input.etage); }
  if (input.statut !== undefined)        { sets.push('statut = ?');           params.push(input.statut); }
  if (input.description !== undefined)   { sets.push('description = ?');      params.push(input.description ?? null); }
  params.push(id);
  db.prepare(`UPDATE chambres SET ${sets.join(', ')} WHERE id = ?`).run(...params);
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

export function getReservation(_actorUserId: number, id: number): Reservation {
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
    if (conflict.cnt > 0) throw new Error('Chambre déjà occupée sur cette période.');
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
       client_email, client_telephone, montant_total, statut, source, notes, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
  db.prepare(`UPDATE reservations SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, id);

  // Sync statut chambre
  if (res.chambreId) {
    const newStatutChambre: StatutChambre =
      statut === 'arrivee'  ? 'occupee' :
      statut === 'depart'   ? 'menage'  :
      statut === 'annulee'  ? 'libre'   : 'libre';
    db.prepare(`UPDATE chambres SET statut=?, updated_at=datetime('now') WHERE id=?`).run(newStatutChambre, res.chambreId);
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
  };
}
