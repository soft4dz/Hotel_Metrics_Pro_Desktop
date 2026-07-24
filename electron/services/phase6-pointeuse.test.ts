import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./permissions.service', () => ({
  userHasPermission: vi.fn(() => true),
}));

vi.mock('./event-bus.service', () => ({
  emitErpEvent: vi.fn(),
}));

function chain(rows: Record<string, unknown>[] | Record<string, unknown> | undefined) {
  return {
    all: vi.fn(() => rows ?? []),
    get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)),
    run: vi.fn(() => ({ changes: 1 })),
  };
}

describe('Phase 6 — pointeuse RH', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('parseCsvPunches détecte badge et datetime', async () => {
    const svc = await import('./rh-pointeuse.service');
    const rows = svc.parseCsvPunches(
      'badge_id,datetime,type\n1001,2026-07-24 08:02,entree\n1001,2026-07-24 17:15,sortie',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].badgeId).toBe('1001');
    expect(rows[0].typePunch).toBe('entree');
  });

  it('traiterRawPunches crée un pointage brouillon', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM rh_raw_punches rp') && sql.includes('traite = 0')) {
        return chain([
          { id: 1, pointeuse_id: null, hotel_id: 1, badge_id: '1001', punch_at: '2026-07-24 08:02', type_punch: 'entree', traite: 0, pointage_id: null, employe_id: 3 },
          { id: 2, pointeuse_id: null, hotel_id: 1, badge_id: '1001', punch_at: '2026-07-24 17:15', type_punch: 'sortie', traite: 0, pointage_id: null, employe_id: 3 },
        ]);
      }
      if (sql.includes('FROM rh_pointages WHERE employe_id')) return chain(undefined);
      if (sql.includes('INSERT INTO rh_pointages')) return chain({ id: 99 });
      if (sql.includes('UPDATE rh_raw_punches')) return chain(undefined);
      return chain(undefined);
    });
    const svc = await import('./rh-pointeuse.service');
    const result = svc.traiterRawPunches(1, 1);
    expect(result.pointagesCrees).toBe(1);
    expect(result.joursTraites).toBe(1);
  });
});
