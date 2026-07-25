export type PosPointVenteType = 'restaurant' | 'bar' | 'room_service' | 'autre';
export type PosSessionStatut = 'ouverte' | 'cloturee';
export type PosTicketStatut = 'brouillon' | 'valide' | 'annule';
export type PosClotureStatut = 'brouillon' | 'cloturee';
export type PosModePaiement = 'especes' | 'carte' | 'cheque' | 'virement' | 'autre';

export interface PosPointVente {
  id: number;
  uuid: string;
  hotelId: number;
  code: string;
  nom: string;
  type: PosPointVenteType;
  actif: boolean;
  createdAt: string;
}

export interface PosFaction {
  id: number;
  pointVenteId: number;
  code: string;
  nom: string;
  heureDebut: string | null;
  heureFin: string | null;
  ordre: number;
  actif: boolean;
}

export interface PosSession {
  id: number;
  uuid: string;
  pointVenteId: number;
  pointVenteNom?: string;
  factionId: number;
  factionNom?: string;
  hotelId: number;
  caissierId: number;
  dateService: string;
  fondCaisse: number;
  statut: PosSessionStatut;
  totalVentes: number;
  totalEspeces: number;
  totalCarte: number;
  totalCheque: number;
  totalVirement: number;
  fondCloture: number | null;
  ecartCaisse: number | null;
  observations: string | null;
  ouvertAt: string;
  clotureAt: string | null;
}

export interface PosTicketLigne {
  id: number;
  ticketId: number;
  recetteId: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montantLigne: number;
  tauxTva: number;
}

export interface PosTicket {
  id: number;
  uuid: string;
  sessionId: number;
  pointVenteId: number;
  hotelId: number;
  numero: string;
  statut: PosTicketStatut;
  totalHt: number;
  totalTtc: number;
  tvaMontant: number;
  modePaiement: PosModePaiement | null;
  dateTicket: string;
  createdAt: string;
  validatedAt: string | null;
  lignes: PosTicketLigne[];
}

export interface PosClotureJournaliere {
  id: number;
  uuid: string;
  pointVenteId: number;
  pointVenteNom?: string;
  hotelId: number;
  dateJournal: string;
  statut: PosClotureStatut;
  totalVentes: number;
  totalEspeces: number;
  totalCarte: number;
  nbTickets: number;
  nbSessions: number;
  ecartCaisse: number;
  observations: string | null;
  clotureAt: string | null;
}

export interface PosRapportSession {
  sessionId: number;
  pointVenteNom: string;
  factionNom: string;
  dateService: string;
  fondCaisse: number;
  totalVentes: number;
  totalEspeces: number;
  totalCarte: number;
  totalCheque: number;
  totalVirement: number;
  nbTickets: number;
  fondTheorique: number;
  fondCloture: number | null;
  ecartCaisse: number | null;
}

export interface CreatePointVenteInput {
  hotelId: number;
  code: string;
  nom: string;
  type?: PosPointVenteType;
}

export interface CreateFactionInput {
  pointVenteId: number;
  code: string;
  nom: string;
  heureDebut?: string;
  heureFin?: string;
  ordre?: number;
}

export interface OpenSessionInput {
  pointVenteId: number;
  factionId: number;
  dateService?: string;
  fondCaisse?: number;
}

export interface CreateTicketInput {
  sessionId: number;
}

export interface AddTicketLigneInput {
  ticketId: number;
  recetteId: number;
  quantite: number;
  prixUnitaire?: number;
}

export interface ValiderTicketInput {
  ticketId: number;
  modePaiement: PosModePaiement;
}

export interface CloturerSessionInput {
  sessionId: number;
  fondCloture: number;
  observations?: string;
}

export interface CloturerJourneeInput {
  pointVenteId: number;
  dateJournal: string;
  observations?: string;
}

export interface PosPointVenteClosureStatus {
  pointVenteId: number;
  nom: string;
  closed: boolean;
  openSessions: number;
  totalVentes: number;
}

export interface PosHotelClosureStatus {
  required: boolean;
  allClosed: boolean;
  points: PosPointVenteClosureStatus[];
}
