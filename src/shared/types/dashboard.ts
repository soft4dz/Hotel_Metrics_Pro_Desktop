export interface DashboardFilters {
  dateDebut?: string;
  dateFin?: string;
  annee: number;
  mois?: number;
  hotelId?: number;
  rubriqueId?: number;
}

export interface DashboardKpis {
  caJour: number;
  caMois: number;
  caAnnuel: number;
  objectifMois: number;
  realiseMois: number;
  tauxRealisation: number;
  totalEncaissements: number;
  tauxEncaissement: number;
  ecartObjectif: number;
  saisiesRealisees: number;
  saisiesManquantes: number;
  periodeLabel: string;
  variationCaPct: number;
  tauxOccupation: number;
  revPAR: number;
  adr: number;
  prixMoyenCouvert: number;
}

export interface HotelRubriqueRow {
  code: string;
  label: string;
  realise: number;
  pctTotal: number;
}

export interface HotelAnalyseRow {
  hotelId: number;
  hotelName: string;
  realise: number;
  objectif: number;
  tauxRealisation: number;
  encaissements: number;
  tauxEncaissement: number;
  ecartObjectif: number;
  statut: 'bon' | 'moyen' | 'critique';
  rubriques: HotelRubriqueRow[];
}

export interface RubriqueAnalyseRow {
  groupe: string;
  realise: number;
  pctTotal: number;
  objectif: number;
  tauxObjectif: number;
}

export interface ChartPoint {
  label: string;
  value: number;
  value2?: number;
}

/** Utilisé par CaParHotelChart */
export interface CaParHotel {
  hotelId: number;
  hotelName: string;
  realise: number;
  objectif: number;
}

/** Alias graphique évolution mensuelle (label + montant) */
export interface EvolutionMensuellePoint {
  label: string;
  montant: number;
}

/** Utilisé par ObjectifsCategorieChart */
export interface CaParCategorie {
  categorie: string;
  objectif: number;
  realise: number;
}

export interface ObjectifRealisePoint {
  label: string;
  objectif: number;
  realise: number;
}

export interface FrequentationDto {
  chambres: number;
  nuitees: number;
  couverts: number;
}

export interface DashboardAlerte {
  id: string;
  type: string;
  hotelName: string | null;
  description: string;
  niveau: 'information' | 'avertissement' | 'critique';
  date: string;
  resolu: boolean;
}

export interface SaisieManquanteRow {
  hotelId: number;
  hotelName: string;
  dateAttendue: string;
}

export interface DerniereDeclarationRow {
  hotelName: string;
  dateJournal: string;
  montant: number;
  statut: string;
}

export interface DashboardAuditRow {
  id: number;
  userEmail: string | null;
  action: string;
  page: string | null;
  description: string;
  createdAt: string;
}

export interface CaJournalierPoint {
  date: string;
  label: string;
  montant: number;
}

export interface DashboardDto {
  kpis: DashboardKpis;
  parHotel: HotelAnalyseRow[];
  parRubrique: RubriqueAnalyseRow[];
  evolutionJournaliere: CaJournalierPoint[];
  evolutionMensuelle: ChartPoint[];
  caParHotel: ChartPoint[];
  repartitionRubrique: ChartPoint[];
  objectifVsRealise: ObjectifRealisePoint[];
  tauxEncaissementHotel: ChartPoint[];
  comparaisonAnnee: ChartPoint[];
  realisationVsObjectifMensuel: ObjectifRealisePoint[];
  frequentation: FrequentationDto;
  alertes: DashboardAlerte[];
  saisiesManquantes: SaisieManquanteRow[];
  dernieresDeclarations: DerniereDeclarationRow[];
  auditRecent: DashboardAuditRow[];
  canViewAudit: boolean;
  canExport: boolean;
  scopeHotelOnly: boolean;
}
