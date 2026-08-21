/** Types Phase 2 — contrôle interne, hôtellerie légale, archivage */

export type WorkflowStatut =
  | 'brouillon'
  | 'soumis'
  | 'en_validation'
  | 'valide'
  | 'valide_unite'
  | 'valide_dec'
  | 'refuse'
  | 'cloture'
  | 'annule';

export interface WorkflowInstance {
  id: number;
  module: string;
  entityType: string;
  entityId: number;
  hotelId: number | null;
  statut: WorkflowStatut;
  priorite: string;
  niveauValidation: number;
  demandeurUserId: number | null;
  validateurUserId: number | null;
  motifRefus: string | null;
  commentaire: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkflowHistoryEntry {
  id: number;
  workflowId: number;
  action: string;
  ancienStatut: string | null;
  nouveauStatut: string | null;
  actorUserId: number | null;
  actorNom: string | null;
  motif: string | null;
  commentaire: string | null;
  createdAt: string;
}

export interface CreateWorkflowInput {
  module: string;
  entityType: string;
  entityId: number;
  hotelId?: number;
  priorite?: 'basse' | 'normale' | 'haute' | 'critique';
  commentaire?: string;
}

export interface WorkflowFilters {
  module?: string;
  statut?: WorkflowStatut | WorkflowStatut[];
  hotelId?: number;
  pendingOnly?: boolean;
}

export type DailyClosureStatut = 'brouillon' | 'soumis' | 'valide_unite' | 'valide_dec' | 'refuse' | 'cloture';

export interface DailyClosureItem {
  id: number;
  rubrique: string;
  montant: number;
  sourceModule: string | null;
  observation: string | null;
}

export interface DailyClosure {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  caDeclare: number;
  /** @deprecated alias — prefer encaissementsTotal */
  montantEncaisse?: number;
  encaissementsTotal?: number;
  /** @deprecated alias — prefer creancesTotal */
  montantCreance?: number;
  creancesTotal?: number;
  /** @deprecated alias — prefer ecartCaisse */
  ecart?: number;
  ecartCaisse?: number;
  statut: DailyClosureStatut;
  reconciliationId: number | null;
  workflowId: number | null;
  items?: DailyClosureItem[];
}

export type ReconciliationStatut = 'a_controler' | 'equilibre' | 'ecart_justifie' | 'ecart_non_justifie' | 'valide';

export interface FinanceReconciliation {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  caDeclare: number;
  montantEspeces: number;
  montantTpe: number;
  montantVirement: number;
  montantCheque: number;
  montantCreance: number;
  totalRapproche: number;
  ecart: number;
  statut: ReconciliationStatut;
  justification: string | null;
}

export type CreanceStatut = 'ouverte' | 'partielle' | 'reglee' | 'litige' | 'irrecouvrable' | 'annulee';

export interface GlobalCreance {
  id: number;
  sourceModule: string;
  sourceEntityType: string | null;
  sourceEntityId: number | null;
  hotelId: number | null;
  clientLabel: string;
  referencePiece: string | null;
  datePiece: string | null;
  dateEcheance: string | null;
  montantTotal: number;
  montantRegle: number;
  montantRestant: number;
  statut: CreanceStatut;
  niveauRisque: string;
  lastRelanceAt: string | null;
}

export interface BalanceAgeeLigne {
  tranche: string;
  montant: number;
  count: number;
}

export interface DecAlert {
  id: number;
  sourceModule: string;
  hotelId: number | null;
  hotelName: string | null;
  severity: 'info' | 'warning' | 'critical';
  statut: string;
  titre: string;
  description: string | null;
  dueAt: string | null;
  createdAt: string;
}

export interface DecWidgetData {
  code: string;
  libelle: string;
  domaine: string;
  value: number | string;
  level: 'normal' | 'warning' | 'critical';
}

export interface DecCockpitDashboard {
  alerts: DecAlert[];
  widgets: DecWidgetData[];
  generatedAt: string;
}

export interface PdgKpi {
  code: string;
  libelle: string;
  domaine: string;
  unite: string;
  value: number;
  level: 'normal' | 'warning' | 'critical';
}

export interface PdgDashboard {
  kpis: PdgKpi[];
  parHotel: { hotelId: number; hotelName: string; caMois: number; occupation: number; creances: number }[];
  generatedAt: string;
}

export interface OrganigrammeNode {
  id: number;
  type: 'direction' | 'departement' | 'poste';
  libelle: string;
  parentId: number | null;
  effectifCible: number;
  effectifReel: number;
  ecart: number;
  enfants?: OrganigrammeNode[];
}

export interface EffectifEgtSummary {
  directionId: number;
  directionNom: string;
  effectifCible: number;
  effectifReel: number;
  ecart: number;
}

export interface FichePoste {
  id: number;
  posteId: number;
  posteLibelle: string;
  version: number;
  missions: string | null;
  responsabilites: string | null;
  competences: string | null;
  kpiJson: string | null;
  actif: boolean;
  updatedAt: string;
}

export interface ChecklistTemplate {
  id: number;
  code: string;
  libelle: string;
  domaine: string;
  frequence: string;
  itemsCount: number;
}

export interface ChecklistRun {
  id: number;
  templateId: number;
  templateLibelle: string;
  hotelId: number | null;
  dateControle: string;
  statut: string;
  score: number | null;
  observation: string | null;
}

export interface ChecklistResultItem {
  itemId: number;
  libelle: string;
  criticite: string;
  statut: string;
  commentaire: string | null;
  preuvePath: string | null;
}

export interface FichePolice {
  id: number;
  hotelId: number;
  reservationId: number | null;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  nationalite: string | null;
  typePiece: 'cni' | 'passeport' | 'permis_sejour' | 'autre';
  numeroPiece: string;
  dateEntree: string;
  dateSortiePrevue: string | null;
  dateSortieReelle: string | null;
  chambreNumero: string | null;
  statut: string;
}

export interface GedLegalArchive {
  id: number;
  documentId: number;
  documentNom: string;
  politiqueCode: string;
  hashSha256: string;
  horodatage: string;
  retentionUntil: string;
  statut: string;
}

export type HealthStatus = 'ok' | 'warning' | 'critical';

export interface SystemHealthCheck {
  code: string;
  libelle: string;
  statut: HealthStatus;
  message: string;
  detail?: string;
}

export interface SystemHealthReport {
  overall: HealthStatus;
  checks: SystemHealthCheck[];
  generatedAt: string;
  appVersion: string;
}
