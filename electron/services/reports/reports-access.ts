import { getActorContext, isGlobalAdminRole } from '../actorContext';
import { assertPermission, userHasPermission } from '../permissions.service';
import type { ReportFilters } from '../../../src/shared/types/reports';
import { REPORT_SOURCES } from './reports-sources.registry';
import type { SourceDef } from './reports-sources.types';

export function assertReportAccess(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (
    userHasPermission(actorUserId, 'reports.create') ||
    userHasPermission(actorUserId, 'reports.export') ||
    isGlobalAdminRole(actor.roleCode) ||
    actor.roleCode === 'PDG' ||
    actor.roleCode === 'COMPTABILITE'
  ) {
    return actor;
  }
  assertPermission(actorUserId, 'reports.create');
  return actor;
}

export function canAccessSource(actorUserId: number, sourceId: string): boolean {
  const source = REPORT_SOURCES[sourceId];
  if (!source) return false;
  const actor = getActorContext(actorUserId);
  if (isGlobalAdminRole(actor.roleCode)) return true;
  if (actor.roleCode === 'PDG' || actor.roleCode === 'COMPTABILITE' || actor.roleCode === 'AUDIT_INTERNE') {
    return true;
  }
  if (userHasPermission(actorUserId, 'portmaster.full') && source.module === 'portmaster') return true;
  if (userHasPermission(actorUserId, 'rh.manage') && source.module === 'rh') return true;
  if (userHasPermission(actorUserId, 'rh.team') && source.module === 'rh') return true;
  if (userHasPermission(actorUserId, 'users.manage') && source.module === 'administration') return true;
  return source.permissions.some((p) => userHasPermission(actorUserId, p));
}

export function resolveHotelScope(actorUserId: number, filters: ReportFilters): number[] | null {
  const actor = getActorContext(actorUserId);
  if (actor.allHotelsAccess) {
    if (filters.hotelId) return [filters.hotelId];
    return null;
  }
  if (filters.hotelId) {
    if (!actor.hotelIds.includes(filters.hotelId)) throw new Error('Accès refusé à cet hôtel.');
    return [filters.hotelId];
  }
  if (actor.hotelIds.length === 0) throw new Error('Aucun hôtel assigné.');
  return actor.hotelIds;
}

export function getSourceDef(sourceId: string): SourceDef | undefined {
  return REPORT_SOURCES[sourceId];
}
