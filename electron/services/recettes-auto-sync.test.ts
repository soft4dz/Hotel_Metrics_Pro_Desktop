import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./pos-recettes-sync.service', () => ({
  syncPosCaToRecettesJournalieres: vi.fn(() => 1200),
}));

function chain(row?: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    all: vi.fn(() => (Array.isArray(row) ? row : row ? [row] : [])),
    get: vi.fn(() => (Array.isArray(row) ? row[0] : row)),
    run: vi.fn(),
  };
}

describe('recettes-auto-sync', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('isErpAutoRecetteLine détecte les lignes auto ERP et POS', async () => {
    const svc = await import('./recettes-auto-sync.service');
    expect(svc.isErpAutoRecetteLine('[ERP auto] CA hébergement')).toBe(true);
    expect(svc.isErpAutoRecetteLine('[POS auto] legacy')).toBe(true);
    expect(svc.isErpAutoRecetteLine('Saisie manuelle')).toBe(false);
  });

  it('syncAllRecettesFromErp agrège hébergement, POS et facturation', async () => {
    let rubriqueCall = 0;
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM rubriques WHERE code')) {
        rubriqueCall += 1;
        return chain({ id: rubriqueCall === 1 ? 1 : 4 });
      }
      if (sql.includes('FROM reservations r') && sql.includes('nb_nuits')) return chain({ total: 5000 });
      if (sql.includes('hebergement_folio_lignes')) return chain({ total: 200 });
      if (sql.includes('FROM factures')) return chain({ total: 800 });
      if (sql.includes('FROM reservations r') && sql.includes('COUNT(*)')) return chain({ chambres: 3 });
      if (sql.includes('pos_clotures_journalieres')) return chain({ couverts: 42 });
      if (sql.includes('FROM encaissements')) return chain({ total: 4500 });
      if (sql.includes('FROM recettes_journalieres')) return chain(undefined);
      return chain(undefined);
    });

    const svc = await import('./recettes-auto-sync.service');
    const result = await svc.syncAllRecettesFromErp(1, 2, '2026-07-25');

    expect(result.hebergement).toBe(5200);
    expect(result.restauration).toBe(1200);
    expect(result.autres).toBe(800);
    expect(result.chambres).toBe(3);
    expect(result.couverts).toBe(42);
  });
});
