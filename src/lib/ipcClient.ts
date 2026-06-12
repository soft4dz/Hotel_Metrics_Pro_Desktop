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
    pendingCount: () => api().users.pendingCount(),
    activatePending: (id) => api().users.activatePending(id),
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
  clients: {
    getDashboard: () => api().clients.getDashboard(),
    list: (filters) => api().clients.list(filters),
    get: (id) => api().clients.get(id),
    create: (input) => api().clients.create(input),
    update: (id, input) => api().clients.update(id, input),
    toggleActif: (id) => api().clients.toggleActif(id),
    delete: (id) => api().clients.delete(id),
    listContacts: (clientId) => api().clients.listContacts(clientId),
    createContact: (clientId, input) => api().clients.createContact(clientId, input),
    updateContact: (contactId, input) => api().clients.updateContact(contactId, input),
    deleteContact: (contactId) => api().clients.deleteContact(contactId),
  },
  tresorerie: {
    getDashboard: (hotelId) => api().tresorerie.getDashboard(hotelId),
    listEncaissements: (filters) => api().tresorerie.listEncaissements(filters),
    createEncaissement: (input) => api().tresorerie.createEncaissement(input),
    updateEncaissement: (id, input) => api().tresorerie.updateEncaissement(id, input),
    confirmerEncaissement: (id) => api().tresorerie.confirmerEncaissement(id),
    rejeterEncaissement: (id, motif) => api().tresorerie.rejeterEncaissement(id, motif),
    deleteEncaissement: (id) => api().tresorerie.deleteEncaissement(id),
    listComptes: (hotelId) => api().tresorerie.listComptes(hotelId),
    createCompte: (input) => api().tresorerie.createCompte(input),
    updateCompte: (id, input) => api().tresorerie.updateCompte(id, input),
    deleteCompte: (id) => api().tresorerie.deleteCompte(id),
    getJournalCaisse: (hotelId, dateDebut, dateFin) => api().tresorerie.getJournalCaisse(hotelId, dateDebut, dateFin),
    addOperationCaisse: (input) => api().tresorerie.addOperationCaisse(input),
    deleteOperationCaisse: (id) => api().tresorerie.deleteOperationCaisse(id),
  },
  facturation: {
    getDashboard: (hotelId) => api().facturation.getDashboard(hotelId),
    listFactures: (filters) => api().facturation.listFactures(filters),
    getFacture: (id) => api().facturation.getFacture(id),
    createFacture: (input) => api().facturation.createFacture(input),
    updateFacture: (id, input) => api().facturation.updateFacture(id, input),
    soumettre: (id) => api().facturation.soumettre(id),
    valider: (id) => api().facturation.valider(id),
    annuler: (id) => api().facturation.annuler(id),
    deleteFacture: (id) => api().facturation.deleteFacture(id),
    addPaiement: (input) => api().facturation.addPaiement(input),
    deletePaiement: (id) => api().facturation.deletePaiement(id),
    listClients: (search) => api().facturation.listClients(search),
    createClient: (input) => api().facturation.createClient(input),
    updateClient: (id, input) => api().facturation.updateClient(id, input),
    deleteClient: (id) => api().facturation.deleteClient(id),
  },
  hebergement: {
    listTypesChambre: (hotelId?) => api().hebergement.listTypesChambre(hotelId),
    createTypeChambre: (input) => api().hebergement.createTypeChambre(input),
    deleteTypeChambre: (id) => api().hebergement.deleteTypeChambre(id),
    listChambres: (hotelId?, statut?) => api().hebergement.listChambres(hotelId, statut),
    createChambre: (input) => api().hebergement.createChambre(input),
    updateChambre: (id, input) => api().hebergement.updateChambre(id, input),
    updateStatutChambre: (id, statut) => api().hebergement.updateStatutChambre(id, statut),
    deleteChambre: (id) => api().hebergement.deleteChambre(id),
    listReservations: (hotelId?, dateDebut?, dateFin?, statut?) =>
      api().hebergement.listReservations(hotelId, dateDebut, dateFin, statut),
    getReservation: (id) => api().hebergement.getReservation(id),
    createReservation: (input) => api().hebergement.createReservation(input),
    updateReservationStatut: (id, statut) => api().hebergement.updateReservationStatut(id, statut),
    deleteReservation: (id) => api().hebergement.deleteReservation(id),
    getOccupationKpis: (dateDebut, dateFin, hotelId?) =>
      api().hebergement.getOccupationKpis(dateDebut, dateFin, hotelId),
  },
  tarifs: {
    listComposants:   (hotelId?)             => api().tarifs.listComposants(hotelId),
    createComposant:  (input)                => api().tarifs.createComposant(input),
    deleteComposant:  (id)                   => api().tarifs.deleteComposant(id),
    listFormules:     (hotelId?)             => api().tarifs.listFormules(hotelId),
    createFormule:    (input)                => api().tarifs.createFormule(input),
    deleteFormule:    (id)                   => api().tarifs.deleteFormule(id),
    listPlans:        (hotelId?)             => api().tarifs.listPlans(hotelId),
    createPlan:       (input)                => api().tarifs.createPlan(input),
    deletePlan:       (id)                   => api().tarifs.deletePlan(id),
    getGrille:        (hotelId, planId, deb, fin, formuleId?) =>
                        api().tarifs.getGrille(hotelId, planId, deb, fin, formuleId),
    upsertTarif:      (input)                => api().tarifs.upsertTarif(input),
    upsertBulk:       (input)                => api().tarifs.upsertBulk(input),
    listPromotions:   (hotelId?)             => api().tarifs.listPromotions(hotelId),
    createPromotion:  (input)                => api().tarifs.createPromotion(input),
    togglePromotion:  (id, actif)            => api().tarifs.togglePromotion(id, actif),
    deletePromotion:  (id)                   => api().tarifs.deletePromotion(id),
    listConventions:  (hotelId?, clientId?)  => api().tarifs.listConventions(hotelId, clientId),
    createConvention: (input)                => api().tarifs.createConvention(input),
    toggleConvention: (id, actif)            => api().tarifs.toggleConvention(id, actif),
    deleteConvention: (id)                   => api().tarifs.deleteConvention(id),
    simuler:          (input)                => api().tarifs.simuler(input),
  },
  rh: {
    getDashboard: (dateDebut?, dateFin?) => api().rh.getDashboard(dateDebut, dateFin),
    pendingAccountsCount: () => api().rh.pendingAccountsCount(),
    getMonEspace: () => api().rh.getMonEspace(),
    listDepartements: () => api().rh.listDepartements(),
    createDepartement: (input) => api().rh.createDepartement(input),
    listPostes: () => api().rh.listPostes(),
    createPoste: (input) => api().rh.createPoste(input),
    listEmployes: (search?) => api().rh.listEmployes(search),
    getEmploye: (id) => api().rh.getEmploye(id),
    createEmploye: (input) => api().rh.createEmploye(input),
    listRecrutements: (statut?) => api().rh.listRecrutements(statut),
    createRecrutement: (input) => api().rh.createRecrutement(input),
    validerRecrutement: (id) => api().rh.validerRecrutement(id),
    refuserRecrutement: (id, motif?) => api().rh.refuserRecrutement(id, motif),
    listContrats: (employeId) => api().rh.listContrats(employeId),
    createContrat: (input) => api().rh.createContrat(input),
    listPointages: (dateDebut?, dateFin?, employeId?) =>
      api().rh.listPointages(dateDebut, dateFin, employeId),
    upsertPointage: (input) => api().rh.upsertPointage(input),
    soumettrePointage: (id) => api().rh.soumettrePointage(id),
    validerPointage: (id, approuve) => api().rh.validerPointage(id, approuve),
    listAbsences: (statut?) => api().rh.listAbsences(statut),
    createAbsence: (input) => api().rh.createAbsence(input),
    deciderAbsence: (id, approuve) => api().rh.deciderAbsence(id, approuve),
  },
};
