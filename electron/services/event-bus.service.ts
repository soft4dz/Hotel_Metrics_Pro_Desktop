import { EventEmitter } from 'node:events';
import { getDatabase } from '../database/sqlite';

export type ErpEventType =
  | 'RECIPE_VALIDATED'
  | 'PRODUCTION_EXECUTED'
  | 'POINTEUSE_IMPORTED'
  | 'POINTAGES_GENERATED';

export interface ErpEventPayload {
  type: ErpEventType;
  entiteType?: string;
  entiteId?: number;
  data?: Record<string, unknown>;
}

const bus = new EventEmitter();
bus.setMaxListeners(50);

export function emitErpEvent(payload: ErpEventPayload): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO erp_evenements (type, entite_type, entite_id, payload)
    VALUES (?, ?, ?, ?)
  `).run(
    payload.type,
    payload.entiteType ?? null,
    payload.entiteId ?? null,
    payload.data ? JSON.stringify(payload.data) : null,
  );
  bus.emit(payload.type, payload);
  bus.emit('*', payload);
}

export function onErpEvent(type: ErpEventType | '*', handler: (payload: ErpEventPayload) => void): () => void {
  bus.on(type, handler);
  return () => bus.off(type, handler);
}

export function listRecentEvents(limit = 50, type?: ErpEventType): ErpEventPayload[] {
  const db = getDatabase();
  const rows = type
    ? db.prepare(`SELECT * FROM erp_evenements WHERE type = ? ORDER BY id DESC LIMIT ?`).all(type, limit)
    : db.prepare(`SELECT * FROM erp_evenements ORDER BY id DESC LIMIT ?`).all(limit);
  return (rows as Record<string, unknown>[]).map((r) => ({
    type: r.type as ErpEventType,
    entiteType: (r.entite_type as string | null) ?? undefined,
    entiteId: (r.entite_id as number | null) ?? undefined,
    data: r.payload ? JSON.parse(r.payload as string) as Record<string, unknown> : undefined,
  }));
}
