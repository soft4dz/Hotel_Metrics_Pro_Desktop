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

export interface PaymentOrder { id:number; numero:string; hotel_id:number; facture_fournisseur_id:number|null; facture_numero:string|null; compte_bancaire_id:number|null; compte_bancaire:string|null; beneficiaire:string; montant:number; mode:'virement'|'cheque'|'prelevement'|'autre'; date_echeance:string; reference:string|null; numero_cheque:string|null; statut:'brouillon'|'soumis'|'approuve'|'execute'|'rejete'|'annule' }
export interface TreasuryForecastLine { id:number; date:string; libelle:string; categorie:string; sens:'encaissement'|'decaissement'; montant:number; probabilite:number; statut:string; source:string; impactPondere:number; soldeCumule:number }
export interface BankStatementLine { id:number; releve_id:number; date_operation:string; date_valeur:string|null; libelle:string; reference:string|null; debit:number; credit:number; solde:number|null; statut:'non_rapprochee'|'rapprochee'|'ignoree'; nom_fichier:string }
export interface ReconciliationSuggestion { id:number; date:string; reference:string|null; montant:number; type:'encaissement'|'paiement_fournisseur'; score:number }
export interface CostCenter { id:number; hotel_id:number; code:string; libelle:string; responsable:string|null; actif:number }
