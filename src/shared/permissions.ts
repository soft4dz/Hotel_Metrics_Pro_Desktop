/** Permissions par rôle — aligné sur le seed Phase 2/3 */

/** Rôles avec accès total (toute permission actuelle ou future). */
export function isAdminRole(roleCode?: string): boolean {
  return roleCode === 'SUPERADMIN' || roleCode === 'ADMIN_DEC';
}

/** @deprecated Utiliser isAdminRole */
export function isSuperAdmin(roleCode?: string): boolean {
  return roleCode === 'SUPERADMIN';
}

export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  HOTELS_MANAGE: 'hotels.manage',
  AUDIT_READ: 'audit.read',
  RECETTES_SAISIE: 'recettes.saisie',
  RECETTES_VALIDATE: 'recettes.validate',
  PORTMASTER_FULL: 'portmaster.full',
  SYNC_FULL: 'sync.full',
  REPORTS_EXPORT: 'reports.export',
} as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  AUDIT_INTERNE: [PERMISSIONS.AUDIT_READ, PERMISSIONS.REPORTS_EXPORT],
  PDG: [PERMISSIONS.AUDIT_READ, PERMISSIONS.REPORTS_EXPORT],
  DIRECTEUR_UNITE: [PERMISSIONS.RECETTES_VALIDATE, PERMISSIONS.REPORTS_EXPORT],
  CONTROLEUR_UNITE: [PERMISSIONS.RECETTES_SAISIE],
  RESPONSABLE_PORT: [PERMISSIONS.PORTMASTER_FULL],
  COMPTABILITE: [PERMISSIONS.REPORTS_EXPORT],
  LECTURE_SEULE: [],
};

export function hasPermission(roleCode: string | undefined, permission: string): boolean {
  if (!roleCode) return false;
  if (isAdminRole(roleCode)) return true;
  const perms = ROLE_PERMISSIONS[roleCode] ?? [];
  return perms.includes(permission);
}

export function canManageUsers(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.USERS_MANAGE);
}

/** Admin décisionnel ou Super Admin — gestion des permissions par rôle. */
export function canManageRolePermissions(roleCode?: string): boolean {
  return isAdminRole(roleCode);
}

export function canManageHotels(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.HOTELS_MANAGE);
}

export function canReadAudit(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.AUDIT_READ);
}

export function canSaisieRecettes(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.RECETTES_SAISIE);
}

export function canValidateRecettes(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.RECETTES_VALIDATE);
}

export function canViewRecettes(roleCode?: string): boolean {
  return (
    isAdminRole(roleCode) ||
    canSaisieRecettes(roleCode) ||
    canValidateRecettes(roleCode) ||
    roleCode === 'PDG'
  );
}

export function canViewObjectifs(roleCode?: string): boolean {
  return canViewRecettes(roleCode);
}

export function canManageObjectifs(roleCode?: string): boolean {
  return isAdminRole(roleCode) || canSaisieRecettes(roleCode) || canValidateRecettes(roleCode);
}

export function canViewDashboard(roleCode?: string): boolean {
  return (
    isAdminRole(roleCode) ||
    canViewRecettes(roleCode) ||
    roleCode === 'COMPTABILITE' ||
    roleCode === 'AUDIT_INTERNE'
  );
}

export function canAccessPortmaster(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.PORTMASTER_FULL);
}

export function canManageSync(roleCode?: string): boolean {
  return hasPermission(roleCode, PERMISSIONS.SYNC_FULL);
}

export function canExportReports(roleCode?: string): boolean {
  return (
    isAdminRole(roleCode) ||
    hasPermission(roleCode, PERMISSIONS.REPORTS_EXPORT) ||
    canAccessPortmaster(roleCode) ||
    roleCode === 'PDG' ||
    roleCode === 'AUDIT_INTERNE'
  );
}
