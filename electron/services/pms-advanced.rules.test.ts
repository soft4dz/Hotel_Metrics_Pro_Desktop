import { describe,expect,it } from 'vitest';
import { assertControlledOverbooking, calculateCancellationPenalty, calculateRefundableDeposit } from './pms-advanced.rules';

describe('P1 PMS avancé — règles métier',()=>{
  it('calcule les pénalités sans dépasser le séjour',()=>{
    expect(calculateCancellationPenalty('pourcentage',50,20000,4)).toBe(10000);
    expect(calculateCancellationPenalty('montant',25000,20000,4)).toBe(20000);
    expect(calculateCancellationPenalty('nuitees',2,20000,4)).toBe(10000);
  });
  it('calcule le remboursement net de pénalité',()=>{
    expect(calculateRefundableDeposit(12000,5000)).toBe(7000);
    expect(calculateRefundableDeposit(3000,5000)).toBe(0);
  });
  it('bloque le surbooking sans autorisation et exige un motif',()=>{
    expect(()=>assertControlledOverbooking(true,false)).toThrow('déjà occupée');
    expect(()=>assertControlledOverbooking(true,true,'')).toThrow('motif');
    expect(()=>assertControlledOverbooking(true,true,'Décision direction')).not.toThrow();
  });
});
