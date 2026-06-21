// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAll = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({ all: mockAll, run: mockRun }));

vi.mock('../database/sqlite', () => ({
  getDatabase: () => ({ prepare: mockPrepare }),
}));

vi.mock('./permissions.service', () => ({
  assertPermission: vi.fn(),
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

const { assertPermission } = await import('./permissions.service');
const { writeAuditLog } = await import('./audit.service');
const {
  listEnabledModuleIds,
  listModulesConfig,
  setModuleEnabled,
  setModuleEnabledForUser,
} = await import('./modules.service');

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
});

describe('listModulesConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne tous les modules configurables avec défaut activé si absent en base', () => {
    mockAll.mockReturnValue([{ module_id: 'portmaster', is_enabled: 0, updated_at: '2026-01-01' }]);
    const rows = listModulesConfig();
    expect(rows.some((row) => row.moduleId === 'portmaster' && !row.isEnabled)).toBe(true);
    expect(rows.some((row) => row.moduleId === 'rh-productivite' && row.isEnabled)).toBe(true);
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
});

describe('setModuleEnabledForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exige users.manage et journalise', () => {
    setModuleEnabledForUser(1, 'portmaster', false);
    expect(assertPermission).toHaveBeenCalledWith(1, 'users.manage');
    expect(writeAuditLog).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith('portmaster', 0);
  });

  it('refuse de désactiver un module socle', () => {
    expect(() => setModuleEnabledForUser(1, 'administration-utilisateurs', false)).toThrow(
      /socle/i,
    );
  });
});
