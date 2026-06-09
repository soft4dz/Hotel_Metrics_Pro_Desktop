export interface ObjectifListItem {
  id: number;
  hotelId: number;
  hotelName: string;
  mois: number;
  annee: number;
  objectifTotal: number;
  realiseTotal: number;
  tauxRealisation: number;
}

export interface ObjectifFilters {
  hotelId?: number;
  annee?: number;
  mois?: number;
}

export interface ObjectifDto {
  id: number | null;
  hotelId: number;
  hotelName: string;
  mois: number;
  annee: number;
  objectifHebergement: number;
  objectifRestauration: number;
  objectifBoissons: number;
  objectifAutres: number;
  capaciteChambres: number | null;
  chambresVendues: number | null;
  tauxOccupationChambres: number | null;
  capaciteNuitees: number | null;
  nuiteesVendues: number | null;
  tauxFrequentationNuitees: number | null;
  capaciteRestaurant: number | null;
  couvertsVendus: number | null;
  tauxFrequentationRestaurant: number | null;
  prixMoyenChambre: number | null;
  revenuParChambreConstruite: number | null;
  prixMoyenCouvert: number | null;
  consoHebergement: number | null;
  consoRestauration: number | null;
  consoBoissons: number | null;
  consoAutres: number | null;
  realiseHebergement: number;
  realiseRestauration: number;
  realiseBoissons: number;
  realiseAutres: number;
  canEdit: boolean;
}

export interface SaveObjectifInput {
  hotelId: number;
  mois: number;
  annee: number;
  objectifHebergement: number;
  objectifRestauration: number;
  objectifBoissons: number;
  objectifAutres: number;
  capaciteChambres?: number | null;
  chambresVendues?: number | null;
  tauxOccupationChambres?: number | null;
  capaciteNuitees?: number | null;
  nuiteesVendues?: number | null;
  tauxFrequentationNuitees?: number | null;
  capaciteRestaurant?: number | null;
  couvertsVendus?: number | null;
  tauxFrequentationRestaurant?: number | null;
  prixMoyenChambre?: number | null;
  revenuParChambreConstruite?: number | null;
  prixMoyenCouvert?: number | null;
  consoHebergement?: number | null;
  consoRestauration?: number | null;
  consoBoissons?: number | null;
  consoAutres?: number | null;
}
