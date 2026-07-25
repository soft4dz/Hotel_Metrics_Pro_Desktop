import { describe, expect, it } from 'vitest';
import {
  SEUIL_RETARD_MINUTES,
  determinerStatutReconciliation,
  minutesRetard,
} from './rh-temps-reconciliation.service';

describe('rh-temps-reconciliation — calculs', () => {
  it('calcule retard en minutes', () => {
    expect(minutesRetard('08:00', '08:20')).toBe(20);
    expect(minutesRetard('08:00', '07:50')).toBe(-10);
    expect(minutesRetard('08:00', null)).toBe(0);
  });

  it('déclenche alerte H+15', () => {
    expect(SEUIL_RETARD_MINUTES).toBe(15);
    expect(determinerStatutReconciliation(8, 8, 16)).toBe('alerte');
    expect(determinerStatutReconciliation(8, 8, 10)).toBe('ok');
  });

  it('détecte absence de pointage', () => {
    expect(determinerStatutReconciliation(8, 0, 0)).toBe('sans_pointage');
  });

  it('détecte pointage sans planning', () => {
    expect(determinerStatutReconciliation(0, 7, 0)).toBe('sans_planning');
  });

  it('détecte écart heures', () => {
    expect(determinerStatutReconciliation(8, 9, 0)).toBe('ecart');
  });
});
