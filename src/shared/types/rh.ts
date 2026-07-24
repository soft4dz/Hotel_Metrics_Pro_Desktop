export type StatutRh = 'actif' | 'inactif' | 'sorti';
export type StatutRecrutement = 'en_cours' | 'valide' | 'refuse';
export type TypeContrat = 'CDI' | 'CDD' | 'Interim';
export type StatutPointage = 'brouillon' | 'soumis' | 'valide' | 'refuse';
export type TypeAbsence = 'CP' | 'Maladie' | 'RTT' | 'Sans_solde' | 'Autre';
export type StatutAbsence = 'demandee' | 'approuvee' | 'refusee';
export type AccountStatus = 'actif' | 'en_attente' | 'inactif';
export type TypeAffectation = 'principale' | 'temporaire' | 'renfort';
export type StatutAffectation = 'active' | 'terminee';
export type TypeActiviteEmploye = 'hotel' | 'port' | 'mixte';

export interface RhDirection {
  id: number;
  nom: string;
  code: string | null;
  description: string | null;
  actif: boolean;
}

export interface RhDepartement {
  id: number;
  nom: string;
  directionId: number | null;
  directionNom: string | null;
  description: string | null;
  actif: boolean;
}

export interface RhPoste {
  id: number;
  nom: string;
  departementId: number;
  departementNom: string;
  directionId: number | null;
  directionNom: string | null;
  salaireMin: number | null;
  salaireMax: number | null;
  roleSystemAssocie: string | null;
  description: string | null;
  actif: boolean;
}

export type StatutValidationN1 = 'en_attente' | 'approuve' | 'refuse' | 'na';
export type StatutValidationDocument = 'brouillon' | 'en_attente_n1' | 'valide' | 'rejete';
export type SourceDocumentRh = 'upload' | 'scan' | 'import_lot';
export type DeclarationAnemStatut = 'a_faire' | 'declaree' | 'non_requis';
export type SituationMilitaire = 'fait' | 'exempte' | 'non_concerne' | 'en_cours';
export type SituationFamiliale = 'celibataire' | 'marie' | 'divorce' | 'veuf';

export const SITUATION_FAMILIALE_LABELS: Record<SituationFamiliale, string> = {
  celibataire: 'Célibataire',
  marie: 'Marié(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf(ve)',
};

export const SEXE_LABELS: Record<'M' | 'F', string> = {
  M: 'Masculin',
  F: 'Féminin',
};

export const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type GroupeSanguin = (typeof GROUPES_SANGUINS)[number];

export interface RhEmploye {
  id: number;
  nom: string;
  prenom: string;
  emailPersonnel: string | null;
  telephone: string | null;
  dateEmbauche: string;
  statutRh: StatutRh;
  posteActuelId: number | null;
  posteNom: string | null;
  departementNom: string | null;
  hotelId: number | null;
  hotelName: string | null;
  userId: number | null;
  userEmail: string | null;
  accountStatus: AccountStatus | null;
  dateSortie: string | null;
  motifSortie: string | null;
  dlgMatricule: string | null;
  typeActivite: TypeActiviteEmploye;
  nin: string | null;
  nss: string | null;
  rib: string | null;
  adresse: string | null;
  wilaya: string | null;
  commune: string | null;
  dateNaissance: string | null;
  sexe: 'M' | 'F' | null;
  lieuNaissanceWilaya: string | null;
  lieuNaissanceCommune: string | null;
  nationalite: string | null;
  nomPere: string | null;
  prenomPere: string | null;
  nomMere: string | null;
  prenomMere: string | null;
  situationFamiliale: SituationFamiliale | null;
  numeroActeNaissance: string | null;
  groupeSanguin: GroupeSanguin | null;
  conjointPrenom: string | null;
  conjointNom: string | null;
  dateMariage: string | null;
  enfantsScolarises: number;
  situationMilitaire: SituationMilitaire | null;
  enfantsCharge: number;
  bonusCongesSud: boolean;
  responsableEmployeId: number | null;
  responsableNom: string | null;
  declarationAnemStatut: DeclarationAnemStatut;
  declarationAnemDate: string | null;
}

export interface RhRecrutement {
  id: number;
  posteId: number;
  posteNom: string;
  departementNom: string;
  candidatNom: string;
  candidatPrenom: string | null;
  candidatEmail: string | null;
  candidatTelephone: string | null;
  notes: string | null;
  statut: StatutRecrutement;
  employeCreeId: number | null;
  utilisateurCreeId: number | null;
  createdAt: string;
}

export interface RhContrat {
  id: number;
  employeId: number;
  posteId: number;
  posteNom: string;
  type: TypeContrat;
  dateDebut: string;
  dateFin: string | null;
  salaireBrut: number;
  heuresHebdo: number;
  actif: boolean;
}

export interface RhContratListe extends RhContrat {
  employeNom: string;
  joursRestants: number | null;
}

export interface RhPointage {
  id: number;
  employeId: number;
  employeNom: string;
  date: string;
  heureEntree: string | null;
  heureSortie: string | null;
  heuresTravaillees: number | null;
  statut: StatutPointage;
  statutN1: StatutValidationN1;
}

export interface RhAffectation {
  id: number;
  employeId: number;
  employeNom: string;
  hotelId: number;
  hotelName: string;
  posteId: number;
  posteNom: string;
  departementNom: string | null;
  type: TypeAffectation;
  dateDebut: string;
  dateFin: string | null;
  statut: StatutAffectation;
  notes: string | null;
  createdAt: string;
}

export interface RhAbsence {
  id: number;
  employeId: number;
  employeNom: string;
  type: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif: string | null;
  statut: StatutAbsence;
  statutN1: StatutValidationN1;
  commentaireN1: string | null;
}

export interface RhDashboard {
  effectifActif: number;
  recrutementsEnCours: number;
  absencesEnAttente: number;
  pointagesASoumettre: number;
  comptesEnAttente: number;
  recettesParEffectif: number;
  tauxPresence: number;
  tauxAbsenteisme: number;
  masseSalariale: number;
  coutMoyenEmploye: number;
  tauxTurnover: number;
  periodeDebut: string;
  periodeFin: string;
  hotelId: number | null;
  hotelName: string | null;
  manqueEffectifTotal: number;
  contratsEcheanceProche: number;
  certificationsEcheanceProche: number;
  entretiensPlanifies: number;
}

export interface RhSoldeConges {
  id: number;
  employeId: number;
  employeNom: string;
  annee: number;
  type: TypeAbsence;
  acquis: number;
  pris: number;
  reste: number;
}

export interface RhMonEspace {
  employe: RhEmploye | null;
  contratActif: RhContrat | null;
  affectationActive: RhAffectation | null;
  pointagesRecents: RhPointage[];
  absences: RhAbsence[];
  formationsProches: RhEmployeFormation[];
  entretiensAvenir: RhEntretien[];
  soldesConges: RhSoldeConges[];
  dernierBulletin: RhBulletin | null;
  onboarding: RhOnboardingSuivi[];
  mesDocuments: RhDocument[];
}

export interface CreateDirectionInput {
  nom: string;
  code?: string | null;
  description?: string | null;
}

export interface UpdateDirectionInput {
  nom?: string;
  code?: string | null;
  description?: string | null;
  actif?: boolean;
}

export interface CreateDepartementInput {
  nom: string;
  directionId: number;
  description?: string | null;
}

export interface UpdateDepartementInput {
  nom?: string;
  directionId?: number;
  description?: string | null;
  actif?: boolean;
}

export interface UpdatePosteInput {
  nom?: string;
  departementId?: number;
  salaireMin?: number | null;
  salaireMax?: number | null;
  roleSystemAssocie?: string | null;
  description?: string | null;
  actif?: boolean;
}

export interface UpdateEmployeInput {
  nom?: string;
  prenom?: string;
  emailPersonnel?: string | null;
  telephone?: string | null;
  dateEmbauche?: string;
  posteActuelId?: number | null;
  hotelId?: number | null;
  statutRh?: StatutRh;
  dlgMatricule?: string | null;
  nin?: string | null;
  nss?: string | null;
  rib?: string | null;
  adresse?: string | null;
  wilaya?: string | null;
  commune?: string | null;
  dateNaissance?: string | null;
  sexe?: 'M' | 'F' | null;
  lieuNaissanceWilaya?: string | null;
  lieuNaissanceCommune?: string | null;
  nationalite?: string | null;
  nomPere?: string | null;
  prenomPere?: string | null;
  nomMere?: string | null;
  prenomMere?: string | null;
  situationFamiliale?: SituationFamiliale | null;
  numeroActeNaissance?: string | null;
  groupeSanguin?: GroupeSanguin | null;
  conjointPrenom?: string | null;
  conjointNom?: string | null;
  dateMariage?: string | null;
  enfantsScolarises?: number;
  situationMilitaire?: SituationMilitaire | null;
  enfantsCharge?: number;
  bonusCongesSud?: boolean;
  responsableEmployeId?: number | null;
  declarationAnemStatut?: DeclarationAnemStatut;
  declarationAnemDate?: string | null;
}

export interface SortirEmployeInput {
  dateSortie: string;
  motifSortie?: string | null;
}

export interface UpsertSoldeCongesInput {
  employeId: number;
  annee: number;
  type: TypeAbsence;
  acquis: number;
  pris: number;
}

export type ShiftPlanning = 'matin' | 'apres_midi' | 'soir' | 'nuit' | 'jour';
export type StatutPlanning = 'planifie' | 'confirme' | 'annule';

export interface RhPlanning {
  id: number;
  hotelId: number;
  hotelName: string;
  employeId: number;
  employeNom: string;
  posteId: number | null;
  posteNom: string | null;
  date: string;
  shift: ShiftPlanning;
  heureDebut: string | null;
  heureFin: string | null;
  heuresPrevues: number;
  statut: StatutPlanning;
  notes: string | null;
}

export interface RhPlanningSyntheseLigne {
  employeId: number;
  employeNom: string;
  heuresPrevues: number;
  heuresPointees: number;
  ecart: number;
}

export interface RhPlanningSynthese {
  periodeDebut: string;
  periodeFin: string;
  lignes: RhPlanningSyntheseLigne[];
  totalHeuresPrevues: number;
  totalHeuresPointees: number;
}

export interface RhSuggestionRenfort {
  hotelId: number;
  hotelName: string;
  tauxOccupation: number;
  dateDebut: string;
  dateFin: string;
  manqueEffectif: number;
  message: string;
}

export interface RhEquipeMembre {
  id: number;
  chefEmployeId: number;
  chefNom: string;
  membreEmployeId: number;
  membreNom: string;
  hotelId: number | null;
  hotelName: string | null;
}

export interface CreatePlanningInput {
  hotelId: number;
  employeId: number;
  posteId?: number | null;
  date: string;
  shift: ShiftPlanning;
  heureDebut?: string | null;
  heureFin?: string | null;
  notes?: string | null;
}

export interface AddEquipeMembreInput {
  chefEmployeId: number;
  membreEmployeId: number;
  hotelId?: number | null;
}

export type StatutBulletin = 'brouillon' | 'exporte' | 'importe' | 'valide';

export interface RhBulletin {
  id: number;
  employeId: number;
  employeNom: string;
  dlgMatricule: string | null;
  periode: string;
  brut: number;
  net: number;
  charges: number;
  heuresTravaillees: number;
  joursAbsence: number;
  primesTotal: number;
  statut: StatutBulletin;
  source: 'local' | 'dlg';
  dlgReference: string | null;
  tresorerieId: number | null;
}

export type PaieClotureStatut = 'brouillon' | 'valide' | 'cloture';

export interface PaieClotureMensuelle {
  id: number;
  periode: string;
  statut: PaieClotureStatut;
  nbBulletins: number;
  valideAt: string | null;
  clotureAt: string | null;
}

export interface RhPrime {
  id: number;
  employeId: number;
  employeNom: string;
  periode: string;
  code: string;
  libelle: string;
  montant: number;
  source: 'manuel' | 'recettes' | 'dlg';
}

export interface RhDlgConfig {
  exportPath: string;
  importPath: string;
  prefixMatricule: string;
  lastExportAt: string | null;
  lastImportAt: string | null;
}

export interface RhDlgJournalEntry {
  id: number;
  sens: 'export' | 'import';
  periode: string | null;
  fichier: string;
  nbLignes: number;
  statut: 'ok' | 'erreur' | 'partiel';
  message: string | null;
  createdAt: string;
}

export interface RhDlgExchangeResult {
  ok: boolean;
  periode: string;
  fichiers: string[];
  nbLignes: number;
  message: string;
}

export interface CreatePrimeInput {
  employeId: number;
  periode: string;
  code: string;
  libelle: string;
  montant: number;
}

export interface UpdateDlgConfigInput {
  exportPath?: string;
  importPath?: string;
  prefixMatricule?: string;
}

export interface CreatePosteInput {
  nom: string;
  departementId: number;
  salaireMin?: number | null;
  salaireMax?: number | null;
  roleSystemAssocie?: string | null;
  description?: string | null;
}

export interface CreateEmployeInput {
  nom: string;
  prenom: string;
  emailPersonnel?: string | null;
  telephone?: string | null;
  dateEmbauche: string;
  posteActuelId?: number | null;
  hotelId?: number | null;
  statutRh?: StatutRh;
}

export interface CreateEmployeWizardInput {
  nom: string;
  prenom: string;
  emailPersonnel?: string | null;
  telephone?: string | null;
  dateNaissance?: string | null;
  sexe?: 'M' | 'F' | null;
  lieuNaissanceWilaya?: string | null;
  lieuNaissanceCommune?: string | null;
  nationalite?: string | null;
  nomPere?: string | null;
  prenomPere?: string | null;
  nomMere?: string | null;
  prenomMere?: string | null;
  situationFamiliale?: SituationFamiliale | null;
  numeroActeNaissance?: string | null;
  groupeSanguin?: GroupeSanguin | null;
  conjointPrenom?: string | null;
  conjointNom?: string | null;
  dateMariage?: string | null;
  enfantsScolarises?: number;
  nin: string;
  wilaya?: string | null;
  commune?: string | null;
  adresse?: string | null;
  dateEmbauche: string;
  hotelId: number;
  posteActuelId: number;
  responsableEmployeId?: number | null;
  dlgMatricule?: string | null;
  typeContrat: TypeContrat;
  salaireBrut: number;
  heuresHebdo?: number;
  nss: string;
  rib: string;
  enfantsCharge?: number;
  bonusCongesSud?: boolean;
  situationMilitaire?: SituationMilitaire | null;
}

export interface CreateRecrutementInput {
  posteId: number;
  candidatNom: string;
  candidatPrenom?: string | null;
  candidatEmail?: string | null;
  candidatTelephone?: string | null;
  notes?: string | null;
}

export interface CreateContratInput {
  employeId: number;
  posteId: number;
  type: TypeContrat;
  dateDebut: string;
  dateFin?: string | null;
  salaireBrut: number;
  heuresHebdo?: number;
}

export interface UpsertPointageInput {
  employeId: number;
  date: string;
  heureEntree?: string | null;
  heureSortie?: string | null;
}

export interface CreateAbsenceInput {
  employeId: number;
  type: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif?: string | null;
}

export interface CreateAffectationInput {
  employeId: number;
  hotelId: number;
  posteId: number;
  type?: TypeAffectation;
  dateDebut: string;
  dateFin?: string | null;
  notes?: string | null;
}

export type StatutEffectif = 'ok' | 'surplus' | 'manque';

export interface RhOrganisationLigne {
  id: number;
  hotelId: number;
  hotelName: string;
  posteId: number;
  posteNom: string;
  departementNom: string | null;
  effectifCible: number;
  effectifActuel: number;
  ecart: number;
  statut: StatutEffectif;
  responsableEmployeId: number | null;
  responsableNom: string | null;
  notes: string | null;
}

export interface RhOrganisationSynthese {
  lignes: RhOrganisationLigne[];
  totalManque: number;
  totalSurplus: number;
  postesEnManque: number;
  postesEnSurplus: number;
  postesEquilibres: number;
}

export interface UpsertOrganisationInput {
  hotelId: number;
  posteId: number;
  effectifCible: number;
  responsableEmployeId?: number | null;
  notes?: string | null;
}

export type StatutEmployeFormation = 'planifie' | 'en_cours' | 'obtenu' | 'expire' | 'annule';
export type TypeEntretien = 'annuel' | 'probatoire' | 'mi_parcours' | 'sortie';
export type StatutEntretien = 'planifie' | 'realise' | 'annule';
export type TypeDocumentRh = 'cv' | 'contrat' | 'certificat' | 'identite' | 'autre';

export interface RhFormationCatalog {
  id: number;
  code: string;
  libelle: string;
  organisme: string | null;
  dureeHeures: number | null;
  validiteMois: number | null;
  obligatoire: boolean;
  actif: boolean;
}

export interface RhEmployeFormation {
  id: number;
  employeId: number;
  employeNom: string;
  formationId: number;
  formationCode: string;
  formationLibelle: string;
  dateObtention: string | null;
  dateEcheance: string | null;
  statut: StatutEmployeFormation;
  certificatRef: string | null;
  notes: string | null;
  obligatoire: boolean;
}

export interface RhCompetence {
  id: number;
  code: string;
  libelle: string;
  categorie: string | null;
  description: string | null;
  actif: boolean;
}

export interface RhPosteCompetence {
  id: number;
  posteId: number;
  posteNom: string;
  competenceId: number;
  competenceCode: string;
  competenceLibelle: string;
  niveauRequis: number;
}

export interface RhEntretien {
  id: number;
  employeId: number;
  employeNom: string;
  dateEntretien: string;
  type: TypeEntretien;
  evaluateurEmployeId: number | null;
  evaluateurNom: string | null;
  noteGlobale: number | null;
  objectifs: string | null;
  commentaires: string | null;
  statut: StatutEntretien;
}

export interface RhDocument {
  id: number;
  employeId: number;
  employeNom: string;
  type: TypeDocumentRh;
  nom: string;
  fichierPath: string;
  mimeType: string | null;
  taille: number | null;
  createdAt: string;
  source: SourceDocumentRh;
  statutValidation: StatutValidationDocument;
  valideN1Par: number | null;
  valideN1At: string | null;
  scanBatch: string | null;
  modeleCode: string | null;
}

export interface RhDossierModele {
  code: string;
  libelle: string;
  typeDocument: TypeDocumentRh;
  obligatoire: boolean;
  ordre: number;
}

export interface RhDossierPiece {
  modele: RhDossierModele;
  document: RhDocument | null;
  present: boolean;
  enAttente: boolean;
}

export interface RhDossierEmploye {
  employeId: number;
  employeNom: string;
  pieces: RhDossierPiece[];
  tauxCompletude: number;
  documents: RhDocument[];
}

export interface RhConformiteAlerte {
  niveau: 'critique' | 'urgent' | 'attention';
  message: string;
}

export interface RhConformiteSuiviItem {
  employeId: number;
  employeNom: string;
  code: string;
  libelle: string;
  statut: 'a_faire' | 'en_cours' | 'fait' | 'non_requis';
  dateEcheance: string | null;
  dateRealisation: string | null;
  notes: string | null;
}

export interface RhConformiteDashboard {
  sansNss: number;
  sansNin: number;
  anemEnRetard: number;
  sousSmig: number;
  dossiersIncomplets: number;
  smig: number;
  alertes: RhConformiteAlerte[];
  suivi: RhConformiteSuiviItem[];
}

export interface RhValidationN1Item {
  type: 'absence' | 'pointage' | 'document';
  id: number;
  employeId: number;
  employeNom: string;
  libelle: string;
  createdAt: string;
}

export interface CreateFormationCatalogInput {
  code: string;
  libelle: string;
  organisme?: string | null;
  dureeHeures?: number | null;
  validiteMois?: number | null;
  obligatoire?: boolean;
}

export interface UpdateFormationCatalogInput {
  libelle?: string;
  organisme?: string | null;
  dureeHeures?: number | null;
  validiteMois?: number | null;
  obligatoire?: boolean;
  actif?: boolean;
}

export interface AssignEmployeFormationInput {
  employeId: number;
  formationId: number;
  dateObtention?: string | null;
  dateEcheance?: string | null;
  statut?: StatutEmployeFormation;
  certificatRef?: string | null;
  notes?: string | null;
}

export interface UpdateEmployeFormationInput {
  dateObtention?: string | null;
  dateEcheance?: string | null;
  statut?: StatutEmployeFormation;
  certificatRef?: string | null;
  notes?: string | null;
}

export interface CreateCompetenceInput {
  code: string;
  libelle: string;
  categorie?: string | null;
  description?: string | null;
}

export interface SetPosteCompetenceInput {
  posteId: number;
  competenceId: number;
  niveauRequis: number;
}

export interface CreateEntretienInput {
  employeId: number;
  dateEntretien: string;
  type?: TypeEntretien;
  evaluateurEmployeId?: number | null;
  noteGlobale?: number | null;
  objectifs?: string | null;
  commentaires?: string | null;
  statut?: StatutEntretien;
}

export interface UpdateEntretienInput {
  dateEntretien?: string;
  type?: TypeEntretien;
  evaluateurEmployeId?: number | null;
  noteGlobale?: number | null;
  objectifs?: string | null;
  commentaires?: string | null;
  statut?: StatutEntretien;
}

export interface RhComparatifUnite {
  hotelId: number;
  hotelName: string;
  effectifActif: number;
  recettes: number;
  masseSalariale: number;
  recettesParEffectif: number;
  coutMainOeuvreSurCa: number;
  manqueEffectif: number;
  periodeDebut: string;
  periodeFin: string;
}

export interface RhPrevisionEffectif {
  hotelId: number;
  hotelName: string;
  mois: string;
  effectifActuel: number;
  effectifRecommande: number;
  delta: number;
  recettesPrevues: number;
  tauxOccupationPrevu: number;
  manqueOrganisation: number;
  message: string;
}

export type StatutOnboardingStep = 'a_faire' | 'fait' | 'ignore';

export interface RhOnboardingSuivi {
  employeId: number;
  employeNom: string;
  stepCode: string;
  stepLibelle: string;
  ordre: number;
  obligatoire: boolean;
  statut: StatutOnboardingStep;
  completedAt: string | null;
}

export interface RhPortEmploye {
  employeId: number;
  employeNom: string;
  typeActivite: TypeActiviteEmploye;
  posteNom: string | null;
}

export interface RhPortRhSynthese {
  employesPort: RhPortEmploye[];
  contratsPortActifs: number;
  facturesPortOuvertes: number;
  totalEmployesPort: number;
}

export interface UpdateEmployeTypeActiviteInput {
  employeId: number;
  typeActivite: TypeActiviteEmploye;
}

export type RhAiProvider = 'gemini' | 'openai' | 'local';
export type RhAiAlerteNiveau = 'critique' | 'urgent' | 'attention' | 'info';

export interface RhAiConfig {
  hasGemini: boolean;
  hasOpenai: boolean;
  provider: RhAiProvider;
  geminiModel: string;
  openaiModel: string;
}

export interface RhAiAlerte {
  niveau: RhAiAlerteNiveau;
  titre: string;
  description: string;
  action: string;
}

export interface RhAiRecommandation {
  priorite: number;
  domaine: string;
  titre: string;
  detail: string;
  impact: string;
}

export interface RhAiIndicateur {
  label: string;
  valeur: string;
  tendance?: 'hausse' | 'baisse' | 'stable';
}

export interface RhAiDecisionContext {
  genereLe: string;
  hotelId: number | null;
  hotelName: string | null;
  periode: { debut: string; fin: string };
  dashboard: RhDashboard;
  comparatifUnites: RhComparatifUnite[];
  previsionsEffectif: RhPrevisionEffectif[];
  organisation: {
    totalManque: number;
    totalSurplus: number;
    postesEnManque: { hotelName: string; posteNom: string; ecart: number; responsableNom: string | null }[];
  };
  alertesMetier: {
    contratsCdd60j: number;
    certifications90j: number;
    absencesAValider: number;
    pointagesAValider: number;
    comptesEnAttente: number;
    bulletinsBrouillon: number;
    entretiens30j: number;
  };
  recrutementsEnCours: { id: number; candidat: string; poste: string; departement: string }[];
  suggestionsRenfort: RhSuggestionRenfort[];
  onboardingEnCours: { employeId: number; nom: string; etapesRestantes: number }[];
  portMaster: RhPortRhSynthese;
  paie: { primesMoisCourant: number };
}

export interface RhAiAnalysisResult {
  generatedAt: string;
  provider: RhAiProvider;
  context: RhAiDecisionContext;
  synthese: string;
  alertes: RhAiAlerte[];
  recommandations: RhAiRecommandation[];
  indicateursCles: RhAiIndicateur[];
  markdown?: string;
  erreurIa?: string;
}

export interface RhExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
}

export interface RhRegistrePersonnelLigne {
  numeroOrdre: number;
  employeId: number;
  nom: string;
  prenom: string;
  dateEmbauche: string;
  dateSortie: string | null;
  statutRh: StatutRh;
  nin: string | null;
  nss: string | null;
  posteNom: string | null;
  departementNom: string | null;
  hotelName: string | null;
}

export interface RhRegistreCongesLigne {
  employeId: number;
  employeNom: string;
  annee: number;
  type: TypeAbsence;
  acquis: number;
  pris: number;
  reste: number;
}

export interface RhAccidentTravail {
  id: number;
  employeId: number;
  employeNom: string;
  dateAccident: string;
  lieu: string | null;
  nature: string;
  mesuresPrises: string | null;
  declarationCnas: boolean;
  createdAt: string;
}

export interface CreateRhAccidentInput {
  employeId: number;
  dateAccident: string;
  lieu?: string | null;
  nature: string;
  mesuresPrises?: string | null;
  declarationCnas?: boolean;
}

export type TypeVisiteMedicale = 'embauche' | 'periodique' | 'reprise';

export interface RhVisiteMedicale {
  id: number;
  employeId: number;
  employeNom: string;
  typeVisite: TypeVisiteMedicale;
  dateVisite: string;
  dateEcheance: string | null;
  medecin: string | null;
  apte: boolean;
  restrictions: string | null;
  createdAt: string;
}

export interface CreateRhVisiteMedicaleInput {
  employeId: number;
  typeVisite: TypeVisiteMedicale;
  dateVisite: string;
  dateEcheance?: string | null;
  medecin?: string | null;
  apte?: boolean;
  restrictions?: string | null;
}

export type TypeRuptureContrat =
  | 'demission'
  | 'licenciement'
  | 'fin_cdd'
  | 'retraite'
  | 'rupture_conventionnelle';

export interface ProcessRuptureInput {
  employeId: number;
  dateSortie: string;
  typeRupture: TypeRuptureContrat;
  motif?: string | null;
  joursCongesRestants?: number;
}

export interface RhStcPreview {
  employeId: number;
  employeNom: string;
  dateSortie: string;
  typeRupture: TypeRuptureContrat;
  salaireBrutRef: number;
  joursCongesRestants: number;
  ancienneteMois: number;
  indemniteConges: number;
  indemnitePreavis: number;
  indemniteLicenciement: number;
  totalBrut: number;
  retenues: number;
  netAPayer: number;
  disclaimer: string;
}

export interface RhRuptureContrat {
  id: number;
  employeId: number;
  employeNom: string;
  dateSortie: string;
  typeRupture: TypeRuptureContrat;
  motif: string | null;
  salaireBrutRef: number;
  ancienneteMois: number;
  joursCongesRestants: number;
  indemniteConges: number;
  indemnitePreavis: number;
  indemniteLicenciement: number;
  totalBrutStc: number;
  retenues: number;
  netAPayer: number;
  createdAt: string;
}

export interface RhPointeuse {
  id: number;
  hotelId: number;
  nom: string;
  marque: string;
  adresseIp: string | null;
  port: number;
  actif: boolean;
  derniereSync: string | null;
}

export interface UpsertPointeuseInput {
  hotelId: number;
  nom: string;
  marque?: string;
  adresseIp?: string | null;
  port?: number;
  actif?: boolean;
}

export interface RhRawPunch {
  id: number;
  pointeuseId: number | null;
  hotelId: number;
  badgeId: string;
  punchAt: string;
  typePunch: 'entree' | 'sortie' | 'autre' | null;
  traite: boolean;
  pointageId: number | null;
  employeNom?: string;
}

export interface TraiterPunchesResult {
  joursTraites: number;
  pointagesCrees: number;
  pointagesMisAJour: number;
  ignorés: number;
}
