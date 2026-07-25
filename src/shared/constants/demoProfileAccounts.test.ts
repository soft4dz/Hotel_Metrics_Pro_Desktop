import { describe, expect, it } from 'vitest';
import { DEMO_PROFILE_ACCOUNTS, DEMO_PROFILE_PASSWORD } from './demoProfileAccounts';
import { USER_ROLE_PROFILES } from './userRoleProfiles';
import { ROLE_PERMISSIONS_MAP } from './rolePermissionsMap';

describe('demoProfileAccounts', () => {
  it('couvre les profils métier (hors super-admin)', () => {
    const demoRoleCodes = new Set(DEMO_PROFILE_ACCOUNTS.map((a) => a.roleCode));
    const expected = USER_ROLE_PROFILES.filter(
      (p) => !['SUPERADMIN', 'ADMIN_DEC'].includes(p.code),
    ).map((p) => p.code);
    for (const code of expected) {
      expect(demoRoleCodes.has(code), `compte démo manquant pour ${code}`).toBe(true);
    }
  });

  it('a des e-mails uniques', () => {
    const emails = DEMO_PROFILE_ACCOUNTS.map((a) => a.email.toLowerCase());
    expect(new Set(emails).size).toBe(emails.length);
  });

  it('expose un mot de passe démo documenté', () => {
    expect(DEMO_PROFILE_PASSWORD.length).toBeGreaterThan(8);
  });
});

describe('rolePermissionsMap', () => {
  it('ne référence que des rôles du registre profils', () => {
    const known = new Set(USER_ROLE_PROFILES.map((p) => p.code));
    for (const code of Object.keys(ROLE_PERMISSIONS_MAP)) {
      expect(known.has(code)).toBe(true);
    }
  });
});
