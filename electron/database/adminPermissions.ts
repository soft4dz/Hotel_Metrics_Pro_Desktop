import { getDatabase } from './sqlite';
import { logger } from '../utils/logger';

/** Rôles avec accès total — toute nouvelle permission leur est attribuée automatiquement. */
export const FULL_ACCESS_ROLE_CODES = ['SUPERADMIN', 'ADMIN_DEC'] as const;

export function isFullAccessRole(roleCode: string | null | undefined): boolean {
  return roleCode != null && (FULL_ACCESS_ROLE_CODES as readonly string[]).includes(roleCode);
}

/**
 * Attribue toutes les permissions existantes aux rôles administrateur.
 * Appelé à chaque démarrage : les permissions ajoutées par migration sont prises en compte.
 */
export function ensureAdminRolesHaveAllPermissions(): void {
  const db = getDatabase();
  const placeholders = FULL_ACCESS_ROLE_CODES.map(() => '?').join(', ');
  const result = db
    .prepare(
      `
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code IN (${placeholders})
      AND r.deleted_at IS NULL
      AND p.deleted_at IS NULL
  `,
    )
    .run(...FULL_ACCESS_ROLE_CODES);

  if (result.changes > 0) {
    logger.info(
      `[permissions] ${result.changes} liaison(s) admin ajoutée(s) pour les nouvelles permissions.`,
    );
  }
}
