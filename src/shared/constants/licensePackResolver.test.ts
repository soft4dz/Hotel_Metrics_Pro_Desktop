import { describe, expect, it } from 'vitest';
import {
  buildLicensePackSummary,
  resolveLicensedModuleIds,
} from './licensePackResolver';

describe('licensePackResolver', () => {
  it('STANDARD commerce exclut les modules premium et sectoriels hôtel', () => {
    const ids = resolveLicensedModuleIds('STANDARD', 'commerce');
    expect(ids).toContain('facturation');
    expect(ids).toContain('clients');
    expect(ids).not.toContain('synchronisation-multi-postes');
    expect(ids).not.toContain('hebergement-occupation');
    expect(ids).not.toContain('pos-restauration');
  });

  it('ENTERPRISE hotel inclut tous les modules', () => {
    const summary = buildLicensePackSummary('ENTERPRISE', 'hotel');
    expect(summary.enabledCount).toBe(summary.totalModules);
    expect(summary.disabledModuleIds).toHaveLength(0);
  });

  it('PRO port inclut portmaster mais pas PMS hôtel', () => {
    const ids = resolveLicensedModuleIds('PRO', 'port');
    expect(ids).toContain('portmaster');
    expect(ids).not.toContain('hebergement-occupation');
  });
});
