export type RegimeAppelOffres = 'consultation_restreinte' | 'appel_offres';
export type StatutAppelOffres = 'brouillon' | 'publie' | 'ouvert' | 'evaluation' | 'attribue' | 'annule';
export type StatutLot = 'ouvert' | 'attribue' | 'infructueux' | 'annule';
export type StatutFournisseurInvite = 'invite' | 'a_repondu' | 'decline';
export type TypeDocumentAo = 'cahier_charges' | 'reglement_consultation' | 'autre';
export type RoleCommission = 'president' | 'membre' | 'rapporteur';
export type TypePv = 'ouverture' | 'attribution';
export type TypeCritere = 'prix' | 'technique' | 'delai' | 'autre';

export interface AppelOffres {
  id: number;
  uuid: string;
  numero: string;
  hotelId: number;
  hotelName: string;
  objet: string;
  regime: RegimeAppelOffres;
  statut: StatutAppelOffres;
  dateLancement: string | null;
  dateLimiteDepot: string | null;
  dateOuverture: string | null;
  demandeIds: number[];
  lotsCount: number;
  fournisseursCount: number;
  offresCount: number;
  createdAt: string;
}

export interface CreateAppelOffresInput {
  hotelId: number;
  objet: string;
  regime: RegimeAppelOffres;
  demandeIds: number[];
  dateLimiteDepot?: string;
}

export interface LotAppelOffres {
  id: number;
  appelOffresId: number;
  numeroLot: string;
  designation: string;
  montantEstime: number;
  statut: StatutLot;
  attributionOffreId: number | null;
  bonCommandeId: number | null;
}

export interface CreateLotInput {
  appelOffresId: number;
  numeroLot: string;
  designation: string;
  montantEstime?: number;
}

export interface DocumentAppelOffres {
  id: number;
  appelOffresId: number;
  lotId: number | null;
  typeDocument: TypeDocumentAo;
  titre: string;
  nomFichier: string;
  taille: number | null;
  createdAt: string;
}

export interface UploadDocumentAoInput {
  appelOffresId: number;
  lotId?: number;
  typeDocument: TypeDocumentAo;
  titre: string;
}

export interface FournisseurInviteAo {
  id: number;
  appelOffresId: number;
  fournisseurId: number;
  fournisseurNom: string;
  statut: StatutFournisseurInvite;
  invitedAt: string;
  reponseAt: string | null;
}

export interface OffreAo {
  id: number;
  appelOffresId: number;
  lotId: number;
  fournisseurId: number;
  fournisseurNom: string;
  reference: string | null;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  delaiLivraisonJours: number;
  conditionsPaiement: string | null;
  conformeAdministrativement: boolean;
  retenue: boolean;
  score: number | null;
}

export interface CreateOffreAoInput {
  appelOffresId: number;
  lotId: number;
  fournisseurId: number;
  reference?: string;
  montantHt: number;
  montantTva?: number;
  delaiLivraisonJours?: number;
  conditionsPaiement?: string;
}

export interface MembreCommission {
  id: number;
  appelOffresId: number;
  nom: string;
  fonction: string | null;
  role: RoleCommission;
}

export interface CritereEvaluation {
  id: number;
  appelOffresId: number;
  libelle: string;
  typeCritere: TypeCritere;
  ponderationPct: number;
}

export interface CreateCritereInput {
  appelOffresId: number;
  libelle: string;
  typeCritere: TypeCritere;
  ponderationPct: number;
}

export interface NoteEvaluation {
  offreId: number;
  critereId: number;
  note: number;
  commentaire: string | null;
}

export interface ProcesVerbalAo {
  id: number;
  appelOffresId: number;
  lotId: number | null;
  typePv: TypePv;
  dateSeance: string;
  contenu: Record<string, unknown>;
  createdAt: string;
}

export interface OuvrirPlisInput {
  appelOffresId: number;
  dateSeance: string;
  membres: { nom: string; fonction?: string; role: RoleCommission }[];
}

export interface AttribuerLotInput {
  lotId: number;
  offreId: number;
}
