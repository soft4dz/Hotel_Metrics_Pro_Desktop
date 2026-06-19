import { getDatabase } from '../database/sqlite';

export interface ParkingConfig { hotelId: number; capacite: number; tarifHeure: number; tarifJour: number; tarifNuit: number }
export interface ParkingTicket {
  id: number; uuid: string; hotelId: number; immatriculation: string | null;
  typeVehicule: string; entreeAt: string; dateEntree: string;
  sortieAt: string | null; dateSortie: string | null;
  dureeMinutes: number | null; montant: number | null; montantTotal: number | null;
  statut: string; createdAt: string;
}
export interface ParkingStats {
  enCours: number; terminesAujourdhui: number; recettesJour: number; tauxOccupation: number;
  placesTotal: number; placesOccupees: number; placesLibres: number;
  entreesAujourdhui: number; chiffreAffaireJour: number;
}
export interface CreateTicketInput { hotelId: number; immatriculation?: string; typeVehicule?: string }

function mapTicket(r: Record<string, unknown>): ParkingTicket {
  const entreeAt = r.entree_at as string;
  const sortieAt = r.sortie_at as string | null;
  const montant = r.montant as number | null;
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number,
    immatriculation: r.immatriculation as string | null, typeVehicule: r.type_vehicule as string,
    entreeAt, dateEntree: entreeAt, sortieAt, dateSortie: sortieAt,
    dureeMinutes: r.duree_minutes as number | null, montant, montantTotal: montant,
    statut: r.statut as string, createdAt: r.created_at as string };
}

export function getConfig(hotelId: number): ParkingConfig {
  const db = getDatabase();
  const r = db.prepare(`SELECT * FROM parking_config WHERE hotel_id = ?`).get(hotelId) as Record<string, number> | undefined;
  return r ? { hotelId, capacite: r.capacite, tarifHeure: r.tarif_heure, tarifJour: r.tarif_jour, tarifNuit: r.tarif_nuit }
    : { hotelId, capacite: 0, tarifHeure: 0, tarifJour: 0, tarifNuit: 0 };
}

export function saveConfig(hotelId: number, input: Partial<ParkingConfig>): ParkingConfig {
  const db = getDatabase();
  db.prepare(`INSERT INTO parking_config (hotel_id, capacite, tarif_heure, tarif_jour, tarif_nuit) VALUES (?,?,?,?,?)
    ON CONFLICT(hotel_id) DO UPDATE SET capacite=excluded.capacite, tarif_heure=excluded.tarif_heure,
    tarif_jour=excluded.tarif_jour, tarif_nuit=excluded.tarif_nuit, updated_at=datetime('now')`)
    .run(hotelId, input.capacite ?? 0, input.tarifHeure ?? 0, input.tarifJour ?? 0, input.tarifNuit ?? 0);
  return getConfig(hotelId);
}

export function listTickets(hotelId: number, statut?: string): ParkingTicket[] {
  const db = getDatabase();
  const where = statut ? 'WHERE hotel_id = ? AND statut = ?' : 'WHERE hotel_id = ?';
  const params = statut ? [hotelId, statut] : [hotelId];
  const rows = db.prepare(`SELECT * FROM parking_tickets ${where} ORDER BY entree_at DESC LIMIT 200`).all(...params) as Record<string, unknown>[];
  return rows.map(mapTicket);
}

export function entreeVehicule(input: CreateTicketInput): ParkingTicket {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO parking_tickets (hotel_id, immatriculation, type_vehicule) VALUES (?,?,?) RETURNING id`)
    .get(input.hotelId, input.immatriculation ?? null, input.typeVehicule ?? 'voiture') as { id: number };
  return mapTicket(db.prepare(`SELECT * FROM parking_tickets WHERE id = ?`).get(res.id) as Record<string, unknown>);
}

export function sortieVehicule(id: number): ParkingTicket {
  const db = getDatabase();
  const ticket = db.prepare(`SELECT * FROM parking_tickets WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!ticket) throw new Error('Ticket introuvable');
  const cfg = getConfig(ticket.hotel_id as number);
  const entree = new Date(ticket.entree_at as string);
  const sortie = new Date();
  const minutes = Math.round((sortie.getTime() - entree.getTime()) / 60000);
  const heures = minutes / 60;
  const montant = heures <= 1 ? cfg.tarifHeure : heures <= 8 ? cfg.tarifHeure * Math.ceil(heures) : cfg.tarifJour;
  db.prepare(`UPDATE parking_tickets SET sortie_at = datetime('now'), duree_minutes = ?, montant = ?, statut = 'termine' WHERE id = ?`)
    .run(minutes, Math.round(montant * 100) / 100, id);
  return mapTicket(db.prepare(`SELECT * FROM parking_tickets WHERE id = ?`).get(id) as Record<string, unknown>);
}

export function getParkingStats(hotelId: number): ParkingStats {
  const db = getDatabase();
  const cfg = getConfig(hotelId);
  const today = new Date().toISOString().slice(0, 10);
  const enCours = (db.prepare(`SELECT COUNT(*) AS n FROM parking_tickets WHERE hotel_id = ? AND statut = 'en_cours'`).get(hotelId) as { n: number }).n;
  const r = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(montant),0) AS rec FROM parking_tickets WHERE hotel_id = ? AND date(sortie_at) = ? AND statut = 'termine'`).get(hotelId, today) as { n: number; rec: number };
  const entreesToday = (db.prepare(`SELECT COUNT(*) AS n FROM parking_tickets WHERE hotel_id = ? AND date(entree_at) = ?`).get(hotelId, today) as { n: number }).n;
  const tauxOccupation = cfg.capacite > 0 ? Math.round((enCours / cfg.capacite) * 100) : 0;
  return {
    enCours,
    terminesAujourdhui: r.n,
    recettesJour: r.rec,
    tauxOccupation,
    placesTotal: cfg.capacite,
    placesOccupees: enCours,
    placesLibres: Math.max(0, cfg.capacite - enCours),
    entreesAujourdhui: entreesToday,
    chiffreAffaireJour: r.rec,
  };
}
