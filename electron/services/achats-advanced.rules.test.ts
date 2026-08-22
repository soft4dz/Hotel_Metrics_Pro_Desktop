import {describe,expect,it} from 'vitest';
import {offerScore,threeWayMatch,validateSchedule} from './achats-advanced.rules';

describe('règles achats avancés',()=>{
  it('classe le moins-disant avec la note technique',()=>{
    expect(offerScore(1000,1000,80)).toBe(94);
    expect(offerScore(1200,1000,80)).toBe(82.33);
  });
  it('accepte les écarts monétaires de tolérance',()=>{
    expect(threeWayMatch(1000.5,1000,0).status).toBe('conforme');
  });
  it('détecte les écarts prix et quantité',()=>{
    expect(threeWayMatch(1100,1000,2)).toEqual({amountGap:100,quantityGap:2,status:'ecart'});
  });
  it('contrôle que les échéances couvrent exactement la facture',()=>{
    expect(()=>validateSchedule(1000,[{montant:400},{montant:600}])).not.toThrow();
    expect(()=>validateSchedule(1000,[{montant:900}])).toThrow('total TTC');
  });
});
