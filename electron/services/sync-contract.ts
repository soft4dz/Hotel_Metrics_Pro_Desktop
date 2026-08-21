export const SYNC_ENTITY_TYPES = ['port_mouvement', 'port_relance'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];
export type SyncAction = 'create' | 'update' | 'delete';

export interface RemoteSyncChange {
  changeUuid: string;
  sourceDeviceId: string;
  entityType: SyncEntityType;
  entityUuid: string;
  action: SyncAction;
  updatedAt: string;
  payload: Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set<SyncAction>(['create', 'update', 'delete']);
const entities = new Set<string>(SYNC_ENTITY_TYPES);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIsoDate = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const optionalUuid = (v: unknown) => v == null || (typeof v === 'string' && UUID_RE.test(v));
const validText = (v: unknown, max = 2000) => v == null || (typeof v === 'string' && v.length <= max);

export function parseRemoteSyncChange(value: unknown): RemoteSyncChange | null {
  if (!isRecord(value) || !isRecord(value.payload)) return null;
  const { changeUuid, sourceDeviceId, entityType, entityUuid, action, updatedAt, payload } = value;
  if (typeof changeUuid !== 'string' || !UUID_RE.test(changeUuid)) return null;
  if (typeof sourceDeviceId !== 'string' || !UUID_RE.test(sourceDeviceId)) return null;
  if (typeof entityType !== 'string' || !entities.has(entityType)) return null;
  if (typeof entityUuid !== 'string' || !UUID_RE.test(entityUuid)) return null;
  if (typeof action !== 'string' || !actions.has(action as SyncAction)) return null;
  if (!isIsoDate(updatedAt) || payload.uuid !== entityUuid) return null;
  if (entityType === 'port_mouvement') {
    if (typeof payload.bateauUuid !== 'string' || !UUID_RE.test(payload.bateauUuid)) return null;
    if (!['arrivee', 'depart', 'changement_emplacement'].includes(String(payload.typeMouvement))) return null;
    if (!optionalUuid(payload.emplacementFromUuid) || !optionalUuid(payload.emplacementToUuid)) return null;
    if (!isIsoDate(payload.dateMouvement) || !validText(payload.motif) || !validText(payload.statut, 40)) return null;
  } else {
    if (!optionalUuid(payload.clientUuid) || !optionalUuid(payload.factureUuid) || !optionalUuid(payload.contratUuid)) return null;
    if (!payload.clientUuid && !payload.factureUuid && !payload.contratUuid) return null;
    if (!validText(payload.typeRelance, 40) || typeof payload.niveau !== 'number' || !Number.isInteger(payload.niveau) || payload.niveau < 1 || payload.niveau > 10) return null;
    if (!isIsoDate(payload.dateRelance) || !validText(payload.commentaire) || !validText(payload.statut, 40)) return null;
  }
  return value as unknown as RemoteSyncChange;
}

export function remoteWins(localUpdatedAt: string | null, remoteUpdatedAt: string): boolean {
  return !localUpdatedAt || Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt);
}
