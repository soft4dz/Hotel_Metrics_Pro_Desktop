export type StatutChambre = 'libre' | 'occupee' | 'hors_service' | 'menage';
export type StatutReservation = 'provisoire' | 'confirmee' | 'arrivee' | 'depart' | 'annulee' | 'no_show';
export type SourceReservation = 'direct' | 'booking' | 'expedia' | 'airbnb' | 'agence' | 'autre';

export interface TypeChambre {
  id: number;
  hotelId: number;
  hotelName: string;
  code: string;
  label: string;
  capacite: number;
  tarifBase: number;
  description: string | null;
  actif: boolean;
  createdAt: string;
}

export interface Chambre {
  id: number;
  hotelId: number;
  hotelName: string;
  typeChambreId: number | null;
  typeChambreLabel: string | null;
  numero: string;
  etage: number;
  statut: StatutChambre;
  description: string | null;
  actif: boolean;
  createdAt: string;
}

export interface EstimateReservationPriceInput {
  hotelId: number;
  chambreId?: number | null;
  typeChambreId?: number;
  planId?: number;
  formuleId?: number | null;
  dateArrivee: string;
  dateDepart: string;
  nbAdultes?: number;
  nbEnfants?: number;
  clientId?: number | null;
}

export interface Reservation {
  id: number;
  hotelId: number;
  hotelName: string;
  chambreId: number | null;
  chambreNumero: string | null;
  typeChambreLabel: string | null;
  clientId: number | null;
  planId: number | null;
  formuleId: number | null;
  factureId: number | null;
  dateArrivee: string;
  dateDepart: string;
  nbNuits: number;
  nbAdultes: number;
  nbEnfants: number;
  clientNom: string;
  clientPrenom: string | null;
  clientEmail: string | null;
  clientTelephone: string | null;
  montantTotal: number;
  montantPaye: number;
  statut: StatutReservation;
  source: SourceReservation;
  notes: string | null;
  createdAt: string;
}

export interface CreateReservationInput {
  hotelId: number;
  chambreId?: number | null;
  clientId?: number | null;
  planId?: number;
  formuleId?: number | null;
  dateArrivee: string;
  dateDepart: string;
  nbAdultes?: number;
  nbEnfants?: number;
  clientNom?: string;
  clientPrenom?: string | null;
  clientEmail?: string | null;
  clientTelephone?: string | null;
  montantTotal?: number;
  statut?: StatutReservation;
  source?: SourceReservation;
  notes?: string | null;
}

export interface CreateTypeChambreInput {
  hotelId: number;
  code: string;
  label: string;
  capacite?: number;
  tarifBase?: number;
  description?: string | null;
}

export interface CreateChambreInput {
  hotelId: number;
  typeChambreId?: number | null;
  numero: string;
  etage?: number;
  statut?: StatutChambre;
  description?: string | null;
}

export interface OccupationKpis {
  hotelId: number;
  hotelName: string;
  date: string;
  totalChambres: number;
  chambresDisponibles: number;
  chambresOccupees: number;
  chambresHorsService: number;
  tauxOccupation: number;        // %
  adr: number;                   // Average Daily Rate
  revpar: number;                // Revenue Per Available Room
  arrivees: number;
  departs: number;
  nbNuiteesVendues: number;
}

export interface OccupationPeriode {
  dateDebut: string;
  dateFin: string;
  hotels: OccupationKpis[];
  totalChambres: number;
  tauxOccupationMoyen: number;
  revparMoyen: number;
  adrMoyen: number;
  totalRevenu: number;
}
