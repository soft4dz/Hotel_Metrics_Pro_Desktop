/** Types connecteur SIFEC — facturation électronique DGI (Algérie) */

export type SifecMode = 'sandbox' | 'production';
export type SifecStatut = 'prepare' | 'soumis' | 'accepte' | 'rejete' | 'erreur';

export interface SifecConfig {
  mode: SifecMode;
  apiBaseUrl: string | null;
  apiKeyRef: string | null;
  nifDeclarant: string | null;
  actif: boolean;
  dernierTestAt: string | null;
  dernierTestOk: boolean | null;
}

export interface SifecDashboard {
  enAttente: number;
  soumis: number;
  acceptes: number;
  rejetes: number;
  erreurs: number;
  connectorActif: boolean;
  mode: SifecMode;
}

export interface SifecFactureItem {
  factureId: number;
  numero: string;
  dateEmission: string;
  montantTtc: number;
  clientNom: string;
  sifecStatut: string;
  documentHash: string | null;
  qrPayload: string | null;
  sifecUid: string | null;
  derniereErreur: string | null;
}

export interface SifecTransmission {
  id: number;
  factureId: number;
  numeroFacture: string;
  statut: SifecStatut;
  uidSifec: string | null;
  messageErreur: string | null;
  transmittedAt: string | null;
  createdAt: string;
}

export interface UpdateSifecConfigInput {
  mode?: SifecMode;
  apiBaseUrl?: string | null;
  apiKeyRef?: string | null;
  nifDeclarant?: string | null;
  actif?: boolean;
}
