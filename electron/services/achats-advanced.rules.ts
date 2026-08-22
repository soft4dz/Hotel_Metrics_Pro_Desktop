export const money=(n:number)=>Math.round(n*100)/100;
export function offerScore(amount:number,lowestAmount:number,technicalScore:number):number{
  if(amount<=0||lowestAmount<=0)return 0;
  return money((lowestAmount/amount)*70+Math.min(100,Math.max(0,technicalScore))*0.3);
}
export function threeWayMatch(invoiceTotal:number,orderTotal:number,quantityGap:number){
  const amountGap=money(invoiceTotal-orderTotal);
  return{amountGap,quantityGap:money(quantityGap),status:Math.abs(amountGap)<=1&&Math.abs(quantityGap)<=0.001?'conforme' as const:'ecart' as const};
}
export function validateSchedule(total:number,schedules:Array<{montant:number}>):void{
  if(!schedules.length||schedules.some(s=>!Number.isFinite(s.montant)||s.montant<=0))throw new Error('Échéancier invalide.');
  if(Math.abs(money(schedules.reduce((sum,s)=>sum+s.montant,0))-money(total))>0.01)throw new Error('L’échéancier doit égaler le total TTC.');
}
