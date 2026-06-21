import { describe, expect, it } from 'vitest';
import { isConfiguredModule, resolveModuleIdForPath } from '@/routes/routeModuleAccess';

describe('routeModuleAccess', () => {
  it('résout RH et PortMaster', () => {
    expect(resolveModuleIdForPath('/rh/paie/pre-paie')).toBe('rh-productivite');
    expect(resolveModuleIdForPath('/portmaster/factures/new')).toBe('portmaster');
  });

  it('résout les routes exploitation', () => {
    expect(resolveModuleIdForPath('/stocks')).toBe('stocks-consommations');
    expect(resolveModuleIdForPath('/hebergement')).toBe('hebergement-occupation');
    expect(resolveModuleIdForPath('/anomalies')).toBe('journal-anomalies');
  });

  it('ignore les chemins sans module catalogue', () => {
    expect(resolveModuleIdForPath('/login')).toBeNull();
    expect(resolveModuleIdForPath('/modules')).toBeNull();
  });

  it('identifie les modules configurables', () => {
    expect(isConfiguredModule('rh-productivite')).toBe(true);
    expect(isConfiguredModule('inconnu')).toBe(false);
  });
});
