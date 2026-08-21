import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));
vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ userId: 1, roleCode: 'ADMIN_DEC', hotelIds: [], allHotelsAccess: true }),
  actorCanAccessHotel: () => true,
}));

const ficheRow = {
  id: 9, hotel_id: 1, reservation_id: 12, nom: 'Benali', prenom: 'Samir',
  date_naissance: null, lieu_naissance: null, nationalite: null, type_piece: 'cni',
  numero_piece: 'A COMPLETER', date_entree: '2026-08-21', date_sortie_prevue: '2026-08-23',
  date_sortie_reelle: null, chambre_numero: '101', statut: 'present',
};

describe('hotel-legal.service', () => {
  beforeEach(() => {
    mockDb.prepare.mockReset();
  });

  it('crée la fiche du check-in avec un type SQL valide et le lien réservation', async () => {
    const insertRun = vi.fn(() => ({ lastInsertRowid: 9 }));
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM reservations r')) return { get: vi.fn(() => ({
        id: 12, hotel_id: 1, client_nom: 'Benali', client_prenom: 'Samir',
        date_arrivee: '2026-08-21', date_depart: '2026-08-23', chambre_numero: '101',
      })) };
      if (sql.includes('WHERE reservation_id =')) return { get: vi.fn(() => undefined) };
      if (sql.includes('INSERT INTO fiche_police')) return { run: insertRun };
      if (sql.includes('SELECT * FROM fiche_police WHERE id=')) return { get: vi.fn(() => ficheRow) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });

    const svc = await import('./hotel-legal.service');
    const fiche = svc.createFichePoliceFromReservation(1, 12);

    expect(fiche.reservationId).toBe(12);
    expect(fiche.typePiece).toBe('cni');
    expect(insertRun).toHaveBeenCalledWith(
      1, 12, 'Benali', 'Samir', null, null, null, 'cni', 'A COMPLETER',
      '2026-08-21', '2026-08-23', null, '101', 'present', 1,
    );
  });

  it('refuse un type de pièce incompatible avec la contrainte SQL', async () => {
    const svc = await import('./hotel-legal.service');
    expect(() => svc.createFichePolice(1, {
      hotelId: 1, nom: 'Benali', prenom: 'Samir', typePiece: 'carte_identite' as never,
      numeroPiece: '123', dateEntree: '2026-08-21',
    })).toThrow('Type de pièce invalide');
  });
});
