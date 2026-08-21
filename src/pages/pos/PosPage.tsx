import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Plus, Play, Lock, Receipt, CalendarCheck } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  PosPointVente,
  PosFaction,
  PosSession,
  PosTicket,
  PosClotureJournaliere,
  PosRapportSession,
  PosModePaiement,
} from '@/shared/types/pos';
import type { CuisineRecette } from '@/shared/types/cuisine';
import {
  POS_POINT_VENTE_TYPE_LABELS,
  type PosPointVenteType,
} from '@/shared/constants/posPointVenteTypes';

type Tab = 'parametrage' | 'caisse' | 'kds' | 'materiel' | 'clotures';

export default function PosPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? 1);
  const [tab, setTab] = useState<Tab>('caisse');
  const [pointVenteId, setPointVenteId] = useState<number | null>(null);
  const [factionId, setFactionId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [dateService] = useState(new Date().toISOString().slice(0, 10));
  const [newPv, setNewPv] = useState<{ code: string; nom: string; type: PosPointVenteType }>({
    code: '',
    nom: '',
    type: 'restaurant',
  });
  const [openSessionForm, setOpenSessionForm] = useState({ fondCaisse: '0' });
  const [ligneForm, setLigneForm] = useState({ recetteId: 0, quantite: 1 });
  const [modePaiement, setModePaiement] = useState<PosModePaiement>('especes');
  const [clotureFaction, setClotureFaction] = useState({ fondCloture: '', observations: '' });
  const [clotureJour, setClotureJour] = useState({ observations: '' });

  const { data: pointsVente = [] } = useQuery({
    queryKey: ['pos-points', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.pos.listPointsVente(hotelId)) as PosPointVente[],
  });

  const pvId = pointVenteId ?? pointsVente[0]?.id ?? null;

  const { data: factions = [] } = useQuery({
    queryKey: ['pos-factions', pvId],
    queryFn: async () => unwrapIpc(await ipcClient.pos.listFactions(pvId!)) as PosFaction[],
    enabled: Boolean(pvId),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['pos-sessions', pvId, dateService],
    queryFn: async () => unwrapIpc(await ipcClient.pos.listSessions(pvId!, dateService)) as PosSession[],
    enabled: Boolean(pvId),
  });

  const sessionActive = sessions.find((s) => s.statut === 'ouverte' && s.id === sessionId)
    ?? sessions.find((s) => s.statut === 'ouverte');
  const effectiveSessionId = sessionId ?? sessionActive?.id ?? null;

  const { data: tickets = [] } = useQuery({
    queryKey: ['pos-tickets', effectiveSessionId],
    queryFn: async () => unwrapIpc(await ipcClient.pos.listTickets(effectiveSessionId!)) as PosTicket[],
    enabled: Boolean(effectiveSessionId),
  });

  const { data: clotures = [] } = useQuery({
    queryKey: ['pos-clotures', pvId],
    queryFn: async () => unwrapIpc(await ipcClient.pos.listCloturesJournalieres(pvId!)) as PosClotureJournaliere[],
    enabled: Boolean(pvId) && tab === 'clotures',
  });

  const { data: recettes = [] } = useQuery({
    queryKey: ['cuisine-recettes', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.cuisine.listRecettes(hotelId)) as CuisineRecette[],
  });
  const { data: kdsOrders = [] } = useQuery({ queryKey:['pos-kds',pvId],queryFn:async()=>unwrapIpc(await ipcClient.pos.listKds(pvId!)),enabled:Boolean(pvId)&&tab==='kds',refetchInterval:5000 });
  const { data: devices = [] } = useQuery({ queryKey:['pos-devices',pvId],queryFn:async()=>unwrapIpc(await ipcClient.pos.listDevices(pvId!)),enabled:Boolean(pvId)&&tab==='materiel' });
  const [device,setDevice]=useState({type:'imprimante_ticket',nom:'',connexion:'usb',adresse:'',actif:true});
  const updateKds=useMutation({mutationFn:async(v:{id:number;statut:string})=>unwrapIpc(await ipcClient.pos.updateKds(v.id,v.statut)),onSuccess:()=>void qc.invalidateQueries({queryKey:['pos-kds']})});
  const saveDevice=useMutation({mutationFn:async()=>unwrapIpc(await ipcClient.pos.saveDevice({pointVenteId:pvId!,...device})),onSuccess:()=>{setDevice({...device,nom:''});void qc.invalidateQueries({queryKey:['pos-devices']});notify.success('Périphérique enregistré');}});

  const recettesValidees = recettes.filter((r) => r.statut === 'valide');
  const activeTicket = tickets.find((t) => t.id === activeTicketId) ?? tickets.find((t) => t.statut === 'brouillon');

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['pos-points', hotelId] });
    if (pvId) {
      void qc.invalidateQueries({ queryKey: ['pos-factions', pvId] });
      void qc.invalidateQueries({ queryKey: ['pos-sessions', pvId] });
      void qc.invalidateQueries({ queryKey: ['pos-clotures', pvId] });
    }
    if (effectiveSessionId) void qc.invalidateQueries({ queryKey: ['pos-tickets', effectiveSessionId] });
  };

  const createPv = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.createPointVente({
      hotelId, code: newPv.code, nom: newPv.nom, type: newPv.type,
    })),
    onSuccess: () => {
      setNewPv({ code: '', nom: '', type: 'restaurant' });
      invalidateAll();
      notify.success('Point de vente créé (factions par défaut)');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const openSession = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.openSession({
      pointVenteId: pvId!,
      factionId: factionId ?? factions[0]?.id,
      dateService,
      fondCaisse: Number(openSessionForm.fondCaisse) || 0,
    })),
    onSuccess: (s) => {
      const sess = s as PosSession;
      setSessionId(sess.id);
      invalidateAll();
      notify.success(`Session ${sess.factionNom} ouverte`);
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const newTicket = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.createTicket({ sessionId: effectiveSessionId! })),
    onSuccess: (t) => {
      setActiveTicketId((t as PosTicket).id);
      invalidateAll();
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const addLigne = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.addTicketLigne({
      ticketId: activeTicket!.id,
      recetteId: ligneForm.recetteId,
      quantite: ligneForm.quantite,
    })),
    onSuccess: () => { invalidateAll(); notify.success('Ligne ajoutée'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const validerTicket = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.validerTicket({
      ticketId: activeTicket!.id,
      modePaiement,
    })),
    onSuccess: () => {
      setActiveTicketId(null);
      invalidateAll();
      notify.success('Ticket encaissé — stock et compta mis à jour');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const cloturerSessionMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.cloturerSession({
      sessionId: effectiveSessionId!,
      fondCloture: Number(clotureFaction.fondCloture),
      observations: clotureFaction.observations || undefined,
    })),
    onSuccess: (r) => {
      const rapport = r as PosRapportSession;
      notify.success(`Faction clôturée — écart ${rapport.ecartCaisse?.toLocaleString() ?? 0} DA`);
      setSessionId(null);
      setClotureFaction({ fondCloture: '', observations: '' });
      invalidateAll();
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const cloturerJourMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.pos.cloturerJournee({
      pointVenteId: pvId!,
      dateJournal: dateService,
      observations: clotureJour.observations || undefined,
    })),
    onSuccess: () => {
      setClotureJour({ observations: '' });
      invalidateAll();
      notify.success('Clôture journalière POS effectuée');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Store className="w-8 h-8 text-orange-600" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Points de vente</h1>
          <p className="text-sm text-muted-foreground">Caisse, factions, clôture Z et clôture journalière.</p>
        </div>
        <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        {pointsVente.length > 0 && (
          <select value={pvId ?? ''} onChange={(e) => setPointVenteId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
            {pointsVente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} ({p.code}) — {POS_POINT_VENTE_TYPE_LABELS[p.type]}
              </option>
            ))}
          </select>
        )}
      </div>

      <ol className="text-sm border rounded-xl p-4 space-y-1 list-decimal list-inside bg-muted/30">
        <li>Ouvrir session faction → encaisser tickets</li>
        <li>Clôturer chaque faction (rapport Z)</li>
        <li>Clôturer journée POS (verrouille le PDV)</li>
        <li>Clôture journalière hôtel (/recettes/cloture) — CA restauration auto-sync</li>
      </ol>

      <div className="flex gap-2 border-b pb-2">
        {(['parametrage', 'caisse', 'kds', 'materiel', 'clotures'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 text-sm rounded-t-lg ${tab === t ? 'bg-orange-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'parametrage' ? 'Paramétrage' : t === 'caisse' ? 'Caisse' : t === 'kds' ? 'KDS cuisine' : t === 'materiel' ? 'Matériel' : 'Clôtures'}
          </button>
        ))}
      </div>

      {tab === 'parametrage' && (
        <div className="space-y-4 border rounded-xl p-4">
          <h2 className="font-semibold">Nouveau point de vente</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div><label className="text-xs text-muted-foreground">Code</label><input value={newPv.code} onChange={(e) => setNewPv({ ...newPv, code: e.target.value })} className="block border rounded px-2 py-1.5 text-sm mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Nom</label><input value={newPv.nom} onChange={(e) => setNewPv({ ...newPv, nom: e.target.value })} className="block border rounded px-2 py-1.5 text-sm mt-1" /></div>
            <select value={newPv.type} onChange={(e) => setNewPv({ ...newPv, type: e.target.value as PosPointVenteType })} className="border rounded px-2 py-1.5 text-sm">
              {(Object.keys(POS_POINT_VENTE_TYPE_LABELS) as PosPointVenteType[]).map((type) => (
                <option key={type} value={type}>{POS_POINT_VENTE_TYPE_LABELS[type]}</option>
              ))}
            </select>
            <Button disabled={!newPv.code || !newPv.nom} onClick={() => createPv.mutate()}><Plus className="w-4 h-4 mr-1" />Créer</Button>
          </div>
          {pvId && factions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mt-4 mb-2">Factions (services)</h3>
              <ul className="text-sm space-y-1">
                {factions.map((f) => (
                  <li key={f.id} className="flex justify-between border-b py-1">
                    <span>{f.nom} <span className="text-muted-foreground">({f.code})</span></span>
                    <span className="text-xs text-muted-foreground">{f.heureDebut} — {f.heureFin}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'caisse' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 border rounded-xl p-4">
            <h2 className="font-semibold flex items-center gap-2"><Play className="w-4 h-4" /> Session faction</h2>
            {!sessionActive ? (
              <div className="space-y-3">
                <select value={factionId ?? factions[0]?.id ?? ''} onChange={(e) => setFactionId(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                  {factions.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
                <div>
                  <label className="text-xs text-muted-foreground">Fond de caisse (DA)</label>
                  <input value={openSessionForm.fondCaisse} onChange={(e) => setOpenSessionForm({ fondCaisse: e.target.value })} className="block w-full border rounded px-2 py-1.5 text-sm mt-1" />
                </div>
                <Button disabled={!pvId || factions.length === 0} onClick={() => openSession.mutate()}>Ouvrir session</Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <Badge variant="success">Session ouverte — {sessionActive.factionNom}</Badge>
                <p>Ventes : {sessionActive.totalVentes.toLocaleString()} DA</p>
                <p>Espèces : {sessionActive.totalEspeces.toLocaleString()} DA · Carte : {sessionActive.totalCarte.toLocaleString()} DA</p>
                <Button size="sm" variant="outline" onClick={() => newTicket.mutate()}><Receipt className="w-3 h-3 mr-1" />Nouveau ticket</Button>
              </div>
            )}
          </div>

          <div className="space-y-4 border rounded-xl p-4">
            <h2 className="font-semibold">Ticket en cours</h2>
            {!activeTicket ? (
              <p className="text-sm text-muted-foreground">Ouvrez une session et créez un ticket.</p>
            ) : (
              <>
                <p className="text-sm font-mono">{activeTicket.numero} — {activeTicket.statut}</p>
                <ul className="text-sm space-y-1">
                  {activeTicket.lignes.map((l) => (
                    <li key={l.id} className="flex justify-between"><span>{l.designation} x{l.quantite}</span><span>{l.montantLigne.toLocaleString()} DA</span></li>
                  ))}
                </ul>
                <p className="font-semibold">Total TTC : {activeTicket.totalTtc.toLocaleString()} DA</p>
                {activeTicket.statut === 'brouillon' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <select value={ligneForm.recetteId} onChange={(e) => setLigneForm({ ...ligneForm, recetteId: Number(e.target.value) })} className="border rounded px-2 py-1 text-sm flex-1">
                        <option value={0}>Plat…</option>
                        {recettesValidees.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                      </select>
                      <input type="number" min={1} value={ligneForm.quantite} onChange={(e) => setLigneForm({ ...ligneForm, quantite: Number(e.target.value) })} className="border rounded px-2 py-1 text-sm w-16" />
                      <Button size="sm" disabled={!ligneForm.recetteId} onClick={() => addLigne.mutate()}>+</Button>
                    </div>
                    <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value as PosModePaiement)} className="border rounded px-2 py-1.5 text-sm w-full">
                      <option value="especes">Espèces</option><option value="carte">Carte</option><option value="cheque">Chèque</option><option value="virement">Virement</option>
                    </select>
                    <Button className="w-full" disabled={activeTicket.lignes.length === 0} onClick={() => validerTicket.mutate()}>Encaisser</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'kds' && <div className="grid gap-3 md:grid-cols-3">{(kdsOrders as Array<Record<string,unknown>>).map(o=><div key={Number(o.id)} className="space-y-3 rounded-xl border bg-card p-4"><div className="flex justify-between"><strong>{String(o.numero)}</strong><Badge variant={Number(o.attente_minutes)>15?'danger':'warning'}>{Number(o.attente_minutes)} min</Badge></div><p className="text-sm text-muted-foreground">{String(o.statut)}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>updateKds.mutate({id:Number(o.id),statut:'en_preparation'})}>Préparer</Button><Button size="sm" onClick={()=>updateKds.mutate({id:Number(o.id),statut:o.statut==='prete'?'servie':'prete'})}>{o.statut==='prete'?'Servie':'Prête'}</Button></div></div>)}</div>}

      {tab === 'materiel' && <div className="space-y-4 rounded-xl border bg-card p-4"><h2 className="font-semibold">Périphériques de caisse</h2><div className="flex flex-wrap gap-2"><select className="border rounded px-2 py-1.5 text-sm" value={device.type} onChange={e=>setDevice({...device,type:e.target.value})}><option value="imprimante_ticket">Imprimante ticket</option><option value="tiroir_caisse">Tiroir-caisse</option><option value="terminal_paiement">Terminal paiement</option><option value="scanner">Scanner</option></select><input className="border rounded px-2 py-1.5 text-sm" placeholder="Nom" value={device.nom} onChange={e=>setDevice({...device,nom:e.target.value})}/><select className="border rounded px-2 py-1.5 text-sm" value={device.connexion} onChange={e=>setDevice({...device,connexion:e.target.value})}><option value="usb">USB</option><option value="reseau">Réseau</option><option value="serie">Série</option></select><input className="border rounded px-2 py-1.5 text-sm" placeholder="Adresse/IP" value={device.adresse} onChange={e=>setDevice({...device,adresse:e.target.value})}/><Button disabled={!pvId||!device.nom} onClick={()=>saveDevice.mutate()}>Ajouter</Button></div>{(devices as Array<Record<string,unknown>>).map(d=><div key={Number(d.id)} className="flex justify-between rounded-lg border p-3 text-sm"><span>{String(d.nom)} · {String(d.type)} · {String(d.connexion)}</span><Badge variant={d.statut==='actif'?'success':'muted'}>{String(d.statut)}</Badge></div>)}</div>}

      {tab === 'clotures' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Clôture faction (fin de service)</h2>
            <p className="text-xs text-muted-foreground">Rapport Z — comptez la caisse et saisissez le fond réel.</p>
            {sessionActive ? (
              <>
                <p className="text-sm">Fond théorique espèces : {(sessionActive.fondCaisse + sessionActive.totalEspeces).toLocaleString()} DA</p>
                <input placeholder="Fond compté (DA)" value={clotureFaction.fondCloture} onChange={(e) => setClotureFaction({ ...clotureFaction, fondCloture: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                <input placeholder="Observations" value={clotureFaction.observations} onChange={(e) => setClotureFaction({ ...clotureFaction, observations: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                <Button onClick={() => cloturerSessionMut.mutate()} disabled={!clotureFaction.fondCloture}>Clôturer faction</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune session ouverte.</p>
            )}
          </div>
          <div className="border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Clôture journalière</h2>
            <p className="text-xs text-muted-foreground">
              Date : {dateService} — toutes les factions doivent être clôturées.
            </p>
            <input placeholder="Observations" value={clotureJour.observations} onChange={(e) => setClotureJour({ observations: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
            <Button variant="destructive" onClick={() => cloturerJourMut.mutate()} disabled={!pvId}>Clôturer la journée POS</Button>
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Historique clôtures</h3>
              <ul className="text-sm space-y-1 max-h-40 overflow-auto">
                {clotures.map((c) => (
                  <li key={c.id} className="flex justify-between border-b py-1">
                    <span>{c.dateJournal}</span>
                    <span>{c.totalVentes.toLocaleString()} DA · {c.statut}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
