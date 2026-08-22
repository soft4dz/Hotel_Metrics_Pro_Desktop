export interface FefoLot{id:number;quantite:number;datePeremption:string|null;}
export function allocateFefo(lots:FefoLot[],requested:number):Array<{lotId:number;quantite:number}>{
  if(requested<=0)throw new Error('Quantité invalide.');
  const ordered=[...lots].filter(l=>l.quantite>0).sort((a,b)=>(a.datePeremption??'9999-12-31').localeCompare(b.datePeremption??'9999-12-31'));
  let remaining=requested;const result:Array<{lotId:number;quantite:number}>=[];
  for(const lot of ordered){if(remaining<=0)break;const take=Math.min(lot.quantite,remaining);result.push({lotId:lot.id,quantite:take});remaining=Math.round((remaining-take)*1000)/1000;}
  if(remaining>0.0001)throw new Error(`Stock lot insuffisant : manque ${remaining}.`);
  return result;
}
