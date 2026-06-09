import type { IpcApi } from '@/shared/types/ipc';

function getApi(): IpcApi {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error(
      "API Electron indisponible. Lancez l'application via dev.bat ou npm run dev.",
    );
  }
  return window.electronAPI;
}

const api = () => getApi();

export const ipcClient: IpcApi = {
  app: {
    getVersion: () => api().app.getVersion(),
    ping: () => api().app.ping(),
  },
  auth: {
    login: (payload) => api().auth.login(payload),
    logout: (sessionToken) => api().auth.logout(sessionToken),
    restore: (sessionToken) => api().auth.restore(sessionToken),
    getCurrentUser: () => api().auth.getCurrentUser(),
    getProfile: () => api().auth.getProfile(),
    changePassword: (payload) => api().auth.changePassword(payload),
  },
  users: {
    list: (search) => api().users.list(search),
    get: (id) => api().users.get(id),
    create: (input) => api().users.create(input),
    update: (id, input) => api().users.update(id, input),
    deactivate: (id, reason) =>
      api().users.deactivate(id, reason),
  },
  hotels: {
    list: () => api().hotels.list(),
    get: (id) => api().hotels.get(id),
    create: (input) => api().hotels.create(input),
    update: (id, input) => api().hotels.update(id, input),
    pickLogo: (hotelId) => api().hotels.pickLogo(hotelId),
    removeLogo: (hotelId) => api().hotels.removeLogo(hotelId),
    deactivate: (id, reason) =>
      api().hotels.deactivate(id, reason),
  },
  roles: {
    list: () => api().roles.list(),
    listForSelect: () => api().roles.listForSelect(),
    listPermissions: () => api().roles.listPermissions(),
    updatePermissions: (roleId, permissionCodes) =>
      api().roles.updatePermissions(roleId, permissionCodes),
  },
  rubriques: {
    list: () => api().rubriques.list(),
    create: (input) => api().rubriques.create(input),
    update: (id, input) => api().rubriques.update(id, input),
    delete: (id) => api().rubriques.delete(id),
    reorder: (items) => api().rubriques.reorder(items),
  },
  audit: {
    list: (filters) => api().audit.list(filters),
  },
  recettes: {
    rubriques: () => api().recettes.rubriques(),
    getSaisie: (hotelId, dateJournal) =>
      api().recettes.getSaisie(hotelId, dateJournal),
    saveSaisie: (input) => api().recettes.saveSaisie(input),
    historique: (filters) => api().recettes.historique(filters),
    historiqueGrouped: (filters) => api().recettes.historiqueGrouped(filters),
    updateLigne: (id, montant, observation, motif) =>
      api().recettes.updateLigne(id, montant, observation, motif),
    deleteLigne: (id, motif) =>
      api().recettes.deleteLigne(id, motif),
    deleteJournee: (hotelId, dateJournal, motif) =>
      api().recettes.deleteJournee(hotelId, dateJournal, motif),
    listAValider: (hotelId) => api().recettes.listAValider(hotelId),
    validerJour: (hotelId, dateJournal, motif) =>
      api().recettes.validerJour(hotelId, dateJournal, motif),
    refuserJour: (hotelId, dateJournal, motif) =>
      api().recettes.refuserJour(hotelId, dateJournal, motif),
    getMensuelle: (hotelId, annee, mois) =>
      api().recettes.getMensuelle(hotelId, annee, mois),
    saveMensuelle: (hotelId, annee, mois, payload) =>
      api().recettes.saveMensuelle(hotelId, annee, mois, payload),
  },
  objectifs: {
    list: (filters) => api().objectifs.list(filters),
    get: (hotelId, annee, mois) =>
      api().objectifs.get(hotelId, annee, mois),
    save: (input) => api().objectifs.save(input),
  },
  dashboard: {
    get: (filters) => api().dashboard.get(filters),
  },
  portmaster: {
    dashboard: () => api().portmaster.dashboard(),
    listBateaux: (search) => api().portmaster.listBateaux(search),
    getBateau: (id) => api().portmaster.getBateau(id),
    createBateau: (input) => api().portmaster.createBateau(input),
    updateBateau: (id, input) =>
      api().portmaster.updateBateau(id, input),
    deactivateBateau: (id) => api().portmaster.deactivateBateau(id),
    listEmplacements: () => api().portmaster.listEmplacements(),
    listEmplacementsLibres: () =>
      api().portmaster.listEmplacementsLibres(),
    listContrats: (statut) => api().portmaster.listContrats(statut),
    getContrat: (id) => api().portmaster.getContrat(id),
    saveContrat: (input, id) =>
      api().portmaster.saveContrat(input, id),
    submitContrat: (id) => api().portmaster.submitContrat(id),
    addEncaissement: (input) =>
      api().portmaster.addEncaissement(input),
    bateauxOptions: () => api().portmaster.bateauxOptions(),
    listClients: (search) => api().portmaster.listClients(search),
    getClient: (id) => api().portmaster.getClient(id),
    saveClient: (input, id) =>
      api().portmaster.saveClient(input, id),
    clientsOptions: () => api().portmaster.clientsOptions(),
    listBassins: () => api().portmaster.listBassins(),
    listQuais: (bassinId) => api().portmaster.listQuais(bassinId),
    listEmplacementsDetail: (filters) =>
      api().portmaster.listEmplacementsDetail(filters),
    searchReferentiel: (query) =>
      api().portmaster.searchReferentiel(query),
    listAlertes: () => api().portmaster.listAlertes(),
    listTarifs: () => api().portmaster.listTarifs(),
    getTarif: (id) => api().portmaster.getTarif(id),
    saveTarif: (input, id) => api().portmaster.saveTarif(input, id),
    simulerTarif: (tarifId, longueurM) =>
      api().portmaster.simulerTarif(tarifId, longueurM),
    listFactures: (statut) => api().portmaster.listFactures(statut),
    getFacture: (id) => api().portmaster.getFacture(id),
    createFacture: (input) => api().portmaster.createFacture(input),
    createFactureFromContrat: (contratId, tarifId) =>
      api().portmaster.createFactureFromContrat(contratId, tarifId),
    submitFacture: (id) => api().portmaster.submitFacture(id),
    addPaiementFacture: (input) =>
      api().portmaster.addPaiementFacture(input),
    listValidations: () => api().portmaster.listValidations(),
    validerEntite: (entityType, entityId, motif) =>
      api().portmaster.validerEntite(entityType, entityId, motif),
    rejeterEntite: (entityType, entityId, motif) =>
      api().portmaster.rejeterEntite(entityType, entityId, motif),
    listMouvements: () => api().portmaster.listMouvements(),
    createMouvement: (input) =>
      api().portmaster.createMouvement(input),
    recouvrementSummary: () =>
      api().portmaster.recouvrementSummary(),
    listCreances: () => api().portmaster.listCreances(),
    listRelances: () => api().portmaster.listRelances(),
    createRelance: (input) =>
      api().portmaster.createRelance(input),
    marquerRelanceEnvoyee: (id) =>
      api().portmaster.marquerRelanceEnvoyee(id),
  },
  settings: {
    getBranding: () => api().settings.getBranding(),
    getAppInfo: () => api().settings.getAppInfo(),
    update: (input) => api().settings.update(input),
    pickBrandAsset: (asset) => api().settings.pickBrandAsset(asset),
    removeBrandAsset: (asset) => api().settings.removeBrandAsset(asset),
  },
  database: {
    getInfo: () => api().database.getInfo(),
    integrityCheck: () => api().database.integrityCheck(),
    vacuum: () => api().database.vacuum(),
    pickImportFile: () => api().database.pickImportFile(),
    importLegacy: (filePath) =>
      api().database.importLegacy(filePath),
  },
  backup: {
    list: () => api().backup.list(),
    create: () => api().backup.create(),
    restore: (filename) => api().backup.restore(filename),
    delete: (filename) => api().backup.delete(filename),
  },
  sync: {
    getConfig: () => api().sync.getConfig(),
    updateConfig: (input) => api().sync.updateConfig(input),
    getStatus: () => api().sync.getStatus(),
    listQueue: () => api().sync.listQueue(),
    run: () => api().sync.run(),
  },
  export: {
    excel: (kind) => api().export.excel(kind),
    facturePdf: (factureId) => api().export.facturePdf(factureId),
    dashboardExcel: (filters) =>
      api().export.dashboardExcel(filters),
    dashboardPdf: (filters) => api().export.dashboardPdf(filters),
  },
};
