/** Codes permission — chaînes brutes pour éviter import circulaire avec permissions.ts */
const P = {
  AUDIT_READ: 'audit.read',
  RECETTES_SAISIE: 'recettes.saisie',
  RECETTES_VALIDATE: 'recettes.validate',
  PORTMASTER_FULL: 'portmaster.full',
  REPORTS_EXPORT: 'reports.export',
  RH_MANAGE: 'rh.manage',
  RH_TEAM: 'rh.team',
  RH_SELF: 'rh.self',
} as const;

/** Permissions par rôle — aligné backend (role_permissions) et frontend. */
export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  AUDIT_INTERNE: [P.AUDIT_READ, P.REPORTS_EXPORT],
  PDG: [P.AUDIT_READ, P.REPORTS_EXPORT],
  DIRECTEUR_UNITE: [P.RECETTES_VALIDATE, P.REPORTS_EXPORT],
  CONTROLEUR_UNITE: [P.RECETTES_SAISIE],
  RESPONSABLE_PORT: [P.PORTMASTER_FULL],
  COMPTABILITE: [P.REPORTS_EXPORT],
  LECTURE_SEULE: [],
  RH_MANAGER: [P.RH_MANAGE, P.RH_TEAM, P.RH_SELF],
  CHEF_DEPARTEMENT: [P.RH_TEAM, P.RH_SELF],
  RECEPTIONNISTE: [P.RH_SELF],
};

export function permissionsForRole(roleCode: string): string[] {
  return ROLE_PERMISSIONS_MAP[roleCode] ?? [];
}
