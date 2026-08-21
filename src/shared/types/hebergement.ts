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
  surbookingAutorise: boolean;
  surbookingMotif: string | null;
  politiqueAnnulationId: number | null;
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
  surbookingAutorise?: boolean;
  surbookingMotif?: string | null;
  politiqueAnnulationId?: number | null;
}

export type UpdateReservationInput = Partial<Omit<CreateReservationInput, 'hotelId'>>;

export interface PmsOccupant {
  id: number; reservationId: number; nom: string; prenom: string | null;
  dateNaissance: string | null; nationalite: string | null; typeDocument: string | null;
  numeroDocument: string | null; principal: boolean;
}
export interface PmsMouvementChambre {
  id: number; reservationId: number; ancienneChambreId: number | null;
  ancienneChambreNumero: string | null; nouvelleChambreId: number;
  nouvelleChambreNumero: string; motif: string; surbookingAutorise: boolean; createdAt: string;
}
export interface PmsAttente {
  id: number; hotelId: number; hotelName: string; typeChambreId: number | null;
  clientNom: string; clientPrenom: string | null; clientEmail: string | null;
  clientTelephone: string | null; dateArrivee: string; dateDepart: string;
  nbAdultes: number; nbEnfants: number; priorite: number;
  statut: 'attente'|'contacte'|'convertie'|'annulee'|'expiree';
  notes: string | null; reservationId: number | null;
}
export interface PmsPolitiqueAnnulation {
  id: number; hotelId: number; hotelName: string; nom: string;
  delaiSansFraisJours: number; penaliteType: 'pourcentage'|'montant'|'nuitees';
  penaliteValeur: number; noShowType: 'pourcentage'|'montant'|'nuitees';
  noShowValeur: number; actif: boolean;
}
export interface PmsAnnulationResult {
  reservation: Reservation; montantPenalite: number; montantRemboursable: number;
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

export interface PmsGroupe { id:number; code:string; hotelId:number; hotelName:string; nom:string; dateArrivee:string; dateDepart:string; statut:'option'|'confirme'|'en_cours'|'termine'|'annule'; allotement:number; reservationsCount:number; }
export interface PmsDepot { id:number; reservationId:number; clientNom:string; montant:number; mode:string; reference:string|null; statut:'recu'|'affecte'|'rembourse'|'annule'; dateDepot:string; }
export interface ChannelConnector { id:number; hotelId:number; hotelName:string; code:string; label:string; statut:'inactif'|'actif'|'erreur'; endpointUrl:string|null; lastSyncAt:string|null; lastError:string|null; }
export interface ChannelImportInput { connectorId:number; externalReference:string; hotelId:number; clientNom:string; dateArrivee:string; dateDepart:string; montantTotal?:number; source?:SourceReservation; notes?:string; }
