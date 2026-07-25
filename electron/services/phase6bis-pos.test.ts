import { describe, it, expect, vi } from 'vitest';

describe('Phase 6 bis — vente POS cuisine (dépréciée)', () => {
  it('enregistrerVentePos redirige vers module /pos', async () => {
    vi.mock('../database/sqlite', () => ({ getDatabase: () => ({ prepare: vi.fn() }) }));
    const svc = await import('./cuisine-pos.service');
    expect(() => svc.enregistrerVentePos(1, { hotelId: 1, recetteId: 1, quantite: 2 })).toThrow(/Points de vente/);
  });
});
