export type TypeTexteReglementaire = 'loi' | 'decret' | 'arrete' | 'circulaire' | 'norme' | 'autre';
export type CategorieVeille = 'marches_publics' | 'fiscal' | 'travail' | 'tourisme' | 'securite' | 'environnement' | 'sante' | 'urbanisme' | 'autre';
export type StatutConformite = 'a_evaluer' | 'en_cours' | 'conforme' | 'non_applicable';

export interface TexteReglementaire {
  id: number;
  uuid: string;
  hotelId: number | null;
  hotelName: string | null;
  reference: string | null;
  titre: string;
  typeTexte: TypeTexteReglementaire;
  categorie: CategorieVeille;
  datePublication: string | null;
  dateEntreeVigueur: string | null;
  dateRevue: string | null;
  resume: string | null;
  statutConformite: StatutConformite;
  responsable: string | null;
  urlSource: string | null;
  nomFichier: string | null;
  taille: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTexteReglementaireInput {
  hotelId?: number | null;
  reference?: string;
  titre: string;
  typeTexte: TypeTexteReglementaire;
  categorie: CategorieVeille;
  datePublication?: string;
  dateEntreeVigueur?: string;
  dateRevue?: string;
  resume?: string;
  statutConformite?: StatutConformite;
  responsable?: string;
  urlSource?: string;
}

export type UpdateTexteReglementaireInput = Partial<CreateTexteReglementaireInput>;
