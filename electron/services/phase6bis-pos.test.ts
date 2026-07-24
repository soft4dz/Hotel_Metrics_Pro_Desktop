import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./event-bus.service', () => ({ emitErpEvent: vi.fn() }));
vi.mock('./cuisine-production.service', () => ({
  getRecette: vi.fn(() => ({
    id: 1, statut: 'valide', nom: 'Couscous', portions: 4, prixVente: 500,
    lignes: [{ produitId: 5, quantite: 0.5, tauxPerte: 0 }],
  })),
  consommerStockRecette: vi.fn(() => [88]),
}));

function chain(rows?: Record<string, unknown>[] | Record<string, unknown>) {
  return {
    all: vi.fn(() => (Array.isArray(rows) ? rows : rows ? [rows] : [])),
    get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)),
    run: vi.fn(),
  };
}

describe('Phase 6 bis — vente POS', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('enregistrerVentePos insère vente et consomme stock', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO cuisine_ventes_pos')) return chain({ id: 12 });
      if (sql.includes('FROM cuisine_ventes_pos v')) return chain([{
        id: 12, uuid: 'u', hotel_id: 1, recette_id: 1, quantite: 2, montant_ttc: 1000,
        reference_ticket: 'T1', date_vente: '2026-07-24', created_at: '2026-07-24', recette_nom: 'Couscous',
      }]);
      return chain(undefined);
    });
    const svc = await import('./cuisine-pos.service');
    const prod = await import('./cuisine-production.service');
    const events = await import('./event-bus.service');
    const v = svc.enregistrerVentePos(1, { hotelId: 1, recetteId: 1, quantite: 2, referenceTicket: 'T1' });
    expect(v.quantite).toBe(2);
    expect(prod.consommerStockRecette).toHaveBeenCalled();
    expect(events.emitErpEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'POS_SALE_RECORDED' }));
  });
});
