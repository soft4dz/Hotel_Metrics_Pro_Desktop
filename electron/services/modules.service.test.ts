// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAll = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({ all: mockAll, run: mockRun }));

vi.mock('../database/sqlite', () => ({
  getDatabase: () => ({ prepare: mockPrepare }),
}));

// import AFTER mock is set up
const { listEnabledModuleIds, setModuleEnabled } = await import('./modules.service');

describe('listEnabledModuleIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne les module_id des lignes activées', () => {
    mockAll.mockReturnValue([
      { module_id: 'rh-productivite' },
      { module_id: 'portmaster' },
    ]);
    expect(listEnabledModuleIds()).toEqual(['rh-productivite', 'portmaster']);
  });

  it('retourne un tableau vide si aucun module activé', () => {
    mockAll.mockReturnValue([]);
    expect(listEnabledModuleIds()).toEqual([]);
  });

  it('interroge uniquement les modules is_enabled=1', () => {
    mockAll.mockReturnValue([]);
    listEnabledModuleIds();
    expect(mockPrepare).toHaveBeenCalled();
    const calls = mockPrepare.mock.calls as unknown[][];
    const sql = String(calls[0]?.[0] ?? '');
    expect(sql).toContain('is_enabled = 1');
  });
});

describe('setModuleEnabled', () => {
  beforeEach(() => vi.clearAllMocks());

  it('appelle run avec moduleId et 1 pour enabled=true', () => {
    setModuleEnabled('portmaster', true);
    expect(mockRun).toHaveBeenCalledWith('portmaster', 1);
  });

  it('appelle run avec moduleId et 0 pour enabled=false', () => {
    setModuleEnabled('rh-productivite', false);
    expect(mockRun).toHaveBeenCalledWith('rh-productivite', 0);
  });

  it('utilise un UPSERT (INSERT … ON CONFLICT)', () => {
    setModuleEnabled('portmaster', true);
    expect(mockPrepare).toHaveBeenCalled();
    const calls = mockPrepare.mock.calls as unknown[][];
    const sql = String(calls[0]?.[0] ?? '');
    expect(sql.toUpperCase()).toContain('ON CONFLICT');
  });
});
