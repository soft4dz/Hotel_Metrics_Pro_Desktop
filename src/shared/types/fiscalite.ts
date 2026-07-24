export interface RegistreTvaVente {
  id: number;
  numeroPiece: string;
  dateOperation: string;
  periode: string;
  clientNom: string | null;
  baseHt: number;
  montantTva: number;
  montantTtc: number;
  typeMouvement: 'vente' | 'avoir';
}

export interface DeclarationTva {
  id: number;
  periode: string;
  baseHtVentes: number;
  tvaCollectee: number;
  tvaDeductible: number;
  creditAnterieur: number;
  solde: number;
  statut: string;
}

export interface RetenueSource {
  id: number;
  fournisseurNom: string;
  baseHt: number;
  taux: number;
  montantRetenu: number;
  dateRetenue: string;
}

export interface LiasseLigne {
  codeG50: string;
  libelle: string;
  montant: number;
}

export interface CreateRetenueInput {
  fournisseurNom: string;
  nifFournisseur?: string;
  baseHt: number;
  taux?: number;
  dateRetenue: string;
  reference?: string;
}

export interface RegistreTvaAchat {
  id: number;
  dateOperation: string;
  periode: string;
  numeroPiece: string;
  fournisseurNom: string | null;
  nifFournisseur: string | null;
  baseHt: number;
  montantTva: number;
  montantTtc: number;
  source: string;
}

export interface CreateTvaAchatInput {
  dateOperation: string;
  numeroPiece: string;
  fournisseurNom: string;
  nifFournisseur?: string;
  baseHt: number;
  tauxTva?: number;
  hotelId?: number;
}

export interface Teledeclaration {
  id: number;
  typeDecl: 'tva' | 'liasse' | 'retenue';
  periode: string;
  referenceDgi: string | null;
  statut: string;
  montantDeclare: number | null;
  dateExport: string | null;
  dateDeclaration: string | null;
}
