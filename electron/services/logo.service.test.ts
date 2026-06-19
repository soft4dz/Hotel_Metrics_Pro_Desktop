// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseLogoRequestPath } from './logo.service';

describe('parseLogoRequestPath', () => {
  it('parse le format triple slash', () => {
    expect(parseLogoRequestPath('hmp-logo:///company/logo.png')).toBe('company/logo.png');
    expect(parseLogoRequestPath('hmp-logo:///assets/app-logo.svg')).toBe('assets/app-logo.svg');
  });

  it('parse le format normalisé par Chromium (double slash)', () => {
    expect(parseLogoRequestPath('hmp-logo://company/logo.png')).toBe('company/logo.png');
    expect(parseLogoRequestPath('hmp-logo://assets/app-logo.svg')).toBe('assets/app-logo.svg');
  });

  it('rejette les URLs invalides', () => {
    expect(parseLogoRequestPath('not-a-url')).toBeNull();
  });
});
