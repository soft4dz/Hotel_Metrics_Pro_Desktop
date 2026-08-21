export type TypeAjustement = 'POURCENTAGE' | 'MONTANT_FIXE';

export interface YieldRule {
  id: number;
  hotelId: number;
  hotelName: string;
  typeChambreId: number | null;
  typeChambreLabel: string | null;
  nom: string;
  occupationMin: number | null;
  occupationMax: number | null;
  joursAvantMax: number | null;
  ajustementType: TypeAjustement;
  ajustementValeur: number;
  priorite: number;
  actif: boolean;
  createdAt: string;
}

export interface CreateYieldRuleInput {
  hotelId: number;
  typeChambreId?: number | null;
  nom: string;
  occupationMin?: number | null;
  occupationMax?: number | null;
  joursAvantMax?: number | null;
  ajustementType: TypeAjustement;
  ajustementValeur: number;
  priorite?: number;
}

export type UpdateYieldRuleInput = Partial<CreateYieldRuleInput>;

export interface ComputeYieldSuggestionsInput {
  hotelId: number;
  planId: number;
  dateDebut: string;
  dateFin: string;
  typeChambreId?: number;
  formuleId?: number;
}

export interface YieldSuggestion {
  hotelId: number;
  typeChambreId: number;
  typeChambreLabel: string;
  planId: number;
  formuleId: number | null;
  dateApplication: string;
  occupationPct: number;
  prixActuel: number;
  prixSuggere: number;
  ruleId: number;
  ruleNom: string;
}

export interface ApplyYieldSuggestionsInput {
  suggestions: {
    hotelId: number;
    typeChambreId: number;
    planId: number;
    formuleId: number | null;
    dateApplication: string;
    prixSuggere: number;
  }[];
}
