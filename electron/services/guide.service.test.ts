import { describe, expect, it } from 'vitest';
import { slugFromFilename } from './guide.service';

describe('guide.service — slugs', () => {
  it('extrait le slug depuis le nom de fichier', () => {
    expect(slugFromFilename('01-super-admin.md')).toBe('super-admin');
    expect(slugFromFilename('07-rh-manager.md')).toBe('rh-manager');
    expect(slugFromFilename('00-manuel-general.md')).toBe('manuel-general');
  });
});
