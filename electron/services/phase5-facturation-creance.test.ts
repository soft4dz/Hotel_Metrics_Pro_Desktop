import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn(), transaction: vi.fn((fn: () => unknown) => () => fn()) };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'admin', hotelIds: [1] }),
  actorCanAccessHotel: () => true,
  isGlobalAdminRole: () => true,
  applyActorHotelFilter: () => {},
}));
vi.mock('./comptabilite.service', () => ({ genererEcritureFacture: vi.fn(), hashDocument: vi.fn(() => 'h'), getExerciceOuvert: vi.fn(() => ({ code: '2026' })) }));
vi.mock('./fiscalite-dz.service', () => ({ enregistrerTvaVente: vi.fn() }));
vi.mock('./workflow.service', () => ({ findWorkflow: vi.fn(() => null), createWorkflow: vi.fn(), submitWorkflow: vi.fn() }));
vi.mock('./creances.service', () => ({ createCreanceFromFacture: vi.fn() }));

function chain(row?: Record<string, unknown>) {
  return { all: vi.fn(() => []), get: vi.fn(() => row), run: vi.fn() };
}

describe('Phase 5 — créance auto à validation facture', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('validerFacture appelle createCreanceFromFacture si impayé', async () => {
    const factureRow = {
      id: 1, uuid: 'u', hotel_id: 1, hotel_name: 'H', client_id: null, client_nom: 'Client',
      numero: 'BROU-1', date_emission: '2026-01-01', date_echeance: '2026-02-01', statut: 'soumise',
      type_document: 'facture', facture_origine_id: null, verrouillee: 0,
      montant_ht: 1000, montant_tva: 190, montant_ttc: 1190, montant_paye: 0,
    };
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM factures') && sql.includes('deleted_at IS NULL')) return chain(factureRow);
      if (sql.includes("key='workflow_seuil_facture_ttc'")) return chain({ value: '9999999' });
      if (sql.includes('SELECT dernier_numero FROM factures_numerotation')) return chain({ dernier_numero: 1 });
      if (sql.includes('UPDATE factures_numerotation')) return chain(undefined);
      if (sql.includes('INSERT OR IGNORE INTO factures_numerotation')) return chain(undefined);
      if (sql.includes('UPDATE factures SET statut')) return chain(undefined);
      if (sql.includes('INSERT INTO factures_registre')) return chain(undefined);
      if (sql.includes('INSERT INTO factures_fiscales_metadata')) return chain(undefined);
      if (sql.includes('FROM facture_lignes')) return chain([]);
      if (sql.includes('FROM paiements_facture')) return chain([]);
      return chain(undefined);
    });
    const creances = await import('./creances.service');
    const svc = await import('./facturation.service');
    svc.validerFacture(1, 1);
    expect(creances.createCreanceFromFacture).toHaveBeenCalledWith(1, 1);
  });
});
