import {describe,expect,it}from'vitest';import{nextMaintenanceDate,slaStatus}from'./maintenance-advanced.rules';
describe('maintenance préventive',()=>{it('préserve les fins de mois',()=>expect(nextMaintenanceDate('2026-01-31','mensuelle')).toBe('2026-02-28'));it('calcule une récurrence trimestrielle',()=>expect(nextMaintenanceDate('2026-02-15','trimestrielle',2)).toBe('2026-08-15'));it('signale un SLA dépassé',()=>expect(slaStatus('2026-08-20T10:00:00Z',new Date('2026-08-21T10:00:00Z'))).toBe('depasse'));});

