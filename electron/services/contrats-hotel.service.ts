import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, actorCanAccessHotel } from './actorContext';

export type ContratHotelStatut = 'brouillon' | 'actif' | 'suspendu' | 'expire' | 'resilie';
export type ContratHotelType = 'convention_entreprise' | 'allotement' | 'mice' | 'prestation_restauration';

export interface ContratHotel {
  id: number;
  uuid: string;
  hotelId: number;
  hotelName: string | null;
  clientId: number | null;
  clientLabel: string | null;
  typeContrat: ContratHotelType | string;
  reference: string;
  dateDebut: string;
  dateFin: string;
  montant: number;
  statut: ContratHotelStatut;
  documentGedId: number | null;
  notes: string | null;
  joursAvantEcheance: number | null;
  createdAt: string;
}

export interface CreateContratHotelInput {
  hotelId: number;
  clientId?: number | null;
  typeContrat?: ContratHotelType | string;
  reference: string;
  dateDebut: string;
  dateFin: string;
  montant?: number;
  statut?: ContratHotelStatut;
  documentGedId?: number | null;
  notes?: string;
}

export interface UpdateContratHotelInput extends Partial<CreateContratHotelInput> {}

function mapContrat(row: Record<string, unknown>): ContratHotel {
  const dateFin = String(row.date_fin);
  const jours = Math.ceil((new Date(dateFin).getTime() - Date.now()) / 86400000);
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    hotelId: Number(row.hotel_id),
    hotelName: row.hotel_name ? String(row.hotel_name) : null,
    clientId: row.client_id ? Number(row.client_id) : null,
    clientLabel: row.client_label ? String(row.client_label) : null,
    typeContrat: String(row.type_contrat),
    reference: String(row.reference),
    dateDebut: String(row.date_debut),
    dateFin,
    montant: Number(row.montant),
    statut: row.statut as ContratHotelStatut,
    documentGedId: row.document_ged_id ? Number(row.document_ged_id) : null,
    notes: row.notes ? String(row.notes) : null,
    joursAvantEcheance: Number.isFinite(jours) ? jours : null,
    createdAt: String(row.created_at),
  };
}

export function listContratsHotel(actorUserId: number, hotelId?: number): ContratHotel[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès refusé.');
    conds.push('c.hotel_id = ?');
    params.push(hotelId);
  }
  const rows = getDatabase().prepare(`
    SELECT c.*, h.name AS hotel_name,
      COALESCE(cl.raison_sociale, cl.nom, '—') AS client_label
    FROM contrats_hotel c
    INNER JOIN hotels h ON h.id = c.hotel_id
    LEFT JOIN clients_facturation cl ON cl.id = c.client_id
    WHERE ${conds.join(' AND ')}
    ORDER BY c.date_fin ASC, c.reference
  `).all(...params) as Record<string, unknown>[];
  return rows.map(mapContrat);
}

export function getContratHotel(actorUserId: number, id: number): ContratHotel {
  const row = getDatabase().prepare(`
    SELECT c.*, h.name AS hotel_name,
      COALESCE(cl.raison_sociale, cl.nom, '—') AS client_label
    FROM contrats_hotel c
    INNER JOIN hotels h ON h.id = c.hotel_id
    LEFT JOIN clients_facturation cl ON cl.id = c.client_id
    WHERE c.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Contrat introuvable.');
  if (!actorCanAccessHotel(getActorContext(actorUserId), Number(row.hotel_id))) throw new Error('Accès refusé.');
  return mapContrat(row);
}

export function createContratHotel(actorUserId: number, input: CreateContratHotelInput): ContratHotel {
  if (!actorCanAccessHotel(getActorContext(actorUserId), input.hotelId)) throw new Error('Accès refusé.');
  const r = getDatabase().prepare(`
    INSERT INTO contrats_hotel (hotel_id, client_id, type_contrat, reference, date_debut, date_fin, montant, statut, document_ged_id, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.hotelId,
    input.clientId ?? null,
    input.typeContrat ?? 'convention_entreprise',
    input.reference,
    input.dateDebut,
    input.dateFin,
    input.montant ?? 0,
    input.statut ?? 'actif',
    input.documentGedId ?? null,
    input.notes ?? null,
    actorUserId,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'contrats_hotel', description: `Contrat ${input.reference}` });
  return getContratHotel(actorUserId, Number(r.lastInsertRowid));
}

export function updateContratHotel(actorUserId: number, id: number, input: UpdateContratHotelInput): ContratHotel {
  const existing = getContratHotel(actorUserId, id);
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.clientId !== undefined) { sets.push('client_id = ?'); params.push(input.clientId); }
  if (input.typeContrat !== undefined) { sets.push('type_contrat = ?'); params.push(input.typeContrat); }
  if (input.reference !== undefined) { sets.push('reference = ?'); params.push(input.reference); }
  if (input.dateDebut !== undefined) { sets.push('date_debut = ?'); params.push(input.dateDebut); }
  if (input.dateFin !== undefined) { sets.push('date_fin = ?'); params.push(input.dateFin); }
  if (input.montant !== undefined) { sets.push('montant = ?'); params.push(input.montant); }
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.documentGedId !== undefined) { sets.push('document_ged_id = ?'); params.push(input.documentGedId); }
  if (input.notes !== undefined) { sets.push('notes = ?'); params.push(input.notes); }
  params.push(id);
  getDatabase().prepare(`UPDATE contrats_hotel SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'contrats_hotel', description: `Contrat ${existing.reference} modifié` });
  return getContratHotel(actorUserId, id);
}

export function listContratsEcheanceProche(actorUserId: number, jours = 30): ContratHotel[] {
  return listContratsHotel(actorUserId).filter((c) => {
    if (c.statut !== 'actif') return false;
    return c.joursAvantEcheance !== null && c.joursAvantEcheance >= 0 && c.joursAvantEcheance <= jours;
  });
}
