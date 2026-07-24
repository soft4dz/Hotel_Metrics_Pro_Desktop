import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./workflow.service', () => ({
  findWorkflow: vi.fn(() => ({ id: 1, statut: 'valide' })),
  createWorkflow: vi.fn(),
  submitWorkflow: vi.fn(),
}));

function chain(row?: Record<string, unknown>) {
  return { all: vi.fn(() => []), get: vi.fn(() => row), run: vi.fn() };
}

describe('Phase 5 — workflow validation BC', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('validerBon refuse si montant > seuil sans workflow approuvé', async () => {
    const wf = await import('./workflow.service');
    vi.mocked(wf.findWorkflow).mockReturnValue({ id: 1, statut: 'soumis' } as never);
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('WHERE bc.id') && sql.includes('JOIN fournisseurs')) {
        return chain({ id: 1, numero: 'BC-1', statut: 'brouillon', hotel_id: 1, montant_ttc: 300000 });
      }
      if (sql.includes("key='workflow_seuil_achat_ttc'")) return chain({ value: '200000' });
      return chain(undefined);
    });
    const svc = await import('./achats.service');
    expect(() => svc.validerBon(1, 1)).toThrow(/workflow/i);
  });
});
