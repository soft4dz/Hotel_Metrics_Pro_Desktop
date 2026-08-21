export type PenaltyType = 'pourcentage' | 'montant' | 'nuitees';

export function calculateCancellationPenalty(type:PenaltyType,value:number,total:number,nbNuits:number):number{
  if(type==='montant') return Math.min(total,Math.max(0,value));
  if(type==='nuitees') return Math.min(total,(total/Math.max(1,nbNuits))*Math.max(0,value));
  return Math.min(total,total*Math.max(0,value)/100);
}

export function calculateRefundableDeposit(deposits:number,penalty:number):number{
  return Math.max(0,deposits-penalty);
}

export function assertControlledOverbooking(hasConflict:boolean,authorized:boolean,motif?:string|null):void{
  if(!hasConflict) return;
  if(!authorized) throw new Error('Chambre déjà occupée sur cette période.');
  if(!motif?.trim()) throw new Error('Le motif du surbooking autorisé est obligatoire.');
}
