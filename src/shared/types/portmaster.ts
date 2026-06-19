export interface BateauListItem {
  id: number;
  nom: string;
  immatriculation: string | null;
  typeNavire: string | null;
  proprietaire: string;
  longueurM: number | null;
  statut: string;
  contratActif: string | null;
  emplacementCode: string | null;
}

export interface BateauDto {
  id: number;
  nom: string;
  immatriculation: string | null;
  typeNavire: string | null;
  proprietaire: string;
  contactEmail: string | null;
  contactTel: string | null;
  longueurM: number | null;
  largeurM: number | null;
  statut: string;
  notes: string | null;
}

export interface SaveBateauInput {
  nom: string;
  immatriculation?: string | null;
  typeNavire?: string | null;
  proprietaire: string;
  contactEmail?: string | null;
  contactTel?: string | null;
  longueurM?: number | null;
  largeurM?: number | null;
  statut?: string;
  notes?: string | null;
}

export interface EmplacementListItem {
  id: number;
  code: string;
  label: string;
  zone: string | null;
  longueurMaxM: number | null;
  statut: string;
  bateauNom: string | null;
  contratNumero: string | null;
}

export interface EmplacementOption {
  id: number;
  code: string;
  label: string;
  statut: string;
}

export interface ContratListItem {
  id: number;
  numero: string;
  bateauNom: string;
  emplacementCode: string;
  dateDebut: string;
  dateFin: string | null;
  montantTotal: number;
  encaisse: number;
  resteARecouvrer: number;
  statut: string;
}

export interface ContratDto {
  id: number;
  numero: string;
  bateauId: number;
  bateauNom: string;
  emplacementId: number;
  emplacementCode: string;
  dateDebut: string;
  dateFin: string | null;
  montantMensuel: number;
  montantTotal: number;
  encaisse: number;
  resteARecouvrer: number;
  statut: string;
  observation: string | null;
}

export interface SaveContratInput {
  numero: string;
  bateauId: number;
  emplacementId: number;
  dateDebut: string;
  dateFin?: string | null;
  montantMensuel: number;
  montantTotal: number;
  statut: string;
  observation?: string | null;
}

export interface AddEncaissementInput {
  contratId: number;
  dateEncaissement: string;
  montant: number;
  modePaiement?: string | null;
  reference?: string | null;
  observation?: string | null;
}

export interface PortAlerte {
  id: string;
  categorie: string;
  severite: 'info' | 'warning' | 'danger';
  message: string;
  entityType?: string;
  entityId?: number;
  link?: string;
}

export interface PortDashboardDto {
  emplacementsTotal: number;
  emplacementsOccupes: number;
  emplacementsLibres: number;
  emplacementsReserves: number;
  contratsActifs: number;
  contratsExpiresProches: number;
  bateauxPresents: number;
  bateauxIrreguliers: number;
  caFacture: number;
  encaissementsRealises: number;
  creancesClients: number;
  validationsEnAttente: number;
  resteARecouvrer: number;
  encaissementsMois: number;
  repartitionTypes: Array<{ type: string; count: number }>;
  revenueChart: Array<{ mois: string; caFacture: number; encaissements: number }>;
  periodeLabel: string;
  variationCaPct: number | null;
  variationEncaissementsPct: number | null;
  emplacements: EmplacementListItem[];
  contratsRecents: ContratListItem[];
  alertes: PortAlerte[];
}

export interface ClientListItem {
  id: number;
  typeClient: string;
  displayName: string;
  email: string | null;
  telephone: string | null;
  statutDossier: string;
  soldeCreances: number;
  bateauCount: number;
  isActive: boolean;
}

export interface ClientDto {
  id: number;
  typeClient: string;
  raisonSociale: string | null;
  nom: string | null;
  prenom: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  nin: string | null;
  nif: string | null;
  rc: string | null;
  pieceIdentite: string | null;
  representantLegal: string | null;
  statutDossier: string;
  soldeCreances: number;
  notes: string | null;
  isActive: boolean;
}

export interface SaveClientInput {
  typeClient: 'physique' | 'morale';
  raisonSociale?: string | null;
  nom?: string | null;
  prenom?: string | null;
  adresse?: string | null;
  ville?: string | null;
  telephone?: string | null;
  email?: string | null;
  nin?: string | null;
  nif?: string | null;
  rc?: string | null;
  pieceIdentite?: string | null;
  representantLegal?: string | null;
  statutDossier?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface BassinItem {
  id: number;
  code: string;
  label: string;
  quaiCount: number;
  emplacementCount: number;
}

export interface QuaiItem {
  id: number;
  bassinId: number;
  bassinCode: string;
  code: string;
  label: string;
  emplacementCount: number;
  occupes: number;
}

export interface EmplacementDetailItem {
  id: number;
  code: string;
  label: string;
  quaiCode: string;
  bassinCode: string;
  longueurMaxM: number | null;
  largeurMaxM: number | null;
  profondeurM: number | null;
  typeEmplacement: string | null;
  statut: string;
  bateauNom: string | null;
  clientName: string | null;
  contratNumero: string | null;
}

export interface ReferentielSearchResult {
  emplacements: EmplacementDetailItem[];
  bateaux: Array<{ id: number; nom: string; immatriculation: string | null }>;
  clients: Array<{ id: number; label: string }>;
}

export interface BateauOption {
  id: number;
  nom: string;
}

export interface TarifTranche {
  id?: number;
  longueurMinM: number;
  longueurMaxM: number | null;
  montantPeriode: number;
}

export interface TarifListItem {
  id: number;
  code: string;
  label: string;
  typePrestation: string;
  dateEffet: string;
  isActive: boolean;
}

export interface TarifDto {
  id: number;
  code: string;
  label: string;
  typePrestation: string;
  montantJournalier: number | null;
  dateEffet: string;
  dateFin: string | null;
  isActive: boolean;
  tranches: TarifTranche[];
}

export interface SaveTarifInput {
  code: string;
  label: string;
  typePrestation: string;
  montantJournalier?: number | null;
  dateEffet: string;
  dateFin?: string | null;
  isActive?: boolean;
  tranches: TarifTranche[];
}

export interface FactureListItem {
  id: number;
  numero: string;
  clientName: string;
  dateFacture: string;
  montantTtc: number;
  paye: number;
  reste: number;
  statut: string;
  typeFacture: string;
}

export interface FactureDto {
  id: number;
  numero: string;
  clientId: number;
  clientName: string;
  contratId: number | null;
  contratNumero: string | null;
  bateauId: number | null;
  bateauNom: string | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  paye: number;
  reste: number;
  statut: string;
  dateFacture: string;
  observation: string | null;
  typeFacture: string;
  canPrint: boolean;
}

export interface CreateFactureInput {
  clientId: number;
  contratId?: number | null;
  bateauId?: number | null;
  periodeDebut?: string | null;
  periodeFin?: string | null;
  montantHt: number;
  tauxTva?: number;
  observation?: string | null;
  typeFacture?: 'contrat' | 'hors_contrat';
}

export interface AddPaiementFactureInput {
  factureId: number;
  dateEncaissement: string;
  montant: number;
  modePaiement?: string | null;
  reference?: string | null;
}

export interface ValidationQueueItem {
  id: number;
  entityType: string;
  entityId: number;
  label: string;
  actionDemandee: string;
  submittedAt: string;
  motifSoumission: string | null;
}

export interface MouvementListItem {
  id: number;
  bateauNom: string;
  typeMouvement: string;
  emplacementFromCode: string | null;
  emplacementToCode: string | null;
  dateMouvement: string;
  motif: string | null;
  statut: string;
}

export interface SaveMouvementInput {
  bateauId: number;
  typeMouvement: 'arrivee' | 'depart' | 'changement_emplacement';
  emplacementFromId?: number | null;
  emplacementToId?: number | null;
  dateMouvement: string;
  motif?: string | null;
}

export interface CreanceItem {
  kind: 'facture' | 'contrat';
  id: number;
  reference: string;
  clientName: string;
  montantDu: number;
  paye: number;
  reste: number;
  dateEcheance: string;
  joursRetard: number;
  tranche: '0-30' | '31-60' | '60+';
}

export interface RecouvrementSummary {
  totalCreances: number;
  nombreFactures: number;
  nombreContrats: number;
  tranche030: number;
  tranche3160: number;
  tranche60plus: number;
}

export interface RelanceListItem {
  id: number;
  clientName: string;
  reference: string;
  typeRelance: string;
  niveau: number;
  dateRelance: string;
  statut: string;
  commentaire: string | null;
}

export interface CreateRelanceInput {
  clientId?: number | null;
  factureId?: number | null;
  contratId?: number | null;
  typeRelance?: string;
  niveau?: number;
  dateRelance: string;
  commentaire?: string | null;
}
