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
  { email: 'pdg@demo.raqmi.local', fullName: 'Amine Benali (PDG)', roleCode: 'PDG' },
  { email: 'dga@demo.raqmi.local', fullName: 'Samir Benali (DGA)', roleCode: 'DGA' },
  { email: 'direction-unites@demo.raqmi.local', fullName: 'Nora Directrice des unités touristiques', roleCode: 'DIRECTEUR_UNITES_TOURISTIQUES' },
  { email: 'qualite@demo.raqmi.local', fullName: 'Sofia Directrice Qualité', roleCode: 'DIRECTEUR_QUALITE' },
  { email: 'commercial@demo.raqmi.local', fullName: 'Rachid Directeur Commercial', roleCode: 'DIRECTEUR_COMMERCIAL' },
  { email: 'maintenance@demo.raqmi.local', fullName: 'Mourad Directeur Maintenance', roleCode: 'DIRECTEUR_MAINTENANCE' },
  { email: 'dsi@demo.raqmi.local', fullName: 'Lyes Directeur SI', roleCode: 'DIRECTEUR_SI' },
  { email: 'securite@demo.raqmi.local', fullName: 'Hakim Responsable Sécurité', roleCode: 'RESPONSABLE_SECURITE' },
  { email: 'juridique@demo.raqmi.local', fullName: 'Amel Responsable Juridique', roleCode: 'RESPONSABLE_JURIDIQUE' },
  { email: 'achats@demo.raqmi.local', fullName: 'Farid Responsable Achats', roleCode: 'RESPONSABLE_ACHATS' },
  { email: 'controle-gestion@demo.raqmi.local', fullName: 'Inès Contrôle de Gestion', roleCode: 'CONTROLEUR_GESTION' },
  {
    email: 'directeur@demo.raqmi.local',
    fullName: 'Salima Directeur (unité)',
    roleCode: 'DIRECTEUR_UNITE',
    assignHotel: true,
  },
  {
    email: 'controleur@demo.raqmi.local',
    fullName: 'Karim Contrôleur (unité)',
    roleCode: 'CONTROLEUR_UNITE',
    assignHotel: true,
  },
  { email: 'port@raqmi.local', fullName: 'Responsable port (démo)', roleCode: 'RESPONSABLE_PORT' },
  {
    email: 'compta@demo.raqmi.local',
    fullName: 'Nadia Comptabilité',
    roleCode: 'COMPTABILITE',
    assignHotel: true,
  },
  { email: 'audit@demo.raqmi.local', fullName: 'Omar Audit interne', roleCode: 'AUDIT_INTERNE' },
  { email: 'lecture@demo.raqmi.local', fullName: 'Invité lecture seule', roleCode: 'LECTURE_SEULE' },
  { email: 'rh@demo.raqmi.local', fullName: 'Fatima RH Manager', roleCode: 'RH_MANAGER' },
  { email: 'chef@demo.raqmi.local', fullName: 'Youssef Chef département', roleCode: 'CHEF_DEPARTEMENT' },
  {
    email: 'reception@demo.raqmi.local',
    fullName: 'Lina Réceptionniste',
    roleCode: 'RECEPTIONNISTE',
    assignHotel: true,
  },
];
