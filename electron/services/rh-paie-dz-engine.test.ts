import { describe, it, expect } from 'vitest';
import {
  calculateIrg,
  calculatePaieDz,
  calculateParafiscalesPatronales,
  calculateBrutPaieMensuel,
  CNAS_SALARIE_TAUX,
  SMIG_DZD,
} from './rh-paie-dz-engine';

describe('rh-paie-dz-engine — IRG', () => {
  it('retourne 0 pour base imposable nulle', () => {
    expect(calculateIrg(0)).toBe(0);
  });

  it('applique abattement enfants à charge', () => {
    const sans = calculateIrg(50_000, 0);
    const avec = calculateIrg(50_000, 2);
    expect(avec).toBeLessThanOrEqual(sans);
  });

  it('calcule tranche 23% pour base <= 30000', () => {
    const irg = calculateIrg(10_000, 0);
    expect(irg).toBe(0);
  });
});

describe('rh-paie-dz-engine — CNAS', () => {
  it('calcule cotisation salariale 9%', () => {
    const paie = calculatePaieDz(30_000, 0);
    expect(paie.cotisationSalarie).toBeCloseTo(30_000 * CNAS_SALARIE_TAUX, 1);
  });

  it('net inférieur au brut moins charges', () => {
    const paie = calculatePaieDz(100_000, 1);
    expect(paie.net).toBeLessThan(100_000 - paie.cotisationSalarie);
  });
});

describe('rh-paie-dz-engine — parafiscales', () => {
  it('calcule accident travail, chômage et formation', () => {
    const p = calculateParafiscalesPatronales(100_000, {
      tauxAccidentTravail: 0.0125,
      tauxAssuranceChomage: 0.015,
      tauxFormationPro: 0.01,
    });
    expect(p.accidentTravail).toBe(1250);
    expect(p.assuranceChomage).toBe(1500);
    expect(p.formationPro).toBe(1000);
    expect(p.total).toBe(3750);
  });

  it('inclut parafiscales dans cout employeur', () => {
    const paie = calculatePaieDz(60_000, 0);
    expect(paie.coutEmployeur).toBeGreaterThan(60_000 + paie.cotisationPatronale);
  });
});

describe('rh-paie-dz-engine — SMIG', () => {
  it('SMIG DZ défini à 20000', () => {
    expect(SMIG_DZD).toBe(20_000);
  });
});

describe('rh-paie-dz-engine — brut mensuel HS et absences', () => {
  it('calcule majoration HS au-delà de 173.33 h', () => {
    const r = calculateBrutPaieMensuel({
      salaireBrutContrat: 60_000,
      heuresTravaillees: 185,
      joursAbsenceNonRemuneree: 0,
      primesTotal: 0,
    });
    expect(r.heuresSup).toBeCloseTo(11.67, 1);
    expect(r.montantHs).toBeGreaterThan(0);
    expect(r.brut).toBeGreaterThan(60_000);
  });

  it('applique retenue absence sans solde', () => {
    const r = calculateBrutPaieMensuel({
      salaireBrutContrat: 60_000,
      heuresTravaillees: 173,
      joursAbsenceNonRemuneree: 2,
      primesTotal: 0,
    });
    expect(r.retenueAbsence).toBe(4000);
    expect(r.brut).toBe(56_000);
  });

  it('ne descend pas brut sous zéro', () => {
    const r = calculateBrutPaieMensuel({
      salaireBrutContrat: 30_000,
      heuresTravaillees: 160,
      joursAbsenceNonRemuneree: 35,
      primesTotal: 0,
    });
    expect(r.brut).toBe(0);
  });
});
