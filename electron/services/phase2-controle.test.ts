import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn((fn: () => unknown) => fn),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./actorContext', () => ({
  getActorContext: () => ({ userId: 1, roleCode: 'superadmin', hotelIds: [1] }),
  isGlobalAdminRole: () => true,
  actorCanAccessHotel: () => true,
  assertRecettesSaisie: () => undefined,
  resolveHotelId: (_a: unknown, hid: number) => hid,
}));

describe('Phase 2 — workflow', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createWorkflow insère une instance brouillon', async () => {
    mockDb.prepare.mockImplementation(() => ({
      run: vi.fn(() => ({ lastInsertRowid: 42 })),
      get: vi.fn(() => ({
        id: 42, module: 'cloture', entity_type: 'daily_closure', entity_id: 1,
        hotel_id: 1, statut: 'brouillon', priorite: 'normale', niveau_validation: 0,
        demandeur_user_id: 1, validateur_user_id: null, motif_refus: null, commentaire: null,
        submitted_at: null, completed_at: null, created_at: '2026-07-24',
      })),
      all: vi.fn(() => []),
    }));

    const { createWorkflow } = await import('./workflow.service');
    const wf = createWorkflow(1, { module: 'cloture', entityType: 'daily_closure', entityId: 1, hotelId: 1 });
    expect(wf.id).toBe(42);
    expect(wf.statut).toBe('brouillon');
  });
});

describe('Phase 2 — clôture journalière', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('isDateJournalLocked retourne true si statut cloture', async () => {
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => ({ statut: 'cloture' })),
    }));
    const { isDateJournalLocked } = await import('./daily-closure.service');
    expect(isDateJournalLocked(1, '2026-07-24')).toBe(true);
  });

  it('isDateJournalLocked retourne false si absent', async () => {
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => undefined),
    }));
    const { isDateJournalLocked } = await import('./daily-closure.service');
    expect(isDateJournalLocked(1, '2026-07-24')).toBe(false);
  });
});

describe('Phase 2 — archivage GED', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('assertDocumentLegallyProtected lève si archive active', async () => {
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => ({ id: 1, retention_until: '2036-01-01' })),
    }));
    const { assertDocumentLegallyProtected } = await import('./ged-archivage.service');
    expect(() => assertDocumentLegallyProtected(42)).toThrow(/protégé/);
  });

  it('isDocumentLegallyProtected retourne false sans archive', async () => {
    mockDb.prepare.mockImplementation(() => ({
      get: vi.fn(() => undefined),
    }));
    const { isDocumentLegallyProtected } = await import('./ged-archivage.service');
    expect(isDocumentLegallyProtected(42)).toBe(false);
  });

  it('hashLegalDocument produit un SHA-256 hex', async () => {
    const { hashLegalDocument } = await import('./hotel-legal.service');
    const hash = hashLegalDocument('test-content');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Phase 2 — alerte 09h30', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('checkClosureDeadlineAlerts retourne 0 avant 09h30', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T08:00:00'));
    const { checkClosureDeadlineAlerts } = await import('./daily-closure.service');
    expect(checkClosureDeadlineAlerts(1)).toBe(0);
    vi.useRealTimers();
  });
});
