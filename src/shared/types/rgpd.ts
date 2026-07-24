/** Types Loi 18-07 / ANPDP — protection des données personnelles (Algérie) */

export type RgpdBaseLegale = 'consentement' | 'contrat' | 'obligation_legale' | 'interet_legitime' | 'mission_publique';
export type RgpdSujetType = 'client' | 'employe' | 'heberge' | 'autre';
export type RgpdTypeDemande = 'acces' | 'rectification' | 'suppression' | 'opposition' | 'portabilite';
export type RgpdDemandeStatut = 'recue' | 'en_cours' | 'traitee' | 'refusee';
export type RgpdIncidentGravite = 'faible' | 'moderee' | 'grave' | 'critique';
export type RgpdIncidentStatut = 'ouvert' | 'en_cours' | 'clos';

export interface RgpdTraitement {
  id: number;
  code: string;
  libelle: string;
  finalite: string;
  baseLegale: RgpdBaseLegale;
  categoriesDonnees: string[];
  categoriesPersonnes: string[];
  destinataires: string | null;
  dureeConservation: string | null;
  mesuresSecurite: string | null;
  responsableTraitement: string | null;
  sousTraitants: string | null;
  transfertHorsAlgerie: boolean;
  actif: boolean;
}

export interface RgpdConsentement {
  id: number;
  traitementId: number | null;
  sujetType: RgpdSujetType;
  sujetId: number | null;
  sujetLabel: string;
  finalite: string;
  consentementDonne: boolean;
  preuvePath: string | null;
  dateConsentement: string;
  dateRetrait: string | null;
  statut: string;
}

export interface RgpdDemandeDroit {
  id: number;
  typeDemande: RgpdTypeDemande;
  sujetType: RgpdSujetType;
  sujetId: number | null;
  sujetLabel: string;
  canal: string | null;
  description: string | null;
  statut: RgpdDemandeStatut;
  dateReception: string;
  dateEcheance: string | null;
  dateTraitement: string | null;
  reponse: string | null;
}

export interface RgpdIncident {
  id: number;
  dateIncident: string;
  dateDetection: string;
  gravite: RgpdIncidentGravite;
  nature: string;
  donneesConcernees: string | null;
  personnesConcernees: number;
  mesuresCorrectives: string | null;
  notificationAnpdp: boolean;
  dateNotificationAnpdp: string | null;
  statut: RgpdIncidentStatut;
}

export interface RgpdPolitiqueConservation {
  id: number;
  code: string;
  typeDonnee: string;
  libelle: string;
  dureeMois: number;
  baseLegale: string | null;
  gedRetentionPolicyId: number | null;
  gedPolitiqueCode: string | null;
  justification: string | null;
}

export interface RgpdDashboard {
  traitementsActifs: number;
  consentementsActifs: number;
  demandesEnCours: number;
  demandesEnRetard: number;
  incidentsOuverts: number;
  incidentsCritiques: number;
}

export interface UpsertTraitementInput {
  id?: number;
  code: string;
  libelle: string;
  finalite: string;
  baseLegale: RgpdBaseLegale;
  categoriesDonnees?: string[];
  categoriesPersonnes?: string[];
  destinataires?: string;
  dureeConservation?: string;
  mesuresSecurite?: string;
  responsableTraitement?: string;
  sousTraitants?: string;
  transfertHorsAlgerie?: boolean;
}

export interface CreateConsentementInput {
  traitementId?: number;
  sujetType: RgpdSujetType;
  sujetId?: number;
  sujetLabel: string;
  finalite: string;
  dateConsentement: string;
  preuvePath?: string;
}

export interface CreateDemandeInput {
  typeDemande: RgpdTypeDemande;
  sujetType: RgpdSujetType;
  sujetId?: number;
  sujetLabel: string;
  canal?: string;
  description?: string;
  dateReception: string;
}

export interface CreateIncidentInput {
  dateIncident: string;
  dateDetection: string;
  gravite: RgpdIncidentGravite;
  nature: string;
  donneesConcernees?: string;
  personnesConcernees?: number;
  mesuresCorrectives?: string;
  notificationAnpdp?: boolean;
  dateNotificationAnpdp?: string;
}
