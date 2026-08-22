import{createHmac,timingSafeEqual}from'node:crypto';
export function retryDelayMinutes(attempt:number){return Math.min(360,2**Math.max(0,attempt-1));}
export function verifyWebhook(secret:string,payload:string,signature:string){const expected=createHmac('sha256',secret).update(payload).digest('hex');const clean=signature.replace(/^sha256=/,'');return clean.length===expected.length&&timingSafeEqual(Buffer.from(clean),Buffer.from(expected));}
export function promotionDiscount(total:number,type:'pourcentage'|'montant',value:number){const raw=type==='pourcentage'?total*value/100:value;return Math.round(Math.min(total,Math.max(0,raw))*100)/100;}
export function requiredDeposit(total:number,type:'pourcentage'|'montant'|'aucun',value:number){if(type==='aucun')return 0;return Math.round(Math.min(total,type==='pourcentage'?total*value/100:value)*100)/100;}

