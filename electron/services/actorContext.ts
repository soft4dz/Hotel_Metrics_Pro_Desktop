import { getDatabase } from '../database/sqlite';
import { userHasPermission } from './permissions.service';
import {
  loadUserHotelIds,
  userHasAllHotelsAccess,
} from './userHotels.service';

export interface ActorContext {
  userId: number;
  email: string;
  roleCode: string;
  /** Unité par défaut (première assignée) — compatibilité */
  hotelId: number | null;
  hotelIds: number[];
  allHotelsAccess: boolean;
}

const GLOBAL_ROLES = ['ADMIN_DEC', 'SUPERADMIN'] as const;

/** Rôles avec accès global (tous hôtels, toutes permissions). */
export function isGlobalAdminRole(roleCode: string): boolean {
  return (GLOBAL_ROLES as readonly string[]).includes(roleCode);
}

function isGlobal(code: string): boolean {
  return isGlobalAdminRole(code);
}

export function actorHasAllHotels(actor: ActorContext): boolean {
  return actor.allHotelsAccess;
}

export function actorCanAccessHotel(actor: ActorContext, hotelId: number): boolean {
  if (actorHasAllHotels(actor)) return true;
  return actor.hotelIds.includes(hotelId);
}

export function getActorContext(userId: number): ActorContext {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT u.id, u.email, r.code AS role_code, u.hotel_id, u.hotel_scope
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL AND u.is_active = 1
  `,
    )
    .get(userId) as
    | {
        id: number;
        email: string;
        role_code: string;
        hotel_id: number | null;
        hotel_scope: string;
      }
    | undefined;

  if (!row) throw new Error('Utilisateur introuvable ou inactif.');

  const hotelIds = loadUserHotelIds(userId);
  const allHotelsAccess = userHasAllHotelsAccess(userId, row.role_code, row.hotel_scope);

  return {
    userId: row.id,
    email: row.email,
    roleCode: row.role_code,
    hotelId: row.hotel_id ?? hotelIds[0] ?? null,
    hotelIds,
    allHotelsAccess,
  };
}

export function resolveHotelId(actor: ActorContext, requestedHotelId: number): number {
  if (actorHasAllHotels(actor)) {
    if (!requestedHotelId) throw new Error('Hôtel requis.');
    return requestedHotelId;
  }

  if (actor.hotelIds.length === 0) {
    throw new Error('Aucune unité rattachée à votre compte.');
  }

  if (requestedHotelId) {
    if (!actorCanAccessHotel(actor, requestedHotelId)) {
      throw new Error('Accès refusé à cet hôtel.');
    }
    return requestedHotelId;
  }

  if (actor.hotelIds.length === 1) {
    return actor.hotelIds[0]!;
  }

  throw new Error('Sélectionnez une unité.');
}

/** Filtre SQL hotel_id pour listes (recettes, objectifs, etc.) */
export function applyActorHotelFilter(
  actor: ActorContext,
  conditions: string[],
  params: unknown[],
  options?: { column?: string; alias?: string; filterHotelId?: number },
): void {
  const column = options?.column ?? 'hotel_id';
  const col = options?.alias ? `${options.alias}.${column}` : column;
  const filterHotelId = options?.filterHotelId;

  if (filterHotelId) {
    resolveHotelId(actor, filterHotelId);
    conditions.push(`${col} = ?`);
    params.push(filterHotelId);
    return;
  }

  if (actorHasAllHotels(actor)) {
    return;
  }

  if (actor.hotelIds.length === 0) {
    conditions.push(`${col} = -1`);
    return;
  }

  if (actor.hotelIds.length === 1) {
    conditions.push(`${col} = ?`);
    params.push(actor.hotelIds[0]);
    return;
  }

  conditions.push(`${col} IN (${actor.hotelIds.map(() => '?').join(',')})`);
  params.push(...actor.hotelIds);
}

export function assertObjectifsEdit(actor: ActorContext): void {
  if (
    userHasPermission(actor.userId, 'recettes.saisie') ||
    userHasPermission(actor.userId, 'recettes.validate') ||
    isGlobal(actor.roleCode)
  ) {
    return;
  }
  throw new Error('Permission refusée : saisie objectifs.');
}

export function assertRecettesSaisie(actor: ActorContext): void {
  if (
    !userHasPermission(actor.userId, 'recettes.saisie') &&
    !isGlobal(actor.roleCode)
  ) {
    throw new Error('Permission refusée : saisie recettes.');
  }
}

export function assertRecettesValidate(actor: ActorContext): void {
  if (
    !userHasPermission(actor.userId, 'recettes.validate') &&
    !userHasPermission(actor.userId, 'recettes.saisie') &&
    !isGlobal(actor.roleCode) &&
    actor.roleCode !== 'PDG'
  ) {
    throw new Error('Permission refusée.');
  }
}

export function assertDashboardView(actor: ActorContext): void {
  if (
    userHasPermission(actor.userId, 'recettes.validate') ||
    userHasPermission(actor.userId, 'recettes.saisie') ||
    userHasPermission(actor.userId, 'audit.read') ||
    isGlobal(actor.roleCode) ||
    actor.roleCode === 'PDG' ||
    actor.roleCode === 'COMPTABILITE'
  ) {
    return;
  }
  throw new Error('Permission refusée : consultation tableau de bord.');
}

export function assertRecettesValidation(actor: ActorContext): void {
  if (
    !userHasPermission(actor.userId, 'recettes.validate') &&
    !isGlobal(actor.roleCode)
  ) {
    throw new Error('Permission refusée : validation recettes.');
  }
}
