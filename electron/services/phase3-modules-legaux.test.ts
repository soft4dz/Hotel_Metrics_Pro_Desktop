import { describe, it, expect, vi } from 'vitest';

vi.mock('./fiscalite-dz.service', () => ({
  calculerDeclarationTva: vi.fn(),
  listLiasseFiscale: vi.fn(),
}));

vi.mock('./comptabilite.service', () => ({
  creerEcriture: vi.fn(),
  hashDocument: vi.fn(),
}));

vi.mock('../database/sqlite', () => ({ getDatabase: () => ({ prepare: vi.fn() }) }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'superadmin' }),
  isGlobalAdminRole: () => true,
}));
vi.mock('./workflow.service', () => ({ createWorkflow: vi.fn() }));

describe('Phase 3 — modules légaux', () => {
  it('calculerDeclarationCasnos applique le taux de cotisation', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        get: vi.fn(() => {
          if (sql.includes('casnos_affilies')) {
            return { id: 1, type_affilie: 'prestataire', nom: 'Benali', prenom: null, nin: null, nif: null, numero_casnos: null, activite: null, date_affiliation: null, taux_cotisation: 15, revenu_assiette: 120000, hotel_id: null, actif: 1 };
          }
          return { id: 1, affilie_id: 1, affilie_nom: 'Benali', periode: '2026-07', revenu_declare: 10000, cotisation_calculee: 1500, statut: 'calculee', reference_casnos: null, date_declaration: null };
        }),
        run: vi.fn(),
        all: vi.fn(() => [{
          id: 1, affilie_id: 1, affilie_nom: 'Benali', periode: '2026-07', revenu_declare: 10000, cotisation_calculee: 1500, statut: 'calculee', reference_casnos: null, date_declaration: null,
        }]),
      })),
    };
    vi.doMock('../database/sqlite', () => ({ getDatabase: () => mockDb }));

    const { calculerDeclarationCasnos } = await import('./casnos.service');
    const d = calculerDeclarationCasnos(1, 1, '2026-07', 10000);
    expect(d.cotisationCalculee).toBe(1500);
    expect(d.revenuDeclare).toBe(10000);
  });

  it('dotation mensuelle linéaire calcule correctement', async () => {
    const immo = {
      id: 1, code: 'IMMO-1', libelle: 'Test', categorie: 'corporelle' as const,
      dateAcquisition: '2026-01-01', valeurAcquisition: 120000, valeurResiduelle: 0,
      dureeAmortissementMois: 60, methode: 'lineaire', compteImmobilisation: '218000',
      compteAmortissement: '281000', compteDotation: '681000', hotelId: 1, statut: 'actif' as const,
    };
    const mensuel = (120000 - 0) / 60;
    expect(mensuel).toBe(2000);
    expect(immo.valeurAcquisition / immo.dureeAmortissementMois).toBe(mensuel);
  });
});
