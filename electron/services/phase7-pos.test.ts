import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./event-bus.service', () => ({ emitErpEvent: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: vi.fn(() => ({ hotelIds: [1], roleCode: 'superadmin' })),
  actorCanAccessHotel: vi.fn(() => true),
}));
vi.mock('./daily-closure.service', () => ({ isDateJournalLocked: vi.fn(() => false) }));
vi.mock('./pos-cloture.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pos-cloture.service')>();
  return { ...actual, isPosJourneeLocked: vi.fn(() => false) };
});
vi.mock('./cuisine-production.service', () => ({
  getRecette: vi.fn(() => ({ id: 1, statut: 'valide', nom: 'Couscous', prixVente: 500, portions: 4, lignes: [] })),
  consommerStockRecette: vi.fn(() => [1]),
}));
vi.mock('./comptabilite.service', () => ({
  genererEcritureVenteRestauration: vi.fn(() => ({ id: 99 })),
}));

function chain(row?: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    all: vi.fn(() => (Array.isArray(row) ? row : row ? [row] : [])),
    get: vi.fn(() => (Array.isArray(row) ? row[0] : row)),
    run: vi.fn(),
  };
}

describe('Phase 7 — module POS', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createPointVente crée PDV et factions par défaut', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO pos_points_vente')) return chain({ id: 3 });
      if (sql.includes('INSERT OR IGNORE INTO pos_factions')) return chain(undefined);
      if (sql.includes('FROM pos_points_vente WHERE id')) return chain({
        id: 3, uuid: 'u', hotel_id: 1, code: 'REST', nom: 'Restaurant', type: 'restaurant', actif: 1, created_at: '2026-07-25',
      });
      return chain(undefined);
    });
    const svc = await import('./pos.service');
    const pv = svc.createPointVente(1, { hotelId: 1, code: 'REST', nom: 'Restaurant' });
    expect(pv.code).toBe('REST');
  });

  it('cloturerSessionFaction calcule écart caisse', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM pos_sessions WHERE id = ?') && !sql.includes('JOIN')) {
        return chain({
          id: 10, hotel_id: 1, statut: 'ouverte', fond_caisse: 1000, total_especes: 5000, point_vente_id: 1,
        });
      }
      if (sql.includes('COUNT(*) as c FROM pos_tickets')) return chain({ c: 0 });
      if (sql.includes('UPDATE pos_sessions SET statut')) return chain(undefined);
      if (sql.includes('FROM pos_sessions s') && sql.includes('WHERE s.id = ?')) {
        return chain({
          id: 10, point_vente_id: 1, faction_id: 1, hotel_id: 1, date_service: '2026-07-25',
          fond_caisse: 1000, total_especes: 5000, total_ventes: 5000, statut: 'cloturee',
          point_vente_nom: 'Resto', faction_nom: 'Midi', fond_cloture: 5900, ecart_caisse: -100,
          total_carte: 0, total_cheque: 0, total_virement: 0,
        });
      }
      return chain(undefined);
    });
    const svc = await import('./pos-cloture.service');
    const r = svc.cloturerSessionFaction(1, { sessionId: 10, fondCloture: 5900 });
    expect(r.ecartCaisse).toBe(-100);
  });
});
