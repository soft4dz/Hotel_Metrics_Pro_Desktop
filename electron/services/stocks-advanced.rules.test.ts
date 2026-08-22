import{describe,expect,it}from'vitest';
import{allocateFefo}from'./stocks-advanced.rules';
describe('allocation FEFO',()=>{
  it('consomme le lot qui expire le premier',()=>{expect(allocateFefo([{id:2,quantite:8,datePeremption:'2026-12-01'},{id:1,quantite:4,datePeremption:'2026-09-01'}],6)).toEqual([{lotId:1,quantite:4},{lotId:2,quantite:2}]);});
  it('place les lots sans péremption en dernier',()=>{expect(allocateFefo([{id:1,quantite:2,datePeremption:null},{id:2,quantite:2,datePeremption:'2026-09-01'}],2)).toEqual([{lotId:2,quantite:2}]);});
  it('refuse une quantité supérieure au disponible',()=>{expect(()=>allocateFefo([{id:1,quantite:1,datePeremption:null}],2)).toThrow('insuffisant');});
});
