import { createHash } from 'node:crypto';

export interface BankCsvLine { dateOperation:string; dateValeur?:string; libelle:string; reference?:string; debit:number; credit:number; solde?:number; empreinte:string }

const amount=(raw:string|undefined)=>{const cleaned=(raw??'').trim().replace(/\s/g,'').replace(',','.');const value=cleaned?Number(cleaned):0;if(!Number.isFinite(value)||value<0)throw new Error(`Montant bancaire invalide : ${raw}`);return Math.round(value*100)/100;};
const date=(raw:string)=>{const value=raw.trim();const fr=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);const iso=fr?`${fr[3]}-${fr[2]}-${fr[1]}`:value;if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw new Error(`Date bancaire invalide : ${raw}`);return iso;};

export function parseBankCsv(csv:string):BankCsvLine[]{
  const rows=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  if(rows.length<2)throw new Error('Le relevé bancaire ne contient aucune opération.');
  const sep=rows[0]!.includes(';')?';':',';
  const headers=rows[0]!.split(sep).map(x=>x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
  const idx=(...names:string[])=>headers.findIndex(h=>names.includes(h));
  const iDate=idx('date','date operation','date_operation'),iValue=idx('date valeur','date_valeur'),iLabel=idx('libelle','description'),iRef=idx('reference','ref'),iDebit=idx('debit'),iCredit=idx('credit'),iBalance=idx('solde');
  if(iDate<0||iLabel<0||iDebit<0||iCredit<0)throw new Error('Colonnes requises : date, libelle, debit et credit.');
  return rows.slice(1).map((row,rowIndex)=>{const c=row.split(sep).map(x=>x.trim().replace(/^"|"$/g,''));const debit=amount(c[iDebit]),credit=amount(c[iCredit]);if((debit>0)===(credit>0))throw new Error(`Ligne ${rowIndex+2} : renseignez exactement un débit ou un crédit.`);const dateOperation=date(c[iDate]??'');const libelle=c[iLabel]??'';if(!libelle)throw new Error(`Ligne ${rowIndex+2} : libellé requis.`);const reference=iRef>=0?c[iRef]||undefined:undefined;const empreinte=createHash('sha256').update([dateOperation,libelle,reference??'',debit,credit].join('|')).digest('hex');return{dateOperation,dateValeur:iValue>=0&&c[iValue]?date(c[iValue]!):undefined,libelle,reference,debit,credit,solde:iBalance>=0&&c[iBalance]?amount(c[iBalance]):undefined,empreinte};});
}

export function reconciliationScore(bank:{dateOperation:string;reference?:string|null;amount:number},source:{date:string;reference?:string|null;amount:number}):number{
  const cents=Math.abs(bank.amount-source.amount);if(cents>0.01)return 0;let score=70;if(bank.reference&&source.reference&&bank.reference.toLowerCase()===source.reference.toLowerCase())score+=20;const days=Math.abs((Date.parse(bank.dateOperation)-Date.parse(source.date))/86400000);if(days<=1)score+=10;else if(days<=3)score+=5;return Math.min(score,100);
}

