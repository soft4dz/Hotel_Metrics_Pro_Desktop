/** Contrat IPC typé — main ↔ renderer */
import type {
  CreateAbsenceInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateEmployeInput,
  CreatePosteInput,
  CreateRecrutementInput,
  RhAbsence,
  RhContrat,
  RhDashboard,
  RhDepartement,
  RhEmploye,
  RhMonEspace,
  RhPointage,
  RhPoste,
  RhRecrutement,
  StatutAbsence,
  StatutRecrutement,
  UpsertPointageInput,
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
  OccupationPeriode, Reservation, StatutChambre, StatutReservation, TypeChambre,
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
  CreateClientInput as CreateClientFactInput,
  CreateFactureInput as CreateFactureFactInput,
  FacturationDashboard,
  FactureDetail as FactureDetailFact,
  FactureFilters as FactureFiltersFact,
  FactureListItem as FactureListItemFact,
} from './facturation';

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
    dashboard: () => Promise<IpcResult<PortDashboardDto>>;
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
    getOccupationKpis: (dateDebut: string, dateFin: string, hotelId?: number) => Promise<IpcResult<OccupationPeriode>>;
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
    getDashboard: (dateDebut?: string, dateFin?: string) => Promise<IpcResult<RhDashboard>>;
    pendingAccountsCount: () => Promise<IpcResult<number>>;
    getMonEspace: () => Promise<IpcResult<RhMonEspace>>;
    listDepartements: () => Promise<IpcResult<RhDepartement[]>>;
    createDepartement: (input: CreateDepartementInput) => Promise<IpcResult<RhDepartement>>;
    listPostes: () => Promise<IpcResult<RhPoste[]>>;
    createPoste: (input: CreatePosteInput) => Promise<IpcResult<RhPoste>>;
    listEmployes: (search?: string) => Promise<IpcResult<RhEmploye[]>>;
    getEmploye: (id: number) => Promise<IpcResult<RhEmploye | null>>;
    createEmploye: (input: CreateEmployeInput) => Promise<IpcResult<RhEmploye>>;
    listRecrutements: (statut?: StatutRecrutement) => Promise<IpcResult<RhRecrutement[]>>;
    createRecrutement: (input: CreateRecrutementInput) => Promise<IpcResult<RhRecrutement>>;
    validerRecrutement: (id: number) => Promise<IpcResult<RhRecrutement>>;
    refuserRecrutement: (id: number, motif?: string) => Promise<IpcResult<RhRecrutement>>;
    listContrats: (employeId: number) => Promise<IpcResult<RhContrat[]>>;
    createContrat: (input: CreateContratInput) => Promise<IpcResult<RhContrat>>;
    listPointages: (dateDebut?: string, dateFin?: string, employeId?: number) => Promise<IpcResult<RhPointage[]>>;
    upsertPointage: (input: UpsertPointageInput) => Promise<IpcResult<RhPointage>>;
    soumettrePointage: (id: number) => Promise<IpcResult<RhPointage>>;
    validerPointage: (id: number, approuve: boolean) => Promise<IpcResult<RhPointage>>;
    listAbsences: (statut?: StatutAbsence) => Promise<IpcResult<RhAbsence[]>>;
    createAbsence: (input: CreateAbsenceInput) => Promise<IpcResult<RhAbsence>>;
    deciderAbsence: (id: number, approuve: boolean) => Promise<IpcResult<RhAbsence>>;
  };
}

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}

export {};
