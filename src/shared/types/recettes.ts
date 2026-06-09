export type RecetteStatut = 'brouillon' | 'soumis' | 'valide' | 'refuse';

export interface RubriqueOption {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  parentId: number | null;
  parentLabel: string | null;
}

export interface RecetteLigne {
  id: number | null;
  rubriqueId: number;
  rubriqueCode: string;
  rubriqueLabel: string;
  parentLabel: string | null;
  montant: number;
  observation: string | null;
}

export interface SaisieJournaliereDto {
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  statut: RecetteStatut;
  lignes: RecetteLigne[];
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
  totalMontant: number;
  canEdit: boolean;
}

export interface SaveSaisieInput {
  hotelId: number;
  dateJournal: string;
  statut: 'brouillon' | 'soumis';
  lignes: Array<{ rubriqueId: number; montant: number; observation?: string }>;
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
}

export interface HistoriqueItem {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  rubriqueLabel: string;
  montant: number;
  statut: RecetteStatut;
  observation: string | null;
  updatedAt: string;
}

/** Une ligne par hôtel par jour — vue synthétique pour l'historique */
export interface HistoriqueJourItem {
  dateJournal: string;
  hotelId: number;
  hotelName: string;
  statut: RecetteStatut;
  montantHebergement: number;
  montantDenrees: number;
  montantBoissons: number;
  montantAutres: number;
  totalMontant: number;
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
}

export interface HistoriqueFilters {
  hotelId?: number;
  dateFrom?: string;
  dateTo?: string;
  statut?: RecetteStatut;
  search?: string;
}

export interface ValidationJourItem {
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  totalMontant: number;
  statut: RecetteStatut;
  ligneCount: number;
}

export interface MensuelleLigne {
  rubriqueId: number;
  rubriqueLabel: string;
  montantJournalier: number;
  montantMensuel: number;
  ecart: number;
  justification: string | null;
}

export interface RecetteMensuelleDto {
  hotelId: number;
  hotelName: string;
  annee: number;
  mois: number;
  lignes: MensuelleLigne[];
  totalJournalier: number;
  totalMensuel: number;
  ecart: number;
  justificationEcart: string | null;
  statut: string;
  verrouille: boolean;
}

export interface SaveMensuellePayload {
  lignes: Array<{ rubriqueId: number; montantMensuel: number; justification?: string }>;
  justificationEcart?: string;
  verrouiller?: boolean;
}
