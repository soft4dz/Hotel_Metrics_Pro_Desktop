/** Contrat IPC typé — main ↔ renderer */
import type {
  AddEquipeMembreInput,
  CreateAbsenceInput,
  CreateAffectationInput,
  CreatePlanningInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateDirectionInput,
  CreateEmployeInput,
  CreateEmployeWizardInput,
  CreatePosteInput,
  AssignEmployeFormationInput,
  CreateCompetenceInput,
  CreateEntretienInput,
  CreateFormationCatalogInput,
  CreatePrimeInput,
  CreateRecrutementInput,
  RhCompetence,
  RhDocument,
  RhEmployeFormation,
  RhEntretien,
  RhAiAnalysisResult,
  RhAiConfig,
  RhAiDecisionContext,
  RhAiProvider,
  RhComparatifUnite,
  RhConformiteDashboard,
  RhDossierEmploye,
  RhDossierModele,
  RhValidationN1Item,
  RhFormationCatalog,
  RhOnboardingSuivi,
  RhPortRhSynthese,
  RhPosteCompetence,
  RhPrevisionEffectif,
  UpdateEmployeTypeActiviteInput,
  SetPosteCompetenceInput,
  TypeDocumentRh,
  UpdateEmployeFormationInput,
  UpdateEntretienInput,
  UpdateFormationCatalogInput,
  RhAbsence,
  RhBulletin,
  PaieClotureMensuelle,
  RhDlgConfig,
  RhDlgExchangeResult,
  RhDlgJournalEntry,
  RhPrime,
  UpdateDlgConfigInput,
  RhAffectation,
  RhContrat,
  RhContratListe,
  RhDashboard,
  RhDepartement,
  RhDirection,
  RhEmploye,
  RhMonEspace,
  RhEquipeMembre,
  RhOrganisationSynthese,
  RhPlanning,
  RhPlanningSynthese,
  RhPointage,
  RhPoste,
  RhRecrutement,
  RhSoldeConges,
  RhSuggestionRenfort,
  SortirEmployeInput,
  CreateRhAccidentInput,
  CreateRhVisiteMedicaleInput,
  ProcessRuptureInput,
  RhAccidentTravail,
  RhExportResult,
  RhRegistreCongesLigne,
  RhRegistrePersonnelLigne,
  RhRuptureContrat,
  RhStcPreview,
  RhVisiteMedicale,
  StatutAbsence,
  StatutAffectation,
  StatutRecrutement,
  UpdateDepartementInput,
  UpdateDirectionInput,
  UpdateEmployeInput,
  UpdatePosteInput,
  UpsertOrganisationInput,
  UpsertPointageInput,
  UpsertSoldeCongesInput,
} from './rh';
import type {
  ComposantTarif, CreateComposantInput,
  FormuleTarif, CreateFormuleInput,
  PlanTarifaire, CreatePlanInput,
  TarifJournalier, UpsertTarifInput, UpsertTarifsBulkInput,
  PromotionTarif, CreatePromotionInput,
  Convention, CreateConventionInput,
  SimulateurInput, SimulateurResult,
} from './tarifs';
import type {
  Chambre, CreateChambreInput, CreateReservationInput, CreateTypeChambreInput,
  EstimateReservationPriceInput, OccupationPeriode, Reservation, StatutChambre, StatutReservation, TypeChambre,
} from './hebergement';
import type {
  AddCaisseInput,
  CompteBancaire,
  CreateCompteInput,
  CreateEncaissementInput,
  EncaissementFilters,
  EncaissementItem,
  JournalCaisseEntry,
  TresorerieDashboard,
} from './tresorerie';
import type {
  AddPaiementInput as AddPaiementFactInput,
  ClientFacturation,
  CreateAvoirInput,
  CreateClientInput as CreateClientFactInput,
  CreateFactureInput as CreateFactureFactInput,
  FacturationDashboard,
  FactureDetail as FactureDetailFact,
  FactureFilters as FactureFiltersFact,
  FactureListItem as FactureListItemFact,
  FactureRegistreItem,
} from './facturation';
import type {
  BalanceLigne,
  Compte,
  CreateEcritureInput,
  EcritureFilters,
  EcritureListItem,
  ExerciceComptable,
  Journal,
} from './comptabilite';
import type {
  CreateRetenueInput,
  DeclarationTva,
  LiasseLigne,
  RegistreTvaVente,
  RetenueSource,
} from './fiscalite';
import type {
  WorkflowInstance,
  WorkflowHistoryEntry,
  CreateWorkflowInput,
  WorkflowFilters,
  WorkflowStatut,
  DailyClosure,
  FinanceReconciliation,
  GlobalCreance,
  BalanceAgeeLigne,
  CreanceStatut,
  DecCockpitDashboard,
  DecAlert,
  PdgDashboard,
  OrganigrammeNode,
  EffectifEgtSummary,
  FichePoste,
  ChecklistTemplate,
  ChecklistRun,
  ChecklistResultItem,
  FichePolice,
  GedLegalArchive,
} from './phase2';

import type { AuthUserDto, ChangePasswordPayload, ChangePasswordResult, LoginPayload, LoginResult, UserProfileDto } from './auth';
import type {
  AuditListFilters,
  AuditLogItem,
  CreateHotelInput,
  CreateRubriqueInput,
  CreateUserInput,
  HotelListItem,
  IpcResult,
  PermissionListItem,
  ReorderRubriqueItem,
  RoleListItem,
  RoleOption,
  RubriqueListItem,
  UpdateHotelInput,
  UpdateRubriqueInput,
  UpdateUserInput,
  UserListItem,
} from './admin';
import type {
  HistoriqueFilters,
  HistoriqueItem,
  HistoriqueJourItem,
  RecetteMensuelleDto,
  SaisieJournaliereDto,
  SaveMensuellePayload,
  SaveSaisieInput,
  ValidationJourItem,
} from './recettes';
import type {
  ObjectifDto,
  ObjectifFilters,
  ObjectifListItem,
  SaveObjectifInput,
} from './objectifs';
import type { DashboardDto, DashboardFilters } from './dashboard';
import type { ExportKind, ExportResult } from './export';
import type { SyncConfigDto, SyncQueueItem, SyncRunResult, SyncStatusDto } from './sync';
import type { AppInfoDto, AppSettingsDto } from './settings';
import type {
  ClientContact,
  ClientFilters,
  ClientItem,
  ClientItemDetail,
  ClientsDashboard,
  CreateClientInput as CreateClientCompletInput,
  CreateContactInput,
} from './clients';
import type {
  BackupCreateResult,
  BackupListItem,
  BackupRestoreResult,
  DatabaseInfoDto,
  IntegrityCheckResult,
  LegacyImportResult,
  VacuumResult,
} from './database';
import type {
  AddEncaissementInput,
  AddPaiementFactureInput,
  BassinItem,
  BateauDto,
  BateauListItem,
  BateauOption,
  ClientDto,
  ClientListItem,
  ContratDto,
  ContratListItem,
  CreateFactureInput,
  EmplacementDetailItem,
  FactureDto,
  FactureListItem,
  EmplacementListItem,
  EmplacementOption,
  PortAlerte,
  PortDashboardDto,
  QuaiItem,
  ReferentielSearchResult,
  SaveBateauInput,
  SaveClientInput,
  SaveContratInput,
  SaveTarifInput,
  TarifDto,
  TarifListItem,
  ValidationQueueItem,
  MouvementListItem,
  SaveMouvementInput,
  CreanceItem,
  RecouvrementSummary,
  RelanceListItem,
  CreateRelanceInput,
} from './portmaster';

export interface PingResponse {
  ok: boolean;
  timestamp: number;
}

export interface IpcApi {
  app: {
    getVersion: () => Promise<string>;
    ping: () => Promise<PingResponse>;
  };
  auth: {
    login: (payload: LoginPayload) => Promise<LoginResult>;
    logout: (sessionToken?: string) => Promise<{ ok: boolean }>;
    restore: (sessionToken: string) => Promise<LoginResult>;
    getCurrentUser: () => Promise<AuthUserDto | null>;
    getProfile: () => Promise<UserProfileDto | null>;
    changePassword: (payload: ChangePasswordPayload) => Promise<ChangePasswordResult>;
  };
  users: {
    list: (search?: string) => Promise<IpcResult<UserListItem[]>>;
    get: (id: number) => Promise<IpcResult<UserListItem | null>>;
    create: (input: CreateUserInput) => Promise<IpcResult<UserListItem>>;
    update: (
      id: number,
      input: UpdateUserInput,
    ) => Promise<IpcResult<UserListItem>>;
    deactivate: (id: number, reason: string) => Promise<IpcResult<boolean>>;
    pendingCount: () => Promise<IpcResult<number>>;
    activatePending: (id: number) => Promise<IpcResult<UserListItem>>;
  };
  hotels: {
    list: () => Promise<IpcResult<HotelListItem[]>>;
    get: (id: number) => Promise<IpcResult<HotelListItem | null>>;
    create: (input: CreateHotelInput) => Promise<IpcResult<HotelListItem>>;
    update: (
      id: number,
      input: UpdateHotelInput,
    ) => Promise<IpcResult<HotelListItem>>;
    pickLogo: (hotelId: number) => Promise<IpcResult<HotelListItem>>;
    removeLogo: (hotelId: number) => Promise<IpcResult<HotelListItem>>;
    deactivate: (id: number, reason: string) => Promise<IpcResult<boolean>>;
  };
  roles: {
    list: () => Promise<IpcResult<RoleListItem[]>>;
    listForSelect: () => Promise<IpcResult<RoleOption[]>>;
    listPermissions: () => Promise<IpcResult<PermissionListItem[]>>;
    updatePermissions: (
      roleId: number,
      permissionCodes: string[],
    ) => Promise<IpcResult<RoleListItem>>;
  };
  rubriques: {
    list: () => Promise<IpcResult<RubriqueListItem[]>>;
    create: (input: CreateRubriqueInput) => Promise<IpcResult<RubriqueListItem>>;
    update: (
      id: number,
      input: UpdateRubriqueInput,
    ) => Promise<IpcResult<RubriqueListItem>>;
    delete: (id: number) => Promise<IpcResult<boolean>>;
    reorder: (
      items: ReorderRubriqueItem[],
    ) => Promise<IpcResult<RubriqueListItem[]>>;
  };
  audit: {
    list: (filters: AuditListFilters) => Promise<IpcResult<AuditLogItem[]>>;
  };
  recettes: {
    rubriques: () => Promise<IpcResult<import('./recettes').RubriqueOption[]>>;
    getSaisie: (
      hotelId: number,
      dateJournal: string,
    ) => Promise<IpcResult<SaisieJournaliereDto>>;
    saveSaisie: (
      input: SaveSaisieInput,
    ) => Promise<IpcResult<SaisieJournaliereDto>>;
    historique: (
      filters: HistoriqueFilters,
    ) => Promise<IpcResult<HistoriqueItem[]>>;
    historiqueGrouped: (
      filters: HistoriqueFilters,
    ) => Promise<IpcResult<HistoriqueJourItem[]>>;
    updateLigne: (
      id: number,
      montant: number,
      observation: string | null,
      motif: string,
    ) => Promise<IpcResult<boolean>>;
    deleteLigne: (
      id: number,
      motif: string,
    ) => Promise<IpcResult<boolean>>;
    deleteJournee: (
      hotelId: number,
      dateJournal: string,
      motif: string,
    ) => Promise<IpcResult<{ deletedCount: number }>>;
    listAValider: (
      hotelId?: number,
    ) => Promise<IpcResult<ValidationJourItem[]>>;
    validerJour: (
      hotelId: number,
      dateJournal: string,
      motif?: string,
    ) => Promise<IpcResult<boolean>>;
    refuserJour: (
      hotelId: number,
      dateJournal: string,
      motif: string,
    ) => Promise<IpcResult<boolean>>;
    getMensuelle: (
      hotelId: number,
      annee: number,
      mois: number,
    ) => Promise<IpcResult<RecetteMensuelleDto>>;
    saveMensuelle: (
      hotelId: number,
      annee: number,
      mois: number,
      payload: SaveMensuellePayload,
    ) => Promise<IpcResult<RecetteMensuelleDto>>;
  };
  objectifs: {
    list: (
      filters: ObjectifFilters,
    ) => Promise<IpcResult<ObjectifListItem[]>>;
    get: (
      hotelId: number,
      annee: number,
      mois: number,
    ) => Promise<IpcResult<ObjectifDto>>;
    save: (
      input: SaveObjectifInput,
    ) => Promise<IpcResult<ObjectifDto>>;
  };
  dashboard: {
    get: (
      filters: DashboardFilters,
    ) => Promise<IpcResult<DashboardDto>>;
  };
  portmaster: {
    dashboard: (filters?: DashboardFilters) => Promise<IpcResult<PortDashboardDto>>;
    listBateaux: (search?: string) => Promise<IpcResult<BateauListItem[]>>;
    getBateau: (id: number) => Promise<IpcResult<BateauDto | null>>;
    createBateau: (input: SaveBateauInput) => Promise<IpcResult<BateauDto>>;
    updateBateau: (
      id: number,
      input: SaveBateauInput,
    ) => Promise<IpcResult<BateauDto>>;
    deactivateBateau: (id: number) => Promise<IpcResult<boolean>>;
    listEmplacements: () => Promise<IpcResult<EmplacementListItem[]>>;
    listEmplacementsLibres: () => Promise<IpcResult<EmplacementOption[]>>;
    listContrats: (statut?: string) => Promise<IpcResult<ContratListItem[]>>;
    getContrat: (id: number) => Promise<IpcResult<ContratDto | null>>;
    saveContrat: (
      input: SaveContratInput,
      id?: number,
    ) => Promise<IpcResult<ContratDto>>;
    addEncaissement: (
      input: AddEncaissementInput,
    ) => Promise<IpcResult<ContratDto>>;
    bateauxOptions: () => Promise<IpcResult<BateauOption[]>>;
    listClients: (
      search?: string,
    ) => Promise<IpcResult<ClientListItem[]>>;
    getClient: (id: number) => Promise<IpcResult<ClientDto | null>>;
    saveClient: (
      input: SaveClientInput,
      id?: number,
    ) => Promise<IpcResult<ClientDto>>;
    clientsOptions: (
    ) => Promise<IpcResult<Array<{ id: number; label: string }>>>;
    listBassins: () => Promise<IpcResult<BassinItem[]>>;
    listQuais: (bassinId?: number) => Promise<IpcResult<QuaiItem[]>>;
    listEmplacementsDetail: (
      filters?: {
        bassinId?: number;
        quaiId?: number;
        statut?: string;
        search?: string;
      },
    ) => Promise<IpcResult<EmplacementDetailItem[]>>;
    searchReferentiel: (
      query: string,
    ) => Promise<IpcResult<ReferentielSearchResult>>;
    listAlertes: () => Promise<IpcResult<PortAlerte[]>>;
    submitContrat: (id: number) => Promise<IpcResult<boolean>>;
    listTarifs: () => Promise<IpcResult<TarifListItem[]>>;
    getTarif: (id: number) => Promise<IpcResult<TarifDto | null>>;
    saveTarif: (
      input: SaveTarifInput,
      id?: number,
    ) => Promise<IpcResult<TarifDto>>;
    simulerTarif: (
      tarifId: number,
      longueurM: number,
    ) => Promise<IpcResult<{ montant: number; tranche: string }>>;
    listFactures: (
      statut?: string,
    ) => Promise<IpcResult<FactureListItem[]>>;
    getFacture: (id: number) => Promise<IpcResult<FactureDto | null>>;
    createFacture: (
      input: CreateFactureInput,
    ) => Promise<IpcResult<FactureDto>>;
    createFactureFromContrat: (
      contratId: number,
      tarifId?: number,
    ) => Promise<IpcResult<FactureDto>>;
    submitFacture: (id: number) => Promise<IpcResult<boolean>>;
    addPaiementFacture: (
      input: AddPaiementFactureInput,
    ) => Promise<IpcResult<FactureDto>>;
    listValidations: () => Promise<IpcResult<ValidationQueueItem[]>>;
    validerEntite: (
      entityType: string,
      entityId: number,
      motif?: string,
    ) => Promise<IpcResult<boolean>>;
    rejeterEntite: (
      entityType: string,
      entityId: number,
      motif: string,
    ) => Promise<IpcResult<boolean>>;
    listMouvements: () => Promise<IpcResult<MouvementListItem[]>>;
    createMouvement: (
      input: SaveMouvementInput,
    ) => Promise<IpcResult<MouvementListItem>>;
    recouvrementSummary: () => Promise<IpcResult<RecouvrementSummary>>;
    listCreances: () => Promise<IpcResult<CreanceItem[]>>;
    listRelances: () => Promise<IpcResult<RelanceListItem[]>>;
    createRelance: (
      input: CreateRelanceInput,
    ) => Promise<IpcResult<RelanceListItem>>;
    marquerRelanceEnvoyee: (id: number) => Promise<IpcResult<boolean>>;
  };
  settings: {
    getBranding: () => Promise<IpcResult<{ companyName: string; companyLogoUrl: string | null }>>;
    getAppInfo: () => Promise<IpcResult<AppInfoDto>>;
    update: (
      input: Partial<AppSettingsDto>,
    ) => Promise<IpcResult<AppSettingsDto>>;
    pickBrandAsset: (
      asset: 'logo' | 'report-header' | 'report-footer',
    ) => Promise<IpcResult<AppSettingsDto>>;
    removeBrandAsset: (
      asset: 'logo' | 'report-header' | 'report-footer',
    ) => Promise<IpcResult<AppSettingsDto>>;
  };
  database: {
    getInfo: () => Promise<IpcResult<DatabaseInfoDto>>;
    integrityCheck: () => Promise<IpcResult<IntegrityCheckResult>>;
    vacuum: () => Promise<IpcResult<VacuumResult>>;
    pickImportFile: () => Promise<IpcResult<string | null>>;
    importLegacy: (filePath: string) => Promise<IpcResult<LegacyImportResult>>;
  };
  backup: {
    list: () => Promise<IpcResult<BackupListItem[]>>;
    create: () => Promise<IpcResult<BackupCreateResult>>;
    restore: (filename: string) => Promise<IpcResult<BackupRestoreResult>>;
    delete: (filename: string) => Promise<IpcResult<boolean>>;
  };
  sync: {
    getConfig: () => Promise<IpcResult<SyncConfigDto>>;
    updateConfig: (
      input: { apiBaseUrl?: string; autoSync?: boolean },
    ) => Promise<IpcResult<SyncConfigDto>>;
    getStatus: () => Promise<IpcResult<SyncStatusDto>>;
    listQueue: () => Promise<IpcResult<SyncQueueItem[]>>;
    run: () => Promise<IpcResult<SyncRunResult>>;
  };
  export: {
    excel: (kind: ExportKind) => Promise<IpcResult<ExportResult>>;
    facturePdf: (factureId: number) => Promise<IpcResult<ExportResult>>;
    dashboardExcel: (
      filters: DashboardFilters,
    ) => Promise<IpcResult<ExportResult>>;
    dashboardPdf: (
      filters: DashboardFilters,
    ) => Promise<IpcResult<ExportResult>>;
  };
  facturation: {
    getDashboard: (hotelId?: number) => Promise<IpcResult<FacturationDashboard>>;
    listFactures: (filters: FactureFiltersFact) => Promise<IpcResult<FactureListItemFact[]>>;
    getFacture: (id: number) => Promise<IpcResult<FactureDetailFact>>;
    createFacture: (input: CreateFactureFactInput) => Promise<IpcResult<FactureDetailFact>>;
    updateFacture: (id: number, input: Partial<CreateFactureFactInput>) => Promise<IpcResult<FactureDetailFact>>;
    soumettre: (id: number) => Promise<IpcResult<FactureListItemFact>>;
    valider: (id: number) => Promise<IpcResult<FactureListItemFact>>;
    annuler: (id: number) => Promise<IpcResult<FactureListItemFact>>;
    deleteFacture: (id: number) => Promise<IpcResult<boolean>>;
    addPaiement: (input: AddPaiementFactInput) => Promise<IpcResult<FactureDetailFact>>;
    deletePaiement: (id: number) => Promise<IpcResult<FactureDetailFact>>;
    listClients: (search?: string) => Promise<IpcResult<ClientFacturation[]>>;
    createClient: (input: CreateClientFactInput) => Promise<IpcResult<ClientFacturation>>;
    updateClient: (id: number, input: Partial<CreateClientFactInput>) => Promise<IpcResult<ClientFacturation>>;
    deleteClient: (id: number) => Promise<IpcResult<boolean>>;
    exportPdf: (factureId: number) => Promise<IpcResult<RhExportResult>>;
    createAvoir: (input: CreateAvoirInput) => Promise<IpcResult<FactureDetailFact>>;
    listRegistre: (filters?: FactureFiltersFact) => Promise<IpcResult<FactureRegistreItem[]>>;
    exportRegistreCsv: (filters?: FactureFiltersFact) => Promise<IpcResult<string>>;
  };
  comptabilite: {
    listComptes: (classe?: number) => Promise<IpcResult<Compte[]>>;
    listJournaux: () => Promise<IpcResult<Journal[]>>;
    listExercices: () => Promise<IpcResult<ExerciceComptable[]>>;
    createExercice: (input: { code: string; libelle: string; dateDebut: string; dateFin: string }) => Promise<IpcResult<ExerciceComptable>>;
    cloturerExercice: (exerciceId: number) => Promise<IpcResult<ExerciceComptable>>;
    listEcritures: (filters?: EcritureFilters) => Promise<IpcResult<EcritureListItem[]>>;
    getEcriture: (id: number) => Promise<IpcResult<unknown>>;
    createEcriture: (input: CreateEcritureInput) => Promise<IpcResult<unknown>>;
    validerEcriture: (id: number) => Promise<IpcResult<unknown>>;
    getGrandLivre: (compteNumero: string, dateDebut: string, dateFin: string) => Promise<IpcResult<unknown[]>>;
    getBalance: (exerciceId: number, dateDebut?: string, dateFin?: string) => Promise<IpcResult<BalanceLigne[]>>;
  };
  fiscalite: {
    listRegistreTva: (periode: string) => Promise<IpcResult<RegistreTvaVente[]>>;
    genererRegistreTva: (periode: string) => Promise<IpcResult<RegistreTvaVente[]>>;
    exportRegistreTvaCsv: (periode: string) => Promise<IpcResult<string>>;
    calculerDeclarationTva: (periode: string) => Promise<IpcResult<DeclarationTva>>;
    getDeclarationTva: (periode: string) => Promise<IpcResult<DeclarationTva | null>>;
    listDeclarationsTva: () => Promise<IpcResult<DeclarationTva[]>>;
    createRetenue: (input: CreateRetenueInput) => Promise<IpcResult<RetenueSource>>;
    listRetenues: () => Promise<IpcResult<RetenueSource[]>>;
    genererLiasse: (exercice: number) => Promise<IpcResult<LiasseLigne[]>>;
    listLiasse: (exercice: number) => Promise<IpcResult<LiasseLigne[]>>;
    exportLiasseCsv: (exercice: number) => Promise<IpcResult<string>>;
    listAchats: (periode?: string) => Promise<IpcResult<import('./fiscalite').RegistreTvaAchat[]>>;
    createAchat: (input: import('./fiscalite').CreateTvaAchatInput) => Promise<IpcResult<import('./fiscalite').RegistreTvaAchat>>;
    importAchatsFromBons: (periode: string) => Promise<IpcResult<{ imported: number; skipped: number }>>;
    exportAchatsCsv: (periode: string) => Promise<IpcResult<string>>;
    genererLiasseAvancee: (exercice: number) => Promise<IpcResult<LiasseLigne[]>>;
    exportTeledeclTvaG50: (periode: string) => Promise<IpcResult<string>>;
    listTeledeclarations: (typeDecl?: string) => Promise<IpcResult<import('./fiscalite').Teledeclaration[]>>;
    marquerTeledeclDeclaree: (id: number, referenceDgi: string) => Promise<IpcResult<import('./fiscalite').Teledeclaration>>;
  };
  sifec: {
    dashboard: () => Promise<IpcResult<import('./sifec').SifecDashboard>>;
    getConfig: () => Promise<IpcResult<import('./sifec').SifecConfig>>;
    updateConfig: (input: import('./sifec').UpdateSifecConfigInput) => Promise<IpcResult<import('./sifec').SifecConfig>>;
    testConnection: () => Promise<IpcResult<{ ok: boolean; message: string; latencyMs: number }>>;
    listFactures: (statut?: string) => Promise<IpcResult<import('./sifec').SifecFactureItem[]>>;
    prepareFacture: (factureId: number) => Promise<IpcResult<import('./sifec').SifecFactureItem>>;
    submitFacture: (factureId: number) => Promise<IpcResult<import('./sifec').SifecTransmission>>;
    submitBatch: (factureIds: number[]) => Promise<IpcResult<import('./sifec').SifecTransmission[]>>;
    listTransmissions: (limit?: number) => Promise<IpcResult<import('./sifec').SifecTransmission[]>>;
  };
  modulesLegaux: {
    dashboard: () => Promise<IpcResult<import('./modules-legaux').ModulesLegauxDashboard>>;
    immo: {
      list: (actifOnly?: boolean) => Promise<IpcResult<import('./modules-legaux').Immobilisation[]>>;
      upsert: (input: Record<string, unknown>, id?: number) => Promise<IpcResult<import('./modules-legaux').Immobilisation>>;
      genererPlan: (immobilisationId: number) => Promise<IpcResult<import('./modules-legaux').AmortissementLigne[]>>;
      listAmortissements: (immobilisationId?: number, periode?: string) => Promise<IpcResult<import('./modules-legaux').AmortissementLigne[]>>;
      comptabiliserMensuel: (periode: string) => Promise<IpcResult<number>>;
      exportCsv: () => Promise<IpcResult<string>>;
    };
    casnos: {
      listAffilies: (actifOnly?: boolean) => Promise<IpcResult<import('./modules-legaux').CasnosAffilie[]>>;
      upsertAffilie: (input: Record<string, unknown>, id?: number) => Promise<IpcResult<import('./modules-legaux').CasnosAffilie>>;
      listDeclarations: (periode?: string) => Promise<IpcResult<import('./modules-legaux').CasnosDeclaration[]>>;
      calculerDeclaration: (affilieId: number, periode: string, revenu?: number) => Promise<IpcResult<import('./modules-legaux').CasnosDeclaration>>;
      calculerPeriode: (periode: string) => Promise<IpcResult<import('./modules-legaux').CasnosDeclaration[]>>;
      marquerDeclaree: (id: number, referenceCasnos: string) => Promise<IpcResult<import('./modules-legaux').CasnosDeclaration>>;
      exportCsv: (periode: string) => Promise<IpcResult<string>>;
    };
    inventaire: {
      listSessions: (exercice?: number) => Promise<IpcResult<import('./modules-legaux').InventaireSession[]>>;
      createSession: (input: { exercice: number; hotelId: number; dateInventaire: string; commentaire?: string }) => Promise<IpcResult<import('./modules-legaux').InventaireSession>>;
      listLignes: (sessionId: number) => Promise<IpcResult<import('./modules-legaux').InventaireLigne[]>>;
      updateLigne: (ligneId: number, quantitePhysique: number, motifEcart?: string) => Promise<IpcResult<import('./modules-legaux').InventaireLigne>>;
      cloturerSession: (sessionId: number) => Promise<IpcResult<import('./modules-legaux').InventaireSession>>;
      exportCsv: (sessionId: number) => Promise<IpcResult<string>>;
    };
  };
  clients: {
    getDashboard: () => Promise<IpcResult<ClientsDashboard>>;
    list: (filters?: ClientFilters) => Promise<IpcResult<ClientItem[]>>;
    get: (id: number) => Promise<IpcResult<ClientItemDetail>>;
    create: (input: CreateClientCompletInput) => Promise<IpcResult<ClientItemDetail>>;
    update: (id: number, input: Partial<CreateClientCompletInput>) => Promise<IpcResult<ClientItemDetail>>;
    toggleActif: (id: number) => Promise<IpcResult<ClientItemDetail>>;
    delete: (id: number) => Promise<IpcResult<boolean>>;
    listContacts: (clientId: number) => Promise<IpcResult<ClientContact[]>>;
    createContact: (clientId: number, input: CreateContactInput) => Promise<IpcResult<ClientContact>>;
    updateContact: (contactId: number, input: Partial<CreateContactInput>) => Promise<IpcResult<ClientContact>>;
    deleteContact: (contactId: number) => Promise<IpcResult<boolean>>;
  };
  tresorerie: {
    getDashboard: (hotelId?: number) => Promise<IpcResult<TresorerieDashboard>>;
    listEncaissements: (filters: EncaissementFilters) => Promise<IpcResult<EncaissementItem[]>>;
    createEncaissement: (input: CreateEncaissementInput) => Promise<IpcResult<EncaissementItem>>;
    updateEncaissement: (id: number, input: Partial<CreateEncaissementInput>) => Promise<IpcResult<EncaissementItem>>;
    confirmerEncaissement: (id: number) => Promise<IpcResult<EncaissementItem>>;
    rejeterEncaissement: (id: number, motif: string) => Promise<IpcResult<EncaissementItem>>;
    deleteEncaissement: (id: number) => Promise<IpcResult<boolean>>;
    listComptes: (hotelId?: number) => Promise<IpcResult<CompteBancaire[]>>;
    createCompte: (input: CreateCompteInput) => Promise<IpcResult<CompteBancaire>>;
    updateCompte: (id: number, input: Partial<CreateCompteInput>) => Promise<IpcResult<CompteBancaire>>;
    deleteCompte: (id: number) => Promise<IpcResult<boolean>>;
    getJournalCaisse: (hotelId: number, dateDebut: string, dateFin: string) => Promise<IpcResult<JournalCaisseEntry[]>>;
    addOperationCaisse: (input: AddCaisseInput) => Promise<IpcResult<JournalCaisseEntry>>;
    deleteOperationCaisse: (id: number) => Promise<IpcResult<boolean>>;
  };
  hebergement: {
    listTypesChambre: (hotelId?: number) => Promise<IpcResult<TypeChambre[]>>;
    createTypeChambre: (input: CreateTypeChambreInput) => Promise<IpcResult<TypeChambre>>;
    deleteTypeChambre: (id: number) => Promise<IpcResult<boolean>>;
    listChambres: (hotelId?: number, statut?: StatutChambre) => Promise<IpcResult<Chambre[]>>;
    createChambre: (input: CreateChambreInput) => Promise<IpcResult<Chambre>>;
    updateChambre: (id: number, input: Partial<CreateChambreInput>) => Promise<IpcResult<Chambre>>;
    updateStatutChambre: (id: number, statut: StatutChambre) => Promise<IpcResult<Chambre>>;
    deleteChambre: (id: number) => Promise<IpcResult<boolean>>;
    listReservations: (hotelId?: number, dateDebut?: string, dateFin?: string, statut?: StatutReservation) => Promise<IpcResult<Reservation[]>>;
    getReservation: (id: number) => Promise<IpcResult<Reservation>>;
    createReservation: (input: CreateReservationInput) => Promise<IpcResult<Reservation>>;
    updateReservationStatut: (id: number, statut: StatutReservation) => Promise<IpcResult<Reservation>>;
    deleteReservation: (id: number) => Promise<IpcResult<boolean>>;
    estimatePrice: (input: EstimateReservationPriceInput) => Promise<IpcResult<number>>;
    createFactureFromReservation: (reservationId: number) => Promise<IpcResult<FactureDetailFact>>;
    getOccupationKpis: (dateDebut: string, dateFin: string, hotelId?: number) => Promise<IpcResult<OccupationPeriode>>;
    getFolio: (reservationId: number) => Promise<IpcResult<unknown>>;
    createFolio: (reservationId: number) => Promise<IpcResult<unknown>>;
    addFolioLine: (folioId: number, input: { designation: string; quantite?: number; prixUnitaire: number; tauxTva?: number; categorie?: string }) => Promise<IpcResult<unknown>>;
    closeFolioToFacture: (reservationId: number) => Promise<IpcResult<{ folio: unknown; factureId: number }>>;
  };
  tarifs: {
    listComposants:   (hotelId?: number) => Promise<IpcResult<ComposantTarif[]>>;
    createComposant:  (input: CreateComposantInput) => Promise<IpcResult<ComposantTarif>>;
    deleteComposant:  (id: number) => Promise<IpcResult<boolean>>;
    listFormules:     (hotelId?: number) => Promise<IpcResult<FormuleTarif[]>>;
    createFormule:    (input: CreateFormuleInput) => Promise<IpcResult<FormuleTarif>>;
    deleteFormule:    (id: number) => Promise<IpcResult<boolean>>;
    listPlans:        (hotelId?: number) => Promise<IpcResult<PlanTarifaire[]>>;
    createPlan:       (input: CreatePlanInput) => Promise<IpcResult<PlanTarifaire>>;
    deletePlan:       (id: number) => Promise<IpcResult<boolean>>;
    getGrille:        (hotelId: number, planId: number, dateDebut: string, dateFin: string, formuleId?: number) => Promise<IpcResult<TarifJournalier[]>>;
    upsertTarif:      (input: UpsertTarifInput) => Promise<IpcResult<TarifJournalier>>;
    upsertBulk:       (input: UpsertTarifsBulkInput) => Promise<IpcResult<number>>;
    listPromotions:   (hotelId?: number) => Promise<IpcResult<PromotionTarif[]>>;
    createPromotion:  (input: CreatePromotionInput) => Promise<IpcResult<PromotionTarif>>;
    togglePromotion:  (id: number, actif: boolean) => Promise<IpcResult<boolean>>;
    deletePromotion:  (id: number) => Promise<IpcResult<boolean>>;
    listConventions:  (hotelId?: number, clientId?: number) => Promise<IpcResult<Convention[]>>;
    createConvention: (input: CreateConventionInput) => Promise<IpcResult<Convention>>;
    toggleConvention: (id: number, actif: boolean) => Promise<IpcResult<boolean>>;
    deleteConvention: (id: number) => Promise<IpcResult<boolean>>;
    simuler:          (input: SimulateurInput) => Promise<IpcResult<SimulateurResult>>;
  };
  rh: {
    getDashboard: (dateDebut?: string, dateFin?: string, hotelId?: number) => Promise<IpcResult<RhDashboard>>;
    pendingAccountsCount: () => Promise<IpcResult<number>>;
    getMonEspace: () => Promise<IpcResult<RhMonEspace>>;
    listDirections: () => Promise<IpcResult<RhDirection[]>>;
    createDirection: (input: CreateDirectionInput) => Promise<IpcResult<RhDirection>>;
    updateDirection: (id: number, input: UpdateDirectionInput) => Promise<IpcResult<RhDirection>>;
    listDepartements: (directionId?: number) => Promise<IpcResult<RhDepartement[]>>;
    createDepartement: (input: CreateDepartementInput) => Promise<IpcResult<RhDepartement>>;
    updateDepartement: (id: number, input: UpdateDepartementInput) => Promise<IpcResult<RhDepartement>>;
    listPostes: (departementId?: number) => Promise<IpcResult<RhPoste[]>>;
    createPoste: (input: CreatePosteInput) => Promise<IpcResult<RhPoste>>;
    updatePoste: (id: number, input: UpdatePosteInput) => Promise<IpcResult<RhPoste>>;
    listEmployes: (search?: string) => Promise<IpcResult<RhEmploye[]>>;
    getEmploye: (id: number) => Promise<IpcResult<RhEmploye | null>>;
    createEmploye: (input: CreateEmployeInput) => Promise<IpcResult<RhEmploye>>;
    createEmployeWizard: (input: CreateEmployeWizardInput) => Promise<IpcResult<RhEmploye>>;
    updateEmploye: (id: number, input: UpdateEmployeInput) => Promise<IpcResult<RhEmploye>>;
    sortirEmploye: (id: number, input: SortirEmployeInput) => Promise<IpcResult<RhEmploye>>;
    listRecrutements: (statut?: StatutRecrutement) => Promise<IpcResult<RhRecrutement[]>>;
    createRecrutement: (input: CreateRecrutementInput) => Promise<IpcResult<RhRecrutement>>;
    validerRecrutement: (id: number) => Promise<IpcResult<RhRecrutement>>;
    refuserRecrutement: (id: number, motif?: string) => Promise<IpcResult<RhRecrutement>>;
    listContrats: (employeId: number) => Promise<IpcResult<RhContrat[]>>;
    createContrat: (input: CreateContratInput) => Promise<IpcResult<RhContrat>>;
    listAllContrats: () => Promise<IpcResult<RhContratListe[]>>;
    listPointages: (dateDebut?: string, dateFin?: string, employeId?: number) => Promise<IpcResult<RhPointage[]>>;
    upsertPointage: (input: UpsertPointageInput) => Promise<IpcResult<RhPointage>>;
    soumettrePointage: (id: number) => Promise<IpcResult<RhPointage>>;
    validerPointage: (id: number, approuve: boolean) => Promise<IpcResult<RhPointage>>;
    listAbsences: (
      statut?: StatutAbsence,
      opts?: { dateDebut?: string; dateFin?: string; hotelId?: number },
    ) => Promise<IpcResult<RhAbsence[]>>;
    createAbsence: (input: CreateAbsenceInput) => Promise<IpcResult<RhAbsence>>;
    deciderAbsence: (id: number, approuve: boolean) => Promise<IpcResult<RhAbsence>>;
    listAffectations: (opts?: {
      employeId?: number;
      hotelId?: number;
      statut?: StatutAffectation;
    }) => Promise<IpcResult<RhAffectation[]>>;
    createAffectation: (input: CreateAffectationInput) => Promise<IpcResult<RhAffectation>>;
    terminerAffectation: (id: number, dateFin?: string) => Promise<IpcResult<RhAffectation>>;
    listOrganisation: (hotelId?: number) => Promise<IpcResult<RhOrganisationSynthese>>;
    upsertOrganisation: (input: UpsertOrganisationInput) => Promise<IpcResult<RhOrganisationSynthese['lignes'][number]>>;
    deleteOrganisation: (id: number) => Promise<IpcResult<boolean>>;
    listSoldesConges: (opts?: { employeId?: number; annee?: number }) => Promise<IpcResult<RhSoldeConges[]>>;
    upsertSoldeConges: (input: UpsertSoldeCongesInput) => Promise<IpcResult<RhSoldeConges>>;
    listPlannings: (opts?: {
      hotelId?: number;
      dateDebut?: string;
      dateFin?: string;
      employeId?: number;
    }) => Promise<IpcResult<RhPlanning[]>>;
    createPlanning: (input: CreatePlanningInput) => Promise<IpcResult<RhPlanning>>;
    deletePlanning: (id: number) => Promise<IpcResult<boolean>>;
    getPlanningSynthese: (
      dateDebut: string,
      dateFin: string,
      hotelId?: number,
    ) => Promise<IpcResult<RhPlanningSynthese>>;
    getSuggestionsRenfort: (seuil?: number) => Promise<IpcResult<RhSuggestionRenfort[]>>;
    listEquipes: (chefEmployeId?: number) => Promise<IpcResult<RhEquipeMembre[]>>;
    addEquipeMembre: (input: AddEquipeMembreInput) => Promise<IpcResult<RhEquipeMembre>>;
    removeEquipeMembre: (id: number) => Promise<IpcResult<boolean>>;
    listBulletins: (periode?: string) => Promise<IpcResult<RhBulletin[]>>;
    generatePrePaie: (periode: string) => Promise<IpcResult<RhBulletin[]>>;
    validerBulletin: (id: number) => Promise<IpcResult<RhBulletin>>;
    getPaieCloture: (periode: string) => Promise<IpcResult<PaieClotureMensuelle>>;
    listPaieClotures: () => Promise<IpcResult<PaieClotureMensuelle[]>>;
    validerPaieMensuelle: (periode: string) => Promise<IpcResult<PaieClotureMensuelle>>;
    cloturerPaieMensuelle: (periode: string) => Promise<IpcResult<PaieClotureMensuelle>>;
    getPaieParams: () => Promise<IpcResult<Record<string, number>>>;
    comptabiliserBulletin: (id: number, hotelId: number, dateOperation: string) => Promise<IpcResult<RhBulletin>>;
    listPrimes: (periode?: string, employeId?: number) => Promise<IpcResult<RhPrime[]>>;
    createPrime: (input: CreatePrimeInput) => Promise<IpcResult<RhPrime>>;
    deletePrime: (id: number) => Promise<IpcResult<boolean>>;
    getDlgConfig: () => Promise<IpcResult<RhDlgConfig>>;
    setDlgConfig: (input: UpdateDlgConfigInput) => Promise<IpcResult<RhDlgConfig>>;
    pickDlgFolder: (kind: 'export' | 'import') => Promise<IpcResult<string | null>>;
    pickDlgImportFile: () => Promise<IpcResult<string | null>>;
    exportVersDlg: (periode: string) => Promise<IpcResult<RhDlgExchangeResult>>;
    importDepuisDlg: (periode: string, sourceFile?: string | null) => Promise<IpcResult<RhDlgExchangeResult>>;
    listDlgJournal: (limit?: number) => Promise<IpcResult<RhDlgJournalEntry[]>>;
    listFormationsCatalog: (actifOnly?: boolean) => Promise<IpcResult<RhFormationCatalog[]>>;
    createFormationCatalog: (input: CreateFormationCatalogInput) => Promise<IpcResult<RhFormationCatalog>>;
    updateFormationCatalog: (id: number, input: UpdateFormationCatalogInput) => Promise<IpcResult<RhFormationCatalog>>;
    listEmployeFormations: (opts?: { employeId?: number; echeanceProche?: boolean }) => Promise<IpcResult<RhEmployeFormation[]>>;
    assignEmployeFormation: (input: AssignEmployeFormationInput) => Promise<IpcResult<RhEmployeFormation>>;
    updateEmployeFormation: (id: number, input: UpdateEmployeFormationInput) => Promise<IpcResult<RhEmployeFormation>>;
    deleteEmployeFormation: (id: number) => Promise<IpcResult<boolean>>;
    listCompetences: () => Promise<IpcResult<RhCompetence[]>>;
    createCompetence: (input: CreateCompetenceInput) => Promise<IpcResult<RhCompetence>>;
    listPosteCompetences: (posteId?: number) => Promise<IpcResult<RhPosteCompetence[]>>;
    setPosteCompetence: (input: SetPosteCompetenceInput) => Promise<IpcResult<RhPosteCompetence>>;
    removePosteCompetence: (id: number) => Promise<IpcResult<boolean>>;
    listEntretiens: (opts?: { employeId?: number; statut?: 'planifie' | 'realise' | 'annule' }) => Promise<IpcResult<RhEntretien[]>>;
    createEntretien: (input: CreateEntretienInput) => Promise<IpcResult<RhEntretien>>;
    updateEntretien: (id: number, input: UpdateEntretienInput) => Promise<IpcResult<RhEntretien>>;
    deleteEntretien: (id: number) => Promise<IpcResult<boolean>>;
    listRhDocuments: (employeId?: number) => Promise<IpcResult<RhDocument[]>>;
    uploadRhDocument: (employeId: number, type: TypeDocumentRh, nom?: string) => Promise<IpcResult<RhDocument>>;
    deleteRhDocument: (id: number) => Promise<IpcResult<boolean>>;
    openRhDocument: (id: number) => Promise<IpcResult<boolean>>;
    getComparatifUnites: (dateDebut?: string, dateFin?: string) => Promise<IpcResult<RhComparatifUnite[]>>;
    getPrevisionsEffectif: (opts?: { hotelId?: number; moisAhead?: number }) => Promise<IpcResult<RhPrevisionEffectif[]>>;
    listOnboardingSuivi: (opts?: { employeId?: number; enCoursOnly?: boolean }) => Promise<IpcResult<RhOnboardingSuivi[]>>;
    completeOnboardingStep: (employeId: number, stepCode: string) => Promise<IpcResult<boolean>>;
    getPortRhSynthese: () => Promise<IpcResult<RhPortRhSynthese>>;
    updateEmployeTypeActivite: (input: UpdateEmployeTypeActiviteInput) => Promise<IpcResult<boolean>>;
    getRhAiConfig: () => Promise<IpcResult<RhAiConfig>>;
    buildRhDecisionContext: (hotelId?: number) => Promise<IpcResult<RhAiDecisionContext>>;
    generateRhAiAnalysis: (opts?: { hotelId?: number; provider?: RhAiProvider }) => Promise<IpcResult<RhAiAnalysisResult>>;
    getConformiteDashboard: () => Promise<IpcResult<RhConformiteDashboard>>;
    syncCongesLegaux: (annee?: number) => Promise<IpcResult<number>>;
    updateConformiteSuivi: (
      employeId: number,
      code: string,
      statut: 'a_faire' | 'en_cours' | 'fait' | 'non_requis',
      opts?: { dateRealisation?: string; notes?: string },
    ) => Promise<IpcResult<boolean>>;
    listDossierModeles: () => Promise<IpcResult<RhDossierModele[]>>;
    getDossierEmploye: (employeId: number) => Promise<IpcResult<RhDossierEmploye>>;
    scanDossierFolder: (employeId: number, modeleCode?: string) => Promise<IpcResult<RhDocument[]>>;
    scanSingleDocument: (employeId: number, modeleCode: string) => Promise<IpcResult<RhDocument>>;
    soumettreDocumentValidation: (documentId: number) => Promise<IpcResult<RhDocument>>;
    listValidationsN1: () => Promise<IpcResult<RhValidationN1Item[]>>;
    countValidationsN1: () => Promise<IpcResult<number>>;
    validerN1Absence: (id: number, approuve: boolean, commentaire?: string) => Promise<IpcResult<boolean>>;
    validerN1Pointage: (id: number, approuve: boolean) => Promise<IpcResult<boolean>>;
    validerN1Document: (id: number, approuve: boolean) => Promise<IpcResult<boolean>>;
    listRegistrePersonnel: () => Promise<IpcResult<RhRegistrePersonnelLigne[]>>;
    listRegistreConges: (annee?: number) => Promise<IpcResult<RhRegistreCongesLigne[]>>;
    listAccidentsTravail: () => Promise<IpcResult<RhAccidentTravail[]>>;
    listVisitesMedicales: () => Promise<IpcResult<RhVisiteMedicale[]>>;
    createAccidentTravail: (input: CreateRhAccidentInput) => Promise<IpcResult<RhAccidentTravail>>;
    createVisiteMedicale: (input: CreateRhVisiteMedicaleInput) => Promise<IpcResult<RhVisiteMedicale>>;
    exportRegistrePersonnelPdf: () => Promise<IpcResult<RhExportResult>>;
    exportRegistrePersonnelCsv: () => Promise<IpcResult<RhExportResult>>;
    exportRegistreCongesPdf: (annee?: number) => Promise<IpcResult<RhExportResult>>;
    exportRegistreAccidentsPdf: () => Promise<IpcResult<RhExportResult>>;
    exportRegistreVisitesPdf: () => Promise<IpcResult<RhExportResult>>;
    exportBulletinPaiePdf: (bulletinId: number) => Promise<IpcResult<RhExportResult>>;
    previewStc: (input: ProcessRuptureInput) => Promise<IpcResult<RhStcPreview>>;
    processRuptureContrat: (input: ProcessRuptureInput) => Promise<IpcResult<RhRuptureContrat>>;
    listRupturesContrat: () => Promise<IpcResult<RhRuptureContrat[]>>;
    exportCertificatTravailPdf: (ruptureId: number) => Promise<IpcResult<RhExportResult>>;
    exportStcPdf: (ruptureId: number) => Promise<IpcResult<RhExportResult>>;
    exportDasAnnuelle: (annee: number) => Promise<IpcResult<RhExportResult>>;
    exportCnasMensuelle: (periode: string) => Promise<IpcResult<RhExportResult>>;
    exportVirementsPaie: (periode: string) => Promise<IpcResult<RhExportResult>>;
    exportAnemEmbauches: () => Promise<IpcResult<RhExportResult>>;
    getOrganigrammeEgt: (hotelId?: number) => Promise<IpcResult<OrganigrammeNode[]>>;
    getEffectifsEgt: (hotelId?: number) => Promise<IpcResult<EffectifEgtSummary[]>>;
    listFichesPoste: (posteId?: number) => Promise<IpcResult<FichePoste[]>>;
    upsertFichePoste: (input: { posteId: number; missions?: string; responsabilites?: string; competences?: string; kpiJson?: string }) => Promise<IpcResult<FichePoste>>;
    exportOrganigrammeCsv: (hotelId?: number) => Promise<IpcResult<string>>;
    listPointeuses: (hotelId: number) => Promise<IpcResult<import('./rh').RhPointeuse[]>>;
    upsertPointeuse: (input: import('./rh').UpsertPointeuseInput, id?: number) => Promise<IpcResult<import('./rh').RhPointeuse>>;
    importPointeuseCsv: (hotelId: number, csvContent: string, pointeuseId?: number) => Promise<IpcResult<{ imported: number; duplicates: number }>>;
    listRawPunches: (hotelId: number, traite?: boolean) => Promise<IpcResult<import('./rh').RhRawPunch[]>>;
    traiterRawPunches: (hotelId: number, dateDebut?: string, dateFin?: string) => Promise<IpcResult<import('./rh').TraiterPunchesResult>>;
    setEmployeBadge: (employeId: number, badgeId: string | null) => Promise<IpcResult<boolean>>;
    syncPointeuseNow: (pointeuseId: number) => Promise<IpcResult<{ imported: number; duplicates: number; ok: boolean; message: string }>>;
    setPointeuseSyncAuto: (pointeuseId: number, syncAuto: boolean, intervalMin?: number) => Promise<IpcResult<boolean>>;
    listPointeusesExtended: (hotelId: number) => Promise<IpcResult<(import('./rh').RhPointeuse & { syncAuto: boolean; syncIntervalMin: number; dernierSyncStatut: string | null; dernierSyncMessage: string | null })[]>>;
  };
  modules: {
    listEnabled: () => Promise<IpcResult<string[]>>;
    listConfig: () => Promise<IpcResult<import('./modules').ModuleConfigItem[]>>;
    setEnabled: (moduleId: string, enabled: boolean) => Promise<IpcResult<boolean>>;
  };
  anomalies: {
    list: (hotelId?: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    stats: (hotelId: number) => Promise<IpcResult<unknown>>;
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
    delete: (id: number) => Promise<IpcResult<boolean>>;
  };
  decisions: {
    list: (filters?: unknown) => Promise<IpcResult<unknown[]>>;
    listForUser: (filters?: { unreadOnly?: boolean; hotelId?: number }) => Promise<IpcResult<unknown[]>>;
    destinataires: (id: number) => Promise<IpcResult<unknown[]>>;
    get: (id: number) => Promise<IpcResult<unknown>>;
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
    marquerLu: (id: number) => Promise<IpcResult<unknown>>;
    archiver: (id: number) => Promise<IpcResult<boolean>>;
  };
  reclamations: {
    list: (hotelId?: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    stats: (hotelId: number) => Promise<IpcResult<unknown>>;
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
  };
  parking: {
    getConfig: (hotelId: number) => Promise<IpcResult<unknown>>;
    saveConfig: (hotelId: number, input: unknown) => Promise<IpcResult<unknown>>;
    listTickets: (hotelId: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    entree: (input: unknown) => Promise<IpcResult<unknown>>;
    sortie: (ticketId: number) => Promise<IpcResult<unknown>>;
    stats: (hotelId: number) => Promise<IpcResult<unknown>>;
  };
  plage: {
    getConfig: (hotelId: number) => Promise<IpcResult<unknown>>;
    saveConfig: (hotelId: number, input: unknown) => Promise<IpcResult<unknown>>;
    listEntrees: (hotelId: number, date?: string) => Promise<IpcResult<unknown[]>>;
    createEntree: (input: unknown) => Promise<IpcResult<unknown>>;
    stats: (hotelId: number) => Promise<IpcResult<unknown>>;
  };
  stocks: {
    listProduits: () => Promise<IpcResult<unknown[]>>;
    createProduit: (input: unknown) => Promise<IpcResult<unknown>>;
    getNiveaux: (hotelId: number) => Promise<IpcResult<unknown[]>>;
    createMouvement: (input: unknown) => Promise<IpcResult<unknown>>;
    listCategories: () => Promise<IpcResult<unknown[]>>;
  };
  cuisine: {
    listRecettes: (hotelId: number) => Promise<IpcResult<import('./cuisine').CuisineRecette[]>>;
    getRecette: (id: number) => Promise<IpcResult<import('./cuisine').CuisineRecette | null>>;
    createRecette: (input: import('./cuisine').CreateRecetteInput) => Promise<IpcResult<import('./cuisine').CuisineRecette>>;
    updateRecette: (id: number, input: Partial<import('./cuisine').CreateRecetteInput>) => Promise<IpcResult<import('./cuisine').CuisineRecette>>;
    upsertRecetteLigne: (recetteId: number, input: import('./cuisine').UpsertRecetteLigneInput, ligneId?: number) => Promise<IpcResult<import('./cuisine').CuisineRecette>>;
    removeRecetteLigne: (recetteId: number, ligneId: number) => Promise<IpcResult<import('./cuisine').CuisineRecette>>;
    validerRecette: (id: number) => Promise<IpcResult<import('./cuisine').CuisineRecette>>;
    listOrdres: (hotelId: number) => Promise<IpcResult<import('./cuisine').CuisineOrdreProduction[]>>;
    createOrdre: (input: import('./cuisine').CreateOrdreProductionInput) => Promise<IpcResult<import('./cuisine').CuisineOrdreProduction>>;
    executerOrdre: (id: number) => Promise<IpcResult<import('./cuisine').CuisineOrdreProduction>>;
    listVentesPos: (hotelId: number) => Promise<IpcResult<import('./cuisine').CuisineVentePos[]>>;
    enregistrerVentePos: (input: import('./cuisine').EnregistrerVentePosInput) => Promise<IpcResult<import('./cuisine').CuisineVentePos>>;
  };
  achats: {
    listFournisseurs: () => Promise<IpcResult<unknown[]>>;
    createFournisseur: (input: unknown) => Promise<IpcResult<unknown>>;
    listBons: (hotelId?: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    getBonLignes: (bonId: number) => Promise<IpcResult<unknown[]>>;
    createBon: (input: unknown) => Promise<IpcResult<unknown>>;
    validerBon: (id: number) => Promise<IpcResult<unknown>>;
    envoyerBon: (id: number) => Promise<IpcResult<unknown>>;
    livrerBon: (id: number, input?: unknown) => Promise<IpcResult<unknown>>;
  };
  maintenance: {
    listEquipements: (hotelId: number) => Promise<IpcResult<unknown[]>>;
    createEquipement: (input: unknown) => Promise<IpcResult<unknown>>;
    listInterventions: (hotelId: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    createIntervention: (input: unknown) => Promise<IpcResult<unknown>>;
    updateIntervention: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
    stats: (hotelId: number) => Promise<IpcResult<unknown>>;
  };
  commercial: {
    listPartenaires: () => Promise<IpcResult<unknown[]>>;
    createPartenaire: (input: unknown) => Promise<IpcResult<unknown>>;
    listOpportunites: (hotelId?: number, statut?: string) => Promise<IpcResult<unknown[]>>;
    createOpportunite: (input: unknown) => Promise<IpcResult<unknown>>;
    updateOpportunite: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
    stats: (hotelId?: number) => Promise<IpcResult<unknown>>;
  };
  ged: {
    listCategories: () => Promise<IpcResult<unknown[]>>;
    listDocuments: (hotelId?: number, categorieId?: number, search?: string) => Promise<IpcResult<unknown[]>>;
    upload: (input: unknown) => Promise<IpcResult<unknown>>;
    archiver: (id: number) => Promise<IpcResult<boolean>>;
    delete: (id: number, motif?: string) => Promise<IpcResult<boolean>>;
    ouvrir: (id: number) => Promise<IpcResult<boolean>>;
  };
  workflow: {
    create: (input: CreateWorkflowInput) => Promise<IpcResult<WorkflowInstance>>;
    submit: (workflowId: number, commentaire?: string) => Promise<IpcResult<WorkflowInstance>>;
    approve: (workflowId: number, statut?: WorkflowStatut, commentaire?: string) => Promise<IpcResult<WorkflowInstance>>;
    reject: (workflowId: number, motif: string) => Promise<IpcResult<WorkflowInstance>>;
    history: (workflowId: number) => Promise<IpcResult<WorkflowHistoryEntry[]>>;
    listPending: (filters?: WorkflowFilters) => Promise<IpcResult<WorkflowInstance[]>>;
    find: (module: string, entityType: string, entityId: number) => Promise<IpcResult<WorkflowInstance | null>>;
  };
  cloture: {
    create: (hotelId: number, dateJournal: string) => Promise<IpcResult<DailyClosure>>;
    prefill: (closureId: number) => Promise<IpcResult<DailyClosure>>;
    submit: (closureId: number) => Promise<IpcResult<DailyClosure>>;
    validateUnit: (closureId: number) => Promise<IpcResult<DailyClosure>>;
    validateDec: (closureId: number) => Promise<IpcResult<DailyClosure>>;
    reject: (closureId: number, motif: string) => Promise<IpcResult<DailyClosure>>;
    close: (closureId: number) => Promise<IpcResult<DailyClosure>>;
    list: (hotelId?: number, dateDebut?: string, dateFin?: string) => Promise<IpcResult<DailyClosure[]>>;
  };
  reconciliation: {
    create: (hotelId: number, dateJournal: string) => Promise<IpcResult<FinanceReconciliation>>;
    prefill: (id: number) => Promise<IpcResult<FinanceReconciliation>>;
    justify: (id: number, justification: string) => Promise<IpcResult<FinanceReconciliation>>;
    validate: (id: number) => Promise<IpcResult<FinanceReconciliation>>;
    list: (hotelId?: number, dateDebut?: string, dateFin?: string) => Promise<IpcResult<FinanceReconciliation[]>>;
  };
  creances: {
    list: (filters?: { hotelId?: number; statut?: CreanceStatut }) => Promise<IpcResult<GlobalCreance[]>>;
    fromFacture: (factureId: number) => Promise<IpcResult<GlobalCreance>>;
    relance: (creanceId: number, input: { canal: string; objet?: string; contenu?: string }) => Promise<IpcResult<unknown>>;
    balanceAgee: (hotelId?: number) => Promise<IpcResult<BalanceAgeeLigne[]>>;
    updateStatut: (creanceId: number, statut: CreanceStatut) => Promise<IpcResult<GlobalCreance>>;
    paiement: (creanceId: number, montant: number) => Promise<IpcResult<GlobalCreance>>;
    runRelancesAuto: () => Promise<IpcResult<{ traitees: number }>>;
    getRelancesAuto: () => Promise<IpcResult<boolean>>;
    setRelancesAuto: (actif: boolean) => Promise<IpcResult<boolean>>;
  };
  contratsHotel: {
    list: (hotelId?: number) => Promise<IpcResult<unknown[]>>;
    get: (id: number) => Promise<IpcResult<unknown>>;
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
    echeances: (jours?: number) => Promise<IpcResult<unknown[]>>;
  };
  decCockpit: {
    get: (hotelId?: number) => Promise<IpcResult<DecCockpitDashboard>>;
    listAlerts: (statut?: string) => Promise<IpcResult<DecAlert[]>>;
    closeAlert: (alertId: number) => Promise<IpcResult<DecAlert>>;
  };
  dashboardPdg: {
    get: () => Promise<IpcResult<PdgDashboard>>;
    exportCsv: () => Promise<IpcResult<string>>;
    exportMensuel: (periode?: string) => Promise<IpcResult<{ ok: boolean; filePath?: string; message?: string }>>;
  };
  checklist: {
    templates: () => Promise<IpcResult<ChecklistTemplate[]>>;
    start: (templateId: number, hotelId?: number) => Promise<IpcResult<ChecklistRun>>;
    get: (runId: number) => Promise<IpcResult<{ run: ChecklistRun; results: ChecklistResultItem[] }>>;
    updateResult: (runId: number, itemId: number, input: { statut: string; commentaire?: string; preuvePath?: string }) => Promise<IpcResult<boolean>>;
    submit: (runId: number) => Promise<IpcResult<ChecklistRun>>;
    list: (hotelId?: number) => Promise<IpcResult<ChecklistRun[]>>;
    stats: (hotelId?: number) => Promise<IpcResult<{ total: number; cloturees: number; tauxCloture: number }>>;
  };
  hotelLegal: {
    listFichesPolice: (hotelId?: number, statut?: string) => Promise<IpcResult<FichePolice[]>>;
    createFichePolice: (input: unknown) => Promise<IpcResult<FichePolice>>;
    checkoutFichePolice: (ficheId: number, dateSortie: string) => Promise<IpcResult<FichePolice>>;
    calculerTaxeSejour: (hotelId: number, periode: string, taux?: number) => Promise<IpcResult<unknown>>;
    genererRapportTourisme: (hotelId: number, periode: string) => Promise<IpcResult<unknown>>;
    listRapportsTourisme: (hotelId?: number) => Promise<IpcResult<unknown[]>>;
    exportFichesPoliceCsv: (hotelId: number) => Promise<IpcResult<string>>;
  };
  gedArchivage: {
    listRetentionPolicies: () => Promise<IpcResult<unknown[]>>;
    archiveLegally: (documentId: number, politiqueCode?: string) => Promise<IpcResult<GedLegalArchive>>;
    listLegalArchives: () => Promise<IpcResult<GedLegalArchive[]>>;
    verifyIntegrity: (archiveId: number) => Promise<IpcResult<{ ok: boolean; hashAttendu: string; hashCalcule?: string }>>;
  };
  systemHealth: {
    get: () => Promise<IpcResult<import('./phase2').SystemHealthReport>>;
    gedIntegrity: (limit?: number) => Promise<IpcResult<{ total: number; ok: number; failed: number; details: string[] }>>;
  };
  license: {
    getStatus: () => Promise<IpcResult<import('./license').LicenseStatusDto>>;
    getMachineId: () => Promise<IpcResult<string>>;
    activate: (key: string) => Promise<IpcResult<import('./license').LicenseStatusDto>>;
    clear: () => Promise<IpcResult<import('./license').LicenseStatusDto>>;
  };
  notifications: {
    list: (unreadOnly?: boolean, limit?: number) => Promise<IpcResult<import('./notifications').NotificationItem[]>>;
    countUnread: () => Promise<IpcResult<number>>;
    markRead: (id: number) => Promise<IpcResult<import('./notifications').NotificationItem>>;
    markAllRead: () => Promise<IpcResult<number>>;
    getRules: () => Promise<IpcResult<import('./notifications').NotificationRule[]>>;
    updateRule: (input: { code: string; actif: boolean }) => Promise<IpcResult<import('./notifications').NotificationRule>>;
    generateSystem: () => Promise<IpcResult<number>>;
  };
  rgpd: {
    dashboard: () => Promise<IpcResult<import('./rgpd').RgpdDashboard>>;
    listTraitements: (actifOnly?: boolean) => Promise<IpcResult<import('./rgpd').RgpdTraitement[]>>;
    upsertTraitement: (input: import('./rgpd').UpsertTraitementInput) => Promise<IpcResult<import('./rgpd').RgpdTraitement>>;
    exportTraitementsCsv: () => Promise<IpcResult<string>>;
    listConsentements: (statut?: string) => Promise<IpcResult<import('./rgpd').RgpdConsentement[]>>;
    createConsentement: (input: import('./rgpd').CreateConsentementInput) => Promise<IpcResult<import('./rgpd').RgpdConsentement>>;
    revokeConsentement: (id: number, dateRetrait: string) => Promise<IpcResult<import('./rgpd').RgpdConsentement>>;
    listDemandes: (statut?: import('./rgpd').RgpdDemandeStatut) => Promise<IpcResult<import('./rgpd').RgpdDemandeDroit[]>>;
    createDemande: (input: import('./rgpd').CreateDemandeInput) => Promise<IpcResult<import('./rgpd').RgpdDemandeDroit>>;
    updateDemande: (id: number, statut: import('./rgpd').RgpdDemandeStatut, reponse?: string) => Promise<IpcResult<import('./rgpd').RgpdDemandeDroit>>;
    listIncidents: (statut?: import('./rgpd').RgpdIncidentStatut) => Promise<IpcResult<import('./rgpd').RgpdIncident[]>>;
    createIncident: (input: import('./rgpd').CreateIncidentInput) => Promise<IpcResult<import('./rgpd').RgpdIncident>>;
    updateIncident: (id: number, input: Partial<{ statut: import('./rgpd').RgpdIncidentStatut; mesuresCorrectives: string; notificationAnpdp: boolean; dateNotificationAnpdp: string }>) => Promise<IpcResult<import('./rgpd').RgpdIncident>>;
    listConservation: () => Promise<IpcResult<import('./rgpd').RgpdPolitiqueConservation[]>>;
  };
  reports: {
    overview: () => Promise<IpcResult<import('./reports').ReportOverview>>;
    semanticCatalog: () => Promise<IpcResult<import('./reports').SemanticCatalog>>;
    compatibleFields: (dimensions: string[], measures: string[]) => Promise<IpcResult<import('./reports').CompatibleFieldsResult>>;
    previewComposed: (composition: import('./reports').ReportComposition, filters?: import('./reports').ReportFilters) => Promise<IpcResult<import('./reports').ReportPreviewResult>>;
    exportComposed: (composition: import('./reports').ReportComposition, filters?: import('./reports').ReportFilters, name?: string) => Promise<IpcResult<import('./reports').ReportExportResult>>;
    catalog: () => Promise<IpcResult<import('./reports').ReportSourceCatalog>>;
    listSources: () => Promise<IpcResult<import('./reports').ReportDataSourceMeta[]>>;
    listTemplates: () => Promise<IpcResult<import('./reports').ReportTemplate[]>>;
    getTemplate: (id: number) => Promise<IpcResult<import('./reports').ReportTemplate | null>>;
    createTemplate: (input: import('./reports').CreateReportTemplateInput) => Promise<IpcResult<import('./reports').ReportTemplate>>;
    updateTemplate: (id: number, input: import('./reports').UpdateReportTemplateInput) => Promise<IpcResult<import('./reports').ReportTemplate>>;
    duplicateTemplate: (id: number, newName?: string) => Promise<IpcResult<import('./reports').ReportTemplate>>;
    deleteTemplate: (id: number) => Promise<IpcResult<boolean>>;
    preview: (dataSource: string, columns: string[], filters?: import('./reports').ReportFilters) => Promise<IpcResult<import('./reports').ReportPreviewResult>>;
    previewKpi: (kpiId: string, filters?: import('./reports').ReportFilters) => Promise<IpcResult<import('./reports').ReportPreviewResult>>;
    exportTemplate: (templateId: number) => Promise<IpcResult<import('./reports').ReportExportResult>>;
    exportAdHoc: (dataSource: string, columns: string[], filters?: import('./reports').ReportFilters, name?: string) => Promise<IpcResult<import('./reports').ReportExportResult>>;
    exportKpi: (kpiId: string, filters?: import('./reports').ReportFilters) => Promise<IpcResult<import('./reports').ReportExportResult>>;
    listRuns: (limit?: number) => Promise<IpcResult<import('./reports').ReportRunHistory[]>>;
  };
}

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}

export {};
