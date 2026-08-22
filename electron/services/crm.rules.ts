export function npsCategory(note:number){if(note<0||note>10)throw new Error('Note NPS invalide.');return note>=9?'promoteur':note>=7?'passif':'detracteur';}
export function npsScore(notes:number[]){if(!notes.length)return 0;const p=notes.filter(n=>n>=9).length/notes.length,d=notes.filter(n=>n<=6).length/notes.length;return Math.round((p-d)*100);}
export function loyaltyLevel(points:number){return points>=10000?'platinum':points>=5000?'gold':points>=1500?'silver':'classic';}
export function consentPurpose(channel:'email'|'sms'|'whatsapp'){return`marketing_${channel}`as const;}

