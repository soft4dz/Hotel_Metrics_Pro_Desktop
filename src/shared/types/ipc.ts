/** Contrat IPC typé — main ↔ renderer */

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
}

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}

export {};
