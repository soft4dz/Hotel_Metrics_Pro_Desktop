import { describe, expect, it } from 'vitest';
import { MODULES } from '@/modules/moduleCatalog';
import { MODULE_SUITES, getModuleSuite } from '@/pages/modules/moduleSuites';

describe('MODULE_SUITES', () => {
  it('classe chaque module du catalogue une seule fois', () => {
    const assignedIds = MODULE_SUITES.flatMap((suite) => suite.moduleIds);
    const catalogIds = MODULES.map((module) => module.id);

    expect(new Set(assignedIds).size).toBe(assignedIds.length);
    expect([...assignedIds].sort()).toEqual([...catalogIds].sort());
  });

  it('permet de retrouver la suite de chaque module', () => {
    for (const module of MODULES) {
      expect(getModuleSuite(module.id)?.moduleIds).toContain(module.id);
    }
  });
});
