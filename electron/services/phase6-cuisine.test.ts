import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn((fn: () => unknown) => () => fn()),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./stocks.service', () => ({
  createMouvement: vi.fn(() => ({ id: 77 })),
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

describe('Phase 6 — fiche technique → production', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('validerRecette calcule coût et émet RECIPE_VALIDATED', async () => {
    let statut = 'brouillon';
    const recetteRow = () => ({
      id: 1, uuid: 'u', hotel_id: 1, code: 'PLT-1', nom: 'Couscous', portions: 4,
      prix_vente: 2000, cout_revient: null, marge_pct: null, statut,
      valide_par: null, valide_at: null, created_at: '2026-01-01',
    });
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM cuisine_recettes WHERE id = ?') && !sql.includes('UPDATE')) {
        return chain(recetteRow());
      }
      if (sql.includes('FROM cuisine_recette_lignes')) {
        return chain([{
          id: 10, recette_id: 1, produit_id: 5, quantite: 0.5, unite: 'kg', taux_perte: 10,
          ordre: 0, produit_code: 'FAR', produit_designation: 'Farine', cout_ligne: 150,
        }]);
      }
      if (sql.includes("statut = 'valide'")) { statut = 'valide'; return chain(undefined); }
      if (sql.includes('SELECT * FROM cuisine_recettes WHERE hotel_id')) return chain([recetteRow()]);
      return chain(undefined);
    });
    const svc = await import('./cuisine-production.service');
    const events = await import('./event-bus.service');
    const result = svc.validerRecette(1, 1);
    expect(result.statut).toBe('valide');
    expect(events.emitErpEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'RECIPE_VALIDATED' }));
  });

  it('executerOrdreProduction appelle sortie stock', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM cuisine_ordres_production o') && sql.includes('WHERE o.id')) {
        return chain({
          id: 5, hotel_id: 1, recette_id: 1, portions_prevues: 10, statut: 'planifie',
          recette_portions: 4, recette_nom: 'Couscous',
        });
      }
      if (sql.includes('FROM cuisine_recette_lignes')) {
        return chain([{
          id: 10, recette_id: 1, produit_id: 5, quantite: 0.5, unite: 'kg', taux_perte: 0,
          ordre: 0, produit_code: 'FAR', produit_designation: 'Farine', cout_ligne: 150,
        }]);
      }
      if (sql.includes('prix_unitaire FROM stock_produits')) return chain({ prix_unitaire: 300 });
      if (sql.includes('UPDATE cuisine_ordres_production')) return chain(undefined);
      if (sql.includes('ORDER BY o.date_production DESC')) return chain([]);
      return chain(undefined);
    });
    const svc = await import('./cuisine-production.service');
    const stocks = await import('./stocks.service');
    svc.executerOrdreProduction(1, 5);
    expect(stocks.createMouvement).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ typeMouvement: 'sortie', hotelId: 1, produitId: 5 }),
    );
  });
});
