import { describe, it, expect } from 'vitest';
import { MODULES, MODULE_GROUPS } from '@/modules/moduleCatalog';

describe('moduleCatalog', () => {
  it('contient au moins 25 modules', () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(25);
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
});
