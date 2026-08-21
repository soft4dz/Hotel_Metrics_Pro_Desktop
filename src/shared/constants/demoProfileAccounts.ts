/** Comptes démo — un utilisateur par profil métier (mot de passe commun documenté). */
export const DEMO_PROFILE_PASSWORD = 'Demo@2026!';

export interface DemoProfileAccount {
  email: string;
  fullName: string;
  roleCode: string;
  /** Affecter le premier hôtel opérationnel si disponible */
  assignHotel?: boolean;
}

export const DEMO_PROFILE_ACCOUNTS: DemoProfileAccount[] = [
  { email: 'pdg@demo.hotelmetrics.local', fullName: 'Amine Benali (PDG)', roleCode: 'PDG' },
  { email: 'dga@demo.hotelmetrics.local', fullName: 'Samir Benali (DGA)', roleCode: 'DGA' },
  { email: 'direction-unites@demo.hotelmetrics.local', fullName: 'Nora Directrice des unités touristiques', roleCode: 'DIRECTEUR_UNITES_TOURISTIQUES' },
  { email: 'qualite@demo.hotelmetrics.local', fullName: 'Sofia Directrice Qualité', roleCode: 'DIRECTEUR_QUALITE' },
  { email: 'commercial@demo.hotelmetrics.local', fullName: 'Rachid Directeur Commercial', roleCode: 'DIRECTEUR_COMMERCIAL' },
  { email: 'maintenance@demo.hotelmetrics.local', fullName: 'Mourad Directeur Maintenance', roleCode: 'DIRECTEUR_MAINTENANCE' },
  { email: 'dsi@demo.hotelmetrics.local', fullName: 'Lyes Directeur SI', roleCode: 'DIRECTEUR_SI' },
  { email: 'securite@demo.hotelmetrics.local', fullName: 'Hakim Responsable Sécurité', roleCode: 'RESPONSABLE_SECURITE' },
  { email: 'juridique@demo.hotelmetrics.local', fullName: 'Amel Responsable Juridique', roleCode: 'RESPONSABLE_JURIDIQUE' },
  { email: 'achats@demo.hotelmetrics.local', fullName: 'Farid Responsable Achats', roleCode: 'RESPONSABLE_ACHATS' },
  { email: 'controle-gestion@demo.hotelmetrics.local', fullName: 'Inès Contrôle de Gestion', roleCode: 'CONTROLEUR_GESTION' },
  {
    email: 'directeur@demo.hotelmetrics.local',
    fullName: 'Salima Directeur (unité)',
    roleCode: 'DIRECTEUR_UNITE',
    assignHotel: true,
  },
  {
    email: 'controleur@demo.hotelmetrics.local',
    fullName: 'Karim Contrôleur (unité)',
    roleCode: 'CONTROLEUR_UNITE',
    assignHotel: true,
  },
  { email: 'port@hotelmetrics.local', fullName: 'Responsable port (démo)', roleCode: 'RESPONSABLE_PORT' },
  {
    email: 'compta@demo.hotelmetrics.local',
    fullName: 'Nadia Comptabilité',
    roleCode: 'COMPTABILITE',
    assignHotel: true,
  },
  { email: 'audit@demo.hotelmetrics.local', fullName: 'Omar Audit interne', roleCode: 'AUDIT_INTERNE' },
  { email: 'lecture@demo.hotelmetrics.local', fullName: 'Invité lecture seule', roleCode: 'LECTURE_SEULE' },
  { email: 'rh@demo.hotelmetrics.local', fullName: 'Fatima RH Manager', roleCode: 'RH_MANAGER' },
  { email: 'chef@demo.hotelmetrics.local', fullName: 'Youssef Chef département', roleCode: 'CHEF_DEPARTEMENT' },
  {
    email: 'reception@demo.hotelmetrics.local',
    fullName: 'Lina Réceptionniste',
    roleCode: 'RECEPTIONNISTE',
    assignHotel: true,
  },
];
