import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));

function chain(rows: Record<string, unknown>[] | Record<string, unknown> | undefined, runResult?: Record<string, unknown>) {
  return {
    all: vi.fn(() => (Array.isArray(rows) ? rows : rows ? [rows] : [])),
    get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)),
    run: vi.fn(() => runResult ?? { lastInsertRowid: 1 }),
  };
}

describe('Phase 5 — relances créances auto', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('runRelancesAutomatiques crée une relance téléphone à 30j', async () => {
    const oldDate = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes("key = 'creances_relances_auto'")) return chain({ value: '1' });
      if (sql.includes('FROM global_creances WHERE statut')) {
        return chain([{ id: 5, date_echeance: oldDate, montant_restant: 50000 }]);
      }
      if (sql.includes('COALESCE(MAX(niveau)')) return chain({ n: 1 });
      if (sql.includes('FROM global_creance_relances WHERE creance_id') && sql.includes('AND canal')) return chain(undefined);
      if (sql.includes('INSERT INTO global_creance_relances')) return chain(undefined);
      if (sql.includes('UPDATE global_creances SET last_relance_at')) return chain(undefined);
      if (sql.includes('SELECT * FROM global_creance_relances WHERE id')) {
        return chain({ id: 1, creance_id: 5, niveau: 1, canal: 'telephone', statut: 'preparee', objet: 'x', created_at: '2026-01-01' });
      }
      return chain(undefined);
    });
    const svc = await import('./creances.service');
    const r = svc.runRelancesAutomatiques(1);
    expect(r.traitees).toBe(1);
  });
});
