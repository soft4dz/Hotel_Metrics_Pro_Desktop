import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ userId: 1, roleCode: 'ADMIN_DEC', hotelIds: [], allHotelsAccess: true }),
  actorCanAccessHotel: () => true,
}));

function chain(rows?: Record<string, unknown>[] | Record<string, unknown>) {
  return {
    all: vi.fn(() => (Array.isArray(rows) ? rows : rows ? [rows] : [])),
    get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)),
    run: vi.fn(() => ({ lastInsertRowid: 1 })),
  };
}

describe('Phase 5 — services satellite MVP', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createPartenaire commercial', async () => {
    const partRow = { id: 1, uuid: 'u', code: 'P1', raison_sociale: 'Agence X', type: 'agence', contact_nom: null, email: null, telephone: null, adresse: null, remise_pct: 10, credit_jours: 30, is_active: 1, notes: null, created_at: '2026-01-01' };
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO partenaires')) return chain({ id: 1 });
      if (sql.includes('FROM partenaires')) return chain([partRow]);
      return chain(undefined);
    });
    const svc = await import('./commercial.service');
    const p = svc.createPartenaire({ code: 'P1', raisonSociale: 'Agence X', type: 'agence' });
    expect(p.raisonSociale).toBe('Agence X');
  });

  it('createEquipement maintenance', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO equipements')) return chain({ id: 3 });
      if (sql.includes('SELECT * FROM equipements WHERE id')) return chain({ id: 3, uuid: 'u', hotel_id: 1, code: 'CLIM-01', designation: 'Climatiseur', categorie: 'clim', localisation: 'Hall', marque: null, modele: null, num_serie: null, date_achat: null, garantie_fin: null, statut: 'actif', created_at: '2026-01-01' });
      return chain(undefined);
    });
    const svc = await import('./maintenance.service');
    const eq = svc.createEquipement(1, { hotelId: 1, code: 'CLIM-01', designation: 'Climatiseur' });
    expect(eq.designation).toBe('Climatiseur');
  });
});
