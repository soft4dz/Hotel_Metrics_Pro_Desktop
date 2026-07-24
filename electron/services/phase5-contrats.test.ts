import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'admin', hotelIds: [1] }),
  actorCanAccessHotel: () => true,
  isGlobalAdminRole: () => true,
}));

function chain(row?: Record<string, unknown>) {
  return { all: vi.fn(() => []), get: vi.fn(() => row), run: vi.fn(() => ({ lastInsertRowid: 1 })) };
}

describe('Phase 5 — contrats hôtel', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createContratHotel insère un contrat', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO contrats_hotel')) return chain();
      if (sql.includes('FROM contrats_hotel c')) return chain({
        id: 1, uuid: 'u', hotel_id: 1, hotel_name: 'H', client_id: null, client_label: '—',
        type_contrat: 'convention_entreprise', reference: 'CONV-2026-01', date_debut: '2026-01-01',
        date_fin: '2026-12-31', montant: 100000, statut: 'actif', document_ged_id: null, notes: null, created_at: '2026-01-01',
      });
      return chain();
    });
    const svc = await import('./contrats-hotel.service');
    const c = svc.createContratHotel(1, {
      hotelId: 1, reference: 'CONV-2026-01', dateDebut: '2026-01-01', dateFin: '2026-12-31', montant: 100000,
    });
    expect(c.reference).toBe('CONV-2026-01');
  });
});
