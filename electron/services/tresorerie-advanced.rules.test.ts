import { describe,expect,it } from 'vitest';
import { parseBankCsv,reconciliationScore } from './tresorerie-advanced.rules';

describe('trésorerie avancée',()=>{
  it('importe un relevé CSV français',()=>{const rows=parseBankCsv('date;libelle;reference;debit;credit;solde\n20/08/2026;Virement client;VIR-1;0;1250,50;9000,50');expect(rows[0]).toMatchObject({dateOperation:'2026-08-20',credit:1250.5,debit:0,reference:'VIR-1'});});
  it('rejette une ligne bancaire ambiguë',()=>expect(()=>parseBankCsv('date;libelle;debit;credit\n2026-08-20;Erreur;10;10')).toThrow(/exactement/));
  it('priorise montant, référence et proximité de date',()=>expect(reconciliationScore({dateOperation:'2026-08-20',reference:'ABC',amount:100},{date:'2026-08-20',reference:'ABC',amount:100})).toBe(100));
});
