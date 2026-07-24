/** Types Phase 3 — modules légaux (immobilisations, CASNOS, inventaire) */

export interface ModulesLegauxDashboard {
  immobilisationsActives: number;
  amortissementsPrevus: number;
  casnosAffiliesActifs: number;
  casnosDeclarationsEnAttente: number;
  inventairesEnCours: number;
  inventairesEcarts: number;
}

export interface Immobilisation {
  id: number;
  code: string;
  libelle: string;
  categorie: string;
  dateAcquisition: string;
  valeurAcquisition: number;
  valeurResiduelle: number;
  dureeAmortissementMois: number;
  statut: string;
  hotelId: number | null;
}

export interface AmortissementLigne {
  id: number;
  immobilisationId: number;
  immoCode: string;
  periode: string;
  dotation: number;
  cumulAmortissement: number;
  vnc: number;
  statut: string;
}

export interface CasnosAffilie {
  id: number;
  typeAffilie: string;
  nom: string;
  prenom: string | null;
  nin: string | null;
  tauxCotisation: number;
  revenuAssiette: number;
  actif: boolean;
}

export interface CasnosDeclaration {
  id: number;
  affilieId: number;
  affilieNom: string;
  periode: string;
  revenuDeclare: number;
  cotisationCalculee: number;
  statut: string;
  referenceCasnos: string | null;
}

export interface InventaireSession {
  id: number;
  exercice: number;
  hotelId: number;
  dateInventaire: string;
  statut: string;
  totalValeurComptable: number;
  totalValeurPhysique: number;
  ecartTotal: number;
}

export interface InventaireLigne {
  id: number;
  designation: string;
  quantiteComptable: number;
  quantitePhysique: number;
  valeurComptable: number;
  valeurPhysique: number;
  ecartValeur: number;
  motifEcart: string | null;
}
