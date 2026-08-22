export function overlaps(startA:string,endA:string,startB:string,endB:string){if(endA<=startA||endB<=startB)throw new Error('Période invalide.');return startA<endB&&endA>startB;}
export function quoteLine(quantity:number,unitPrice:number,taxRate=19){if(quantity<=0||unitPrice<0||taxRate<0)throw new Error('Montants de devis invalides.');const ht=Math.round(quantity*unitPrice*100)/100,tax=Math.round(ht*taxRate)/100;return{ht,tax,ttc:Math.round((ht+tax)*100)/100};}
export function capacityFor(layout:string,space:{theatre:number;classe:number;banquet:number}){return layout==='classe'?space.classe:layout==='banquet'?space.banquet:space.theatre;}

