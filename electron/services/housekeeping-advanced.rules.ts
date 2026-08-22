export interface WorkItem{id:number;points:number;priority:number}export interface Worker{id:number;currentPoints:number}
export function balanceWorkload(items:WorkItem[],workers:Worker[]){if(!workers.length)throw new Error('Aucun agent disponible.');const loads=new Map(workers.map(w=>[w.id,w.currentPoints]));return[...items].sort((a,b)=>b.priority-a.priority||b.points-a.points).map(item=>{const worker=[...loads].sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0]!;loads.set(worker[0],worker[1]+item.points);return{taskId:item.id,assigneeId:worker[0],resultingPoints:worker[1]+item.points};});}
export function taskPoints(type:string){return({recouche:1,checkout:2,controle:1,grand_menage:3}as Record<string,number>)[type]??1;}

