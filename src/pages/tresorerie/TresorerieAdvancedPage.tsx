import { useState } from 'react';
import { Landmark, ReceiptText, TrendingUp, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import type { BankStatementLine, PaymentOrder, TreasuryForecastLine } from '@/shared/types/tresorerie';

const today=new Date().toISOString().slice(0,10);
const in90=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
function getData<T>(r:{ok:boolean;data?:T;error?:string}):T{if(!r.ok)throw new Error(r.error??'Opération impossible');return r.data as T;}

export function TresorerieAdvancedPage(){
  const [hotelId,setHotelId]=useState(1),[accountId,setAccountId]=useState(1),[message,setMessage]=useState('');
  const [orders,setOrders]=useState<PaymentOrder[]>([]),[forecast,setForecast]=useState<TreasuryForecastLine[]>([]),[lines,setLines]=useState<BankStatementLine[]>([]);
  const [csv,setCsv]=useState('date;libelle;reference;debit;credit;solde\n');
  const run=async(fn:()=>Promise<void>)=>{try{await fn();setMessage('Opération terminée.');}catch(e){setMessage(e instanceof Error?e.message:String(e));}};
  const refresh=()=>run(async()=>{const [o,f,b]=await Promise.all([ipcClient.tresorerie.listPaymentOrders(hotelId),ipcClient.tresorerie.listForecast(hotelId,today,in90),ipcClient.tresorerie.listBankLines(accountId)]);setOrders(getData(o));setForecast(getData(f));setLines(getData(b));});
  return <div className="space-y-4">
    <div className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-end gap-3"><label className="text-xs">Hôtel<Input type="number" value={hotelId} onChange={e=>setHotelId(Number(e.target.value))}/></label><label className="text-xs">Compte bancaire<Input type="number" value={accountId} onChange={e=>setAccountId(Number(e.target.value))}/></label><Button onClick={()=>void refresh()}>Actualiser le cockpit</Button></div>{message&&<p className="mt-2 text-sm text-muted-foreground">{message}</p>}</div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel icon={ReceiptText} title="Ordres de paiement & chèques" subtitle="Double validation, exécution fournisseur et écriture 401/512">
        <Button variant="outline" onClick={()=>void run(async()=>{const r=await ipcClient.tresorerie.createPaymentOrder({hotelId,beneficiaire:'À compléter',montant:1,mode:'virement',dateEcheance:today});getData(r);await refresh();})}>Nouvel ordre brouillon</Button>
        <Rows rows={orders.map(o=>[o.numero,o.beneficiaire,`${o.montant} DA`,o.statut])}/>
      </Panel>
      <Panel icon={TrendingUp} title="Prévisions à 90 jours" subtitle="Flux pondérés et échéances fournisseurs intégrées">
        <Button variant="outline" onClick={()=>void run(async()=>{getData(await ipcClient.tresorerie.createForecast({hotelId,datePrevue:today,libelle:'Prévision à qualifier',categorie:'exploitation',sens:'decaissement',montant:1,probabilite:50}));await refresh();})}>Ajouter une prévision</Button>
        <Rows rows={forecast.map(f=>[f.date,f.libelle,`${f.impactPondere} DA`,`${f.soldeCumule} DA`])}/>
      </Panel>
      <Panel icon={Landmark} title="Relevés & rapprochement bancaire" subtitle="Import CSV, anti-doublon et suggestions montant/date/référence">
        <textarea className="min-h-28 w-full rounded-md border p-2 font-mono text-xs" value={csv} onChange={e=>setCsv(e.target.value)}/><Button variant="outline" onClick={()=>void run(async()=>{getData(await ipcClient.tresorerie.importBankStatement({compteBancaireId:accountId,nomFichier:`releve-${today}.csv`,csv}));await refresh();})}>Importer le relevé</Button>
        <Rows rows={lines.slice(0,10).map(l=>[l.date_operation,l.libelle,`${l.credit-l.debit} DA`,l.statut])}/>
      </Panel>
      <Panel icon={Workflow} title="Comptabilité analytique" subtitle="Centres de coût et ventilation contrôlée des écritures">
        <Button variant="outline" onClick={()=>void run(async()=>{getData(await ipcClient.tresorerie.createCostCenter({hotelId,code:`CC${Date.now().toString().slice(-4)}`,libelle:'Nouveau centre'}));})}>Créer un centre de coût</Button><p className="text-sm text-muted-foreground">Les ventilations empêchent de dépasser le montant de la ligne comptable. Le rapport analytique consolide uniquement les écritures validées.</p>
      </Panel>
    </div>
  </div>;
}
function Panel({icon:Icon,title,subtitle,children}:{icon:typeof Landmark;title:string;subtitle:string;children:React.ReactNode}){return <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex gap-3"><Icon className="h-5 w-5 text-primary"/><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>{children}</section>}
function Rows({rows}:{rows:string[][]}){return <div className="divide-y text-xs">{rows.length?rows.map((r,i)=><div key={i} className="grid grid-cols-4 gap-2 py-2">{r.map((x,j)=><span key={j} className="truncate">{x}</span>)}</div>):<p className="py-3 text-muted-foreground">Aucune donnée</p>}</div>}
