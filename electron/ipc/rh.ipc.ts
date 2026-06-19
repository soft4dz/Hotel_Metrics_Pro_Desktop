import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import * as rh from '../services/rh.service';
import * as rhPaie from '../services/rh-paie-dlg.service';
import * as rhTalent from '../services/rh-talent.service';
import * as rhPilotage from '../services/rh-pilotage.service';
import * as rhAi from '../services/rh-ai.service';
import * as rhConformite from '../services/rh-conformite-dz.service';
import * as rhGed from '../services/rh-ged.service';
import * as rhValidation from '../services/rh-validation-n1.service';
import * as rhRegistres from '../services/rh-registres-legaux.service';
import * as rhBulletinPdf from '../services/rh-bulletin-pdf.service';
import * as rhRupture from '../services/rh-rupture-contrat.service';
import * as rhDeclarations from '../services/rh-declarations-export.service';
import type {
  CreateAbsenceInput,
  CreateAffectationInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateEmployeInput,
  CreateEmployeWizardInput,
  CreatePosteInput,
  CreateRecrutementInput,
  StatutAbsence,
  StatutAffectation,
  StatutRecrutement,
  AddEquipeMembreInput,
  CreatePlanningInput,
  AssignEmployeFormationInput,
  CreateCompetenceInput,
  CreateEntretienInput,
  CreateFormationCatalogInput,
  CreatePrimeInput,
  SetPosteCompetenceInput,
  SortirEmployeInput,
  TypeDocumentRh,
  UpdateEmployeFormationInput,
  UpdateEntretienInput,
  UpdateFormationCatalogInput,
  UpdateEmployeTypeActiviteInput,
  UpdateDlgConfigInput,
  UpdateDepartementInput,
  UpdateEmployeInput,
  UpdatePosteInput,
  UpsertOrganisationInput,
  UpsertPointageInput,
  UpsertSoldeCongesInput,
  CreateRhAccidentInput,
  CreateRhVisiteMedicaleInput,
  ProcessRuptureInput,
} from '../../src/shared/types/rh';

export function registerRhIpc(): void {
  Electron.ipcMain.handle(
    'rh:dashboard',
    (event, dateDebut?: string, dateFin?: string, hotelId?: number) =>
      wrapIpc(event, (uid) => rh.getRhDashboard(uid, dateDebut, dateFin, hotelId)),
  );

  Electron.ipcMain.handle('rh:pendingAccountsCount', (event) =>
    wrapIpc(event, (uid) => rh.countPendingAccounts(uid)));

  Electron.ipcMain.handle('rh:monEspace', (event) =>
    wrapIpc(event, (uid) => rh.getMonEspace(uid)));

  Electron.ipcMain.handle('rh:departements:list', (event) =>
    wrapIpc(event, (uid) => rh.listDepartements(uid)));
  Electron.ipcMain.handle('rh:departements:create', (event, input: CreateDepartementInput) =>
    wrapIpc(event, (uid) => rh.createDepartement(uid, input)));
  Electron.ipcMain.handle(
    'rh:departements:update',
    (event, id: number, input: UpdateDepartementInput) =>
      wrapIpc(event, (uid) => rh.updateDepartement(uid, id, input)),
  );

  Electron.ipcMain.handle('rh:postes:list', (event) =>
    wrapIpc(event, (uid) => rh.listPostes(uid)));
  Electron.ipcMain.handle('rh:postes:create', (event, input: CreatePosteInput) =>
    wrapIpc(event, (uid) => rh.createPoste(uid, input)));
  Electron.ipcMain.handle('rh:postes:update', (event, id: number, input: UpdatePosteInput) =>
    wrapIpc(event, (uid) => rh.updatePoste(uid, id, input)));

  Electron.ipcMain.handle('rh:employes:list', (event, search?: string) =>
    wrapIpc(event, (uid) => rh.listEmployes(uid, search)));
  Electron.ipcMain.handle('rh:employes:get', (event, id: number) =>
    wrapIpc(event, (uid) => rh.getEmploye(uid, id)));
  Electron.ipcMain.handle('rh:employes:create', (event, input: CreateEmployeInput) =>
    wrapIpc(event, (uid) => rh.createEmploye(uid, input)));
  Electron.ipcMain.handle('rh:employes:createWizard', (event, input: CreateEmployeWizardInput) =>
    wrapIpc(event, (uid) => rh.createEmployeWizard(uid, input)));
  Electron.ipcMain.handle('rh:employes:update', (event, id: number, input: UpdateEmployeInput) =>
    wrapIpc(event, (uid) => rh.updateEmploye(uid, id, input)));
  Electron.ipcMain.handle('rh:employes:sortir', (event, id: number, input: SortirEmployeInput) =>
    wrapIpc(event, (uid) => rh.sortirEmploye(uid, id, input)));

  Electron.ipcMain.handle('rh:recrutements:list', (event, statut?: StatutRecrutement) =>
    wrapIpc(event, (uid) => rh.listRecrutements(uid, statut)));
  Electron.ipcMain.handle('rh:recrutements:create', (event, input: CreateRecrutementInput) =>
    wrapIpc(event, (uid) => rh.createRecrutement(uid, input)));
  Electron.ipcMain.handle('rh:recrutements:valider', (event, id: number) =>
    wrapIpc(event, (uid) => rh.validerRecrutement(uid, id)));
  Electron.ipcMain.handle('rh:recrutements:refuser', (event, id: number, motif?: string) =>
    wrapIpc(event, (uid) => rh.refuserRecrutement(uid, id, motif)));

  Electron.ipcMain.handle('rh:contrats:list', (event, employeId: number) =>
    wrapIpc(event, (uid) => rh.listContrats(uid, employeId)));
  Electron.ipcMain.handle('rh:contrats:create', (event, input: CreateContratInput) =>
    wrapIpc(event, (uid) => rh.createContrat(uid, input)));
  Electron.ipcMain.handle('rh:contrats:listAll', (event) =>
    wrapIpc(event, (uid) => rh.listAllContrats(uid)));

  Electron.ipcMain.handle('rh:pointages:list', (event, dateDebut?: string, dateFin?: string, employeId?: number) =>
    wrapIpc(event, (uid) => rh.listPointages(uid, dateDebut, dateFin, employeId)));
  Electron.ipcMain.handle('rh:pointages:upsert', (event, input: UpsertPointageInput) =>
    wrapIpc(event, (uid) => rh.upsertPointage(uid, input)));
  Electron.ipcMain.handle('rh:pointages:soumettre', (event, id: number) =>
    wrapIpc(event, (uid) => rh.soumettrePointage(uid, id)));
  Electron.ipcMain.handle('rh:pointages:valider', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => rh.validerPointage(uid, id, approuve)));

  Electron.ipcMain.handle(
    'rh:absences:list',
    (
      event,
      statut?: StatutAbsence,
      opts?: { dateDebut?: string; dateFin?: string; hotelId?: number },
    ) => wrapIpc(event, (uid) => rh.listAbsences(uid, statut, opts)),
  );
  Electron.ipcMain.handle('rh:absences:create', (event, input: CreateAbsenceInput) =>
    wrapIpc(event, (uid) => rh.createAbsence(uid, input)));
  Electron.ipcMain.handle('rh:absences:decider', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => rh.deciderAbsence(uid, id, approuve)));

  Electron.ipcMain.handle(
    'rh:affectations:list',
    (event, opts?: { employeId?: number; hotelId?: number; statut?: StatutAffectation }) =>
      wrapIpc(event, (uid) => rh.listAffectations(uid, opts)),
  );
  Electron.ipcMain.handle('rh:affectations:create', (event, input: CreateAffectationInput) =>
    wrapIpc(event, (uid) => rh.createAffectation(uid, input)));
  Electron.ipcMain.handle('rh:affectations:terminer', (event, id: number, dateFin?: string) =>
    wrapIpc(event, (uid) => rh.terminerAffectation(uid, id, dateFin)));

  Electron.ipcMain.handle('rh:organisation:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rh.listOrganisation(uid, hotelId)));
  Electron.ipcMain.handle('rh:organisation:upsert', (event, input: UpsertOrganisationInput) =>
    wrapIpc(event, (uid) => rh.upsertOrganisation(uid, input)));
  Electron.ipcMain.handle('rh:organisation:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rh.deleteOrganisation(uid, id);
      return true;
    }));

  Electron.ipcMain.handle(
    'rh:soldes:list',
    (event, opts?: { employeId?: number; annee?: number }) =>
      wrapIpc(event, (uid) => rh.listSoldesConges(uid, opts)),
  );
  Electron.ipcMain.handle('rh:soldes:upsert', (event, input: UpsertSoldeCongesInput) =>
    wrapIpc(event, (uid) => rh.upsertSoldeConges(uid, input)));

  Electron.ipcMain.handle(
    'rh:plannings:list',
    (event, opts?: { hotelId?: number; dateDebut?: string; dateFin?: string; employeId?: number }) =>
      wrapIpc(event, (uid) => rh.listPlannings(uid, opts)),
  );
  Electron.ipcMain.handle('rh:plannings:create', (event, input: CreatePlanningInput) =>
    wrapIpc(event, (uid) => rh.createPlanning(uid, input)));
  Electron.ipcMain.handle('rh:plannings:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rh.deletePlanning(uid, id);
      return true;
    }));
  Electron.ipcMain.handle(
    'rh:plannings:synthese',
    (event, dateDebut: string, dateFin: string, hotelId?: number) =>
      wrapIpc(event, (uid) => rh.getPlanningSynthese(uid, dateDebut, dateFin, hotelId)),
  );
  Electron.ipcMain.handle('rh:plannings:suggestionsRenfort', (event, seuil?: number) =>
    wrapIpc(event, (uid) => rh.getSuggestionsRenfort(uid, seuil)));

  Electron.ipcMain.handle('rh:equipes:list', (event, chefEmployeId?: number) =>
    wrapIpc(event, (uid) => rh.listEquipes(uid, chefEmployeId)));
  Electron.ipcMain.handle('rh:equipes:add', (event, input: AddEquipeMembreInput) =>
    wrapIpc(event, (uid) => rh.addEquipeMembre(uid, input)));
  Electron.ipcMain.handle('rh:equipes:remove', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rh.removeEquipeMembre(uid, id);
      return true;
    }));

  Electron.ipcMain.handle('rh:paie:bulletins:list', (event, periode?: string) =>
    wrapIpc(event, (uid) => rhPaie.listBulletins(uid, periode)));
  Electron.ipcMain.handle('rh:paie:generate', (event, periode: string) =>
    wrapIpc(event, (uid) => rhPaie.generatePrePaie(uid, periode)));
  Electron.ipcMain.handle('rh:paie:bulletins:valider', (event, id: number) =>
    wrapIpc(event, (uid) => rhPaie.validerBulletin(uid, id)));
  Electron.ipcMain.handle(
    'rh:paie:bulletins:comptabiliser',
    (event, id: number, hotelId: number, dateOperation: string) =>
      wrapIpc(event, (uid) => rhPaie.comptabiliserBulletinTresorerie(uid, id, hotelId, dateOperation)),
  );

  Electron.ipcMain.handle('rh:paie:primes:list', (event, periode?: string, employeId?: number) =>
    wrapIpc(event, (uid) => rhPaie.listPrimes(uid, periode, employeId)));
  Electron.ipcMain.handle('rh:paie:primes:create', (event, input: CreatePrimeInput) =>
    wrapIpc(event, (uid) => rhPaie.createPrime(uid, input)));
  Electron.ipcMain.handle('rh:paie:primes:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhPaie.deletePrime(uid, id);
      return true;
    }));

  Electron.ipcMain.handle('rh:dlg:config:get', (event) =>
    wrapIpc(event, (uid) => rhPaie.getDlgConfig(uid)));
  Electron.ipcMain.handle('rh:dlg:config:set', (event, input: UpdateDlgConfigInput) =>
    wrapIpc(event, (uid) => rhPaie.setDlgConfig(uid, input)));
  Electron.ipcMain.handle('rh:dlg:pickFolder', (event, kind: 'export' | 'import') =>
    wrapIpc(event, (uid) => rhPaie.pickDlgFolder(uid, kind)));
  Electron.ipcMain.handle('rh:dlg:export', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhPaie.exportVersDlg(uid, periode)));
  Electron.ipcMain.handle('rh:dlg:import', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhPaie.importDepuisDlg(uid, periode)));
  Electron.ipcMain.handle('rh:dlg:journal', (event, limit?: number) =>
    wrapIpc(event, (uid) => rhPaie.listDlgJournal(uid, limit)));

  Electron.ipcMain.handle('rh:formations:catalog', (event, actifOnly?: boolean) =>
    wrapIpc(event, (uid) => rhTalent.listFormationsCatalog(uid, actifOnly)));
  Electron.ipcMain.handle('rh:formations:catalog:create', (event, input: CreateFormationCatalogInput) =>
    wrapIpc(event, (uid) => rhTalent.createFormationCatalog(uid, input)));
  Electron.ipcMain.handle(
    'rh:formations:catalog:update',
    (event, id: number, input: UpdateFormationCatalogInput) =>
      wrapIpc(event, (uid) => rhTalent.updateFormationCatalog(uid, id, input)),
  );
  Electron.ipcMain.handle(
    'rh:formations:employe:list',
    (event, opts?: { employeId?: number; echeanceProche?: boolean }) =>
      wrapIpc(event, (uid) => rhTalent.listEmployeFormations(uid, opts)),
  );
  Electron.ipcMain.handle('rh:formations:employe:assign', (event, input: AssignEmployeFormationInput) =>
    wrapIpc(event, (uid) => rhTalent.assignEmployeFormation(uid, input)));
  Electron.ipcMain.handle(
    'rh:formations:employe:update',
    (event, id: number, input: UpdateEmployeFormationInput) =>
      wrapIpc(event, (uid) => rhTalent.updateEmployeFormation(uid, id, input)),
  );
  Electron.ipcMain.handle('rh:formations:employe:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteEmployeFormation(uid, id);
      return true;
    }));

  Electron.ipcMain.handle('rh:competences:list', (event) =>
    wrapIpc(event, (uid) => rhTalent.listCompetences(uid)));
  Electron.ipcMain.handle('rh:competences:create', (event, input: CreateCompetenceInput) =>
    wrapIpc(event, (uid) => rhTalent.createCompetence(uid, input)));
  Electron.ipcMain.handle('rh:competences:poste:list', (event, posteId?: number) =>
    wrapIpc(event, (uid) => rhTalent.listPosteCompetences(uid, posteId)));
  Electron.ipcMain.handle('rh:competences:poste:set', (event, input: SetPosteCompetenceInput) =>
    wrapIpc(event, (uid) => rhTalent.setPosteCompetence(uid, input)));
  Electron.ipcMain.handle('rh:competences:poste:remove', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhTalent.removePosteCompetence(uid, id);
      return true;
    }));

  Electron.ipcMain.handle(
    'rh:entretiens:list',
    (event, opts?: { employeId?: number; statut?: 'planifie' | 'realise' | 'annule' }) =>
      wrapIpc(event, (uid) => rhTalent.listEntretiens(uid, opts)),
  );
  Electron.ipcMain.handle('rh:entretiens:create', (event, input: CreateEntretienInput) =>
    wrapIpc(event, (uid) => rhTalent.createEntretien(uid, input)));
  Electron.ipcMain.handle('rh:entretiens:update', (event, id: number, input: UpdateEntretienInput) =>
    wrapIpc(event, (uid) => rhTalent.updateEntretien(uid, id, input)));
  Electron.ipcMain.handle('rh:entretiens:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteEntretien(uid, id);
      return true;
    }));

  Electron.ipcMain.handle('rh:documents:list', (event, employeId?: number) =>
    wrapIpc(event, (uid) => rhTalent.listDocuments(uid, employeId)));
  Electron.ipcMain.handle(
    'rh:documents:upload',
    (event, employeId: number, type: TypeDocumentRh, nom?: string) =>
      wrapIpc(event, (uid) => rhTalent.pickAndUploadDocument(uid, employeId, type, nom)),
  );
  Electron.ipcMain.handle('rh:documents:delete', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteDocument(uid, id);
      return true;
    }));
  Electron.ipcMain.handle('rh:documents:open', (event, id: number) =>
    wrapIpc(event, (uid) => {
      rhTalent.openDocument(uid, id);
      return true;
    }));

  Electron.ipcMain.handle('rh:pilotage:comparatif', (event, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => rhPilotage.getComparatifUnites(uid, dateDebut, dateFin)));
  Electron.ipcMain.handle(
    'rh:pilotage:previsions',
    (event, opts?: { hotelId?: number; moisAhead?: number }) =>
      wrapIpc(event, (uid) => rhPilotage.getPrevisionsEffectif(uid, opts)),
  );
  Electron.ipcMain.handle(
    'rh:pilotage:onboarding:list',
    (event, opts?: { employeId?: number; enCoursOnly?: boolean }) =>
      wrapIpc(event, (uid) => rhPilotage.listOnboardingSuivi(uid, opts)),
  );
  Electron.ipcMain.handle('rh:pilotage:onboarding:complete', (event, employeId: number, stepCode: string) =>
    wrapIpc(event, (uid) => {
      rhPilotage.completeOnboardingStep(uid, employeId, stepCode);
      return true;
    }));
  Electron.ipcMain.handle('rh:pilotage:port:synthese', (event) =>
    wrapIpc(event, (uid) => rhPilotage.getPortRhSynthese(uid)));
  Electron.ipcMain.handle('rh:pilotage:port:typeActivite', (event, input: UpdateEmployeTypeActiviteInput) =>
    wrapIpc(event, (uid) => {
      rhPilotage.updateEmployeTypeActivite(uid, input);
      return true;
    }));

  Electron.ipcMain.handle('rh:ai:config', (event) => wrapIpc(event, (uid) => rhAi.getRhAiConfig(uid)));
  Electron.ipcMain.handle('rh:ai:context', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rhAi.buildRhDecisionContext(uid, hotelId)));
  Electron.ipcMain.handle(
    'rh:ai:analyze',
    (event, opts?: { hotelId?: number; provider?: 'gemini' | 'openai' | 'local' }) =>
      wrapIpc(event, (uid) => rhAi.generateRhAiAnalysis(uid, opts)),
  );

  Electron.ipcMain.handle('rh:conformite:dashboard', (event) =>
    wrapIpc(event, (uid) => rhConformite.getConformiteDashboard(uid)));
  Electron.ipcMain.handle('rh:conformite:syncConges', (event, annee?: number) =>
    wrapIpc(event, (uid) => rhConformite.syncCongesLegaux90_11(uid, annee)));
  Electron.ipcMain.handle(
    'rh:conformite:suivi:update',
    (event, employeId: number, code: string, statut: 'a_faire' | 'en_cours' | 'fait' | 'non_requis', opts?: { dateRealisation?: string; notes?: string }) =>
      wrapIpc(event, (uid) => {
        rhConformite.updateConformiteSuivi(uid, employeId, code, statut, opts);
        return true;
      }),
  );

  Electron.ipcMain.handle('rh:ged:modeles', (event) =>
    wrapIpc(event, (uid) => rhGed.listDossierModeles(uid)));
  Electron.ipcMain.handle('rh:ged:dossier', (event, employeId: number) =>
    wrapIpc(event, (uid) => rhGed.getDossierEmploye(uid, employeId)));
  Electron.ipcMain.handle('rh:ged:scanFolder', (event, employeId: number, modeleCode?: string) =>
    wrapIpc(event, (uid) => rhGed.scanDossierFromFolder(uid, employeId, modeleCode)));
  Electron.ipcMain.handle('rh:ged:scanSingle', (event, employeId: number, modeleCode: string) =>
    wrapIpc(event, (uid) => rhGed.pickAndScanSingleDocument(uid, employeId, modeleCode)));
  Electron.ipcMain.handle('rh:ged:soumettre', (event, documentId: number) =>
    wrapIpc(event, (uid) => rhGed.soumettreDocumentValidation(uid, documentId)));

  Electron.ipcMain.handle('rh:validations:n1:list', (event) =>
    wrapIpc(event, (uid) => rhValidation.listValidationsN1(uid)));
  Electron.ipcMain.handle('rh:validations:n1:count', (event) =>
    wrapIpc(event, (uid) => rhValidation.countValidationsN1EnAttente(uid)));
  Electron.ipcMain.handle('rh:validations:n1:absence', (event, id: number, approuve: boolean, commentaire?: string) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Absence(uid, id, approuve, commentaire);
      return true;
    }));
  Electron.ipcMain.handle('rh:validations:n1:pointage', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Pointage(uid, id, approuve);
      return true;
    }));
  Electron.ipcMain.handle('rh:validations:n1:document', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Document(uid, id, approuve);
      return true;
    }));

  Electron.ipcMain.handle('rh:registres:personnel:list', (event) =>
    wrapIpc(event, (uid) => rhRegistres.listRegistrePersonnel(uid)));
  Electron.ipcMain.handle('rh:registres:conges:list', (event, annee?: number) =>
    wrapIpc(event, (uid) => rhRegistres.listRegistreConges(uid, annee)));
  Electron.ipcMain.handle('rh:registres:accidents:list', (event) =>
    wrapIpc(event, (uid) => rhRegistres.listAccidentsTravail(uid)));
  Electron.ipcMain.handle('rh:registres:visites:list', (event) =>
    wrapIpc(event, (uid) => rhRegistres.listVisitesMedicales(uid)));
  Electron.ipcMain.handle('rh:registres:accidents:create', (event, input: CreateRhAccidentInput) =>
    wrapIpc(event, (uid) => rhRegistres.createAccidentTravail(uid, input)));
  Electron.ipcMain.handle('rh:registres:visites:create', (event, input: CreateRhVisiteMedicaleInput) =>
    wrapIpc(event, (uid) => rhRegistres.createVisiteMedicale(uid, input)));
  Electron.ipcMain.handle('rh:registres:personnel:exportPdf', (event) =>
    wrapIpcAsync(event, (uid) => rhRegistres.exportRegistrePersonnelPdf(uid)));
  Electron.ipcMain.handle('rh:registres:personnel:exportCsv', (event) =>
    wrapIpcAsync(event, (uid) => rhRegistres.exportRegistrePersonnelCsv(uid)));
  Electron.ipcMain.handle('rh:registres:conges:exportPdf', (event, annee?: number) =>
    wrapIpcAsync(event, (uid) => rhRegistres.exportRegistreCongesPdf(uid, annee)));
  Electron.ipcMain.handle('rh:registres:accidents:exportPdf', (event) =>
    wrapIpcAsync(event, (uid) => rhRegistres.exportRegistreAccidentsPdf(uid)));
  Electron.ipcMain.handle('rh:registres:visites:exportPdf', (event) =>
    wrapIpcAsync(event, (uid) => rhRegistres.exportRegistreVisitesPdf(uid)));

  Electron.ipcMain.handle('rh:paie:bulletin:exportPdf', (event, bulletinId: number) =>
    wrapIpcAsync(event, (uid) => rhBulletinPdf.exportBulletinPaiePdf(uid, bulletinId)));

  Electron.ipcMain.handle('rh:rupture:previewStc', (event, input: ProcessRuptureInput) =>
    wrapIpc(event, (uid) => rhRupture.previewStc(uid, input)));
  Electron.ipcMain.handle('rh:rupture:process', (event, input: ProcessRuptureInput) =>
    wrapIpc(event, (uid) => rhRupture.processRuptureContrat(uid, input)));
  Electron.ipcMain.handle('rh:rupture:list', (event) =>
    wrapIpc(event, (uid) => rhRupture.listRuptures(uid)));
  Electron.ipcMain.handle('rh:rupture:certificat:exportPdf', (event, ruptureId: number) =>
    wrapIpcAsync(event, (uid) => rhRupture.exportCertificatTravailPdf(uid, ruptureId)));
  Electron.ipcMain.handle('rh:rupture:stc:exportPdf', (event, ruptureId: number) =>
    wrapIpcAsync(event, (uid) => rhRupture.exportStcPdf(uid, ruptureId)));

  Electron.ipcMain.handle('rh:declarations:exportDas', (event, annee: number) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportDasAnnuelle(uid, annee)));
  Electron.ipcMain.handle('rh:declarations:exportCnas', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportCnasMensuelle(uid, periode)));
  Electron.ipcMain.handle('rh:declarations:exportVirements', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportVirementsPaie(uid, periode)));
  Electron.ipcMain.handle('rh:declarations:exportAnem', (event) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportAnemEmbauches(uid)));
}
