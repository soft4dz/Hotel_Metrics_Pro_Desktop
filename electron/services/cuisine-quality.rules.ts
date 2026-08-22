export function temperatureCompliance(value:number,min:number,max:number){if(max<min)throw new Error('Plage de température invalide.');return value>=min&&value<=max;}
export function menuClass(popularity:number,averagePopularity:number,margin:number,averageMargin:number){if(popularity>=averagePopularity)return margin>=averageMargin?'star':'workhorse';return margin>=averageMargin?'puzzle':'dog';}
export function costVariance(theoretical:number,actual:number){const amount=Math.round((actual-theoretical)*100)/100;return{amount,percent:theoretical===0?0:Math.round(amount/theoretical*10000)/100};}

