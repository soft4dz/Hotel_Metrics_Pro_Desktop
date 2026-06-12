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
    pendingCount: () => ipcRenderer.invoke('users:pendingCount'),
    activatePending: (id) => ipcRenderer.invoke('users:activatePending', id),
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
    getBranding: () => ipcRenderer.invoke('settings:getBranding'),
    getAppInfo: () => ipcRenderer.invoke('settings:getAppInfo'),
    update: (input) => ipcRenderer.invoke('settings:update', input),
    pickBrandAsset: (asset) => ipcRenderer.invoke('settings:pickBrandAsset', asset),
    removeBrandAsset: (asset) => ipcRenderer.invoke('settings:removeBrandAsset', asset),
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
  clients: {
    getDashboard: () => ipcRenderer.invoke('clients:getDashboard'),
    list: (filters) => ipcRenderer.invoke('clients:list', filters),
    get: (id) => ipcRenderer.invoke('clients:get', id),
    create: (input) => ipcRenderer.invoke('clients:create', input),
    update: (id, input) => ipcRenderer.invoke('clients:update', id, input),
    toggleActif: (id) => ipcRenderer.invoke('clients:toggleActif', id),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
    listContacts: (clientId) => ipcRenderer.invoke('clients:contacts:list', clientId),
    createContact: (clientId, input) => ipcRenderer.invoke('clients:contacts:create', clientId, input),
    updateContact: (contactId, input) => ipcRenderer.invoke('clients:contacts:update', contactId, input),
    deleteContact: (contactId) => ipcRenderer.invoke('clients:contacts:delete', contactId),
  },
  tresorerie: {
    getDashboard: (hotelId) =>
      ipcRenderer.invoke('tresorerie:dashboard', hotelId),
    listEncaissements: (filters) =>
      ipcRenderer.invoke('tresorerie:encaissements:list', filters),
    createEncaissement: (input) =>
      ipcRenderer.invoke('tresorerie:encaissements:create', input),
    updateEncaissement: (id, input) =>
      ipcRenderer.invoke('tresorerie:encaissements:update', id, input),
    confirmerEncaissement: (id) =>
      ipcRenderer.invoke('tresorerie:encaissements:confirmer', id),
    rejeterEncaissement: (id, motif) =>
      ipcRenderer.invoke('tresorerie:encaissements:rejeter', id, motif),
    deleteEncaissement: (id) =>
      ipcRenderer.invoke('tresorerie:encaissements:delete', id),
    listComptes: (hotelId) =>
      ipcRenderer.invoke('tresorerie:comptes:list', hotelId),
    createCompte: (input) =>
      ipcRenderer.invoke('tresorerie:comptes:create', input),
    updateCompte: (id, input) =>
      ipcRenderer.invoke('tresorerie:comptes:update', id, input),
    deleteCompte: (id) =>
      ipcRenderer.invoke('tresorerie:comptes:delete', id),
    getJournalCaisse: (hotelId, dateDebut, dateFin) =>
      ipcRenderer.invoke('tresorerie:caisse:list', hotelId, dateDebut, dateFin),
    addOperationCaisse: (input) =>
      ipcRenderer.invoke('tresorerie:caisse:add', input),
    deleteOperationCaisse: (id) =>
      ipcRenderer.invoke('tresorerie:caisse:delete', id),
  },
  facturation: {
    getDashboard: (hotelId) =>
      ipcRenderer.invoke('facturation:getDashboard', hotelId),
    listFactures: (filters) =>
      ipcRenderer.invoke('facturation:listFactures', filters),
    getFacture: (id) =>
      ipcRenderer.invoke('facturation:getFacture', id),
    createFacture: (input) =>
      ipcRenderer.invoke('facturation:createFacture', input),
    updateFacture: (id, input) =>
      ipcRenderer.invoke('facturation:updateFacture', id, input),
    soumettre: (id) =>
      ipcRenderer.invoke('facturation:soumettre', id),
    valider: (id) =>
      ipcRenderer.invoke('facturation:valider', id),
    annuler: (id) =>
      ipcRenderer.invoke('facturation:annuler', id),
    deleteFacture: (id) =>
      ipcRenderer.invoke('facturation:deleteFacture', id),
    addPaiement: (input) =>
      ipcRenderer.invoke('facturation:addPaiement', input),
    deletePaiement: (id) =>
      ipcRenderer.invoke('facturation:deletePaiement', id),
    listClients: (search) =>
      ipcRenderer.invoke('facturation:listClients', search),
    createClient: (input) =>
      ipcRenderer.invoke('facturation:createClient', input),
    updateClient: (id, input) =>
      ipcRenderer.invoke('facturation:updateClient', id, input),
    deleteClient: (id) =>
      ipcRenderer.invoke('facturation:deleteClient', id),
  },
  hebergement: {
    listTypesChambre: (hotelId?) => ipcRenderer.invoke('hebergement:listTypesChambre', hotelId),
    createTypeChambre: (input) => ipcRenderer.invoke('hebergement:createTypeChambre', input),
    deleteTypeChambre: (id) => ipcRenderer.invoke('hebergement:deleteTypeChambre', id),
    listChambres: (hotelId?, statut?) => ipcRenderer.invoke('hebergement:listChambres', hotelId, statut),
    createChambre: (input) => ipcRenderer.invoke('hebergement:createChambre', input),
    updateChambre: (id, input) => ipcRenderer.invoke('hebergement:updateChambre', id, input),
    updateStatutChambre: (id, statut) => ipcRenderer.invoke('hebergement:updateStatutChambre', id, statut),
    deleteChambre: (id) => ipcRenderer.invoke('hebergement:deleteChambre', id),
    listReservations: (hotelId?, dateDebut?, dateFin?, statut?) =>
      ipcRenderer.invoke('hebergement:listReservations', hotelId, dateDebut, dateFin, statut),
    getReservation: (id) => ipcRenderer.invoke('hebergement:getReservation', id),
    createReservation: (input) => ipcRenderer.invoke('hebergement:createReservation', input),
    updateReservationStatut: (id, statut) => ipcRenderer.invoke('hebergement:updateReservationStatut', id, statut),
    deleteReservation: (id) => ipcRenderer.invoke('hebergement:deleteReservation', id),
    getOccupationKpis: (dateDebut, dateFin, hotelId?) =>
      ipcRenderer.invoke('hebergement:getOccupationKpis', dateDebut, dateFin, hotelId),
  },
  tarifs: {
    listComposants:    (hotelId?)             => ipcRenderer.invoke('tarifs:listComposants', hotelId),
    createComposant:   (input)                => ipcRenderer.invoke('tarifs:createComposant', input),
    deleteComposant:   (id)                   => ipcRenderer.invoke('tarifs:deleteComposant', id),
    listFormules:      (hotelId?)             => ipcRenderer.invoke('tarifs:listFormules', hotelId),
    createFormule:     (input)                => ipcRenderer.invoke('tarifs:createFormule', input),
    deleteFormule:     (id)                   => ipcRenderer.invoke('tarifs:deleteFormule', id),
    listPlans:         (hotelId?)             => ipcRenderer.invoke('tarifs:listPlans', hotelId),
    createPlan:        (input)                => ipcRenderer.invoke('tarifs:createPlan', input),
    deletePlan:        (id)                   => ipcRenderer.invoke('tarifs:deletePlan', id),
    getGrille:         (hotelId, planId, dateDebut, dateFin, formuleId?) =>
                         ipcRenderer.invoke('tarifs:getGrille', hotelId, planId, dateDebut, dateFin, formuleId),
    upsertTarif:       (input)                => ipcRenderer.invoke('tarifs:upsertTarif', input),
    upsertBulk:        (input)                => ipcRenderer.invoke('tarifs:upsertBulk', input),
    listPromotions:    (hotelId?)             => ipcRenderer.invoke('tarifs:listPromotions', hotelId),
    createPromotion:   (input)                => ipcRenderer.invoke('tarifs:createPromotion', input),
    togglePromotion:   (id, actif)            => ipcRenderer.invoke('tarifs:togglePromotion', id, actif),
    deletePromotion:   (id)                   => ipcRenderer.invoke('tarifs:deletePromotion', id),
    listConventions:   (hotelId?, clientId?)  => ipcRenderer.invoke('tarifs:listConventions', hotelId, clientId),
    createConvention:  (input)                => ipcRenderer.invoke('tarifs:createConvention', input),
    toggleConvention:  (id, actif)            => ipcRenderer.invoke('tarifs:toggleConvention', id, actif),
    deleteConvention:  (id)                   => ipcRenderer.invoke('tarifs:deleteConvention', id),
    simuler:           (input)                => ipcRenderer.invoke('tarifs:simuler', input),
  },
  rh: {
    getDashboard: (dateDebut?, dateFin?) => ipcRenderer.invoke('rh:dashboard', dateDebut, dateFin),
    pendingAccountsCount: () => ipcRenderer.invoke('rh:pendingAccountsCount'),
    getMonEspace: () => ipcRenderer.invoke('rh:monEspace'),
    listDepartements: () => ipcRenderer.invoke('rh:departements:list'),
    createDepartement: (input) => ipcRenderer.invoke('rh:departements:create', input),
    listPostes: () => ipcRenderer.invoke('rh:postes:list'),
    createPoste: (input) => ipcRenderer.invoke('rh:postes:create', input),
    listEmployes: (search?) => ipcRenderer.invoke('rh:employes:list', search),
    getEmploye: (id) => ipcRenderer.invoke('rh:employes:get', id),
    createEmploye: (input) => ipcRenderer.invoke('rh:employes:create', input),
    listRecrutements: (statut?) => ipcRenderer.invoke('rh:recrutements:list', statut),
    createRecrutement: (input) => ipcRenderer.invoke('rh:recrutements:create', input),
    validerRecrutement: (id) => ipcRenderer.invoke('rh:recrutements:valider', id),
    refuserRecrutement: (id, motif?) => ipcRenderer.invoke('rh:recrutements:refuser', id, motif),
    listContrats: (employeId) => ipcRenderer.invoke('rh:contrats:list', employeId),
    createContrat: (input) => ipcRenderer.invoke('rh:contrats:create', input),
    listPointages: (dateDebut?, dateFin?, employeId?) =>
      ipcRenderer.invoke('rh:pointages:list', dateDebut, dateFin, employeId),
    upsertPointage: (input) => ipcRenderer.invoke('rh:pointages:upsert', input),
    soumettrePointage: (id) => ipcRenderer.invoke('rh:pointages:soumettre', id),
    validerPointage: (id, approuve) => ipcRenderer.invoke('rh:pointages:valider', id, approuve),
    listAbsences: (statut?) => ipcRenderer.invoke('rh:absences:list', statut),
    createAbsence: (input) => ipcRenderer.invoke('rh:absences:create', input),
    deciderAbsence: (id, approuve) => ipcRenderer.invoke('rh:absences:decider', id, approuve),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
