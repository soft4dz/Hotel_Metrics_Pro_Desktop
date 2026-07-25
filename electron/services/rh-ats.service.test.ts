import { describe, expect, it } from 'vitest';
import { ETAPES_PIPELINE, isTransitionAutorisee } from './rh-ats.service';

describe('rh-ats.service — transitions pipeline', () => {
  it('autorise avancement séquentiel', () => {
    expect(isTransitionAutorisee('candidature', 'preselection')).toBe(true);
    expect(isTransitionAutorisee('preselection', 'entretien_rh')).toBe(true);
    expect(isTransitionAutorisee('entretien_rh', 'entretien_metier')).toBe(true);
  });

  it('autorise saut d\'une étape', () => {
    expect(isTransitionAutorisee('candidature', 'entretien_rh')).toBe(true);
  });

  it('refuse retour arrière ou saut trop large', () => {
    expect(isTransitionAutorisee('entretien_rh', 'candidature')).toBe(false);
    expect(isTransitionAutorisee('candidature', 'proposition')).toBe(false);
  });

  it('autorise refus depuis toute étape active', () => {
    const actives = ETAPES_PIPELINE.filter((e) => e !== 'embauche');
    for (const etape of actives) {
      expect(isTransitionAutorisee(etape, 'refuse')).toBe(true);
    }
    expect(isTransitionAutorisee('embauche', 'refuse')).toBe(false);
  });

  it('bloque transitions depuis étapes terminales', () => {
    expect(isTransitionAutorisee('embauche', 'proposition')).toBe(false);
    expect(isTransitionAutorisee('refuse', 'candidature')).toBe(false);
  });
});
