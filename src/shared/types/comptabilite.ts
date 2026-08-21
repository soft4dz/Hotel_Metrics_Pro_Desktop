export type EcritureStatut = 'brouillon' | 'valide';
export type ExerciceStatut = 'ouvert' | 'ferme';

export interface Compte {
  id: number;
  numero: string;
  libelle: string;
  classe: number;
  typeSolde: 'debit' | 'credit';
  actif: boolean;
}

export interface Journal {
  id: number;
  code: string;
  libelle: string;
  type: string;
  actif: boolean;
}

export interface ExerciceComptable {
  id: number;
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut;
  closedAt: string | null;
}

export interface LigneEcritureInput {
  compteNumero: string;
  libelle?: string;
  debit?: number;
  credit?: number;
  hotelId?: number;
}

export interface CreateEcritureInput {
  journalCode: string;
  dateEcriture: string;
  libelle: string;
  piece?: string;
  hotelId?: number;
  lignes: LigneEcritureInput[];
}

export interface EcritureListItem {
  id: number;
  journalCode: string;
  journalLibelle: string;
  dateEcriture: string;
  piece: string | null;
  libelle: string;
  statut: EcritureStatut;
  totalDebit: number;
  totalCredit: number;
}

export interface BalanceLigne {
  compteNumero: string;
  compteLibelle: string;
  classe: number;
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

export interface EcritureFilters {
  exerciceId?: number;
  journalCode?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: EcritureStatut;
}

export interface LigneLettrable {
  ligneId: number;
  ecritureId: number;
  compteNumero: string;
  compteLibelle: string;
  dateEcriture: string;
  piece: string | null;
  libelle: string;
  debit: number;
  credit: number;
  hotelId: number | null;
}

export interface LettrageComptable {
  id: number;
  code: string;
  compteNumero: string;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  statut: 'valide' | 'annule';
  createdAt: string;
  lignesCount: number;
}
