import { describe, expect, it } from 'vitest';
import { evaluateNightAuditControls, type NightAuditSnapshot } from './night-audit.service';

function snapshot(overrides: Partial<NightAuditSnapshot> = {}): NightAuditSnapshot {
  return {
    expectedBusinessDate: '2026-08-21',
    requestedBusinessDate: '2026-08-21',
    pendingArrivals: [],
    pendingDepartures: [],
    incompletePoliceSheets: [],
    openPosPoints: [],
    missingFolios: [],
    roomStatusMismatches: [],
    cashGap: 0,
    cashGapJustified: false,
    ...overrides,
  };
}

describe('Night Audit — contrôles', () => {
  it('valide une journée sans anomalie', () => {
    const controls = evaluateNightAuditControls(snapshot());

    expect(controls).toHaveLength(8);
    expect(controls.every((control) => control.statut === 'ok')).toBe(true);
  });

  it('bloque une date hors séquence et les opérations réception non traitées', () => {
    const controls = evaluateNightAuditControls(snapshot({
      requestedBusinessDate: '2026-08-22',
      pendingArrivals: ['Réservation #12'],
      pendingDepartures: ['Réservation #20'],
      incompletePoliceSheets: ['Fiche #7'],
      openPosPoints: ['Restaurant — 1 session ouverte'],
      missingFolios: ['Réservation #30'],
    }));
    const blockers = controls.filter((control) => control.severity === 'blocking' && control.statut === 'failed');

    expect(blockers.map((control) => control.code)).toEqual([
      'BUSINESS_DATE',
      'PENDING_ARRIVALS',
      'PENDING_DEPARTURES',
      'POLICE_INCOMPLETE',
      'POS_OPEN',
      'MISSING_FOLIOS',
    ]);
  });

  it('signale les incohérences chambre et un écart de caisse non justifié', () => {
    const controls = evaluateNightAuditControls(snapshot({
      roomStatusMismatches: ['Réservation #4 — chambre 102 (libre)'],
      cashGap: -350,
    }));
    const warnings = controls.filter((control) => control.severity === 'warning' && control.statut === 'failed');

    expect(warnings.map((control) => control.code)).toEqual(['ROOM_STATUS', 'CASH_GAP']);
    expect(warnings[1].details[0]).toContain('-350.00 DA');
  });

  it('accepte un écart de caisse justifié', () => {
    const cashControl = evaluateNightAuditControls(snapshot({ cashGap: 350, cashGapJustified: true }))
      .find((control) => control.code === 'CASH_GAP');

    expect(cashControl?.statut).toBe('ok');
  });
});
