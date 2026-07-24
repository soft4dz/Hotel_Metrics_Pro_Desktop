import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./fiscalite-dz.service', () => ({
  calculerDeclarationTva: vi.fn(() => ({
    id: 1, periode: '2026-07', baseHtVentes: 100000, tvaCollectee: 19000,
    tvaDeductible: 5000, creditAnterieur: 0, solde: 14000, statut: 'calculee',
  })),
  listLiasseFiscale: vi.fn(() => []),
}));

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
}));

vi.mock('./workflow.service', () => ({
  createWorkflow: vi.fn(),
}));

vi.mock('./comptabilite.service', () => ({
  hashDocument: (s: string) => 'hash-' + String(s).length,
}));

describe('Phase 3 — SIFEC connecteur', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('buildQrPayload produit un format SIFEC stable', async () => {
    const { buildQrPayload } = await import('./sifec-connector.service');
    const qr = buildQrPayload({ numero: 'FAC-2026-00001', montant_ttc: 11900 });
    expect(qr).toMatch(/^SIFEC\|/);
    expect(qr).toContain('FAC-2026-00001');
    expect(qr).toContain('11900');
  });

  it('testSifecConnection sandbox retourne OK', async () => {
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => ({
        id: 1, mode: 'sandbox', api_base_url: null, api_key_ref: null, nif_declarant: null,
        actif: 0, dernier_test_at: null, dernier_test_ok: null,
      })),
      run: vi.fn(),
    }));
    const { testSifecConnection } = await import('./sifec-connector.service');
    const r = testSifecConnection(1);
    expect(r.ok).toBe(true);
    expect(r.message).toContain('sandbox');
  });
});

describe('Phase 3 — fiscalité avancée', () => {
  beforeEach(() => {
    mockDb.prepare.mockReset();
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => undefined),
      run: vi.fn(),
    }));
  });

  it('exportDeclarationTvaG50 inclut SOLDE_A_PAYER', async () => {
    const { exportDeclarationTvaG50 } = await import('./fiscalite-avancee.service');
    const csv = exportDeclarationTvaG50(1, '2026-07');
    expect(csv).toContain('SOLDE_A_PAYER');
    expect(csv).toContain('14000.00');
  });
});
