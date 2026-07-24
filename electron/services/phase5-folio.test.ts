import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };
let folioCreated = false;

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'admin', hotelIds: [1] }),
  applyActorHotelFilter: () => {},
  isGlobalAdminRole: () => true,
}));
vi.mock('./tarifs.service', () => ({ simulerPrix: vi.fn() }));
vi.mock('./facturation.service', () => ({ createFacture: vi.fn(() => ({ id: 99, numero: 'FAC-1' })) }));
vi.mock('./hotel-legal.service', () => ({
  createFichePoliceFromReservation: vi.fn(),
  calculerTaxeSejour: vi.fn(),
}));

function chain(row?: Record<string, unknown>) {
  return { all: vi.fn(() => row ? [row] : []), get: vi.fn(() => row), run: vi.fn(() => { folioCreated = true; return { lastInsertRowid: 7 }; }) };
}

describe('Phase 5 — folio hébergement', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
    folioCreated = false;
  });

  it('createFolioFromReservation crée folio + ligne nuitées', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM reservations r') && sql.includes('WHERE r.id')) {
        return chain({
          id: 1, hotel_id: 1, hotel_name: 'H', chambre_id: 2, chambre_numero: '101', type_label: 'Std',
          client_id: null, plan_id: null, formule_id: null, facture_id: null,
          date_arrivee: '2026-07-01', date_depart: '2026-07-03', nb_nuits: 2,
          nb_adultes: 2, nb_enfants: 0, client_nom: 'Dupont', client_prenom: null,
          client_email: null, client_telephone: null, montant_total: 20000, montant_paye: 0,
          statut: 'arrivee', source: 'direct', notes: null, created_at: '2026-01-01',
        });
      }
      if (sql.includes('FROM hebergement_folios WHERE reservation_id')) {
        if (!folioCreated) return chain(undefined);
        return chain({ id: 7, reservation_id: 1, hotel_id: 1, statut: 'ouvert', total_ht: 20000, total_ttc: 20000, facture_id: null });
      }
      if (sql.includes('FROM hebergement_folio_lignes WHERE folio_id')) {
        return chain({ id: 1, folio_id: 7, designation: 'Nuitées', quantite: 2, prix_unitaire: 10000, taux_tva: 0, montant_ht: 20000, montant_ttc: 20000, categorie: 'hebergement', ordre: 0 });
      }
      return chain(undefined);
    });
    const svc = await import('./hebergement.service');
    const folio = svc.createFolioFromReservation(1, 1);
    expect(folio?.reservationId).toBe(1);
    expect(folio?.statut).toBe('ouvert');
  });
});
