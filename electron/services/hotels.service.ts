import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext, actorCanAccessHotel, actorHasAllHotels } from './actorContext';
import {
  deleteHotelLogoFile,
  ensureLogoDirectories,
  migrateLegacyLogosFromDatabase,
  pickHotelLogoFile,
  resolveHotelLogoUrl,
  saveHotelLogoFromFile,
} from './logo.service';

export interface HotelListItem {
  id: number;
  uuid: string;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  logoFile: string | null;
  logoUrl: string | null;
  rubriqueIds: number[];
}

export interface CreateHotelInput {
  code: string;
  name: string;
  city?: string | null;
  isActive?: boolean;
}

export interface UpdateHotelInput {
  code?: string;
  name?: string;
  city?: string | null;
  isActive?: boolean;
  rubriqueIds?: number[];
}

function mapRow(row: Record<string, unknown>): HotelListItem {
  const logoFile = (row.logo_file as string | null) ?? null;
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    code: row.code as string,
    name: row.name as string,
    city: (row.city as string | null) ?? null,
    isActive: Boolean(row.is_active),
    userCount: Number(row.user_count ?? 0),
    createdAt: row.created_at as string,
    logoFile,
    logoUrl: resolveHotelLogoUrl(logoFile),
    rubriqueIds: [],
  };
}

function loadRubriqueIds(db: ReturnType<typeof import('../database/sqlite').getDatabase>, hotelId: number): number[] {
  return (
    db
      .prepare(`SELECT rubrique_id FROM hotel_rubriques WHERE hotel_id = ? ORDER BY sort_order`)
      .all(hotelId) as Array<{ rubrique_id: number }>
  ).map((r) => r.rubrique_id);
}

const listSql = `
  SELECT
    h.id, h.uuid, h.code, h.name, h.city, h.is_active, h.created_at, h.logo_file,
    (SELECT COUNT(*) FROM users u WHERE u.hotel_id = h.id AND u.deleted_at IS NULL) AS user_count
  FROM hotels h
  WHERE h.deleted_at IS NULL
`;

function ensureHotelsLogosReady(): void {
  ensureLogoDirectories();
  migrateLegacyLogosFromDatabase();
}

export function listHotels(actorUserId: number): HotelListItem[] {
  ensureHotelsLogosReady();
  const actor = getActorContext(actorUserId);
  const canList =
    userHasPermission(actorUserId, 'hotels.manage') ||
    userHasPermission(actorUserId, 'recettes.saisie') ||
    userHasPermission(actorUserId, 'recettes.validate') ||
    actor.roleCode === 'PDG' ||
    actor.roleCode === 'ADMIN_DEC' ||
    actor.roleCode === 'SUPERADMIN';
  if (!canList) {
    assertPermission(actorUserId, 'hotels.manage');
  }

  const db = getDatabase();
  const hotels = db
    .prepare(`${listSql} ORDER BY h.name`)
    .all()
    .map((r) => mapRow(r as Record<string, unknown>));

  const all = db
    .prepare(`SELECT hotel_id, rubrique_id FROM hotel_rubriques ORDER BY sort_order`)
    .all() as Array<{ hotel_id: number; rubrique_id: number }>;
  const byHotel = new Map<number, number[]>();
  for (const a of all) {
    if (!byHotel.has(a.hotel_id)) byHotel.set(a.hotel_id, []);
    byHotel.get(a.hotel_id)!.push(a.rubrique_id);
  }
  for (const h of hotels) h.rubriqueIds = byHotel.get(h.id) ?? [];

  if (actorHasAllHotels(actor)) {
    return hotels;
  }

  return hotels.filter((h) => actorCanAccessHotel(actor, h.id));
}

export function getHotel(actorUserId: number, id: number): HotelListItem | null {
  ensureHotelsLogosReady();
  assertPermission(actorUserId, 'hotels.manage');

  const db = getDatabase();
  const row = db.prepare(`${listSql} AND h.id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  const hotel = mapRow(row);
  hotel.rubriqueIds = loadRubriqueIds(db, id);
  return hotel;
}

export function createHotel(actorUserId: number, input: CreateHotelInput): HotelListItem {
  assertPermission(actorUserId, 'hotels.manage');

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();

  if (!code || !name) throw new Error('Code et nom requis.');

  const db = getDatabase();
  const exists = db
    .prepare(`SELECT 1 FROM hotels WHERE code = ? AND deleted_at IS NULL`)
    .get(code);
  if (exists) throw new Error('Ce code hôtel existe déjà.');

  const result = db
    .prepare(
      `
    INSERT INTO hotels (uuid, code, name, city, is_active, created_by, updated_by, sync_status)
    VALUES (@uuid, @code, @name, @city, @is_active, @created_by, @updated_by, 'pending_create')
  `,
    )
    .run({
      uuid: randomUUID(),
      code,
      name,
      city: input.city?.trim() || null,
      is_active: input.isActive === false ? 0 : 1,
      created_by: actorUserId,
      updated_by: actorUserId,
    });

  const hotel = getHotel(actorUserId, Number(result.lastInsertRowid))!;

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'administration',
    page: 'HotelFormPage',
    description: `Création hôtel ${hotel.code} — ${hotel.name}`,
    newValue: JSON.stringify(hotel),
  });

  return hotel;
}

export function updateHotel(
  actorUserId: number,
  id: number,
  input: UpdateHotelInput,
): HotelListItem {
  assertPermission(actorUserId, 'hotels.manage');

  const existing = getHotel(actorUserId, id);
  if (!existing) throw new Error('Hôtel introuvable.');

  const db = getDatabase();
  const updates: string[] = [];
  const params: Record<string, unknown> = { id, updated_by: actorUserId };

  if (input.code !== undefined) {
    const code = input.code.trim().toUpperCase();
    const dup = db
      .prepare(`SELECT 1 FROM hotels WHERE code = ? AND id != ? AND deleted_at IS NULL`)
      .get(code, id);
    if (dup) throw new Error('Ce code hôtel existe déjà.');
    updates.push('code = @code');
    params.code = code;
  }
  if (input.name !== undefined) {
    updates.push('name = @name');
    params.name = input.name.trim();
  }
  if (input.city !== undefined) {
    updates.push('city = @city');
    params.city = input.city?.trim() || null;
  }
  if (input.isActive !== undefined) {
    updates.push('is_active = @is_active');
    params.is_active = input.isActive ? 1 : 0;
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')", "sync_status = 'pending_update'");
    db.prepare(`UPDATE hotels SET ${updates.join(', ')} WHERE id = @id`).run(params);
  }

  if (input.rubriqueIds !== undefined) {
    db.prepare(`DELETE FROM hotel_rubriques WHERE hotel_id = ?`).run(id);
    if (input.rubriqueIds.length > 0) {
      const ins = db.prepare(
        `INSERT OR IGNORE INTO hotel_rubriques (hotel_id, rubrique_id, sort_order) VALUES (?, ?, ?)`,
      );
      input.rubriqueIds.forEach((rId, idx) => ins.run(id, rId, idx));
    }
  }

  if (updates.length === 0 && input.rubriqueIds === undefined) return existing;

  const hotel = getHotel(actorUserId, id)!;

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'HotelFormPage',
    description: `Modification hôtel ${hotel.code}`,
    oldValue: JSON.stringify(existing),
    newValue: JSON.stringify(hotel),
  });

  return hotel;
}

export async function setHotelLogoFromPicker(
  actorUserId: number,
  hotelId: number,
): Promise<HotelListItem> {
  assertPermission(actorUserId, 'hotels.manage');
  const hotel = getHotel(actorUserId, hotelId);
  if (!hotel) throw new Error('Hôtel introuvable.');

  const picked = await pickHotelLogoFile();
  if (!picked) return hotel;

  const logoFile = saveHotelLogoFromFile(hotel.uuid, picked);
  getDatabase()
    .prepare(
      `UPDATE hotels SET logo_file = ?, logo_data = NULL, updated_at = datetime('now'), updated_by = ?, sync_status = 'pending_update' WHERE id = ?`,
    )
    .run(logoFile, actorUserId, hotelId);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'administration',
    page: 'HotelFormPage',
    description: `Logo mis à jour pour ${hotel.code}`,
    newValue: JSON.stringify({ logoFile }),
  });

  return getHotel(actorUserId, hotelId)!;
}

export function removeHotelLogo(actorUserId: number, hotelId: number): HotelListItem {
  assertPermission(actorUserId, 'hotels.manage');
  const hotel = getHotel(actorUserId, hotelId);
  if (!hotel) throw new Error('Hôtel introuvable.');

  deleteHotelLogoFile(hotel.logoFile);
  getDatabase()
    .prepare(
      `UPDATE hotels SET logo_file = NULL, logo_data = NULL, updated_at = datetime('now'), updated_by = ?, sync_status = 'pending_update' WHERE id = ?`,
    )
    .run(actorUserId, hotelId);

  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'administration',
    page: 'HotelFormPage',
    description: `Logo supprimé pour ${hotel.code}`,
  });

  return getHotel(actorUserId, hotelId)!;
}

export function deactivateHotel(actorUserId: number, id: number, reason: string): void {
  assertPermission(actorUserId, 'hotels.manage');

  const existing = getHotel(actorUserId, id);
  if (!existing) throw new Error('Hôtel introuvable.');

  if (existing.code === 'SIEGE') {
    throw new Error('Le siège ne peut pas être supprimé.');
  }

  const db = getDatabase();
  const linked = db
    .prepare(
      `SELECT COUNT(*) AS c FROM users WHERE hotel_id = ? AND deleted_at IS NULL`,
    )
    .get(id) as { c: number };

  if (linked.c > 0) {
    throw new Error('Des utilisateurs sont rattachés à cet hôtel.');
  }

  deleteHotelLogoFile(existing.logoFile);

  db.prepare(
    `
    UPDATE hotels
    SET deleted_at = datetime('now'), is_active = 0, updated_by = ?, sync_status = 'pending_delete'
    WHERE id = ?
  `,
  ).run(actorUserId, id);

  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'administration',
    page: 'HotelsPage',
    description: `Désactivation hôtel ${existing.code} — ${reason}`,
    oldValue: JSON.stringify(existing),
  });
}
