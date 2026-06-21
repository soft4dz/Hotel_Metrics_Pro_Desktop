import { vi } from 'vitest';
import type { IpcApi } from '@/shared/types/ipc';
import {
  mockAdminUser,
  mockBranding,
  mockDashboard,
  mockEnabledModuleIds,
  mockHotels,
  mockReportsCatalog,
} from './fixtures/mockData';

type MockFn = ReturnType<typeof vi.fn>;

function ok<T>(data: T): MockFn {
  return vi.fn().mockResolvedValue({ ok: true, data });
}

function list(): MockFn {
  return ok([]);
}

function createLeafProxy(): unknown {
  const callable = vi.fn().mockResolvedValue({ ok: true, data: [] });
  return new Proxy(callable, {
    get(_target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      return createLeafProxy();
    },
    apply() {
      return Promise.resolve({ ok: true, data: [] });
    },
  });
}

function namespace(overrides: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(overrides, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in target) return target[prop];
      return createLeafProxy();
    },
  });
}

/** Mock IPC complet pour les tests smoke (toutes les pages montent sans Electron). */
export function createMockIpcClient(): IpcApi {
  const client = {
    app: {
      getVersion: vi.fn().mockResolvedValue('0.8.0-test'),
      ping: vi.fn().mockResolvedValue({ ok: true, timestamp: Date.now() }),
    },
    auth: {
      login: vi.fn().mockResolvedValue({ success: true, user: mockAdminUser, sessionToken: 'test-token' }),
      logout: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue({ success: true, user: mockAdminUser, sessionToken: 'test-token' }),
      getCurrentUser: vi.fn().mockResolvedValue(mockAdminUser),
      getProfile: vi.fn().mockResolvedValue({
        id: 1,
        email: mockAdminUser.email,
        fullName: mockAdminUser.fullName,
        roleCode: mockAdminUser.role,
        roleLabel: mockAdminUser.roleLabel,
        hotelId: null,
        lastLoginAt: null,
      }),
      changePassword: vi.fn().mockResolvedValue({ success: true }),
    },
    users: namespace({ list: list(), pendingCount: ok(0) }),
    hotels: namespace({
      list: ok(mockHotels),
      get: ok(mockHotels[0]),
    }),
    roles: namespace({ list: list(), listForSelect: list(), listPermissions: list() }),
    rubriques: namespace({ list: list() }),
    audit: namespace({ list: ok({ rows: [], total: 0 }) }),
    recettes: namespace({
      rubriques: list(),
      getSaisie: ok({ lignes: [], statut: 'brouillon' }),
      historique: list(),
      historiqueGrouped: list(),
      listAValider: list(),
      getMensuelle: ok({ lignes: [] }),
    }),
    objectifs: namespace({ list: list() }),
    dashboard: namespace({ get: ok(mockDashboard) }),
    portmaster: namespace({
      dashboard: ok({ kpis: {}, alertes: [], emplacements: [] }),
      listBateaux: list(),
      listContrats: list(),
      listClients: list(),
      listFactures: list(),
      listMouvements: list(),
      listValidations: list(),
      listTarifs: list(),
      listEmplacements: list(),
      listEmplacementsLibres: list(),
      listBassins: list(),
      listAlertes: list(),
      recouvrementSummary: ok({ totalCreances: 0, enRetard: 0 }),
      listCreances: list(),
      listRelances: list(),
      bateauxOptions: list(),
      clientsOptions: list(),
    }),
    settings: namespace({
      getBranding: ok(mockBranding),
      getAppInfo: ok({ version: '0.8.0-test', dbPath: '/tmp/test.db' }),
    }),
    database: namespace({
      getInfo: ok({ path: '/tmp/test.db', sizeBytes: 0, migrationCount: 48 }),
      integrityCheck: ok({ ok: true }),
    }),
    backup: namespace({ list: list() }),
    sync: namespace({ status: ok({ enabled: false, lastSyncAt: null }) }),
    export: namespace({}),
    tresorerie: namespace({
      board: ok({ encaissementsJour: 0, soldeCaisse: 0, comptes: [] }),
      listEncaissements: list(),
      journalCaisse: list(),
      listComptes: list(),
    }),
    facturation: namespace({
      board: ok({ facturesEmises: 0, montantTotal: 0, enAttente: 0 }),
      listFactures: list(),
    }),
    clients: namespace({ list: list() }),
    hebergement: namespace({
      dashboard: ok({ tauxOccupation: 0, chambresLibres: 0, arrivees: 0, departs: 0 }),
      listReservations: list(),
      listChambres: list(),
    }),
    tarifs: namespace({ listGrilles: list(), listConventions: list() }),
    rh: namespace({
      dashboard: ok({ effectif: 0, absences: 0, pointages: 0 }),
      listEmployes: list(),
      listAbsences: list(),
      listPointages: list(),
      listRecrutements: list(),
      referentiel: ok({ departements: [], postes: [] }),
    }),
    modules: namespace({
      listEnabled: ok(mockEnabledModuleIds),
      listConfig: ok(mockEnabledModuleIds.map((moduleId) => ({ moduleId, isEnabled: true, updatedAt: null }))),
      setEnabled: ok(true),
    }),
    anomalies: namespace({ list: list() }),
    decisions: namespace({ list: list() }),
    reclamations: namespace({ list: list() }),
    parking: namespace({ listPlaces: list(), listMouvements: list() }),
    plage: namespace({ listZones: list(), listPassages: list() }),
    stocks: namespace({ getNiveaux: list(), listProduits: list() }),
    achats: namespace({ listCommandes: list(), listFournisseurs: list() }),
    maintenance: namespace({ listTickets: list() }),
    commercial: namespace({ listPartenaires: list(), listActions: list() }),
    ged: namespace({ listDocuments: list(), listDossiers: list() }),
    reports: namespace({
      overview: ok({ templates: 0, runs: 0, kpis: 0 }),
      semanticCatalog: ok({ packages: [] }),
      catalog: ok(mockReportsCatalog),
      listSources: list(),
      listTemplates: list(),
      listRuns: list(),
      compatibleFields: ok({ dimensions: [], measures: [] }),
      previewComposed: ok({ columns: [], rows: [] }),
    }),
    import: namespace({}),
  } as unknown as IpcApi;

  return client;
}
