import { describe, expect, it } from 'vitest';
import {
  IpcValidationError,
  assertAmount,
  assertDateJournal,
  assertEnum,
  assertPercentage,
  assertPositiveInteger,
  assertPositiveNumber,
  assertText,
} from './validation';

describe('IPC validation helpers', () => {
  it('accepts a valid journal date', () => {
    expect(assertDateJournal('2026-06-19')).toBe('2026-06-19');
  });

  it('rejects malformed or impossible dates', () => {
    expect(() => assertDateJournal('19/06/2026')).toThrow(IpcValidationError);
    expect(() => assertDateJournal('2026-02-31')).toThrow(IpcValidationError);
  });

  it('rejects negative or non-finite amounts', () => {
    expect(() => assertAmount(-1, 'montant')).toThrow(IpcValidationError);
    expect(() => assertAmount(Number.NaN, 'montant')).toThrow(IpcValidationError);
    expect(() => assertAmount(Number.POSITIVE_INFINITY, 'montant')).toThrow(IpcValidationError);
    expect(assertAmount(0, 'montant')).toBe(0);
  });

  it('validates positive decimal numbers', () => {
    expect(assertPositiveNumber(1.5, 'quantite')).toBe(1.5);
    expect(() => assertPositiveNumber(0, 'quantite')).toThrow(IpcValidationError);
    expect(assertPositiveNumber(0, 'quantite', { allowZero: true })).toBe(0);
  });

  it('validates percentages', () => {
    expect(assertPercentage(9, 'tva')).toBe(9);
    expect(assertPercentage(100, 'tva')).toBe(100);
    expect(() => assertPercentage(-1, 'tva')).toThrow(IpcValidationError);
    expect(() => assertPercentage(101, 'tva')).toThrow(IpcValidationError);
  });

  it('validates positive integers with optional zero', () => {
    expect(assertPositiveInteger(1, 'hotelId')).toBe(1);
    expect(assertPositiveInteger(0, 'chambres', { allowZero: true })).toBe(0);
    expect(() => assertPositiveInteger(0, 'hotelId')).toThrow(IpcValidationError);
  });

  it('trims and limits text payloads', () => {
    expect(assertText('  motif  ', 'motif', { required: true })).toBe('motif');
    expect(() => assertText('', 'motif', { required: true })).toThrow(IpcValidationError);
    expect(() => assertText('abcdef', 'motif', { maxLength: 3 })).toThrow(IpcValidationError);
  });

  it('validates enum values', () => {
    expect(assertEnum('soumis', 'statut', ['brouillon', 'soumis'] as const)).toBe('soumis');
    expect(() => assertEnum('valide', 'statut', ['brouillon', 'soumis'] as const)).toThrow(IpcValidationError);
  });
});
