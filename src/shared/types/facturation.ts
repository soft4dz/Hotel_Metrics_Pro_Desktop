export type FactureStatut =
  | 'brouillon'
  | 'proforma'
  | 'soumise'
  | 'validee'
  | 'envoyee'
  | 'payee_partielle'
  | 'payee'
  | 'annulee'
  | 'avoir_emis';
export type TypeDocument = 'facture' | 'avoir' | 'proforma';
export type TypeClient = 'particulier' | 'entreprise';
export type ModePaiementFact = 'especes' | 'cheque' | 'virement' | 'carte' | 'effet' | 'autre';

export const STATUT_FACT_LABELS: Record<FactureStatut, string> = {
  brouillon: 'Brouillon',
  proforma: 'Proforma',
  soumise: 'Soumise',
  validee: 'Validée',
  envoyee: 'Envoyée',
  payee_partielle: 'Payée partielle',
  payee: 'Payée',
  annulee: 'Annulée',
  avoir_emis: 'Avoir émis',
};

export const MODE_FACT_LABELS: Record<ModePaiementFact, string> = {
  especes:  'Espèces',
  cheque:   'Chèque',
  virement: 'Virement',
  carte:    'Carte bancaire',
  effet:    'Effet de commerce',
  autre:    'Autre',
};

export const TYPE_CLIENT_LABELS: Record<TypeClient, string> = {
  particulier: 'Particulier',
  entreprise:  'Entreprise',
};

export interface ClientFacturation {
  id: number;
  type: TypeClient;
  nom: string;
  raisonSociale: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  nif: string | null;
  rc: string | null;
}

export interface LigneFacture {
  id: number;
  factureId: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTva: number;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  ordre: number;
}

export interface PaiementFacture {
  id: number;
  factureId: number;
  datePaiement: string;
  montant: number;
  mode: ModePaiementFact;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FactureListItem {
  id: number;
  uuid: string;
  hotelId: number;
  hotelName: string;
  clientId: number | null;
  clientNom: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string | null;
  statut: FactureStatut;
  typeDocument?: TypeDocument;
  factureOrigineId?: number | null;
  verrouillee?: boolean;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  montantPaye: number;
  montantRestant: number;
  createdAt: string;
}

export interface FactureDetail extends FactureListItem {
  notes: string | null;
  lignes: LigneFacture[];
  paiements: PaiementFacture[];
}

export interface FacturationDashboard {
  totalFactureHt: number;
  totalFactureTtc: number;
  totalEncaisseMois: number;
  totalEnAttente: number;
  nombreEnRetard: number;
  tauxRecouvrement: number;
  evolutionMensuelle: { mois: string; facture: number; encaisse: number }[];
  parHotel: { hotelId: number; hotelName: string; facture: number; encaisse: number; enAttente: number }[];
  recentesFactures: FactureListItem[];
}

export interface LigneInput {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTva?: number;
  ordre?: number;
}

export interface CreateFactureInput {
  hotelId: number;
  clientId?: number;
  clientNom?: string;
  dateEmission?: string;
  dateEcheance?: string;
  notes?: string;
  lignes: LigneInput[];
}

export interface AddPaiementInput {
  factureId: number;
  datePaiement: string;
  montant: number;
  mode: ModePaiementFact;
  reference?: string;
  notes?: string;
}

export interface CreateClientInput {
  type: TypeClient;
  nom: string;
  raisonSociale?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  nif?: string;
  rc?: string;
}

export interface FactureFilters {
  hotelId?: number;
  statut?: FactureStatut;
  clientId?: number;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
  typeDocument?: TypeDocument;
}

export interface FactureRegistreItem {
  id: number;
  factureId: number;
  numero: string;
  typeDocument: TypeDocument;
  dateEmission: string;
  clientNom: string;
  nifClient: string | null;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  statut: FactureStatut;
  exercice: number | null;
}

export interface CreateAvoirInput {
  factureOrigineId: number;
  lignes?: LigneInput[];
  notes?: string;
}
