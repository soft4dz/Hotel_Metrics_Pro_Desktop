export type ModePaiement = 'especes' | 'cheque' | 'virement' | 'carte' | 'effet' | 'autre';
export type EncaissementStatut = 'en_attente' | 'confirme' | 'rejete';

export const MODE_LABELS: Record<ModePaiement, string> = {
  especes:  'Espèces',
  cheque:   'Chèque',
  virement: 'Virement',
  carte:    'Carte bancaire',
  effet:    'Effet de commerce',
  autre:    'Autre',
};

export const STATUT_LABELS: Record<EncaissementStatut, string> = {
  en_attente: 'En attente',
  confirme:   'Confirmé',
  rejete:     'Rejeté',
};

export interface EncaissementItem {
  id: number;
  uuid: string;
  hotelId: number;
  hotelName: string;
  dateEncaissement: string;
  montant: number;
  mode: ModePaiement;
  reference: string | null;
  description: string | null;
  statut: EncaissementStatut;
  compteBancaireId: number | null;
  compteBancaireIntitule: string | null;
  createdAt: string;
}

export interface EncaissementFilters {
  hotelId?: number;
  mode?: ModePaiement;
  statut?: EncaissementStatut;
  dateDebut?: string;
  dateFin?: string;
}

export interface CreateEncaissementInput {
  hotelId: number;
  dateEncaissement: string;
  montant: number;
  mode: ModePaiement;
  reference?: string;
  description?: string;
  statut?: EncaissementStatut;
  compteBancaireId?: number;
}

export interface CompteBancaire {
  id: number;
  hotelId: number;
  hotelName: string;
  intitule: string;
  banque: string;
  numeroCompte: string;
  soldeInitial: number;
  actif: boolean;
}

export interface CreateCompteInput {
  hotelId: number;
  intitule: string;
  banque: string;
  numeroCompte?: string;
  soldeInitial?: number;
  actif?: boolean;
}

export interface JournalCaisseEntry {
  id: number;
  hotelId: number;
  hotelName: string;
  dateOperation: string;
  libelle: string;
  entree: number;
  sortie: number;
  solde: number;
  createdAt: string;
}

export interface AddCaisseInput {
  hotelId: number;
  dateOperation: string;
  libelle: string;
  entree?: number;
  sortie?: number;
}

export interface TresorerieDashboard {
  totalEncaisseJour: number;
  totalEncaisseMois: number;
  totalEnAttente: number;
  nombreEnAttente: number;
  tauxCouverture: number;
  evolutionJours: { date: string; montant: number }[];
  parMode: { mode: ModePaiement; montant: number; count: number }[];
  parHotel: { hotelId: number; hotelName: string; encaisse: number; enAttente: number }[];
  recentEncaissements: EncaissementItem[];
}
