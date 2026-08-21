import { describe, expect, it, vi } from 'vitest';

const actorState = vi.hoisted(() => ({
  userId: 1,
  roleCode: 'SUPERADMIN',
  hotelIds: [10] as number[],
}));

vi.mock('../database/sqlite', () => ({ getDatabase: () => ({ prepare: vi.fn() }) }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./permissions.service', () => ({ userHasPermission: () => false }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ ...actorState }),
  isGlobalAdminRole: (roleCode: string) => roleCode === 'SUPERADMIN',
  actorCanAccessHotel: (actor: { hotelIds: number[] }, hotelId: number) => actor.hotelIds.includes(hotelId),
}));

import { canActorApproveStep } from './workflow-procedure.service';

const procedure = {
  steps: [{
    id: 1,
    procedureId: 1,
    stepOrder: 1,
    stepCode: 'approval',
    label: 'Approbation',
    targetStatut: 'valide',
    approverRoles: ['SUPERADMIN'],
    approverPermissions: [],
    slaHours: null,
    moduleAction: null,
  }],
} as never;

function workflow(demandeurUserId: number, hotelId = 10) {
  return {
    id: 1,
    module: 'finance',
    entityType: 'reconciliation',
    entityId: 20,
    hotelId,
    statut: 'soumis',
    priorite: 'normale',
    niveauValidation: 0,
    demandeurUserId,
    validateurUserId: null,
    motifRefus: null,
    commentaire: null,
    submittedAt: '2026-08-21',
    completedAt: null,
    createdAt: '2026-08-21',
  } as never;
}

describe('workflow separation of duties', () => {
  it('interdit au demandeur de valider sa propre demande, même superadmin', () => {
    expect(canActorApproveStep(1, procedure, workflow(1))).toBe(false);
  });

  it('interdit une validation hors périmètre hôtel, même superadmin', () => {
    expect(canActorApproveStep(1, procedure, workflow(2, 99))).toBe(false);
  });

  it('autorise un validateur distinct et dans le bon périmètre', () => {
    expect(canActorApproveStep(1, procedure, workflow(2))).toBe(true);
  });
});
