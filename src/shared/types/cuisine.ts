export type StatutRecetteCuisine = 'brouillon' | 'valide' | 'archive';
export type StatutOrdreProduction = 'planifie' | 'en_cours' | 'termine' | 'annule';

export interface CuisineRecetteLigne {
  id: number;
  recetteId: number;
  produitId: number;
  produitCode: string;
  produitDesignation: string;
  quantite: number;
  unite: string;
  tauxPerte: number;
  ordre: number;
  coutLigne?: number;
}

export interface CuisineRecette {
  id: number;
  uuid: string;
  hotelId: number;
  code: string;
  nom: string;
  portions: number;
  prixVente: number | null;
  coutRevient: number | null;
  margePct: number | null;
  statut: StatutRecetteCuisine;
  validePar: number | null;
  valideAt: string | null;
  lignes: CuisineRecetteLigne[];
  createdAt: string;
}

export interface CreateRecetteInput {
  hotelId: number;
  code: string;
  nom: string;
  portions?: number;
  prixVente?: number | null;
}

export interface UpsertRecetteLigneInput {
  produitId: number;
  quantite: number;
  unite?: string;
  tauxPerte?: number;
  ordre?: number;
}

export interface CreateOrdreProductionInput {
  hotelId: number;
  recetteId: number;
  dateProduction: string;
  portionsPrevues: number;
}

export interface CuisineOrdreProduction {
  id: number;
  uuid: string;
  hotelId: number;
  recetteId: number;
  recetteNom: string;
  dateProduction: string;
  portionsPrevues: number;
  portionsRealisees: number | null;
  statut: StatutOrdreProduction;
  coutTheorique: number | null;
  executeAt: string | null;
}
