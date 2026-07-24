import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./comptabilite.service', () => ({
  genererEcritureVariationStock: vi.fn(() => ({ id: 501 })),
}));
vi.mock('./event-bus.service', () => ({ emitErpEvent: vi.fn() }));

function chain(row?: Record<string, unknown>) {
  return { all: vi.fn(() => []), get: vi.fn(() => row), run: vi.fn() };
}

describe('Phase 6 bis — compta stock SCF', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('postComptaForMouvement génère écriture pour sortie', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM stock_mouvements WHERE id')) {
        return chain({
          id: 7, hotel_id: 1, type_mouvement: 'sortie', quantite: -2, prix_unitaire: 100,
          montant: 200, reference: 'POS-1', motif: 'Vente', date_mouvement: '2026-07-24', ecriture_comptable_id: null,
        });
      }
      if (sql.includes('UPDATE stock_mouvements SET ecriture_comptable_id')) return chain(undefined);
      return chain(undefined);
    });
    const svc = await import('./stocks-compta.service');
    const compta = await import('./comptabilite.service');
    const id = svc.postComptaForMouvement(7);
    expect(id).toBe(501);
    expect(compta.genererEcritureVariationStock).toHaveBeenCalledWith(1, expect.objectContaining({ mouvementId: 7, montant: 200 }));
  });
});
