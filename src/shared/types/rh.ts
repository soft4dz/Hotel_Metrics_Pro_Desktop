export type StatutRh = 'actif' | 'inactif' | 'sorti';
export type StatutRecrutement = 'en_cours' | 'valide' | 'refuse';
export type TypeContrat = 'CDI' | 'CDD' | 'Interim';
export type StatutPointage = 'brouillon' | 'soumis' | 'valide' | 'refuse';
export type TypeAbsence = 'CP' | 'Maladie' | 'RTT' | 'Sans_solde' | 'Autre';
export type StatutAbsence = 'demandee' | 'approuvee' | 'refusee';
export type AccountStatus = 'actif' | 'en_attente' | 'inactif';

export interface RhDepartement {
  id: number;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface RhPoste {
  id: number;
  nom: string;
  departementId: number;
  departementNom: string;
  salaireMin: number | null;
  salaireMax: number | null;
  roleSystemAssocie: string | null;
  description: string | null;
  actif: boolean;
}

export interface RhEmploye {
  id: number;
  nom: string;
  prenom: string;
  emailPersonnel: string | null;
  telephone: string | null;
  dateEmbauche: string;
  statutRh: StatutRh;
  posteActuelId: number | null;
  posteNom: string | null;
  departementNom: string | null;
  hotelId: number | null;
  hotelName: string | null;
  userId: number | null;
  userEmail: string | null;
  accountStatus: AccountStatus | null;
}

export interface RhRecrutement {
  id: number;
  posteId: number;
  posteNom: string;
  departementNom: string;
  candidatNom: string;
  candidatPrenom: string | null;
  candidatEmail: string | null;
  candidatTelephone: string | null;
  notes: string | null;
  statut: StatutRecrutement;
  employeCreeId: number | null;
  utilisateurCreeId: number | null;
  createdAt: string;
}

export interface RhContrat {
  id: number;
  employeId: number;
  posteId: number;
  posteNom: string;
  type: TypeContrat;
  dateDebut: string;
  dateFin: string | null;
  salaireBrut: number;
  heuresHebdo: number;
  actif: boolean;
}

export interface RhPointage {
  id: number;
  employeId: number;
  employeNom: string;
  date: string;
  heureEntree: string | null;
  heureSortie: string | null;
  heuresTravaillees: number | null;
  statut: StatutPointage;
}

export interface RhAbsence {
  id: number;
  employeId: number;
  employeNom: string;
  type: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif: string | null;
  statut: StatutAbsence;
}

export interface RhDashboard {
  effectifActif: number;
  recrutementsEnCours: number;
  absencesEnAttente: number;
  pointagesASoumettre: number;
  comptesEnAttente: number;
  recettesParEffectif: number;
  tauxPresence: number;
  tauxAbsenteisme: number;
  masseSalariale: number;
  coutMoyenEmploye: number;
  tauxTurnover: number;
  periodeDebut: string;
  periodeFin: string;
}

export interface RhMonEspace {
  employe: RhEmploye | null;
  contratActif: RhContrat | null;
  pointagesRecents: RhPointage[];
  absences: RhAbsence[];
}

export interface CreateDepartementInput {
  nom: string;
  description?: string | null;
}

export interface CreatePosteInput {
  nom: string;
  departementId: number;
  salaireMin?: number | null;
  salaireMax?: number | null;
  roleSystemAssocie?: string | null;
  description?: string | null;
}

export interface CreateEmployeInput {
  nom: string;
  prenom: string;
  emailPersonnel?: string | null;
  telephone?: string | null;
  dateEmbauche: string;
  posteActuelId?: number | null;
  hotelId?: number | null;
  statutRh?: StatutRh;
}

export interface CreateRecrutementInput {
  posteId: number;
  candidatNom: string;
  candidatPrenom?: string | null;
  candidatEmail?: string | null;
  candidatTelephone?: string | null;
  notes?: string | null;
}

export interface CreateContratInput {
  employeId: number;
  posteId: number;
  type: TypeContrat;
  dateDebut: string;
  dateFin?: string | null;
  salaireBrut: number;
  heuresHebdo?: number;
}

export interface UpsertPointageInput {
  employeId: number;
  date: string;
  heureEntree?: string | null;
  heureSortie?: string | null;
}

export interface CreateAbsenceInput {
  employeId: number;
  type: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif?: string | null;
}
