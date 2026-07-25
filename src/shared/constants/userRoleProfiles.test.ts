import { describe, it, expect } from 'vitest';
import { getGuideSlugForRole, listUserRoleProfiles } from '@/shared/constants/userRoleProfiles';

describe('userRoleProfiles', () => {
  it('référence tous les rôles métier principaux', () => {
    const codes = listUserRoleProfiles().map((p) => p.code);
    expect(codes).toContain('SUPERADMIN');
    expect(codes).toContain('DIRECTEUR_UNITE');
    expect(codes).toContain('CONTROLEUR_UNITE');
    expect(codes).toContain('COMPTABILITE');
    expect(codes).toContain('RECEPTIONNISTE');
    expect(codes.length).toBeGreaterThanOrEqual(12);
  });

  it('associe CONTROLEUR_UNITE au guide exploitation', () => {
    expect(getGuideSlugForRole('CONTROLEUR_UNITE')).toBe('controleur-exploitation');
  });

  it('retombe sur le manuel général pour un rôle inconnu', () => {
    expect(getGuideSlugForRole('INCONNU')).toBe('manuel-general');
  });
});
