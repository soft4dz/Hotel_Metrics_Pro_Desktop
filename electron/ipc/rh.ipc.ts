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
import * as rhPaieCloture from '../services/rh-paie-cloture.service';
import * as rhEgt from '../services/rh-organisation-egt.service';
import * as rhPointeuse from '../services/rh-pointeuse.service';
import * as rhPointeuseSync from '../services/rh-pointeuse-sync.service';
import * as rhAts from '../services/rh-ats.service';
import * as rhTemps from '../services/rh-temps-reconciliation.service';
import * as rhGpec from '../services/rh-gpec.service';
import { assertPositiveInteger, assertText, assertObject, assertEnum, assertDateJournal, assertAmount, assertArray } from './validation';
import type {
  CreateAbsenceInput,
  CreateAffectationInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateDirectionInput,
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
  UpdateDirectionInput,
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
import type {
  CreateAbsenceInput,
  CreateAffectationInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateDirectionInput,
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
  UpdateDirectionInput,
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

  Electron.ipcMain.handle('rh:directions:list', (event) =>
    wrapIpc(event, (uid) => rh.listDirections(uid)));
  Electron.ipcMain.handle('rh:directions:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => { const o = assertObject<Record<string,unknown>>(input,'input'); assertText(o.libelle,'libelle',{required:true,maxLength:200}); return rh.createDirection(uid, input as CreateDirectionInput); }));
  Electron.ipcMain.handle(
    'rh:directions:update',
    (event, id: unknown, input: unknown) =>
      wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.updateDirection(uid, assertPositiveInteger(id,'id'), input as UpdateDirectionInput); }),
  );

  Electron.ipcMain.handle('rh:departements:list', (event, directionId?: number) =>
    wrapIpc(event, (uid) => rh.listDepartements(uid, directionId)));
  Electron.ipcMain.handle('rh:departements:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => { const o = assertObject<Record<string,unknown>>(input,'input'); assertText(o.libelle,'libelle',{required:true,maxLength:200}); return rh.createDepartement(uid, input as CreateDepartementInput); }));
  Electron.ipcMain.handle(
    'rh:departements:update',
    (event, id: unknown, input: unknown) =>
      wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.updateDepartement(uid, assertPositiveInteger(id,'id'), input as UpdateDepartementInput); }),
  );

  Electron.ipcMain.handle('rh:postes:list', (event, departementId?: number) =>
    wrapIpc(event, (uid) => rh.listPostes(uid, departementId)));
  Electron.ipcMain.handle('rh:postes:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => { const o = assertObject<Record<string,unknown>>(input,'input'); assertText(o.libelle,'libelle',{required:true,maxLength:200}); return rh.createPoste(uid, input as CreatePosteInput); }));
  Electron.ipcMain.handle('rh:postes:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.updatePoste(uid, assertPositiveInteger(id,'id'), input as UpdatePosteInput); }));

  Electron.ipcMain.handle('rh:employes:list', (event, search?: string) =>
    wrapIpc(event, (uid) => rh.listEmployes(uid, search)));
  Electron.ipcMain.handle('rh:employes:get', (event, id: unknown) =>
    wrapIpc(event, (uid) => rh.getEmploye(uid, assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('rh:employes:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => { const o = assertObject<Record<string,unknown>>(input,'input'); assertText(o.nom,'nom',{required:true,maxLength:200}); return rh.createEmploye(uid, input as CreateEmployeInput); }));
  Electron.ipcMain.handle('rh:employes:createWizard', (event, input: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.createEmployeWizard(uid, input as CreateEmployeWizardInput); }));
  Electron.ipcMain.handle('rh:employes:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.updateEmploye(uid, assertPositiveInteger(id,'id'), input as UpdateEmployeInput); }));
  Electron.ipcMain.handle('rh:employes:sortir', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rh.sortirEmploye(uid, assertPositiveInteger(id,'id'), input as SortirEmployeInput); }));

  Electron.ipcMain.handle('rh:recrutements:list', (event, statut?: StatutRecrutement) =>
    wrapIpc(event, (uid) => rh.listRecrutements(uid, statut)));
  Electron.ipcMain.handle('rh:recrutements:create', (event, input: CreateRecrutementInput) =>
    wrapIpc(event, (uid) => rh.createRecrutement(uid, input)));
  Electron.ipcMain.handle('rh:recrutements:valider', (event, id: unknown) =>
    wrapIpc(event, (uid) => rh.validerRecrutement(uid, assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('rh:recrutements:refuser', (event, id: unknown, motif?: unknown) =>
    wrapIpc(event, (uid) => rh.refuserRecrutement(uid, assertPositiveInteger(id,'id'), motif ? assertText(motif,'motif',{maxLength:500}) : undefined)));

  Electron.ipcMain.handle('rh:ats:offres:list', (event, statut?: import('../../src/shared/types/rh').StatutOffreEmploi) =>
    wrapIpc(event, (uid) => rhAts.listOffresEmploi(uid, statut)));
  Electron.ipcMain.handle('rh:ats:offres:create', (event, input: import('../../src/shared/types/rh').CreateOffreEmploiInput) =>
    wrapIpc(event, (uid) => rhAts.createOffreEmploi(uid, input)));
  Electron.ipcMain.handle('rh:ats:offres:update', (event, id: number, input: import('../../src/shared/types/rh').UpdateOffreEmploiInput) =>
    wrapIpc(event, (uid) => rhAts.updateOffreEmploi(uid, id, input)));
  Electron.ipcMain.handle('rh:ats:pipeline', (event, offreId?: number) =>
    wrapIpc(event, (uid) => rhAts.getPipelineRecrutement(uid, offreId)));
  Electron.ipcMain.handle('rh:ats:candidatures:create', (event, input: CreateRecrutementInput) =>
    wrapIpc(event, (uid) => rhAts.createCandidature(uid, input)));
  Electron.ipcMain.handle('rh:ats:candidatures:avancer', (event, input: import('../../src/shared/types/rh').AvancerCandidatureInput) =>
    wrapIpc(event, (uid) => rhAts.avancerCandidature(uid, input)));
  Electron.ipcMain.handle('rh:ats:entretiens:list', (event, recrutementId: number) =>
    wrapIpc(event, (uid) => rhAts.listEntretiensRecrutement(uid, recrutementId)));
  Electron.ipcMain.handle('rh:ats:entretiens:create', (event, input: import('../../src/shared/types/rh').CreateEntretienRecrutementInput) =>
    wrapIpc(event, (uid) => rhAts.createEntretienRecrutement(uid, input)));
  Electron.ipcMain.handle('rh:ats:entretiens:update', (event, id: number, input: import('../../src/shared/types/rh').UpdateEntretienRecrutementInput) =>
    wrapIpc(event, (uid) => rhAts.updateEntretienRecrutement(uid, id, input)));
  Electron.ipcMain.handle('rh:ats:historique', (event, recrutementId: number) =>
    wrapIpc(event, (uid) => rhAts.listHistoriqueCandidature(uid, recrutementId)));

  Electron.ipcMain.handle('rh:temps:reconcilier', (event, dateDebut: string, dateFin: string, hotelId?: number) =>
    wrapIpc(event, (uid) => rhTemps.runReconciliationTemps(uid, dateDebut, dateFin, hotelId)));
  Electron.ipcMain.handle('rh:temps:reconciliations:list', (event, opts?: { dateDebut?: string; dateFin?: string; hotelId?: number; statut?: string }) =>
    wrapIpc(event, (uid) => rhTemps.listReconciliationsTemps(uid, opts as Parameters<typeof rhTemps.listReconciliationsTemps>[1])));
  Electron.ipcMain.handle('rh:temps:alertes:list', (event, statut?: string) =>
    wrapIpc(event, (uid) => rhTemps.listTempsAlertes(uid, statut as import('../../src/shared/types/rh').StatutTempsAlerte | undefined)));
  Electron.ipcMain.handle('rh:temps:alertes:traiter', (event, alerteId: number, action: 'traitee' | 'ignoree') =>
    wrapIpc(event, (uid) => rhTemps.traiterTempsAlerte(uid, alerteId, action)));
  Electron.ipcMain.handle('rh:temps:paie:reconciliation', (event, periode: string) =>
    wrapIpc(event, (uid) => rhTemps.getReconciliationPaie(uid, periode)));
  Electron.ipcMain.handle('rh:temps:paie:valider', (event, employeId: number, dateDebut: string, dateFin: string) =>
    wrapIpc(event, (uid) => rhTemps.validerReconciliationPaie(uid, employeId, dateDebut, dateFin)));
  Electron.ipcMain.handle('rh:temps:exportCsv', (event, dateDebut: string, dateFin: string) =>
    wrapIpcAsync(event, (uid) => rhTemps.exportReconciliationCsv(uid, dateDebut, dateFin)));

  Electron.ipcMain.handle('rh:gpec:employeCompetences:list', (event, employeId?: number) =>
    wrapIpc(event, (uid) => rhGpec.listEmployeCompetences(uid, employeId)));
  Electron.ipcMain.handle('rh:gpec:employeCompetences:set', (event, input: import('../../src/shared/types/rh').SetEmployeCompetenceInput) =>
    wrapIpc(event, (uid) => rhGpec.setEmployeCompetence(uid, input)));
  Electron.ipcMain.handle('rh:gpec:matrice', (event, employeId: number) =>
    wrapIpc(event, (uid) => rhGpec.getMatriceGpec(uid, employeId)));
  Electron.ipcMain.handle('rh:gpec:campagnes:list', (event) =>
    wrapIpc(event, (uid) => rhGpec.listCampagnesEvaluation(uid)));
  Electron.ipcMain.handle('rh:gpec:campagnes:create', (event, input: import('../../src/shared/types/rh').CreateCampagneEvaluationInput) =>
    wrapIpc(event, (uid) => rhGpec.createCampagneEvaluation(uid, input)));
  Electron.ipcMain.handle('rh:gpec:campagnes:update', (event, id: number, input: import('../../src/shared/types/rh').UpdateCampagneEvaluationInput) =>
    wrapIpc(event, (uid) => rhGpec.updateCampagneEvaluation(uid, id, input)));
  Electron.ipcMain.handle('rh:gpec:campagnes:lancer', (event, campagneId: number) =>
    wrapIpc(event, (uid) => rhGpec.lancerCampagneEvaluation(uid, campagneId)));
  Electron.ipcMain.handle('rh:gpec:campagnes:cloturer', (event, campagneId: number) =>
    wrapIpc(event, (uid) => rhGpec.cloturerCampagneEvaluation(uid, campagneId)));
  Electron.ipcMain.handle('rh:gpec:campagnes:synthese', (event, campagneId: number) =>
    wrapIpc(event, (uid) => rhGpec.getCampagneSynthese(uid, campagneId)));
  Electron.ipcMain.handle('rh:gpec:evaluations:list', (event, campagneId: number, employeId?: number) =>
    wrapIpc(event, (uid) => rhGpec.listCampagneEvaluations(uid, campagneId, employeId)));
  Electron.ipcMain.handle('rh:gpec:evaluations:soumettre', (event, ligneId: number, input: import('../../src/shared/types/rh').SoumettreEvaluationInput) =>
    wrapIpc(event, (uid) => rhGpec.soumettreEvaluationLigne(uid, ligneId, input)));
  Electron.ipcMain.handle('rh:gpec:evaluations:valider', (event, ligneId: number) =>
    wrapIpc(event, (uid) => rhGpec.validerEvaluationLigne(uid, ligneId)));

  Electron.ipcMain.handle('rh:contrats:list', (event, employeId: unknown) =>
    wrapIpc(event, (uid) => rh.listContrats(uid, assertPositiveInteger(employeId,'employeId'))));
  Electron.ipcMain.handle('rh:contrats:create', (event, input: unknown) =>
    wrapIpc(event, (uid) => { const o = assertObject<Record<string,unknown>>(input,'input'); assertPositiveInteger(o.employeId,'employeId'); return rh.createContrat(uid, input as CreateContratInput); }));
  Electron.ipcMain.handle('rh:contrats:listAll', (event) =>
    wrapIpc(event, (uid) => rh.listAllContrats(uid)));

  Electron.ipcMain.handle('rh:pointages:list', (event, dateDebut?: string, dateFin?: string, employeId?: number) =>
    wrapIpc(event, (uid) => rh.listPointages(uid, dateDebut, dateFin, employeId)));
  Electron.ipcMain.handle('rh:pointages:upsert', (event, input: UpsertPointageInput) =>
    wrapIpc(event, (uid) => rh.upsertPointage(uid, input)));
  Electron.ipcMain.handle('rh:pointages:soumettre', (event, id: unknown) =>
    wrapIpc(event, (uid) => rh.soumettrePointage(uid, assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('rh:pointages:valider', (event, id: unknown, approuve: unknown) =>
    wrapIpc(event, (uid) => rh.validerPointage(uid, assertPositiveInteger(id,'id'), approuve === true)));

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
  Electron.ipcMain.handle('rh:absences:decider', (event, id: unknown, approuve: unknown) =>
    wrapIpc(event, (uid) => rh.deciderAbsence(uid, assertPositiveInteger(id,'id'), approuve === true)));
  Electron.ipcMain.handle('rh:absences:cancel', (event, id: unknown, motif?: unknown) =>
    wrapIpc(event, (uid) => rh.cancelAbsence(uid, assertPositiveInteger(id, 'id'), motif ? assertText(motif, 'motif', { maxLength: 500 }) : undefined)));

  Electron.ipcMain.handle(
    'rh:affectations:list',
    (event, opts?: { employeId?: number; hotelId?: number; statut?: StatutAffectation }) =>
      wrapIpc(event, (uid) => rh.listAffectations(uid, opts)),
  );
  Electron.ipcMain.handle('rh:affectations:create', (event, input: CreateAffectationInput) =>
    wrapIpc(event, (uid) => rh.createAffectation(uid, input)));
  Electron.ipcMain.handle('rh:affectations:terminer', (event, id: unknown, dateFin?: unknown) =>
    wrapIpc(event, (uid) => rh.terminerAffectation(uid, assertPositiveInteger(id,'id'), dateFin ? assertDateJournal(dateFin,'dateFin') : undefined)));

  Electron.ipcMain.handle('rh:organisation:list', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rh.listOrganisation(uid, hotelId)));
  Electron.ipcMain.handle('rh:organisation:upsert', (event, input: UpsertOrganisationInput) =>
    wrapIpc(event, (uid) => rh.upsertOrganisation(uid, input)));
  Electron.ipcMain.handle('rh:organisation:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rh.deleteOrganisation(uid, assertPositiveInteger(id,'id'));
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
  Electron.ipcMain.handle('rh:plannings:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rh.deletePlanning(uid, assertPositiveInteger(id,'id'));
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
  Electron.ipcMain.handle('rh:equipes:remove', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rh.removeEquipeMembre(uid, assertPositiveInteger(id,'id'));
      return true;
    }));

  Electron.ipcMain.handle('rh:paie:bulletins:list', (event, periode?: string) =>
    wrapIpc(event, (uid) => rhPaie.listBulletins(uid, periode)));
  Electron.ipcMain.handle('rh:paie:generate', (event, periode: string) =>
    wrapIpc(event, (uid) => rhPaie.generatePrePaie(uid, periode)));
  Electron.ipcMain.handle('rh:paie:bulletins:valider', (event, id: unknown) =>
    wrapIpc(event, (uid) => rhPaie.validerBulletin(uid, assertPositiveInteger(id,'id'))));

  Electron.ipcMain.handle('rh:paie:cloture:get', (event, periode: string) =>
    wrapIpc(event, (uid) => rhPaieCloture.getPaieCloture(uid, periode)));
  Electron.ipcMain.handle('rh:paie:cloture:list', (event) =>
    wrapIpc(event, (uid) => rhPaieCloture.listPaieClotures(uid)));
  Electron.ipcMain.handle('rh:paie:cloture:valider', (event, periode: string) =>
    wrapIpc(event, (uid) => rhPaieCloture.validerPaieMensuelle(uid, periode)));
  Electron.ipcMain.handle('rh:paie:cloture:cloturer', (event, periode: string) =>
    wrapIpc(event, (uid) => rhPaieCloture.cloturerPaieMensuelle(uid, periode)));
  Electron.ipcMain.handle('rh:paie:params:get', (event) =>
    wrapIpc(event, () => rhPaieCloture.getPaieParams()));
  Electron.ipcMain.handle(
    'rh:paie:bulletins:comptabiliser',
    (event, id: unknown, hotelId: unknown, dateOperation: unknown) =>
      wrapIpc(event, (uid) => rhPaie.comptabiliserBulletinTresorerie(uid, assertPositiveInteger(id,'id'), assertPositiveInteger(hotelId,'hotelId'), assertDateJournal(dateOperation,'dateOperation'))),
  );

  Electron.ipcMain.handle('rh:paie:primes:list', (event, periode?: string, employeId?: number) =>
    wrapIpc(event, (uid) => rhPaie.listPrimes(uid, periode, employeId)));
  Electron.ipcMain.handle('rh:paie:primes:create', (event, input: CreatePrimeInput) =>
    wrapIpc(event, (uid) => rhPaie.createPrime(uid, input)));
  Electron.ipcMain.handle('rh:paie:primes:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhPaie.deletePrime(uid, assertPositiveInteger(id,'id'));
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
  Electron.ipcMain.handle('rh:dlg:import', (event, periode: string, sourceFile?: string | null) =>
    wrapIpcAsync(event, (uid) => rhPaie.importDepuisDlg(uid, periode, sourceFile)));
  Electron.ipcMain.handle('rh:dlg:pickImportFile', (event) =>
    wrapIpcAsync(event, (uid) => rhPaie.pickDlgImportFile(uid)));
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
  Electron.ipcMain.handle('rh:formations:employe:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteEmployeFormation(uid, assertPositiveInteger(id,'id'));
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
  Electron.ipcMain.handle('rh:competences:poste:remove', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhTalent.removePosteCompetence(uid, assertPositiveInteger(id,'id'));
      return true;
    }));

  Electron.ipcMain.handle(
    'rh:entretiens:list',
    (event, opts?: { employeId?: number; statut?: 'planifie' | 'realise' | 'annule' }) =>
      wrapIpc(event, (uid) => rhTalent.listEntretiens(uid, opts)),
  );
  Electron.ipcMain.handle('rh:entretiens:create', (event, input: CreateEntretienInput) =>
    wrapIpc(event, (uid) => rhTalent.createEntretien(uid, input)));
  Electron.ipcMain.handle('rh:entretiens:update', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rhTalent.updateEntretien(uid, assertPositiveInteger(id,'id'), input as UpdateEntretienInput); }));
  Electron.ipcMain.handle('rh:entretiens:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteEntretien(uid, assertPositiveInteger(id,'id'));
      return true;
    }));

  Electron.ipcMain.handle('rh:documents:list', (event, employeId?: number) =>
    wrapIpc(event, (uid) => rhTalent.listDocuments(uid, employeId)));
  Electron.ipcMain.handle(
    'rh:documents:upload',
    (event, employeId: number, type: TypeDocumentRh, nom?: string) =>
      wrapIpc(event, (uid) => rhTalent.pickAndUploadDocument(uid, employeId, type, nom)),
  );
  Electron.ipcMain.handle('rh:documents:delete', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhTalent.deleteDocument(uid, assertPositiveInteger(id,'id'));
      return true;
    }));
  Electron.ipcMain.handle('rh:documents:open', (event, id: unknown) =>
    wrapIpc(event, (uid) => {
      rhTalent.openDocument(uid, assertPositiveInteger(id,'id'));
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
  Electron.ipcMain.handle('rh:ged:soumettre', (event, documentId: unknown) =>
    wrapIpc(event, (uid) => rhGed.soumettreDocumentValidation(uid, assertPositiveInteger(documentId,'documentId'))));

  Electron.ipcMain.handle('rh:validations:n1:list', (event) =>
    wrapIpc(event, (uid) => rhValidation.listValidationsN1(uid)));
  Electron.ipcMain.handle('rh:validations:n1:count', (event) =>
    wrapIpc(event, (uid) => rhValidation.countValidationsN1EnAttente(uid)));
  Electron.ipcMain.handle('rh:validations:n1:absence', (event, id: unknown, approuve: unknown, commentaire?: unknown) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Absence(uid, assertPositiveInteger(id,'id'), approuve === true, commentaire ? assertText(commentaire,'commentaire',{maxLength:1000}) : undefined);
      return true;
    }));
  Electron.ipcMain.handle('rh:validations:n1:pointage', (event, id: unknown, approuve: unknown) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Pointage(uid, assertPositiveInteger(id,'id'), approuve === true);
      return true;
    }));
  Electron.ipcMain.handle('rh:validations:n1:document', (event, id: unknown, approuve: unknown) =>
    wrapIpc(event, (uid) => {
      rhValidation.validerN1Document(uid, assertPositiveInteger(id,'id'), approuve === true);
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

  Electron.ipcMain.handle('rh:paie:bulletin:exportPdf', (event, bulletinId: unknown) =>
    wrapIpcAsync(event, (uid) => rhBulletinPdf.exportBulletinPaiePdf(uid, assertPositiveInteger(bulletinId,'bulletinId'))));

  Electron.ipcMain.handle('rh:rupture:previewStc', (event, input: ProcessRuptureInput) =>
    wrapIpc(event, (uid) => rhRupture.previewStc(uid, input)));
  Electron.ipcMain.handle('rh:rupture:process', (event, input: ProcessRuptureInput) =>
    wrapIpc(event, (uid) => rhRupture.processRuptureContrat(uid, input)));
  Electron.ipcMain.handle('rh:rupture:list', (event) =>
    wrapIpc(event, (uid) => rhRupture.listRuptures(uid)));
  Electron.ipcMain.handle('rh:rupture:certificat:exportPdf', (event, ruptureId: unknown) =>
    wrapIpcAsync(event, (uid) => rhRupture.exportCertificatTravailPdf(uid, assertPositiveInteger(ruptureId,'ruptureId'))));
  Electron.ipcMain.handle('rh:rupture:stc:exportPdf', (event, ruptureId: unknown) =>
    wrapIpcAsync(event, (uid) => rhRupture.exportStcPdf(uid, assertPositiveInteger(ruptureId,'ruptureId'))));

  Electron.ipcMain.handle('rh:declarations:exportDas', (event, annee: number) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportDasAnnuelle(uid, annee)));
  Electron.ipcMain.handle('rh:declarations:exportCnas', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportCnasMensuelle(uid, periode)));
  Electron.ipcMain.handle('rh:declarations:exportVirements', (event, periode: string) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportVirementsPaie(uid, periode)));
  Electron.ipcMain.handle('rh:declarations:exportAnem', (event) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportAnemEmbauches(uid)));
  Electron.ipcMain.handle('rh:declarations:exportDadsU', (event, annee: number) =>
    wrapIpcAsync(event, (uid) => rhDeclarations.exportDadsUAnnuelle(uid, annee)));

  Electron.ipcMain.handle('rh:egt:organigramme', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rhEgt.getOrganigrammeEgt(uid, hotelId)));
  Electron.ipcMain.handle('rh:egt:effectifs', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rhEgt.getEffectifsEgtSummary(uid, hotelId)));
  Electron.ipcMain.handle('rh:fichesPoste:list', (event, posteId?: number) =>
    wrapIpc(event, (uid) => rhEgt.listFichesPoste(uid, posteId)));
  Electron.ipcMain.handle('rh:fichesPoste:upsert', (event, input: Parameters<typeof rhEgt.upsertFichePoste>[1]) =>
    wrapIpc(event, (uid) => rhEgt.upsertFichePoste(uid, input)));
  Electron.ipcMain.handle('rh:egt:exportCsv', (event, hotelId?: number) =>
    wrapIpc(event, (uid) => rhEgt.exportOrganigrammeCsv(uid, hotelId)));

  Electron.ipcMain.handle('rh:pointeuses:list', (event, hotelId: unknown) =>
    wrapIpc(event, () => rhPointeuse.listPointeuses(assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('rh:pointeuses:upsert', (event, input: unknown, id?: unknown) =>
    wrapIpc(event, (uid) => { assertObject(input,'input'); return rhPointeuse.upsertPointeuse(uid, input as rhPointeuse.UpsertPointeuseInput, id !== undefined ? assertPositiveInteger(id,'id') : undefined); }));
  Electron.ipcMain.handle('rh:pointeuses:importCsv', (event, hotelId: unknown, csvContent: unknown, pointeuseId?: unknown) =>
    wrapIpc(event, (uid) => {
      const rows = rhPointeuse.parseCsvPunches(assertText(csvContent,'csvContent',{required:true,maxLength:10_000_000}));
      return rhPointeuse.importPunches(uid, assertPositiveInteger(hotelId,'hotelId'), rows, pointeuseId !== undefined ? assertPositiveInteger(pointeuseId,'pointeuseId') : undefined);
    }));
  Electron.ipcMain.handle('rh:pointeuses:rawPunches', (event, hotelId: unknown, traite?: unknown) =>
    wrapIpc(event, () => rhPointeuse.listRawPunches(assertPositiveInteger(hotelId,'hotelId'), traite === true ? true : traite === false ? false : undefined)));
  Electron.ipcMain.handle('rh:pointeuses:traiter', (event, hotelId: unknown, dateDebut?: unknown, dateFin?: unknown) =>
    wrapIpc(event, (uid) => rhPointeuse.traiterRawPunches(uid, assertPositiveInteger(hotelId,'hotelId'), dateDebut ? assertDateJournal(dateDebut,'dateDebut') : undefined, dateFin ? assertDateJournal(dateFin,'dateFin') : undefined)));
  Electron.ipcMain.handle('rh:pointeuses:setBadge', (event, employeId: unknown, badgeId: unknown) =>
    wrapIpc(event, (uid) => {
      rhPointeuse.setEmployeBadge(uid, assertPositiveInteger(employeId,'employeId'), badgeId !== null && badgeId !== undefined ? assertText(badgeId,'badgeId',{maxLength:100}) : null);
      return true;
    }));
  Electron.ipcMain.handle('rh:pointeuses:syncNow', (event, pointeuseId: unknown) =>
    wrapIpcAsync(event, (uid) => rhPointeuseSync.syncPointeuseNow(uid, assertPositiveInteger(pointeuseId,'pointeuseId'))));
  Electron.ipcMain.handle('rh:pointeuses:setSyncAuto', (event, pointeuseId: unknown, syncAuto: unknown, intervalMin?: unknown) =>
    wrapIpc(event, (uid) => {
      rhPointeuseSync.setPointeuseSyncAuto(uid, assertPositiveInteger(pointeuseId,'pointeuseId'), syncAuto === true, intervalMin !== undefined ? assertPositiveInteger(intervalMin,'intervalMin') : undefined);
      return true;
    }));
  Electron.ipcMain.handle('rh:pointeuses:listExtended', (event, hotelId: unknown) =>
    wrapIpc(event, () => rhPointeuseSync.listPointeusesWithSync(assertPositiveInteger(hotelId,'hotelId'))));
}
