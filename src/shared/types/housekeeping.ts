export type TypeTacheHousekeeping = 'checkout' | 'recouche' | 'grand_menage' | 'controle';
export type StatutTacheHousekeeping = 'a_faire' | 'en_cours' | 'controle' | 'terminee' | 'annulee';
export type StatutChecklistItem = 'pending' | 'ok' | 'ko';

export interface HousekeepingTache {
  id: number;
  uuid: string;
  hotelId: number;
  chambreId: number;
  chambreNumero: string;
  chambreEtage: number;
  reservationId: number | null;
  typeTache: TypeTacheHousekeeping;
  statut: StatutTacheHousekeeping;
  assigneeId: number | null;
  assigneeNom: string | null;
  datePrevue: string;
  dateDebut: string | null;
  dateFin: string | null;
  notes: string | null;
  checklistProgress: { total: number; ok: number };
  createdAt: string;
}

export interface HousekeepingChecklistItem {
  id: number;
  tacheId: number;
  libelle: string;
  ordre: number;
  statut: StatutChecklistItem;
  commentaire: string | null;
}

export interface CreateHousekeepingTacheInput {
  hotelId: number;
  chambreId: number;
  typeTache?: TypeTacheHousekeeping;
  datePrevue?: string;
  assigneeId?: number;
  notes?: string;
  reservationId?: number;
}

export interface UpdateHousekeepingTacheInput {
  statut?: StatutTacheHousekeeping;
  assigneeId?: number | null;
  datePrevue?: string;
  notes?: string | null;
}

export interface UpdateChecklistItemInput {
  statut?: StatutChecklistItem;
  commentaire?: string | null;
}

export interface HousekeepingStats {
  aFaire: number;
  enCours: number;
  controle: number;
  termineesJour: number;
  chambresMenage: number;
}
