import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn((fn: () => unknown) => () => fn()),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./stocks.service', () => ({
  createMouvement: vi.fn(() => ({ id: 99 })),
}));

vi.mock('./fiscalite-avancee.service', () => ({
  registerTvaAchatFromBonLivraison: vi.fn(() => ({ id: 42 })),
}));

function chain(rows: Record<string, unknown>[] | Record<string, unknown> | undefined) {
  return {
    all: vi.fn(() => rows ?? []),
    get: vi.fn(() => (Array.isArray(rows) ? rows[0] : rows)),
    run: vi.fn(),
  };
}

describe('Phase 5 — chaîne achats → stock → TVA', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  mockDb.transaction.mockImplementation((fn: () => unknown) => () => fn());
  });

  it('envoyerBon passe de valide à envoye', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('FROM bons_commande bc') && sql.includes('WHERE bc.id')) {
        return chain({ id: 1, numero: 'BC-2026-0001', statut: 'valide', hotel_id: 1, fournisseur_nom: 'Fournisseur A', fournisseur_nif: '123' });
      }
      if (sql.includes('UPDATE bons_commande SET statut = \'envoye\'')) return chain(undefined);
      if (sql.includes('ORDER BY bc.date_commande DESC')) {
        return chain([{ id: 1, uuid: 'u', numero: 'BC-2026-0001', hotel_id: 1, fournisseur_id: 1, fournisseur_nom: 'F', statut: 'envoye', date_commande: '2026-01-01', date_livraison_prevue: null, date_livraison_effective: null, montant_ht: 100, montant_tva: 19, montant_ttc: 119, notes: null, cree_par: 1, valide_par: 1, valide_at: null, created_at: '2026-01-01' }]);
      }
      return chain(undefined);
    });
    const svc = await import('./achats.service');
    const bon = svc.envoyerBon(1, 1);
    expect(bon.statut).toBe('envoye');
  });

  it('livrerBon met à jour qte_recue et appelle stock + TVA', async () => {
    const ligne = { id: 10, bon_id: 1, produit_id: 5, designation: 'Produit test', quantite: 10, prix_unitaire: 100, tva_pct: 19, montant_ht: 1000, qte_recue: 0 };
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('WHERE bc.id = ?') && sql.includes('JOIN fournisseurs')) {
        return chain({ id: 1, numero: 'BC-2026-0001', statut: 'envoye', hotel_id: 1, fournisseur_nom: 'Fournisseur A', fournisseur_nif: '123' });
      }
      if (sql.includes('FROM bons_commande_lignes WHERE bon_id')) return chain([ligne]);
      if (sql.includes('UPDATE bons_commande_lignes SET qte_recue')) return chain(undefined);
      if (sql.includes('UPDATE bons_commande')) return chain(undefined);
      if (sql.includes('ORDER BY bc.date_commande DESC')) return chain([]);
      return chain(undefined);
    });
    const svc = await import('./achats.service');
    const stocks = await import('./stocks.service');
    const fiscal = await import('./fiscalite-avancee.service');
    const result = svc.livrerBon(1, 1, { lignes: [{ ligneId: 10, qteRecue: 4 }] });
    expect(result.mouvementsStock).toContain(99);
    expect(result.tvaAchatIds).toContain(42);
    expect(stocks.createMouvement).toHaveBeenCalled();
    expect(fiscal.registerTvaAchatFromBonLivraison).toHaveBeenCalled();
  });
});
