import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ userId: 1, roleCode: 'ADMIN_DEC', hotelIds: [], allHotelsAccess: true }),
  actorCanAccessHotel: () => true,
}));

describe('maintenance.service', () => {
  beforeEach(() => mockDb.prepare.mockReset());

  it('autorise le démarrage direct d’une intervention demandée', async () => {
    mockDb.prepare.mockImplementation((sql = '') => {
      if (sql.includes('SELECT hotel_id, statut')) return { get: vi.fn(() => ({ hotel_id: 1, statut: 'demandee' })) };
      if (sql.startsWith('UPDATE interventions')) return { run: vi.fn() };
      if (sql.includes('SELECT i.*')) return { get: vi.fn(() => ({
        id: 3, uuid: 'u', hotel_id: 1, equipement_id: null, equip_design: null,
        type_intervention: 'corrective', titre: 'Fuite', description: null, priorite: 'haute',
        statut: 'en_cours', technicien_id: null, tech_nom: null, date_demande: '2026-08-21',
        date_planifiee: null, date_debut: '2026-08-21', date_fin: null, duree_heures: null,
        cout_pieces: 0, cout_main_oeuvre: 0, rapport: null, created_at: '2026-08-21',
      })) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });

    const svc = await import('./maintenance.service');
    const result = svc.updateIntervention(1, 3, { statut: 'en_cours', dateDebut: '2026-08-21' });
    expect(result.statut).toBe('en_cours');
  });

  it('interdit de terminer une demande qui n’a jamais démarré', async () => {
    mockDb.prepare.mockImplementation((sql = '') => {
      if (sql.includes('SELECT hotel_id, statut')) return { get: vi.fn(() => ({ hotel_id: 1, statut: 'demandee' })) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });

    const svc = await import('./maintenance.service');
    expect(() => svc.updateIntervention(1, 3, { statut: 'terminee' })).toThrow('Transition maintenance interdite');
  });
});
