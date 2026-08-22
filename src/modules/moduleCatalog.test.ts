import { describe, it, expect } from 'vitest';
import { MODULES, MODULE_GROUPS } from '@/modules/moduleCatalog';
import { CONFIGURED_MODULE_IDS } from '@/shared/constants/configuredModules';

describe('moduleCatalog', () => {
  it('contient les 49 modules du catalogue consolidé', () => {
    expect(MODULES).toHaveLength(49);
  });

  it('a des identifiants uniques', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('référence des routes valides pour les modules opérationnels', () => {
    for (const mod of MODULES.filter((m) => m.status === 'operationnel' && m.existingRoute)) {
      expect(mod.existingRoute).toMatch(/^\//);
    }
  });

  it('a des groupes connus pour chaque module', () => {
    for (const mod of MODULES) {
      expect(MODULE_GROUPS).toContain(mod.group);
    }
  });

  it('a un ordre strictement positif', () => {
    for (const mod of MODULES) {
      expect(mod.order).toBeGreaterThan(0);
    }
  });

  it('aligne exactement le catalogue et les modules configurables', () => {
    expect(new Set(CONFIGURED_MODULE_IDS)).toEqual(new Set(MODULES.map((module) => module.id)));
  });

  it('décrit les fonctions rattachées aux modules métier', () => {
    for (const mod of MODULES) {
      expect(mod.capabilities?.length).toBeGreaterThan(0);
      expect(new Set(mod.capabilities).size).toBe(mod.capabilities?.length);
    }
  });
});
