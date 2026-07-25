/** Registre des profils utilisateur (rôles ERP) — source unique pour guides, admin et permissions. */

export type UserRoleCategory = 'admin' | 'direction' | 'exploitation' | 'finance' | 'metier' | 'controle' | 'rh';

export interface UserRoleProfile {
  code: string;
  label: string;
  description: string;
  guideSlug: string;
  category: UserRoleCategory;
}

export const USER_ROLE_PROFILES: UserRoleProfile[] = [
  {
    code: 'SUPERADMIN',
    label: 'Super administrateur',
    description: 'Accès total — paramétrage, sécurité, sauvegarde',
    guideSlug: 'super-admin',
    category: 'admin',
  },
  {
    code: 'ADMIN_DEC',
    label: 'Administrateur décisionnel',
    description: 'Accès total — pilotage et configuration',
    guideSlug: 'super-admin',
    category: 'admin',
  },
  {
    code: 'PDG',
    label: 'PDG',
    description: 'Consultation consolidée et pilotage stratégique',
    guideSlug: 'pdg',
    category: 'direction',
  },
  {
    code: 'DIRECTEUR_UNITE',
    label: 'Directeur d\'unité',
    description: 'Pilotage de son hôtel — recettes, exploitation, validation',
    guideSlug: 'directeur-unite',
    category: 'direction',
  },
  {
    code: 'CONTROLEUR_UNITE',
    label: 'Contrôleur unité',
    description: 'Saisie recettes et contrôle opérationnel',
    guideSlug: 'controleur-exploitation',
    category: 'exploitation',
  },
  {
    code: 'RESPONSABLE_PORT',
    label: 'Responsable port',
    description: 'Module PortMaster — bateaux, contrats, facturation portuaire',
    guideSlug: 'responsable-portmaster',
    category: 'metier',
  },
  {
    code: 'COMPTABILITE',
    label: 'Comptabilité',
    description: 'Encaissements, facturation, trésorerie, clôtures',
    guideSlug: 'comptabilite-tresorerie',
    category: 'finance',
  },
  {
    code: 'AUDIT_INTERNE',
    label: 'Audit interne',
    description: 'Consultation, journaux et traçabilité',
    guideSlug: 'audit-interne',
    category: 'controle',
  },
  {
    code: 'LECTURE_SEULE',
    label: 'Lecture seule',
    description: 'Consultation sans modification',
    guideSlug: 'lecture-seule',
    category: 'controle',
  },
  {
    code: 'RH_MANAGER',
    label: 'Responsable RH',
    description: 'Paie, contrats, absences, formations',
    guideSlug: 'rh-manager',
    category: 'rh',
  },
  {
    code: 'CHEF_DEPARTEMENT',
    label: 'Chef de département',
    description: 'Suivi opérationnel et validations N+1',
    guideSlug: 'chef-departement',
    category: 'rh',
  },
  {
    code: 'RECEPTIONNISTE',
    label: 'Réceptionniste',
    description: 'Hébergement, réservations, check-in / check-out',
    guideSlug: 'receptionniste',
    category: 'exploitation',
  },
];

const BY_CODE = new Map(USER_ROLE_PROFILES.map((p) => [p.code, p]));

export function getUserRoleProfile(roleCode?: string | null): UserRoleProfile | undefined {
  if (!roleCode) return undefined;
  return BY_CODE.get(roleCode);
}

export function getGuideSlugForRole(roleCode?: string | null): string {
  return getUserRoleProfile(roleCode)?.guideSlug ?? 'manuel-general';
}

export function listUserRoleProfiles(): UserRoleProfile[] {
  return [...USER_ROLE_PROFILES];
}
