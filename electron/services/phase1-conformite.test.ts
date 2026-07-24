import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn((fn: () => unknown) => fn),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'superadmin', hotelIds: [1] }),
  isGlobalAdminRole: () => true,
  actorCanAccessHotel: () => true,
}));

describe('facturation — numérotation légale', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
    mockDb.transaction.mockImplementation((fn: () => unknown) => () => fn());
  });

  it('alloue des numéros séquentiels sans doublon', async () => {
    let seq = 0;
    mockDb.prepare.mockImplementation((sql: string) => ({
      run: vi.fn(() => {
        if (sql.includes('UPDATE factures_numerotation')) seq += 1;
      }),
      get: vi.fn(() => ({ dernier_numero: seq })),
    }));

    const { allocateNumeroLegal } = await import('./facturation.service');
    const n1 = allocateNumeroLegal('FAC', 2026);
    const n2 = allocateNumeroLegal('FAC', 2026);
    expect(n1).toBe('FAC-2026-00001');
    expect(n2).toBe('FAC-2026-00002');
  });
});

describe('comptabilite — équilibre écriture', () => {
  it('refuse une écriture déséquilibrée', async () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn()
        .mockReturnValueOnce({ id: 1, code: '2026', date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'ouvert' })
        .mockReturnValueOnce({ id: 1, code: 'OD', libelle: 'OD', type: 'od', actif: 1 }),
    });

    const { creerEcriture } = await import('./comptabilite.service');
    expect(() => creerEcriture(1, {
      journalCode: 'OD',
      dateEcriture: '2026-06-01',
      libelle: 'Test',
      lignes: [
        { compteNumero: '411000', debit: 1000, credit: 0 },
        { compteNumero: '707100', debit: 0, credit: 500 },
      ],
    })).toThrow(/déséquilibrée/i);
  });
});

describe('comptabilite — hash document SIFEC', () => {
  it('produit un hash SHA-256 stable', async () => {
    const { hashDocument } = await import('./comptabilite.service');
    const h1 = hashDocument('FAC-2026-00001|2026-01-15|11900');
    const h2 = hashDocument('FAC-2026-00001|2026-01-15|11900');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
