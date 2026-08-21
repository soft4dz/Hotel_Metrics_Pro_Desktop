import { describe, expect, it } from 'vitest';
import { assertSettlementsMatch, calculateDiscount, refundableBalance } from './pos-restaurant.rules';

describe('règles POS restauration avancé', () => {
  it('calcule une remise en pourcentage et la plafonne au ticket', () => {
    expect(calculateDiscount(1_000, 0, 15)).toBe(150);
    expect(calculateDiscount(100, 200, 0)).toBe(100);
  });

  it('accepte un multi-paiement exactement équilibré', () => {
    expect(assertSettlementsMatch(1_250, [
      { mode: 'especes', montant: 500 },
      { mode: 'carte', montant: 750 },
    ])).toBe(1_250);
  });

  it('refuse un règlement incomplet ou négatif', () => {
    expect(() => assertSettlementsMatch(100, [{ mode: 'carte', montant: 90 }])).toThrow('doit égaler');
    expect(() => assertSettlementsMatch(100, [{ mode: 'carte', montant: -100 }])).toThrow('positif');
  });

  it('calcule le solde remboursable sans passer sous zéro', () => {
    expect(refundableBalance(1_000, 325.55)).toBe(674.45);
    expect(refundableBalance(100, 120)).toBe(0);
  });
});
