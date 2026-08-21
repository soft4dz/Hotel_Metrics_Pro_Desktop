import { describe, expect, it } from 'vitest';
import { parseRemoteSyncChange, remoteWins } from './sync-contract';

const movement = {
  changeUuid: '11111111-1111-4111-8111-111111111111',
  sourceDeviceId: '22222222-2222-4222-8222-222222222222',
  entityType: 'port_mouvement',
  entityUuid: '33333333-3333-4333-8333-333333333333',
  action: 'create',
  updatedAt: '2026-08-12T10:00:00.000Z',
  payload: {
    uuid: '33333333-3333-4333-8333-333333333333',
    bateauUuid: '44444444-4444-4444-8444-444444444444',
    typeMouvement: 'arrivee',
    emplacementFromUuid: null,
    emplacementToUuid: '55555555-5555-4555-8555-555555555555',
    dateMouvement: '2026-08-12T09:00:00.000Z',
    motif: null,
    statut: 'valide',
  },
};

describe('sync contract', () => {
  it('accepts a valid allowlisted movement', () => {
    expect(parseRemoteSyncChange(movement)?.entityUuid).toBe(movement.entityUuid);
  });

  it('rejects unsupported entities and mismatched UUIDs', () => {
    expect(parseRemoteSyncChange({ ...movement, entityType: 'users' })).toBeNull();
    expect(parseRemoteSyncChange({ ...movement, payload: { ...movement.payload, uuid: movement.changeUuid } })).toBeNull();
  });

  it('uses strict last-write-wins ordering', () => {
    expect(remoteWins('2026-08-12T09:00:00Z', '2026-08-12T10:00:00Z')).toBe(true);
    expect(remoteWins('2026-08-12T10:00:00Z', '2026-08-12T10:00:00Z')).toBe(false);
  });
});
