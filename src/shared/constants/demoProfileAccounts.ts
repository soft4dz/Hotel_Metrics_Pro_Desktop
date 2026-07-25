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
