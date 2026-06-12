export type TypeClient = 'particulier' | 'entreprise';
export type RegimeImposition = 'reel' | 'forfait_unique' | 'ifu' | 'auto_entrepreneur';
export type TypeContact = 'gerant' | 'dg' | 'daf' | 'commercial' | 'comptable' | 'autre';

export interface ClientStats {
  clientId: number;
  nbFactures: number;
  totalFactureHt: number;
  totalFactureTtc: number;
  montantPaye: number;
  montantRestant: number;
  derniereFactureDate: string | null;
}

export interface ClientContact {
  id: number;
  clientId: number;
  type: TypeContact;
  nom: string;
  titre: string | null;
  telephone: string | null;
  email: string | null;
  principal: boolean;
  notes: string | null;
  createdAt: string;
}

export interface CreateContactInput {
  type: TypeContact;
  nom: string;
  titre?: string | null;
  telephone?: string | null;
  email?: string | null;
  principal?: boolean;
  notes?: string | null;
}

export interface ClientComplet {
  id: number;
  // Identification
  type: TypeClient;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  formeJuridique: string | null;
  // Contact principal
  email: string | null;
  telephone: string | null;
  mobile: string | null;
  fax: string | null;
  siteWeb: string | null;
  // Adresse
  adresse: string | null;
  adresseLigne1: string | null;
  adresseLigne2: string | null;
  ville: string | null;
  wilaya: string | null;
  codePostal: string | null;
  pays: string;
  // Fiscal & Légal
  nif: string | null;
  dateExpirationNif: string | null;
  rc: string | null;
  dateExpirationNrc: string | null;
  nis: string | null;
  ai: string | null;
  dateCreationEntreprise: string | null;
  numeroAgrement: string | null;
  assujettITva: boolean;
  numeroTva: string | null;
  regimeImposition: RegimeImposition | null;
  // Bancaire
  banqueClient: string | null;
  agenceBancaire: string | null;
  rib: string | null;
  // Interne
  notesInternes: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientItem extends ClientComplet {
  stats: ClientStats;
}

export interface ClientItemDetail extends ClientItem {
  contacts: ClientContact[];
}

export interface ClientFilters {
  search?: string;
  type?: TypeClient;
  actif?: boolean;
}

export interface CreateClientInput {
  type: TypeClient;
  civilite?: string | null;
  nom: string;
  prenom?: string | null;
  raisonSociale?: string | null;
  formeJuridique?: string | null;
  email?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  siteWeb?: string | null;
  adresse?: string | null;
  adresseLigne1?: string | null;
  adresseLigne2?: string | null;
  ville?: string | null;
  wilaya?: string | null;
  codePostal?: string | null;
  pays?: string | null;
  nif?: string | null;
  dateExpirationNif?: string | null;
  rc?: string | null;
  dateExpirationNrc?: string | null;
  nis?: string | null;
  ai?: string | null;
  dateCreationEntreprise?: string | null;
  numeroAgrement?: string | null;
  assujettITva?: boolean;
  numeroTva?: string | null;
  regimeImposition?: RegimeImposition | null;
  banqueClient?: string | null;
  agenceBancaire?: string | null;
  rib?: string | null;
  notesInternes?: string | null;
  actif?: boolean;
}

export interface ClientsDashboard {
  totalClients: number;
  clientsActifs: number;
  clientsEntreprises: number;
  clientsParticuliers: number;
  totalFactureHt: number;
  totalFactureTtc: number;
  montantRestant: number;
}

export const TYPE_CLIENT_LABELS: Record<TypeClient, string> = {
  particulier: 'Particulier',
  entreprise: 'Entreprise',
};

export const REGIME_IMPOSITION_LABELS: Record<RegimeImposition, string> = {
  reel: 'Régime réel',
  forfait_unique: 'Forfait unique',
  ifu: 'IFU (Impôt Forfaitaire Unique)',
  auto_entrepreneur: 'Auto-entrepreneur',
};

export const TYPE_CONTACT_LABELS: Record<TypeContact, string> = {
  gerant: 'Gérant(e)',
  dg: 'Directeur(trice) Général(e)',
  daf: 'Dir. Administratif & Financier',
  commercial: 'Responsable commercial',
  comptable: 'Responsable comptable',
  autre: 'Autre',
};

export const FORMES_JURIDIQUES = [
  'SARL', 'SPA', 'EURL', 'SNC', 'EPIC', 'EPA', 'EI', 'SCP', 'SCS', 'autre',
] as const;

export const WILAYAS_ALGERIE = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj',
  'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela',
  'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal',
  'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet',
  'El M\'Ghair', 'El Meniaa',
] as const;
