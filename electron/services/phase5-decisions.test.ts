import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));

function chain(rows: Record<string, unknown>[] | Record<string, unknown> | undefined) {
  return { all: vi.fn(() => (Array.isArray(rows) ? rows : rows ? [rows] : [])), get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)), run: vi.fn(() => ({ lastInsertRowid: 1 })) };
}

describe('Phase 5 — décisions destinataires', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('getDecisionDestinataires retourne lu/non-lu', async () => {
    mockDb.prepare.mockReturnValue(chain([
      { user_id: 2, user_nom: 'Alice', lu_at: '2026-01-01' },
      { user_id: 3, user_nom: 'Bob', lu_at: null },
    ]));
    const svc = await import('./decisions.service');
    const dests = svc.getDecisionDestinataires(10);
    expect(dests).toHaveLength(2);
    expect(dests[0].lu).toBe(true);
    expect(dests[1].lu).toBe(false);
  });

  it('createDecision insère destinataires', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO decisions')) return chain({ id: 5 });
      if (sql.includes('INSERT OR IGNORE INTO decisions_destinataires')) return chain(undefined);
      if (sql.includes('WHERE d.id = ? GROUP BY')) return chain({ id: 5, uuid: 'u', hotel_id: null, type: 'decision', titre: 'T', contenu: 'C', priorite: 'normale', statut: 'active', auteur_id: 1, auteur_nom: 'Admin', date_emission: '2026-01-01', date_echeance: null, nb_dest: 2, nb_lu: 0, created_at: '2026-01-01' });
      return chain(undefined);
    });
    const svc = await import('./decisions.service');
    const d = svc.createDecision(1, { titre: 'T', contenu: 'C', destinataireIds: [2, 3] });
    expect(d.titre).toBe('T');
  });
});
