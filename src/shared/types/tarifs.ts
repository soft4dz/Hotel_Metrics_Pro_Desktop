// ── Composants ────────────────────────────────────────────────────────────────

export type ModeCalcul = 'PAR_NUIT' | 'PAR_PERSONNE_NUIT' | 'PAR_SEJOUR' | 'FIXE';

export interface ComposantTarif {
  id: number;
  hotelId: number;
  hotelName: string;
  code: string;
  label: string;
  modeCalcul: ModeCalcul;
  prixDefaut: number;
  description: string | null;
  actif: boolean;
  createdAt: string;
}

export interface CreateComposantInput {
  hotelId: number;
  code: string;
  label: string;
  modeCalcul: ModeCalcul;
  prixDefaut: number;
  description?: string;
}

// ── Formules ──────────────────────────────────────────────────────────────────

export interface FormuleComposant {
  composantId: number;
  code: string;
  label: string;
  modeCalcul: ModeCalcul;
  prixDefaut: number;
  prixOverride: number | null;
  prixEffectif: number;
}

export interface FormuleTarif {
  id: number;
  hotelId: number;
  hotelName: string;
  code: string;
  label: string;
  description: string | null;
  actif: boolean;
  composants: FormuleComposant[];
  createdAt: string;
}

export interface CreateFormuleInput {
  hotelId: number;
  code: string;
  label: string;
  description?: string;
  composants: { composantId: number; prixOverride?: number }[];
}

// ── Plans tarifaires ──────────────────────────────────────────────────────────

export type TypePlan = 'BASIQUE' | 'PROMOTIONNEL' | 'PACKAGE' | 'GROUPE';

export interface PlanTarifaire {
  id: number;
  hotelId: number;
  hotelName: string;
  code: string;
  label: string;
  typePlan: TypePlan;
  conditionsAnnulation: string | null;
  conditionsPaiement: string | null;
  priorite: number;
  actif: boolean;
  createdAt: string;
}

export interface CreatePlanInput {
  hotelId: number;
  code: string;
  label: string;
  typePlan: TypePlan;
  conditionsAnnulation?: string;
  conditionsPaiement?: string;
  priorite?: number;
}

// ── Tarifs journaliers ────────────────────────────────────────────────────────

export interface TarifJournalier {
  id: number;
  hotelId: number;
  typeChambreId: number;
  typeChambreLabel: string;
  planId: number;
  planLabel: string;
  formuleId: number | null;
  formuleLabel: string | null;
  dateApplication: string;
  prixBase: number;
  prixPersonneSupp: number;
  minSejour: number;
  maxSejour: number | null;
  fermetureVente: boolean;
  restrictionArrivee: 'AUCUNE' | 'CDA';
  restrictionDepart: 'AUCUNE' | 'CDD';
}

export interface UpsertTarifInput {
  hotelId: number;
  typeChambreId: number;
  planId: number;
  formuleId?: number;
  dateApplication: string;
  prixBase: number;
  prixPersonneSupp?: number;
  minSejour?: number;
  maxSejour?: number | null;
  fermetureVente?: boolean;
  restrictionArrivee?: 'AUCUNE' | 'CDA';
  restrictionDepart?: 'AUCUNE' | 'CDD';
}

export interface UpsertTarifsBulkInput {
  hotelId: number;
  typeChambreIds: number[];
  planId: number;
  formuleId?: number;
  dateDebut: string;
  dateFin: string;
  prixBase: number;
  prixPersonneSupp?: number;
  minSejour?: number;
  maxSejour?: number | null;
  fermetureVente?: boolean;
}

// ── Promotions ────────────────────────────────────────────────────────────────

export type TypeReductionPromo = 'POURCENTAGE' | 'MONTANT_FIXE';

export interface PromotionTarif {
  id: number;
  hotelId: number;
  hotelName: string;
  nom: string;
  description: string | null;
  dateDebut: string;
  dateFin: string;
  typeReduction: TypeReductionPromo;
  valeurReduction: number;
  minSejour: number;
  joursSemaine: number[] | null;
  typeChambreIds: number[] | null;
  formulesIds: number[] | null;
  actif: boolean;
  createdAt: string;
}

export interface CreatePromotionInput {
  hotelId: number;
  nom: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  typeReduction: TypeReductionPromo;
  valeurReduction: number;
  minSejour?: number;
  joursSemaine?: number[];
  typeChambreIds?: number[];
  formulesIds?: number[];
}

// ── Conventions client ────────────────────────────────────────────────────────

export type TypeReductionConvention = 'FIXE_PRIX' | 'POURCENTAGE';

export interface ConventionTarifLigne {
  id: number;
  typeChambreId: number;
  typeChambreLabel: string;
  formuleId: number | null;
  formuleLabel: string | null;
  typeReduction: TypeReductionConvention;
  valeur: number;
}

export interface Convention {
  id: number;
  hotelId: number;
  hotelName: string;
  clientId: number;
  clientNom: string;
  nom: string;
  description: string | null;
  dateDebut: string;
  dateFin: string;
  priorite: number;
  estActive: boolean;
  tarifs: ConventionTarifLigne[];
  createdAt: string;
}

export interface CreateConventionInput {
  hotelId: number;
  clientId: number;
  nom: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  priorite?: number;
  tarifs: {
    typeChambreId: number;
    formuleId?: number;
    typeReduction: TypeReductionConvention;
    valeur: number;
  }[];
}

// ── Calcul de prix ────────────────────────────────────────────────────────────

export interface SimulateurInput {
  hotelId: number;
  typeChambreId: number;
  planId: number;
  formuleId?: number;
  dateArrivee: string;
  dateDepart: string;
  nbAdultes: number;
  nbEnfants?: number;
  clientId?: number;
}

export interface DetailNuit {
  date: string;
  prixBase: number;
  prixComposants: { label: string; montant: number }[];
  prixConvention: number | null;
  prixPromo: number | null;
  prixFinal: number;
}

export interface SimulateurResult {
  nbNuits: number;
  prixTotal: number;
  conventionAppliquee: string | null;
  promoAppliquee: string | null;
  detail: DetailNuit[];
}
