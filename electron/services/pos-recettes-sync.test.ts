import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));

function chain(row?: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    all: vi.fn(() => (Array.isArray(row) ? row : row ? [row] : [])),
    get: vi.fn(() => (Array.isArray(row) ? row[0] : row)),
    run: vi.fn(),
  };
}

describe('pos-recettes-sync', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('assertAllPosClosedForHotel bloque si PDV non clôturé', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM pos_points_vente WHERE hotel_id')) {
        return chain([{ id: 1, nom: 'Restaurant' }]);
      }
      if (sql.includes('pos_clotures_journalieres') && sql.includes('statut = \'cloturee\'')) return chain(undefined);
      if (sql.includes('COUNT(*) as c FROM pos_sessions')) return chain({ c: 0 });
      if (sql.includes('total_ventes')) return chain(undefined);
      return chain(undefined);
    });
    const svc = await import('./pos-recettes-sync.service');
    expect(() => svc.assertAllPosClosedForHotel(1, '2026-07-25')).toThrow(/Clôture POS requise/);
  });

  it('enregistrerVentePos cuisine est désactivé', async () => {
    const svc = await import('./cuisine-pos.service');
    expect(() => svc.enregistrerVentePos(1, { hotelId: 1, recetteId: 1, quantite: 1 })).toThrow(/Points de vente/);
  });
});
