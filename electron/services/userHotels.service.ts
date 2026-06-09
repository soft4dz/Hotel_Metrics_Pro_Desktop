import { getDatabase } from '../database/sqlite';

export type HotelScope = 'assigned' | 'all';

function isGlobalAdminRole(roleCode: string): boolean {
  return roleCode === 'ADMIN_DEC' || roleCode === 'SUPERADMIN';
}

export function loadUserHotelIds(userId: number): number[] {
  const db = getDatabase();
  return (
    db
      .prepare(
        `
    SELECT uh.hotel_id AS hotelId
    FROM user_hotels uh
    INNER JOIN hotels h ON h.id = uh.hotel_id AND h.deleted_at IS NULL
    WHERE uh.user_id = ?
    ORDER BY h.name
  `,
      )
      .all(userId) as Array<{ hotelId: number }>
  ).map((r) => r.hotelId);
}

export function userHasAllHotelsAccess(userId: number, roleCode: string, hotelScope: string): boolean {
  if (isGlobalAdminRole(roleCode)) return true;
  if (['PDG', 'AUDIT_INTERNE', 'COMPTABILITE'].includes(roleCode)) return true;
  return hotelScope === 'all';
}

export function syncUserHotelAccess(
  userId: number,
  hotelIds: number[],
  allHotelsAccess: boolean,
): void {
  const db = getDatabase();
  const uniqueIds = [...new Set(hotelIds.filter((id) => Number.isFinite(id) && id > 0))];

  if (!allHotelsAccess && uniqueIds.length === 0) {
    throw new Error('Sélectionnez au moins une unité ou activez « Toutes les unités ».');
  }

  if (!allHotelsAccess && uniqueIds.length > 0) {
    const activeHotels = db
      .prepare(`SELECT id FROM hotels WHERE deleted_at IS NULL AND id IN (${uniqueIds.map(() => '?').join(',')})`)
      .all(...uniqueIds) as Array<{ id: number }>;

    if (activeHotels.length !== uniqueIds.length) {
      throw new Error('Une ou plusieurs unités sélectionnées sont invalides.');
    }
  }

  const run = db.transaction(() => {
    db.prepare(`DELETE FROM user_hotels WHERE user_id = ?`).run(userId);
    if (!allHotelsAccess) {
      const insert = db.prepare(`INSERT INTO user_hotels (user_id, hotel_id) VALUES (?, ?)`);
      for (const hid of uniqueIds) {
        insert.run(userId, hid);
      }
    }
    db.prepare(
      `
      UPDATE users
      SET hotel_scope = ?, hotel_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(allHotelsAccess ? 'all' : 'assigned', allHotelsAccess ? null : uniqueIds[0] ?? null, userId);
  });
  run();
}

export function formatUserHotelsLabel(hotelIds: number[], allHotelsAccess: boolean): string {
  if (allHotelsAccess) return 'Toutes les unités';
  if (hotelIds.length === 0) return '—';
  const db = getDatabase();
  const names = (
    db
      .prepare(
        `SELECT name FROM hotels WHERE id IN (${hotelIds.map(() => '?').join(',')}) ORDER BY name`,
      )
      .all(...hotelIds) as Array<{ name: string }>
  ).map((r) => r.name);
  return names.join(', ');
}
