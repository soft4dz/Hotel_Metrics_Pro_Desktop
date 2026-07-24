import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));

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

  it('parking saveConfig round-trip', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO parking_config')) return chain(undefined);
      if (sql.includes('FROM parking_config')) return chain({ hotel_id: 1, capacite: 50, tarif_heure: 200, tarif_jour: 1000, tarif_nuit: 500 });
      return chain(undefined);
    });
    const svc = await import('./parking.service');
    const cfg = svc.saveConfig(1, { capacite: 50, tarifHeure: 200 });
    expect(cfg.capacite).toBe(50);
  });

  it('plage savePlageConfig round-trip', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO plage_config')) return chain(undefined);
      if (sql.includes('FROM plage_config')) return chain({ hotel_id: 1, capacite_plage: 120, capacite_piscine: 40, tarif_adulte: 500, tarif_enfant: 250, tarif_resident: 200 });
      return chain(undefined);
    });
    const svc = await import('./plage.service');
    const cfg = svc.savePlageConfig(1, { capacitePlage: 120 });
    expect(cfg.capacitePlage).toBe(120);
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
    const eq = svc.createEquipement({ hotelId: 1, code: 'CLIM-01', designation: 'Climatiseur' });
    expect(eq.designation).toBe('Climatiseur');
  });
});
