import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { emitErpEvent } from './event-bus.service';
import { getActorContext, actorCanAccessHotel } from './actorContext';
import { isDateJournalLocked } from './daily-closure.service';
import { consommerStockRecette, getRecette } from './cuisine-production.service';
import { genererEcritureVenteRestaurationMulti } from './comptabilite.service';
import { isPosJourneeLocked } from './pos-cloture.service';
import { enqueueKdsForTicket } from './pos-kds.service';
import { addFolioLine, createFolioFromReservation, getReservation } from './hebergement.service';
import { assertSettlementsMatch, calculateDiscount } from './pos-restaurant.rules';

import type {
  PosPointVente,
  PosFaction,
  PosSession,
  PosTicket,
  PosTicketLigne,
  CreatePointVenteInput,
  CreateFactionInput,
  OpenSessionInput,
  CreateTicketInput,
  AddTicketLigneInput,
  ValiderTicketInput,
  PosModePaiement,
} from '../../src/shared/types/pos';

const DEFAULT_FACTIONS = [
  { code: 'MATIN', nom: 'Service matin', heureDebut: '06:00', heureFin: '11:00', ordre: 1 },
  { code: 'MIDI', nom: 'Service midi', heureDebut: '11:00', heureFin: '15:00', ordre: 2 },
  { code: 'SOIR', nom: 'Service soir', heureDebut: '18:00', heureFin: '23:00', ordre: 3 },
  { code: 'NUIT', nom: 'Service nuit', heureDebut: '23:00', heureFin: '06:00', ordre: 4 },
];

const TVA_RATE = 19;

function assertHotel(actorUserId: number, hotelId: number): void {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcTvaFromTtc(ttc: number, taux = TVA_RATE): { ht: number; tva: number } {
  const ht = round2(ttc / (1 + taux / 100));
  return { ht, tva: round2(ttc - ht) };
}

function mapPointVente(r: Record<string, unknown>): PosPointVente {
  return {
    id: r.id as number,
    uuid: r.uuid as string,
    hotelId: r.hotel_id as number,
    code: r.code as string,
    nom: r.nom as string,
    type: r.type as PosPointVente['type'],
    actif: Boolean(r.actif),
    createdAt: r.created_at as string,
  };
}

function mapFaction(r: Record<string, unknown>): PosFaction {
  return {
    id: r.id as number,
    pointVenteId: r.point_vente_id as number,
    code: r.code as string,
    nom: r.nom as string,
    heureDebut: (r.heure_debut as string | null) ?? null,
    heureFin: (r.heure_fin as string | null) ?? null,
    ordre: r.ordre as number,
    actif: Boolean(r.actif),
  };
}

function mapSession(r: Record<string, unknown>): PosSession {
  return {
    id: r.id as number,
    uuid: r.uuid as string,
    pointVenteId: r.point_vente_id as number,
    pointVenteNom: (r.point_vente_nom as string | undefined) ?? undefined,
    factionId: r.faction_id as number,
    factionNom: (r.faction_nom as string | undefined) ?? undefined,
    hotelId: r.hotel_id as number,
    caissierId: r.caissier_id as number,
    dateService: r.date_service as string,
    fondCaisse: r.fond_caisse as number,
    statut: r.statut as PosSession['statut'],
    totalVentes: r.total_ventes as number,
    totalEspeces: r.total_especes as number,
    totalCarte: r.total_carte as number,
    totalCheque: r.total_cheque as number,
    totalVirement: r.total_virement as number,
    fondCloture: (r.fond_cloture as number | null) ?? null,
    ecartCaisse: (r.ecart_caisse as number | null) ?? null,
    observations: (r.observations as string | null) ?? null,
    ouvertAt: r.ouvert_at as string,
    clotureAt: (r.cloture_at as string | null) ?? null,
  };
}

function mapLigne(r: Record<string, unknown>): PosTicketLigne {
  return {
    id: r.id as number,
    ticketId: r.ticket_id as number,
    recetteId: r.recette_id as number,
    designation: r.designation as string,
    quantite: r.quantite as number,
    prixUnitaire: r.prix_unitaire as number,
    montantLigne: r.montant_ligne as number,
    tauxTva: r.taux_tva as number,
  };
}

export function getTicketById(ticketId: number): PosTicket {
  const db = getDatabase();
  const row = db.prepare(`SELECT t.*,pt.numero table_numero FROM pos_tickets t LEFT JOIN pos_tables pt ON pt.id=t.table_id WHERE t.id = ?`).get(ticketId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Ticket introuvable.');
  const lignes = (db.prepare(`SELECT * FROM pos_ticket_lignes WHERE ticket_id = ? ORDER BY id`).all(ticketId) as Record<string, unknown>[]).map(mapLigne);
  const paiements = (db.prepare(`SELECT * FROM pos_ticket_paiements WHERE ticket_id=? ORDER BY id`).all(ticketId) as Record<string,unknown>[]).map(p=>({id:Number(p.id),ticketId:Number(p.ticket_id),mode:p.mode as PosTicket['paiements'][number]['mode'],montant:Number(p.montant),reference:p.reference?String(p.reference):null,encaissementId:p.encaissement_id?Number(p.encaissement_id):null,createdAt:String(p.created_at)}));
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    sessionId: row.session_id as number,
    pointVenteId: row.point_vente_id as number,
    hotelId: row.hotel_id as number,
    numero: row.numero as string,
    statut: row.statut as PosTicket['statut'],
    totalHt: row.total_ht as number,
    totalTtc: row.total_ttc as number,
    tvaMontant: row.tva_montant as number,
    modePaiement: (row.mode_paiement as PosModePaiement | null) ?? null,
    dateTicket: row.date_ticket as string,
    createdAt: row.created_at as string,
    validatedAt: (row.validated_at as string | null) ?? null,
    tableId: row.table_id ? Number(row.table_id) : null,
    tableNumero: row.table_numero ? String(row.table_numero) : null,
    nbCouverts: Number(row.nb_couverts ?? 1),
    etapeService: row.etape_service as PosTicket['etapeService'],
    remiseMontant: Number(row.remise_montant ?? 0),
    remisePourcentage: Number(row.remise_pourcentage ?? 0),
    remiseMotif: row.remise_motif ? String(row.remise_motif) : null,
    folioId: row.folio_id ? Number(row.folio_id) : null,
    paiements,
    lignes,
  };
}

export function recalcTicketTotals(ticketId: number): void {
  const db = getDatabase();
  const sum = db.prepare(`SELECT COALESCE(SUM(montant_ligne), 0) as ttc FROM pos_ticket_lignes WHERE ticket_id = ?`).get(ticketId) as { ttc: number };
  const ticket=getDatabase().prepare(`SELECT remise_montant,remise_pourcentage FROM pos_tickets WHERE id=?`).get(ticketId) as {remise_montant:number;remise_pourcentage:number};
  const brut=round2(sum.ttc??0);const remise=calculateDiscount(brut,Number(ticket.remise_montant??0),Number(ticket.remise_pourcentage??0));
  const ttc = round2(brut-remise);
  const { ht, tva } = calcTvaFromTtc(ttc);
  db.prepare(`UPDATE pos_tickets SET total_ttc = ?, total_ht = ?, tva_montant = ? WHERE id = ?`).run(ttc, ht, tva, ticketId);
}

function nextTicketNumero(pointVenteId: number, date: string): string {
  const db = getDatabase();
  const count = db.prepare(`
    SELECT COUNT(*) as c FROM pos_tickets WHERE point_vente_id = ? AND date_ticket = ?
  `).get(pointVenteId, date) as { c: number };
  return `T${pointVenteId}-${date.replace(/-/g, '')}-${String((count.c ?? 0) + 1).padStart(4, '0')}`;
}

function seedDefaultFactions(pointVenteId: number): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO pos_factions (point_vente_id, code, nom, heure_debut, heure_fin, ordre) VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const f of DEFAULT_FACTIONS) {
    stmt.run(pointVenteId, f.code, f.nom, f.heureDebut, f.heureFin, f.ordre);
  }
}

// ── Points de vente ───────────────────────────────────────────────────────────

export function listPointsVente(hotelId: number): PosPointVente[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM pos_points_vente WHERE hotel_id = ? AND actif = 1 ORDER BY nom
  `).all(hotelId) as Record<string, unknown>[];
  return rows.map(mapPointVente);
}

export function createPointVente(actorUserId: number, input: CreatePointVenteInput): PosPointVente {
  assertHotel(actorUserId, input.hotelId);
  const db = getDatabase();
  const pvType = input.type ?? 'restaurant';
  const res = db.prepare(`
    INSERT INTO pos_points_vente (hotel_id, code, nom, type) VALUES (?, ?, ?, ?) RETURNING id
  `).get(input.hotelId, input.code.trim().toUpperCase(), input.nom.trim(), pvType) as { id: number };
  seedDefaultFactions(res.id);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'pos', description: `Point de vente ${input.code} créé`, newValue: String(res.id) });
  return mapPointVente(db.prepare(`SELECT * FROM pos_points_vente WHERE id = ?`).get(res.id) as Record<string, unknown>);
}

export function listFactions(pointVenteId: number): PosFaction[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM pos_factions WHERE point_vente_id = ? AND actif = 1 ORDER BY ordre, id
  `).all(pointVenteId) as Record<string, unknown>[];
  return rows.map(mapFaction);
}

export function createFaction(actorUserId: number, input: CreateFactionInput): PosFaction {
  const pv = getDatabase().prepare(`SELECT hotel_id FROM pos_points_vente WHERE id = ?`).get(input.pointVenteId) as { hotel_id: number } | undefined;
  if (!pv) throw new Error('Point de vente introuvable.');
  assertHotel(actorUserId, pv.hotel_id);
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO pos_factions (point_vente_id, code, nom, heure_debut, heure_fin, ordre)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).get(
    input.pointVenteId,
    input.code.trim().toUpperCase(),
    input.nom.trim(),
    input.heureDebut ?? null,
    input.heureFin ?? null,
    input.ordre ?? 99,
  ) as { id: number };
  return mapFaction(db.prepare(`SELECT * FROM pos_factions WHERE id = ?`).get(res.id) as Record<string, unknown>);
}

// ── Sessions (factions) ───────────────────────────────────────────────────────

export function listSessions(pointVenteId: number, dateService?: string): PosSession[] {
  const db = getDatabase();
  const rows = dateService
    ? db.prepare(`
        SELECT s.*, pv.nom AS point_vente_nom, f.nom AS faction_nom
        FROM pos_sessions s
        JOIN pos_points_vente pv ON pv.id = s.point_vente_id
        JOIN pos_factions f ON f.id = s.faction_id
        WHERE s.point_vente_id = ? AND s.date_service = ?
        ORDER BY s.ouvert_at DESC
      `).all(pointVenteId, dateService) as Record<string, unknown>[]
    : db.prepare(`
        SELECT s.*, pv.nom AS point_vente_nom, f.nom AS faction_nom
        FROM pos_sessions s
        JOIN pos_points_vente pv ON pv.id = s.point_vente_id
        JOIN pos_factions f ON f.id = s.faction_id
        WHERE s.point_vente_id = ?
        ORDER BY s.ouvert_at DESC LIMIT 50
      `).all(pointVenteId) as Record<string, unknown>[];
  return rows.map(mapSession);
}

export function getSessionActive(pointVenteId: number, factionId: number, dateService: string): PosSession | null {
  const row = getDatabase().prepare(`
    SELECT s.*, pv.nom AS point_vente_nom, f.nom AS faction_nom
    FROM pos_sessions s
    JOIN pos_points_vente pv ON pv.id = s.point_vente_id
    JOIN pos_factions f ON f.id = s.faction_id
    WHERE s.point_vente_id = ? AND s.faction_id = ? AND s.date_service = ? AND s.statut = 'ouverte'
    LIMIT 1
  `).get(pointVenteId, factionId, dateService) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
}

export function openSession(actorUserId: number, input: OpenSessionInput): PosSession {
  const db = getDatabase();
  const pv = db.prepare(`SELECT * FROM pos_points_vente WHERE id = ? AND actif = 1`).get(input.pointVenteId) as Record<string, unknown> | undefined;
  if (!pv) throw new Error('Point de vente introuvable.');
  const hotelId = pv.hotel_id as number;
  assertHotel(actorUserId, hotelId);
  const dateService = input.dateService ?? new Date().toISOString().slice(0, 10);
  if (isDateJournalLocked(hotelId, dateService)) throw new Error('Journée hôtel clôturée — ouverture session impossible.');
  if (isPosJourneeLocked(input.pointVenteId, dateService)) throw new Error('Journée POS clôturée — ouverture session impossible.');

  const existing = getSessionActive(input.pointVenteId, input.factionId, dateService);
  if (existing) throw new Error(`Session déjà ouverte pour cette faction (${existing.factionNom}).`);

  const res = db.prepare(`
    INSERT INTO pos_sessions (point_vente_id, faction_id, hotel_id, caissier_id, date_service, fond_caisse)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).get(input.pointVenteId, input.factionId, hotelId, actorUserId, dateService, input.fondCaisse ?? 0) as { id: number };

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'pos', description: `Session POS #${res.id} ouverte`, newValue: String(res.id) });
  emitErpEvent({ type: 'POS_SESSION_OPENED', entiteType: 'pos_session', entiteId: res.id, data: { pointVenteId: input.pointVenteId, factionId: input.factionId } });

  const row = db.prepare(`
    SELECT s.*, pv.nom AS point_vente_nom, f.nom AS faction_nom FROM pos_sessions s
    JOIN pos_points_vente pv ON pv.id = s.point_vente_id
    JOIN pos_factions f ON f.id = s.faction_id WHERE s.id = ?
  `).get(res.id) as Record<string, unknown>;
  return mapSession(row);
}

// ── Tickets ─────────────────────────────────────────────────────────────────────

export function listTickets(sessionId: number): PosTicket[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM pos_tickets WHERE session_id = ? ORDER BY id DESC
  `).all(sessionId) as Record<string, unknown>[];
  return rows.map((r) => getTicketById(r.id as number));
}

export function createTicket(actorUserId: number, input: CreateTicketInput): PosTicket {
  const db = getDatabase();
  const session = db.prepare(`SELECT * FROM pos_sessions WHERE id = ?`).get(input.sessionId) as Record<string, unknown> | undefined;
  if (!session || session.statut !== 'ouverte') throw new Error('Session ouverte requise.');
  assertHotel(actorUserId, session.hotel_id as number);
  const dateTicket = session.date_service as string;
  if (isPosJourneeLocked(session.point_vente_id as number, dateTicket)) throw new Error('Journée POS clôturée.');

  const numero = nextTicketNumero(session.point_vente_id as number, dateTicket);
  if(input.tableId){const table=db.prepare(`SELECT t.id,s.point_vente_id,t.statut,EXISTS(SELECT 1 FROM pos_tickets x WHERE x.table_id=t.id AND x.statut='brouillon') ticket_ouvert FROM pos_tables t JOIN pos_salles s ON s.id=t.salle_id WHERE t.id=?`).get(input.tableId) as {id:number;point_vente_id:number;statut:string;ticket_ouvert:number}|undefined;if(!table||table.point_vente_id!==Number(session.point_vente_id))throw new Error('Table incompatible avec le point de vente.');if(table.statut==='hors_service')throw new Error('Table hors service.');if(table.ticket_ouvert)throw new Error('Un ticket est déjà ouvert sur cette table.');}
  const res = db.prepare(`
    INSERT INTO pos_tickets (session_id, point_vente_id, hotel_id, numero, cree_par, date_ticket,table_id,nb_couverts)
    VALUES (?, ?, ?, ?, ?, ?,?,?) RETURNING id
  `).get(input.sessionId, session.point_vente_id, session.hotel_id, numero, actorUserId, dateTicket,input.tableId??null,input.nbCouverts??1) as { id: number };
  if(input.tableId)db.prepare(`UPDATE pos_tables SET statut='occupee',updated_at=datetime('now') WHERE id=?`).run(input.tableId);
  return getTicketById(res.id);
}

export function addTicketLigne(actorUserId: number, input: AddTicketLigneInput): PosTicket {
  const ticket = getTicketById(input.ticketId);
  if (ticket.statut !== 'brouillon') throw new Error('Ticket non modifiable.');
  const recette = getRecette(input.recetteId);
  if (!recette || recette.statut !== 'valide') throw new Error('Recette validée requise.');
  if (input.quantite <= 0) throw new Error('Quantité invalide.');

  const prix = input.prixUnitaire ?? recette.prixVente ?? 0;
  const montant = round2(prix * input.quantite);
  getDatabase().prepare(`
    INSERT INTO pos_ticket_lignes (ticket_id, recette_id, designation, quantite, prix_unitaire, montant_ligne, taux_tva)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(input.ticketId, input.recetteId, recette.nom, input.quantite, prix, montant, TVA_RATE);
  recalcTicketTotals(input.ticketId);
  void actorUserId;
  return getTicketById(input.ticketId);
}

export function removeTicketLigne(actorUserId: number, ligneId: number): PosTicket {
  const db = getDatabase();
  const ligne = db.prepare(`SELECT ticket_id FROM pos_ticket_lignes WHERE id = ?`).get(ligneId) as { ticket_id: number } | undefined;
  if (!ligne) throw new Error('Ligne introuvable.');
  const ticket = getTicketById(ligne.ticket_id);
  if (ticket.statut !== 'brouillon') throw new Error('Ticket non modifiable.');
  db.prepare(`DELETE FROM pos_ticket_lignes WHERE id = ?`).run(ligneId);
  recalcTicketTotals(ligne.ticket_id);
  void actorUserId;
  return getTicketById(ligne.ticket_id);
}

export function validerTicket(actorUserId: number, input: ValiderTicketInput): PosTicket {
  const db = getDatabase();
  const ticket = getTicketById(input.ticketId);
  if (ticket.statut !== 'brouillon') throw new Error('Ticket déjà traité.');
  if (ticket.lignes.length === 0) throw new Error('Ticket vide.');
  if (ticket.totalTtc <= 0) throw new Error('Montant invalide.');

  const session = db.prepare(`SELECT * FROM pos_sessions WHERE id = ?`).get(ticket.sessionId) as Record<string, unknown>;
  if (session.statut !== 'ouverte') throw new Error('Session fermée.');
  assertHotel(actorUserId, ticket.hotelId);
  if (isDateJournalLocked(ticket.hotelId, ticket.dateTicket)) throw new Error('Journée hôtel clôturée.');
  if (isPosJourneeLocked(ticket.pointVenteId, ticket.dateTicket)) throw new Error('Journée POS clôturée.');

  const settlements:Array<{mode:'especes'|'carte'|'cheque'|'virement'|'autre'|'folio';montant:number;reference?:string}>=input.reservationId
    ? [{mode:'folio',montant:ticket.totalTtc,reference:`RES-${input.reservationId}`}]
    : input.paiements?.length?input.paiements:[{mode:input.modePaiement??'especes',montant:ticket.totalTtc}];
  assertSettlementsMatch(ticket.totalTtc,settlements);

  let folioId:number|null=null;
  if(input.reservationId){const reservation=getReservation(actorUserId,input.reservationId);if(reservation.hotelId!==ticket.hotelId)throw new Error('La chambre doit appartenir au même hôtel.');if(!['confirmee','arrivee'].includes(reservation.statut))throw new Error('Réservation non éligible au transfert folio.');const folio=createFolioFromReservation(actorUserId,input.reservationId);if(folio.statut!=='ouvert')throw new Error('Folio chambre non ouvert.');addFolioLine(actorUserId,folio.id,{designation:`Restaurant ${ticket.numero}`,quantite:1,prixUnitaire:ticket.totalHt,tauxTva:ticket.totalHt>0?round2(ticket.tvaMontant/ticket.totalHt*100):0,categorie:'restauration'});folioId=folio.id;}

  // La validation des règlements et du folio doit précéder toute sortie de stock.
  // Une erreur de saisie ne peut ainsi jamais consommer les ingrédients du ticket.
  for (const ligne of ticket.lignes) {
    consommerStockRecette(
      actorUserId,
      ticket.hotelId,
      ligne.recetteId,
      ligne.quantite,
      ticket.numero,
      `POS ${ligne.designation} x${ligne.quantite}`,
      'pos_ticket',
      ticket.id,
    );
  }

  const ecriture = genererEcritureVenteRestaurationMulti(actorUserId, {
    ticketId: ticket.id,
    hotelId: ticket.hotelId,
    dateTicket: ticket.dateTicket,
    numero: ticket.numero,
    totalTtc: ticket.totalTtc,
    totalHt: ticket.totalHt,
    tvaMontant: ticket.tvaMontant,
    modePaiement:settlements.length>1?'multiple':settlements[0].mode,
  },settlements);

  let firstEncaissementId:number|null=null;
  for(const p of settlements){let encaissementId:number|null=null;if(p.mode!=='folio'){const encRes=db.prepare(`INSERT INTO encaissements (hotel_id,date_encaissement,montant,mode,reference,description,statut,created_by) VALUES(?,?,?,?,?,?,'confirme',?)`).run(ticket.hotelId,ticket.dateTicket,p.montant,p.mode,p.reference??ticket.numero,`Encaissement POS ${ticket.numero}`,actorUserId);encaissementId=Number(encRes.lastInsertRowid);firstEncaissementId??=encaissementId;}db.prepare(`INSERT INTO pos_ticket_paiements(ticket_id,mode,montant,reference,encaissement_id,created_by) VALUES(?,?,?,?,?,?)`).run(ticket.id,p.mode,p.montant,p.reference??null,encaissementId,actorUserId);}

  const paymentMode:PosModePaiement=folioId?'folio':settlements.length>1?'multiple':settlements[0].mode;

  db.prepare(`
    UPDATE pos_tickets SET statut = 'valide', mode_paiement = ?, encaissement_id = ?,folio_id=?,etape_service='terminee',
      ecriture_comptable_id = ?, validated_at = datetime('now') WHERE id = ?
  `).run(paymentMode, firstEncaissementId,folioId, ecriture?.id ?? null, ticket.id);
  enqueueKdsForTicket(ticket.id);
  db.prepare(`UPDATE pos_sessions SET total_ventes=total_ventes+? WHERE id=?`).run(ticket.totalTtc,ticket.sessionId);
  for(const p of settlements){const col=p.mode==='especes'?'total_especes':p.mode==='carte'?'total_carte':p.mode==='cheque'?'total_cheque':p.mode==='virement'?'total_virement':null;if(col)db.prepare(`UPDATE pos_sessions SET ${col}=${col}+? WHERE id=?`).run(p.montant,ticket.sessionId);}
  if(ticket.tableId)db.prepare(`UPDATE pos_tables SET statut='a_nettoyer',updated_at=datetime('now') WHERE id=?`).run(ticket.tableId);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'pos', description: `Ticket ${ticket.numero} validé — ${ticket.totalTtc} DA`, newValue: String(ticket.id) });
  emitErpEvent({
    type: 'POS_SALE_RECORDED',
    entiteType: 'pos_ticket',
    entiteId: ticket.id,
    data: { numero: ticket.numero, totalTtc: ticket.totalTtc, modePaiement: paymentMode },
  });

  return getTicketById(ticket.id);
}

export function annulerTicket(actorUserId: number, ticketId: number): PosTicket {
  const ticket = getTicketById(ticketId);
  if (ticket.statut !== 'brouillon') throw new Error('Seuls les brouillons peuvent être annulés.');
  getDatabase().prepare(`UPDATE pos_tickets SET statut = 'annule' WHERE id = ?`).run(ticketId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'pos', description: `Ticket ${ticket.numero} annulé` });
  return getTicketById(ticketId);
}
