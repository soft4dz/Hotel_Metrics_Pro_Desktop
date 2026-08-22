import { describe, expect, it } from 'vitest';
import { isConfiguredModuleId, resolveModuleIdForPath } from './routeModuleAccess';

describe('routeModuleAccess', () => {
  it('résout RH et PortMaster', () => {
    expect(resolveModuleIdForPath('/rh/paie/pre-paie')).toBe('rh-productivite');
    expect(resolveModuleIdForPath('/portmaster/factures/new')).toBe('portmaster');
  });

  it('résout les routes exploitation historiques', () => {
    expect(resolveModuleIdForPath('/stocks')).toBe('stocks-consommations');
    expect(resolveModuleIdForPath('/hebergement')).toBe('hebergement-occupation');
    expect(resolveModuleIdForPath('/anomalies')).toBe('journal-anomalies');
  });

  it.each([
    ['/comptabilite', 'comptabilite-scf'],
    ['/fiscalite/sifec', 'fiscalite-dgi'],
    ['/recettes/cloture', 'cloture-night-audit'],
    ['/crm', 'crm-experience-client'],
    ['/mice', 'groupes-mice'],
    ['/integrations-materielles', 'integrations-materielles'],
    ['/conformite/donnees-personnelles/incidents', 'protection-donnees-personnelles'],
    ['/dashboard/pdg', 'dashboard-pdg'],
    ['/dec/cockpit', 'cockpit-dec'],
  ])('associe %s au module %s', (route, moduleId) => {
    expect(resolveModuleIdForPath(route)).toBe(moduleId);
  });

  it('ignore les chemins sans module catalogue', () => {
    expect(resolveModuleIdForPath('/login')).toBeNull();
    expect(resolveModuleIdForPath('/modules')).toBeNull();
  });

  it('identifie les modules configurables', () => {
    expect(isConfiguredModuleId('rh-productivite')).toBe(true);
    expect(isConfiguredModuleId('crm-experience-client')).toBe(true);
    expect(isConfiguredModuleId('inconnu')).toBe(false);
  });
});
