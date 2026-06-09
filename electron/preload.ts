import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../src/shared/types/ipc';

const api: IpcApi = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
    ping: () =>
      ipcRenderer.invoke('app:ping') as Promise<{ ok: boolean; timestamp: number }>,
  },
  auth: {
    login: (payload) => ipcRenderer.invoke('auth:login', payload),
    logout: (sessionToken) => ipcRenderer.invoke('auth:logout', sessionToken),
    restore: (sessionToken) => ipcRenderer.invoke('auth:restore', sessionToken),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getProfile: () => ipcRenderer.invoke('auth:getProfile'),
    changePassword: (payload) => ipcRenderer.invoke('auth:changePassword', payload),
  },
  users: {
    list: (search) => ipcRenderer.invoke('users:list', search),
    get: (id) => ipcRenderer.invoke('users:get', id),
    create: (input) => ipcRenderer.invoke('users:create', input),
    update: (id, input) =>
      ipcRenderer.invoke('users:update', id, input),
    deactivate: (id, reason) =>
      ipcRenderer.invoke('users:deactivate', id, reason),
  },
  hotels: {
    list: () => ipcRenderer.invoke('hotels:list'),
    get: (id) => ipcRenderer.invoke('hotels:get', id),
    create: (input) => ipcRenderer.invoke('hotels:create', input),
    update: (id, input) =>
      ipcRenderer.invoke('hotels:update', id, input),
    pickLogo: (hotelId) => ipcRenderer.invoke('hotels:pickLogo', hotelId),
    removeLogo: (hotelId) => ipcRenderer.invoke('hotels:removeLogo', hotelId),
    deactivate: (id, reason) =>
      ipcRenderer.invoke('hotels:deactivate', id, reason),
  },
  roles: {
    list: () => ipcRenderer.invoke('roles:list'),
    listForSelect: () => ipcRenderer.invoke('roles:listForSelect'),
    listPermissions: () => ipcRenderer.invoke('roles:listPermissions'),
    updatePermissions: (roleId, permissionCodes) =>
      ipcRenderer.invoke('roles:updatePermissions', roleId, permissionCodes),
  },
  rubriques: {
    list: () => ipcRenderer.invoke('rubriques:list'),
    create: (input) => ipcRenderer.invoke('rubriques:create', input),
    update: (id, input) =>
      ipcRenderer.invoke('rubriques:update', id, input),
    delete: (id) => ipcRenderer.invoke('rubriques:delete', id),
    reorder: (items) =>
      ipcRenderer.invoke('rubriques:reorder', items),
  },
  audit: {
    list: (filters) => ipcRenderer.invoke('audit:list', filters),
  },
  recettes: {
    rubriques: () => ipcRenderer.invoke('recettes:rubriques'),
    getSaisie: (hotelId, dateJournal) =>
      ipcRenderer.invoke('recettes:getSaisie', hotelId, dateJournal),
    saveSaisie: (input) =>
      ipcRenderer.invoke('recettes:saveSaisie', input),
    historique: (filters) =>
      ipcRenderer.invoke('recettes:historique', filters),
    historiqueGrouped: (filters) =>
      ipcRenderer.invoke('recettes:historiqueGrouped', filters),
    updateLigne: (id, montant, observation, motif) =>
      ipcRenderer.invoke('recettes:updateLigne', id, montant, observation, motif),
    deleteLigne: (id, motif) =>
      ipcRenderer.invoke('recettes:deleteLigne', id, motif),
    deleteJournee: (hotelId, dateJournal, motif) =>
      ipcRenderer.invoke('recettes:deleteJournee', hotelId, dateJournal, motif),
    listAValider: (hotelId) =>
      ipcRenderer.invoke('recettes:listAValider', hotelId),
    validerJour: (hotelId, dateJournal, motif) =>
      ipcRenderer.invoke('recettes:validerJour', hotelId, dateJournal, motif),
    refuserJour: (hotelId, dateJournal, motif) =>
      ipcRenderer.invoke('recettes:refuserJour', hotelId, dateJournal, motif),
    getMensuelle: (hotelId, annee, mois) =>
      ipcRenderer.invoke('recettes:getMensuelle', hotelId, annee, mois),
    saveMensuelle: (hotelId, annee, mois, payload) =>
      ipcRenderer.invoke('recettes:saveMensuelle', hotelId, annee, mois, payload),
  },
  objectifs: {
    list: (filters) =>
      ipcRenderer.invoke('objectifs:list', filters),
    get: (hotelId, annee, mois) =>
      ipcRenderer.invoke('objectifs:get', hotelId, annee, mois),
    save: (input) =>
      ipcRenderer.invoke('objectifs:save', input),
  },
  dashboard: {
    get: (filters) =>
      ipcRenderer.invoke('dashboard:get', filters),
  },
  portmaster: {
    dashboard: () => ipcRenderer.invoke('portmaster:dashboard'),
    listBateaux: (search) =>
      ipcRenderer.invoke('portmaster:bateaux:list', search),
    getBateau: (id) =>
      ipcRenderer.invoke('portmaster:bateaux:get', id),
    createBateau: (input) =>
      ipcRenderer.invoke('portmaster:bateaux:create', input),
    updateBateau: (id, input) =>
      ipcRenderer.invoke('portmaster:bateaux:update', id, input),
    deactivateBateau: (id) =>
      ipcRenderer.invoke('portmaster:bateaux:deactivate', id),
    listEmplacements: () =>
      ipcRenderer.invoke('portmaster:emplacements:list'),
    listEmplacementsLibres: () =>
      ipcRenderer.invoke('portmaster:emplacements:libres'),
    listContrats: (statut) =>
      ipcRenderer.invoke('portmaster:contrats:list', statut),
    getContrat: (id) =>
      ipcRenderer.invoke('portmaster:contrats:get', id),
    saveContrat: (input, id) =>
      ipcRenderer.invoke('portmaster:contrats:save', input, id),
    submitContrat: (id) =>
      ipcRenderer.invoke('portmaster:contrats:submit', id),
    addEncaissement: (input) =>
      ipcRenderer.invoke('portmaster:encaissements:add', input),
    bateauxOptions: () =>
      ipcRenderer.invoke('portmaster:bateaux:options'),
    listClients: (search) =>
      ipcRenderer.invoke('portmaster:clients:list', search),
    getClient: (id) =>
      ipcRenderer.invoke('portmaster:clients:get', id),
    saveClient: (input, id) =>
      ipcRenderer.invoke('portmaster:clients:save', input, id),
    clientsOptions: () =>
      ipcRenderer.invoke('portmaster:clients:options'),
    listBassins: () =>
      ipcRenderer.invoke('portmaster:referentiel:bassins'),
    listQuais: (bassinId) =>
      ipcRenderer.invoke('portmaster:referentiel:quais', bassinId),
    listEmplacementsDetail: (filters) =>
      ipcRenderer.invoke('portmaster:referentiel:emplacements', filters),
    searchReferentiel: (query) =>
      ipcRenderer.invoke('portmaster:referentiel:search', query),
    listAlertes: () =>
      ipcRenderer.invoke('portmaster:alertes:list'),
    listTarifs: () => ipcRenderer.invoke('portmaster:tarifs:list'),
    getTarif: (id) => ipcRenderer.invoke('portmaster:tarifs:get', id),
    saveTarif: (input, id) =>
      ipcRenderer.invoke('portmaster:tarifs:save', input, id),
    simulerTarif: (tarifId, longueurM) =>
      ipcRenderer.invoke('portmaster:tarifs:simuler', tarifId, longueurM),
    listFactures: (statut) =>
      ipcRenderer.invoke('portmaster:factures:list', statut),
    getFacture: (id) =>
      ipcRenderer.invoke('portmaster:factures:get', id),
    createFacture: (input) =>
      ipcRenderer.invoke('portmaster:factures:create', input),
    createFactureFromContrat: (contratId, tarifId) =>
      ipcRenderer.invoke('portmaster:factures:fromContrat', contratId, tarifId),
    submitFacture: (id) =>
      ipcRenderer.invoke('portmaster:factures:submit', id),
    addPaiementFacture: (input) =>
      ipcRenderer.invoke('portmaster:factures:addPaiement', input),
    listValidations: () =>
      ipcRenderer.invoke('portmaster:validations:list'),
    validerEntite: (entityType, entityId, motif) =>
      ipcRenderer.invoke('portmaster:validations:valider', entityType, entityId, motif),
    rejeterEntite: (entityType, entityId, motif) =>
      ipcRenderer.invoke('portmaster:validations:rejeter', entityType, entityId, motif),
    listMouvements: () =>
      ipcRenderer.invoke('portmaster:mouvements:list'),
    createMouvement: (input) =>
      ipcRenderer.invoke('portmaster:mouvements:create', input),
    recouvrementSummary: () =>
      ipcRenderer.invoke('portmaster:recouvrement:summary'),
    listCreances: () =>
      ipcRenderer.invoke('portmaster:recouvrement:creances'),
    listRelances: () =>
      ipcRenderer.invoke('portmaster:recouvrement:relances'),
    createRelance: (input) =>
      ipcRenderer.invoke('portmaster:recouvrement:relanceCreate', input),
    marquerRelanceEnvoyee: (id) =>
      ipcRenderer.invoke('portmaster:recouvrement:relanceEnvoyee', id),
  },
  settings: {
    getAppInfo: () => ipcRenderer.invoke('settings:getAppInfo'),
    update: (input) => ipcRenderer.invoke('settings:update', input),
  },
  database: {
    getInfo: () => ipcRenderer.invoke('database:getInfo'),
    integrityCheck: () => ipcRenderer.invoke('database:integrityCheck'),
    vacuum: () => ipcRenderer.invoke('database:vacuum'),
    pickImportFile: () => ipcRenderer.invoke('database:pickImportFile'),
    importLegacy: (filePath) =>
      ipcRenderer.invoke('database:importLegacy', filePath),
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list'),
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (filename) =>
      ipcRenderer.invoke('backup:restore', filename),
    delete: (filename) =>
      ipcRenderer.invoke('backup:delete', filename),
  },
  sync: {
    getConfig: () => ipcRenderer.invoke('sync:config:get'),
    updateConfig: (input) =>
      ipcRenderer.invoke('sync:config:update', input),
    getStatus: () => ipcRenderer.invoke('sync:status'),
    listQueue: () => ipcRenderer.invoke('sync:queue:list'),
    run: () => ipcRenderer.invoke('sync:run'),
  },
  export: {
    excel: (kind) => ipcRenderer.invoke('export:excel', kind),
    facturePdf: (factureId) =>
      ipcRenderer.invoke('export:facturePdf', factureId),
    dashboardExcel: (filters) =>
      ipcRenderer.invoke('export:dashboardExcel', filters),
    dashboardPdf: (filters) =>
      ipcRenderer.invoke('export:dashboardPdf', filters),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
