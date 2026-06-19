import { describe, expect, it } from 'vitest';
import {
  COMMUNE_ALIASES,
  COMMUNES_PAR_WILAYA,
  WILAYAS_ALGERIE,
  communesForSelect,
  getCommunesForWilaya,
  isWilayaAlgerie,
  normalizeCommuneName,
} from './algerieGeo';

describe('algerieGeo', () => {
  it('contient 58 wilayas officielles', () => {
    expect(WILAYAS_ALGERIE).toHaveLength(58);
    expect(WILAYAS_ALGERIE).toContain('El Meniaa');
    expect(WILAYAS_ALGERIE).toContain('Timimoun');
  });

  it('a une entrée communes pour chaque wilaya', () => {
    for (const w of WILAYAS_ALGERIE) {
      expect(COMMUNES_PAR_WILAYA[w].length).toBeGreaterThan(0);
    }
  });

  it('liste les 57 communes d\'Alger avec noms officiels', () => {
    const alger = getCommunesForWilaya('Alger');
    expect(alger).toHaveLength(57);
    expect(alger).toContain('Douera');
    expect(alger).toContain('Saoula');
    expect(alger).toContain('Dar El Beïda');
    expect(alger).not.toContain('Douira');
    expect(alger).not.toContain('Hamma Annassers');
    expect(alger).not.toContain('Sidi Abdellah');
  });

  it('n\'assigne pas de communes à une mauvaise wilaya (découpage 2019)', () => {
    expect(getCommunesForWilaya('Tamanrasset')).not.toContain('In Salah');
    expect(getCommunesForWilaya('Biskra')).not.toContain('Ouled Djellal');
    expect(getCommunesForWilaya('Ouargla')).not.toContain('Touggourt');
    expect(getCommunesForWilaya('Illizi')).not.toContain('Djanet');
    expect(getCommunesForWilaya('Adrar')).not.toContain('Timimoun');
    expect(getCommunesForWilaya('Khenchela')).not.toContain('Oum El Bouaghi');
  });

  it('couvre les nouvelles wilayas avec leurs communes', () => {
    expect(getCommunesForWilaya('Timimoun')).toHaveLength(10);
    expect(getCommunesForWilaya('Touggourt')).toHaveLength(13);
    expect(getCommunesForWilaya('Ouled Djellal')).toContain('Ras El Miaad');
    expect(getCommunesForWilaya('Béni Abbès')).toContain('Beni Ikhlef');
    expect(getCommunesForWilaya('El M\'Ghair')).toContain('Merara');
  });

  it('normalise les anciennes graphies', () => {
    expect(normalizeCommuneName('Douira')).toBe('Douera');
    expect(normalizeCommuneName('Rouiba')).toBe('Rouïba');
    expect(normalizeCommuneName('Khraissia')).toBe('Khraicia');
  });

  it('conserve les valeurs legacy dans communesForSelect', () => {
    const list = communesForSelect('Alger', 'Douira');
    expect(list).toContain('Douera');
    expect(list).toContain('Douira');
  });

  it('valide isWilayaAlgerie', () => {
    expect(isWilayaAlgerie('Alger')).toBe(true);
    expect(isWilayaAlgerie('Paris')).toBe(false);
  });

  it('a des alias pour les fautes corrigées', () => {
    expect(Object.keys(COMMUNE_ALIASES).length).toBeGreaterThan(10);
  });
});
