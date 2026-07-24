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

vi.mock('./permissions.service', () => ({
  assertPermission: vi.fn(),
}));

vi.mock('./workflow.service', () => ({
  createWorkflow: vi.fn(() => ({ id: 1, statut: 'brouillon' })),
}));

describe('Phase 3 — RGPD Loi 18-07', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createDemandeDroit calcule échéance à J+30', async () => {
    mockDb.prepare.mockImplementation(() => ({
      run: vi.fn(() => ({ lastInsertRowid: 5 })),
      get: vi.fn(() => ({
        id: 5, type_demande: 'acces', sujet_type: 'client', sujet_id: null,
        sujet_label: 'Test Client', canal: null, description: null, statut: 'recue',
        date_reception: '2026-07-01', date_echeance: '2026-07-31',
        date_traitement: null, reponse: null,
      })),
      all: vi.fn(() => []),
    }));

    const { createDemandeDroit } = await import('./rgpd-anpdp.service');
    const d = createDemandeDroit(1, {
      typeDemande: 'acces',
      sujetType: 'client',
      sujetLabel: 'Test Client',
      dateReception: '2026-07-01',
    });
    expect(d.dateEcheance).toBe('2026-07-31');
    expect(d.statut).toBe('recue');
  });

  it('exportRegistreTraitementsCsv inclut en-tête', async () => {
    mockDb.prepare.mockImplementation(() => ({
      all: vi.fn(() => [{
        id: 1, code: 'RH_PAIE', libelle: 'Paie', finalite: 'Paie', base_legale: 'obligation_legale',
        categories_donnees: '[]', categories_personnes: '[]', destinataires: null,
        duree_conservation: '10 ans', mesures_securite: null, responsable_traitement: 'DRH',
        sous_traitants: null, transfert_hors_algerie: 0, actif: 1,
      }]),
    }));
    const { exportRegistreTraitementsCsv } = await import('./rgpd-anpdp.service');
    const csv = exportRegistreTraitementsCsv(1);
    expect(csv).toContain('Code;Libellé');
    expect(csv).toContain('RH_PAIE');
  });
});
