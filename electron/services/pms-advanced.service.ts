import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { createReservation, createFolioFromReservation, getReservation } from './hebergement.service';
import type {
  PmsAnnulationResult, PmsAttente, PmsMouvementChambre, PmsOccupant,
  PmsPolitiqueAnnulation, Reservation, UpdateReservationInput,
} from '../../src/shared/types/hebergement';
import { assertControlledOverbooking, calculateCancellationPenalty, calculateRefundableDeposit } from './pms-advanced.rules';

type Db = ReturnType<typeof getDatabase>;

function assertHotelAccess(actorId: number, hotelId: number): void {
  const actor = getActorContext(actorId);
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }
}

function reservationHotel(db: Db, reservationId: number): number {
  const row = db.prepare(`SELECT hotel_id FROM reservations WHERE id=? AND deleted_at IS NULL`).get(reservationId) as { hotel_id: number } | undefined;
  if (!row) throw new Error('Réservation introuvable.');
  return row.hotel_id;
}

function assertDates(arrivee: string, depart: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivee) || !/^\d{4}-\d{2}-\d{2}$/.test(depart) || depart <= arrivee) {
    throw new Error("La date de départ doit être postérieure à la date d'arrivée.");
  }
}

function nights(arrivee: string, depart: string): number {
  return Math.max(1, Math.round((new Date(depart).getTime() - new Date(arrivee).getTime()) / 86_400_000));
}

function roomConflict(db: Db, chambreId: number, arrivee: string, depart: string, excludeReservationId?: number): boolean {
  const row = db.prepare(`
    SELECT COUNT(*) AS c FROM reservations
    WHERE chambre_id=? AND deleted_at IS NULL AND statut NOT IN ('annulee','no_show','depart')
      AND date_arrivee < ? AND date_depart > ? AND (? IS NULL OR id <> ?)
  `).get(chambreId, depart, arrivee, excludeReservationId ?? null, excludeReservationId ?? null) as { c: number };
  return row.c > 0;
}

function ensureRoom(db: Db, hotelId: number, chambreId: number): void {
  const room = db.prepare(`SELECT id FROM chambres WHERE id=? AND hotel_id=? AND actif=1`).get(chambreId, hotelId);
  if (!room) throw new Error('Chambre introuvable dans cet hôtel.');
}

export function updateReservation(actorId: number, reservationId: number, input: UpdateReservationInput): Reservation {
  const db = getDatabase();
  const current = getReservation(actorId, reservationId);
  assertHotelAccess(actorId, current.hotelId);
  if (current.statut === 'depart') throw new Error('Une réservation clôturée ne peut plus être modifiée.');
  if (current.factureId && (input.montantTotal !== undefined || input.dateArrivee || input.dateDepart)) {
    throw new Error('Dates et montant verrouillés après facturation.');
  }

  const arrivee = input.dateArrivee ?? current.dateArrivee;
  const depart = input.dateDepart ?? current.dateDepart;
  assertDates(arrivee, depart);
  const chambreId = input.chambreId === undefined ? current.chambreId : input.chambreId;
  const surbooking = input.surbookingAutorise ?? current.surbookingAutorise;
  const motifSurbooking = input.surbookingMotif ?? current.surbookingMotif;
  if (chambreId) {
    ensureRoom(db, current.hotelId, chambreId);
    assertControlledOverbooking(roomConflict(db, chambreId, arrivee, depart, reservationId),surbooking,motifSurbooking);
  }

  const allowed: Array<[keyof UpdateReservationInput, string, (v: unknown) => unknown]> = [
    ['chambreId', 'chambre_id', (v) => v ?? null], ['clientId', 'client_id', (v) => v ?? null],
    ['planId', 'plan_id', (v) => v ?? null], ['formuleId', 'formule_id', (v) => v ?? null],
    ['dateArrivee', 'date_arrivee', String], ['dateDepart', 'date_depart', String],
    ['nbAdultes', 'nb_adultes', Number], ['nbEnfants', 'nb_enfants', Number],
    ['clientNom', 'client_nom', (v) => String(v).trim()], ['clientPrenom', 'client_prenom', (v) => v || null],
    ['clientEmail', 'client_email', (v) => v || null], ['clientTelephone', 'client_telephone', (v) => v || null],
    ['montantTotal', 'montant_total', Number], ['source', 'source', String], ['notes', 'notes', (v) => v || null],
    ['politiqueAnnulationId', 'politique_annulation_id', (v) => v ?? null],
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, column, cast] of allowed) {
    if (input[key] !== undefined) { sets.push(`${column}=?`); params.push(cast(input[key])); }
  }
  if (input.dateArrivee !== undefined || input.dateDepart !== undefined) { sets.push('nb_nuits=?'); params.push(nights(arrivee, depart)); }
  if (input.surbookingAutorise !== undefined) { sets.push('surbooking_autorise=?'); params.push(surbooking ? 1 : 0); }
  if (input.surbookingMotif !== undefined) { sets.push('surbooking_motif=?'); params.push(motifSurbooking?.trim() || null); }
  if (!sets.length) return current;
  sets.push(`updated_at=datetime('now')`);
  db.prepare(`UPDATE reservations SET ${sets.join(',')} WHERE id=?`).run(...params, reservationId);
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'hebergement', description: `Réservation #${reservationId} modifiée` });
  return getReservation(actorId, reservationId);
}

export function moveReservationRoom(actorId: number, reservationId: number, newRoomId: number, motif: string, surbookingAutorise = false): PmsMouvementChambre {
  const db = getDatabase();
  const res = getReservation(actorId, reservationId);
  assertHotelAccess(actorId, res.hotelId);
  if (['depart', 'annulee', 'no_show'].includes(res.statut)) throw new Error('Déplacement impossible pour cette réservation.');
  ensureRoom(db, res.hotelId, newRoomId);
  if (newRoomId === res.chambreId) throw new Error('La réservation occupe déjà cette chambre.');
  if (!motif.trim()) throw new Error('Motif du déplacement obligatoire.');
  const conflict = roomConflict(db, newRoomId, res.dateArrivee, res.dateDepart, reservationId);
  assertControlledOverbooking(conflict,surbookingAutorise,motif);

  const id = db.transaction(() => {
    const out = db.prepare(`INSERT INTO pms_mouvements_chambre
      (reservation_id,ancienne_chambre_id,nouvelle_chambre_id,motif,surbooking_autorise,effectue_par)
      VALUES(?,?,?,?,?,?)`).run(reservationId, res.chambreId, newRoomId, motif.trim(), surbookingAutorise ? 1 : 0, actorId);
    db.prepare(`UPDATE reservations SET chambre_id=?,surbooking_autorise=?,surbooking_motif=?,updated_at=datetime('now') WHERE id=?`)
      .run(newRoomId, surbookingAutorise ? 1 : 0, surbookingAutorise ? motif.trim() : null, reservationId);
    if (res.statut === 'arrivee') {
      if (res.chambreId) db.prepare(`UPDATE chambres SET statut='menage',updated_at=datetime('now') WHERE id=?`).run(res.chambreId);
      db.prepare(`UPDATE chambres SET statut='occupee',updated_at=datetime('now') WHERE id=?`).run(newRoomId);
    }
    return Number(out.lastInsertRowid);
  })();
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'hebergement', description: `Réservation #${reservationId} déplacée vers chambre #${newRoomId}` });
  return listRoomMoves(actorId, reservationId).find((m) => m.id === id)!;
}

export function listRoomMoves(actorId: number, reservationId: number): PmsMouvementChambre[] {
  const db = getDatabase();
  assertHotelAccess(actorId, reservationHotel(db, reservationId));
  const rows = db.prepare(`SELECT m.*,a.numero ancienne_numero,n.numero nouvelle_numero
    FROM pms_mouvements_chambre m LEFT JOIN chambres a ON a.id=m.ancienne_chambre_id
    JOIN chambres n ON n.id=m.nouvelle_chambre_id WHERE m.reservation_id=? ORDER BY m.id DESC`).all(reservationId) as Record<string, unknown>[];
  return rows.map((r) => ({ id:Number(r.id),reservationId:Number(r.reservation_id),ancienneChambreId:r.ancienne_chambre_id?Number(r.ancienne_chambre_id):null,
    ancienneChambreNumero:r.ancienne_numero?String(r.ancienne_numero):null,nouvelleChambreId:Number(r.nouvelle_chambre_id),nouvelleChambreNumero:String(r.nouvelle_numero),
    motif:String(r.motif),surbookingAutorise:Number(r.surbooking_autorise)===1,createdAt:String(r.created_at) }));
}

export function listOccupants(actorId: number, reservationId: number): PmsOccupant[] {
  const db = getDatabase(); assertHotelAccess(actorId, reservationHotel(db, reservationId));
  return (db.prepare(`SELECT * FROM pms_occupants WHERE reservation_id=? ORDER BY principal DESC,nom,prenom`).all(reservationId) as Record<string, unknown>[]).map((r) => ({
    id:Number(r.id),reservationId:Number(r.reservation_id),nom:String(r.nom),prenom:r.prenom?String(r.prenom):null,dateNaissance:r.date_naissance?String(r.date_naissance):null,
    nationalite:r.nationalite?String(r.nationalite):null,typeDocument:r.type_document?String(r.type_document):null,numeroDocument:r.numero_document?String(r.numero_document):null,principal:Number(r.principal)===1,
  }));
}

export function saveOccupant(actorId: number, reservationId: number, input: Omit<PmsOccupant,'id'|'reservationId'>, occupantId?: number): PmsOccupant {
  const db=getDatabase(); assertHotelAccess(actorId,reservationHotel(db,reservationId));
  if(!input.nom.trim()) throw new Error("Nom de l'occupant obligatoire.");
  const id=db.transaction(()=>{
    if(input.principal) db.prepare(`UPDATE pms_occupants SET principal=0,updated_at=datetime('now') WHERE reservation_id=?`).run(reservationId);
    if(occupantId){
      const out=db.prepare(`UPDATE pms_occupants SET nom=?,prenom=?,date_naissance=?,nationalite=?,type_document=?,numero_document=?,principal=?,updated_at=datetime('now') WHERE id=? AND reservation_id=?`)
        .run(input.nom.trim(),input.prenom||null,input.dateNaissance||null,input.nationalite||null,input.typeDocument||null,input.numeroDocument||null,input.principal?1:0,occupantId,reservationId);
      if(!out.changes) throw new Error('Occupant introuvable.'); return occupantId;
    }
    return Number(db.prepare(`INSERT INTO pms_occupants(reservation_id,nom,prenom,date_naissance,nationalite,type_document,numero_document,principal) VALUES(?,?,?,?,?,?,?,?)`)
      .run(reservationId,input.nom.trim(),input.prenom||null,input.dateNaissance||null,input.nationalite||null,input.typeDocument||null,input.numeroDocument||null,input.principal?1:0).lastInsertRowid);
  })();
  writeAuditLog({userId:actorId,action:occupantId?'UPDATE':'CREATE',module:'hebergement',description:`Occupant réservation #${reservationId}`});
  return listOccupants(actorId,reservationId).find(o=>o.id===id)!;
}

export function deleteOccupant(actorId:number,occupantId:number):boolean{
  const db=getDatabase(); const row=db.prepare(`SELECT reservation_id,principal FROM pms_occupants WHERE id=?`).get(occupantId) as {reservation_id:number;principal:number}|undefined;
  if(!row) throw new Error('Occupant introuvable.'); assertHotelAccess(actorId,reservationHotel(db,row.reservation_id));
  db.prepare(`DELETE FROM pms_occupants WHERE id=?`).run(occupantId); writeAuditLog({userId:actorId,action:'DELETE',module:'hebergement',description:`Occupant #${occupantId} supprimé`}); return true;
}

export function listWaitlist(actorId:number,hotelId?:number):PmsAttente[]{
  const db=getDatabase(); const actor=getActorContext(actorId); const where:string[]=[]; const params:unknown[]=[];
  if(hotelId){assertHotelAccess(actorId,hotelId);where.push('w.hotel_id=?');params.push(hotelId);}else if(!isGlobalAdminRole(actor.roleCode)){where.push(`w.hotel_id IN (${actor.hotelIds.map(()=>'?').join(',')})`);params.push(...actor.hotelIds);}
  return (db.prepare(`SELECT w.*,h.name hotel_name FROM pms_liste_attente w JOIN hotels h ON h.id=w.hotel_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CASE w.statut WHEN 'attente' THEN 0 ELSE 1 END,w.priorite,w.created_at`).all(...params) as Record<string,unknown>[]).map(r=>({
    id:Number(r.id),hotelId:Number(r.hotel_id),hotelName:String(r.hotel_name),typeChambreId:r.type_chambre_id?Number(r.type_chambre_id):null,clientNom:String(r.client_nom),clientPrenom:r.client_prenom?String(r.client_prenom):null,
    clientEmail:r.client_email?String(r.client_email):null,clientTelephone:r.client_telephone?String(r.client_telephone):null,dateArrivee:String(r.date_arrivee),dateDepart:String(r.date_depart),nbAdultes:Number(r.nb_adultes),nbEnfants:Number(r.nb_enfants),priorite:Number(r.priorite),statut:r.statut as PmsAttente['statut'],notes:r.notes?String(r.notes):null,reservationId:r.reservation_id?Number(r.reservation_id):null,
  }));
}

export function createWaitlist(actorId:number,input:{hotelId:number;typeChambreId?:number|null;clientNom:string;clientPrenom?:string|null;clientEmail?:string|null;clientTelephone?:string|null;dateArrivee:string;dateDepart:string;nbAdultes?:number;nbEnfants?:number;priorite?:number;notes?:string|null}):PmsAttente{
  assertHotelAccess(actorId,input.hotelId); assertDates(input.dateArrivee,input.dateDepart); if(!input.clientNom.trim())throw new Error('Nom client obligatoire.');
  const db=getDatabase(); const r=db.prepare(`INSERT INTO pms_liste_attente(hotel_id,type_chambre_id,client_nom,client_prenom,client_email,client_telephone,date_arrivee,date_depart,nb_adultes,nb_enfants,priorite,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(input.hotelId,input.typeChambreId??null,input.clientNom.trim(),input.clientPrenom||null,input.clientEmail||null,input.clientTelephone||null,input.dateArrivee,input.dateDepart,input.nbAdultes??1,input.nbEnfants??0,input.priorite??3,input.notes||null,actorId);
  writeAuditLog({userId:actorId,action:'CREATE',module:'hebergement',description:`Liste d'attente ${input.clientNom}`}); return listWaitlist(actorId,input.hotelId).find(w=>w.id===Number(r.lastInsertRowid))!;
}

export function updateWaitlistStatus(actorId:number,id:number,statut:PmsAttente['statut']):PmsAttente{
  const db=getDatabase(); const row=db.prepare(`SELECT hotel_id FROM pms_liste_attente WHERE id=?`).get(id) as {hotel_id:number}|undefined;if(!row)throw new Error("Entrée d'attente introuvable.");assertHotelAccess(actorId,row.hotel_id);
  db.prepare(`UPDATE pms_liste_attente SET statut=?,updated_at=datetime('now') WHERE id=?`).run(statut,id);return listWaitlist(actorId,row.hotel_id).find(w=>w.id===id)!;
}

export function promoteWaitlist(actorId:number,id:number,chambreId:number,surbookingAutorise=false,motif?:string):Reservation{
  const db=getDatabase(); const w=db.prepare(`SELECT * FROM pms_liste_attente WHERE id=? AND statut IN ('attente','contacte')`).get(id) as Record<string,unknown>|undefined;if(!w)throw new Error("Entrée d'attente non convertible.");assertHotelAccess(actorId,Number(w.hotel_id));
  const res=db.transaction(()=>{const created=createReservation(actorId,{hotelId:Number(w.hotel_id),chambreId,clientNom:String(w.client_nom),clientPrenom:w.client_prenom?String(w.client_prenom):null,clientEmail:w.client_email?String(w.client_email):null,clientTelephone:w.client_telephone?String(w.client_telephone):null,dateArrivee:String(w.date_arrivee),dateDepart:String(w.date_depart),nbAdultes:Number(w.nb_adultes),nbEnfants:Number(w.nb_enfants),notes:w.notes?String(w.notes):null,surbookingAutorise,surbookingMotif:motif});
    db.prepare(`UPDATE pms_liste_attente SET statut='convertie',reservation_id=?,updated_at=datetime('now') WHERE id=?`).run(created.id,id);return getReservation(actorId,created.id);})();
  return res;
}

export function listCancellationPolicies(actorId:number,hotelId?:number):PmsPolitiqueAnnulation[]{
  const db=getDatabase();const actor=getActorContext(actorId);const where:string[]=['p.actif=1'];const params:unknown[]=[];if(hotelId){assertHotelAccess(actorId,hotelId);where.push('p.hotel_id=?');params.push(hotelId);}else if(!isGlobalAdminRole(actor.roleCode)){where.push(`p.hotel_id IN (${actor.hotelIds.map(()=>'?').join(',')})`);params.push(...actor.hotelIds);}
  return (db.prepare(`SELECT p.*,h.name hotel_name FROM pms_politiques_annulation p JOIN hotels h ON h.id=p.hotel_id WHERE ${where.join(' AND ')} ORDER BY h.name,p.nom`).all(...params) as Record<string,unknown>[]).map(r=>({id:Number(r.id),hotelId:Number(r.hotel_id),hotelName:String(r.hotel_name),nom:String(r.nom),delaiSansFraisJours:Number(r.delai_sans_frais_jours),penaliteType:r.penalite_type as PmsPolitiqueAnnulation['penaliteType'],penaliteValeur:Number(r.penalite_valeur),noShowType:r.no_show_type as PmsPolitiqueAnnulation['noShowType'],noShowValeur:Number(r.no_show_valeur),actif:Number(r.actif)===1}));
}

export function createCancellationPolicy(actorId:number,input:Omit<PmsPolitiqueAnnulation,'id'|'hotelName'|'actif'>):PmsPolitiqueAnnulation{
  assertHotelAccess(actorId,input.hotelId);const db=getDatabase();const r=db.prepare(`INSERT INTO pms_politiques_annulation(hotel_id,nom,delai_sans_frais_jours,penalite_type,penalite_valeur,no_show_type,no_show_valeur,created_by) VALUES(?,?,?,?,?,?,?,?)`).run(input.hotelId,input.nom.trim(),input.delaiSansFraisJours,input.penaliteType,input.penaliteValeur,input.noShowType,input.noShowValeur,actorId);return listCancellationPolicies(actorId,input.hotelId).find(p=>p.id===Number(r.lastInsertRowid))!;
}

export function cancelReservation(actorId:number,reservationId:number,motif:string,policyId?:number):PmsAnnulationResult{
  const db=getDatabase();const res=getReservation(actorId,reservationId);assertHotelAccess(actorId,res.hotelId);if(['depart','annulee'].includes(res.statut))throw new Error('Réservation déjà clôturée ou annulée.');if(!motif.trim())throw new Error("Motif d'annulation obligatoire.");
  const selected=policyId??res.politiqueAnnulationId;let amount=0;let applied:number|null=null;if(selected){const p=db.prepare(`SELECT * FROM pms_politiques_annulation WHERE id=? AND hotel_id=? AND actif=1`).get(selected,res.hotelId) as Record<string,unknown>|undefined;if(!p)throw new Error("Politique d'annulation invalide.");applied=Number(p.id);const days=Math.floor((new Date(res.dateArrivee).getTime()-Date.now())/86_400_000);if(days<Number(p.delai_sans_frais_jours))amount=calculateCancellationPenalty(String(p.penalite_type) as 'pourcentage'|'montant'|'nuitees',Number(p.penalite_valeur),res.montantTotal,res.nbNuits);}
  const deposits=(db.prepare(`SELECT COALESCE(SUM(montant),0) total FROM pms_depots WHERE reservation_id=? AND statut IN ('recu','affecte')`).get(reservationId) as {total:number}).total;const refundable=calculateRefundableDeposit(deposits,amount);
  db.transaction(()=>{db.prepare(`INSERT INTO pms_annulations(reservation_id,politique_id,motif,montant_penalite,montant_remboursable,annule_par) VALUES(?,?,?,?,?,?)`).run(reservationId,applied,motif.trim(),amount,refundable,actorId);db.prepare(`UPDATE reservations SET statut='annulee',updated_at=datetime('now') WHERE id=?`).run(reservationId);if(res.chambreId)db.prepare(`UPDATE chambres SET statut='libre',updated_at=datetime('now') WHERE id=? AND statut<>'hors_service'`).run(res.chambreId);})();
  writeAuditLog({userId:actorId,action:'UPDATE',module:'hebergement',description:`Réservation #${reservationId} annulée, pénalité ${amount}`});return{reservation:getReservation(actorId,reservationId),montantPenalite:amount,montantRemboursable:refundable};
}

export function markReservationNoShow(actorId:number,reservationId:number,motif:string,policyId?:number):PmsAnnulationResult{
  const db=getDatabase();const res=getReservation(actorId,reservationId);assertHotelAccess(actorId,res.hotelId);if(['depart','annulee','no_show'].includes(res.statut))throw new Error('Réservation déjà clôturée.');if(!motif.trim())throw new Error('Motif du no-show obligatoire.');
  const selected=policyId??res.politiqueAnnulationId;let amount=0;let applied:number|null=null;if(selected){const p=db.prepare(`SELECT * FROM pms_politiques_annulation WHERE id=? AND hotel_id=? AND actif=1`).get(selected,res.hotelId) as Record<string,unknown>|undefined;if(!p)throw new Error("Politique d'annulation invalide.");applied=Number(p.id);amount=calculateCancellationPenalty(String(p.no_show_type) as 'pourcentage'|'montant'|'nuitees',Number(p.no_show_valeur),res.montantTotal,res.nbNuits);}
  const deposits=(db.prepare(`SELECT COALESCE(SUM(montant),0) total FROM pms_depots WHERE reservation_id=? AND statut IN ('recu','affecte')`).get(reservationId) as {total:number}).total;const refundable=calculateRefundableDeposit(deposits,amount);
  db.transaction(()=>{db.prepare(`INSERT INTO pms_annulations(reservation_id,politique_id,motif,montant_penalite,montant_remboursable,annule_par) VALUES(?,?,?,?,?,?)`).run(reservationId,applied,`NO-SHOW — ${motif.trim()}`,amount,refundable,actorId);db.prepare(`UPDATE reservations SET statut='no_show',updated_at=datetime('now') WHERE id=?`).run(reservationId);if(res.chambreId)db.prepare(`UPDATE chambres SET statut='libre',updated_at=datetime('now') WHERE id=? AND statut<>'hors_service'`).run(res.chambreId);})();
  writeAuditLog({userId:actorId,action:'UPDATE',module:'hebergement',description:`Réservation #${reservationId} no-show, pénalité ${amount}`});return{reservation:getReservation(actorId,reservationId),montantPenalite:amount,montantRemboursable:refundable};
}

export function operateDeposit(actorId:number,depotId:number,type:'remboursement'|'annulation',motif:string,reference?:string):void{
  const db=getDatabase();const d=db.prepare(`SELECT d.*,r.hotel_id FROM pms_depots d JOIN reservations r ON r.id=d.reservation_id WHERE d.id=?`).get(depotId) as Record<string,unknown>|undefined;if(!d)throw new Error('Dépôt introuvable.');assertHotelAccess(actorId,Number(d.hotel_id));if(!['recu','affecte'].includes(String(d.statut)))throw new Error('Dépôt déjà soldé.');if(!motif.trim())throw new Error('Motif obligatoire.');
  db.transaction(()=>{db.prepare(`INSERT INTO pms_depot_operations(depot_id,type_operation,montant,motif,reference,effectue_par) VALUES(?,?,?,?,?,?)`).run(depotId,type,Number(d.montant),motif.trim(),reference?.trim()||null,actorId);db.prepare(`UPDATE pms_depots SET statut=?,updated_at=datetime('now') WHERE id=?`).run(type==='remboursement'?'rembourse':'annule',depotId);db.prepare(`UPDATE reservations SET montant_paye=MAX(0,montant_paye-?),updated_at=datetime('now') WHERE id=?`).run(Number(d.montant),Number(d.reservation_id));})();
  writeAuditLog({userId:actorId,action:'UPDATE',module:'hebergement',description:`Dépôt #${depotId} ${type}`});
}

export function transferFolioLines(actorId:number,sourceReservationId:number,destinationReservationId:number,lineIds:number[],motif:string):void{
  if(sourceReservationId===destinationReservationId)throw new Error('Les folios source et destination doivent être différents.');if(!lineIds.length)throw new Error('Sélectionnez au moins une ligne.');if(!motif.trim())throw new Error('Motif du transfert obligatoire.');
  const db=getDatabase();const sourceRes=getReservation(actorId,sourceReservationId);const destRes=getReservation(actorId,destinationReservationId);assertHotelAccess(actorId,sourceRes.hotelId);if(sourceRes.hotelId!==destRes.hotelId)throw new Error('Transfert de folio limité au même hôtel.');const source=createFolioFromReservation(actorId,sourceReservationId);const dest=createFolioFromReservation(actorId,destinationReservationId);if(source.statut!=='ouvert'||dest.statut!=='ouvert')throw new Error('Les deux folios doivent être ouverts.');
  db.transaction(()=>{for(const lineId of lineIds){const line=db.prepare(`SELECT * FROM hebergement_folio_lignes WHERE id=? AND folio_id=?`).get(lineId,source.id) as Record<string,unknown>|undefined;if(!line)throw new Error(`Ligne de folio #${lineId} introuvable.`);db.prepare(`UPDATE hebergement_folio_lignes SET folio_id=?,ordre=(SELECT COALESCE(MAX(ordre),0)+1 FROM hebergement_folio_lignes WHERE folio_id=?) WHERE id=?`).run(dest.id,dest.id,lineId);db.prepare(`INSERT INTO pms_folio_mouvements(folio_source_id,folio_destination_id,ligne_source_id,montant_ttc,motif,effectue_par) VALUES(?,?,?,?,?,?)`).run(source.id,dest.id,lineId,Number(line.montant_ttc),motif.trim(),actorId);}recalc(db,source.id);recalc(db,dest.id);})();
  writeAuditLog({userId:actorId,action:'UPDATE',module:'hebergement',description:`Transfert folio #${source.id} vers #${dest.id}`});
}

function recalc(db:Db,folioId:number):void{const t=db.prepare(`SELECT COALESCE(SUM(montant_ht),0) ht,COALESCE(SUM(montant_ttc),0) ttc FROM hebergement_folio_lignes WHERE folio_id=?`).get(folioId) as {ht:number;ttc:number};db.prepare(`UPDATE hebergement_folios SET total_ht=?,total_ttc=?,updated_at=datetime('now') WHERE id=?`).run(t.ht,t.ttc,folioId);}

export function shareFolio(actorId:number,folioReservationId:number,sharedReservationId:number):void{
  const db=getDatabase();const owner=getReservation(actorId,folioReservationId);const shared=getReservation(actorId,sharedReservationId);assertHotelAccess(actorId,owner.hotelId);if(owner.hotelId!==shared.hotelId)throw new Error('Partage de folio limité au même hôtel.');const folio=createFolioFromReservation(actorId,folioReservationId);db.prepare(`INSERT OR IGNORE INTO pms_folio_partages(folio_id,reservation_partagee_id,created_by) VALUES(?,?,?)`).run(folio.id,sharedReservationId,actorId);writeAuditLog({userId:actorId,action:'UPDATE',module:'hebergement',description:`Folio #${folio.id} partagé avec réservation #${sharedReservationId}`});
}
