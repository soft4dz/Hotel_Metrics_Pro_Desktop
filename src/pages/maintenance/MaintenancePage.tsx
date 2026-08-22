import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, Cog, CalendarClock } from 'lucide-react';

interface Equipement { id: number; code: string; designation: string; categorie: string; localisation: string | null; statut: string; dateAchat: string | null }
interface Intervention { id: number; equipementId: number | null; equipementDesignation: string | null; titre: string; typeIntervention: string; priorite: string; statut: string; technicienNom: string | null; dateDemande: string; datePlanifiee: string | null; coutPieces: number; coutMainOeuvre: number; rapport: string | null }
interface MaintenanceStats { total: number; enCours: number; urgentes: number; coutMois: number }

const prioriteColor = (p: string) => ({ normale: 'bg-gray-100 text-gray-600', haute: 'bg-orange-100 text-orange-700', urgente: 'bg-red-100 text-red-700' }[p] ?? 'bg-gray-100');
const statutIcon = (s: string) => s === 'terminee' ? <CheckCircle className="w-4 h-4 text-green-500" /> : s === 'en_cours' ? <Clock className="w-4 h-4 text-blue-500" /> : <AlertTriangle className="w-4 h-4 text-orange-500" />;

export default function MaintenancePage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const [tab, setTab] = useState<'interventions' | 'equipements' | 'preventif'>('interventions');
  const [showForm, setShowForm] = useState(false);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [statutFilter, setStatutFilter] = useState('');
  const [form, setForm] = useState({ titre: '', typeIntervention: 'corrective', priorite: 'normale', description: '', datePlanifiee: '', equipementId: 0, coutPieces: 0, coutMainOeuvre: 0, rapport: '' });
  const [equipForm, setEquipForm] = useState({ code: '', designation: '', categorie: 'autre', localisation: '', marque: '', dateAchat: '' });

  const refreshMaintenance = () => {
    qc.invalidateQueries({ queryKey: ['maintenance-interventions'] });
    qc.invalidateQueries({ queryKey: ['maintenance-stats'] });
  };

  const { data: equipements = [] } = useQuery({
    queryKey: ['maintenance-equipements', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.maintenance.listEquipements(hotelId)) as Equipement[],
  });

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['maintenance-interventions', hotelId, statutFilter],
    queryFn: async () => unwrapIpc(await ipcClient.maintenance.listInterventions(hotelId, statutFilter || undefined)) as Intervention[],
  });
  const { data: stats } = useQuery({
    queryKey: ['maintenance-stats', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.maintenance.stats(hotelId)) as MaintenanceStats,
  });
  const { data: plans = [] } = useQuery({queryKey:['maintenance-plans',hotelId],queryFn:async()=>unwrapIpc(await ipcClient.maintenance.listPlans(hotelId)) as Array<Record<string,unknown>>});
  const { data: contracts = [] } = useQuery({queryKey:['maintenance-contracts',hotelId],queryFn:async()=>unwrapIpc(await ipcClient.maintenance.listContracts(hotelId)) as Array<Record<string,unknown>>});

  const createEquip = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.maintenance.createEquipement({ hotelId, ...equipForm })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-equipements'] }); setShowEquipForm(false); notify.success('Équipement créé'); },
    onError: () => notify.error('Erreur'),
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.maintenance.createIntervention({
      hotelId,
      titre: form.titre,
      typeIntervention: form.typeIntervention,
      priorite: form.priorite,
      description: form.description,
      datePlanifiee: form.datePlanifiee || undefined,
      equipementId: form.equipementId || undefined,
    })),
    onSuccess: () => { refreshMaintenance(); setShowForm(false); notify.success('Intervention créée'); },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Erreur'),
  });

  const terminer = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.maintenance.updateIntervention(id, {
      statut: 'terminee',
      dateFin: new Date().toISOString().slice(0, 10),
      coutPieces: form.coutPieces,
      coutMainOeuvre: form.coutMainOeuvre,
      rapport: form.rapport || undefined,
    })),
    onSuccess: () => { refreshMaintenance(); notify.success('Intervention terminée'); },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Erreur'),
  });

  const commencer = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.maintenance.updateIntervention(id, { statut: 'en_cours', dateDebut: new Date().toISOString().slice(0, 10) })),
    onSuccess: () => { refreshMaintenance(); notify.success('Intervention démarrée'); },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Erreur'),
  });

  const openInterventionFromEquip = (equipId: number, designation: string) => {
    setForm((f) => ({ ...f, equipementId: equipId, titre: `Intervention — ${designation}` }));
    setTab('interventions');
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="w-7 h-7 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold">Maintenance</h1>
            <p className="text-sm text-muted-foreground">Équipements et interventions techniques</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={hotelId} onChange={e => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {tab === 'interventions' ? (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Nouvelle intervention
            </button>
          ) : tab === 'equipements' ? (
            <button onClick={() => setShowEquipForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Nouvel équipement
            </button>
          ) : <button onClick={() => void ipcClient.maintenance.generateWorkOrders(new Date().toISOString().slice(0,10)).then(()=>{qc.invalidateQueries({queryKey:['maintenance-plans']});refreshMaintenance();notify.success('Ordres préventifs générés');})} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"><CalendarClock className="w-4 h-4"/>Générer les OT dus</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {[{ id: 'interventions' as const, label: 'Ordres de travail' }, { id: 'equipements' as const, label: 'Équipements' }, {id:'preventif' as const,label:'Plans & contrats'}].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats?.total ?? '--', color: 'text-slate-600' },
          { label: 'En cours', value: stats?.enCours ?? '--', color: 'text-blue-500' },
          { label: 'Urgentes', value: stats?.urgentes ?? '--', color: 'text-red-500' },
          { label: 'Coût du mois', value: stats ? `${stats.coutMois.toLocaleString()} DA` : '--', color: 'text-foreground' },
        ].map(k => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {tab === 'preventif' ? <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Plans récurrents</h2><p className="mb-3 text-xs text-muted-foreground">Récurrence, prochain passage, SLA et technicien affecté.</p>{plans.length?plans.map((p:any)=><div key={p.id} className="border-t py-2 text-sm"><b>{p.code}</b> — {p.titre}<p className="text-xs text-muted-foreground">{p.frequence} · prochain {p.prochaine_date} · SLA {p.sla_heures} h</p></div>):<p className="text-sm text-muted-foreground">Aucun plan.</p>}</section><section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Garanties & contrats</h2><p className="mb-3 text-xs text-muted-foreground">Prestataire, échéance, délai contractuel et coût annuel.</p>{contracts.length?contracts.map((c:any)=><div key={c.id} className="border-t py-2 text-sm"><b>{c.numero}</b> — {c.prestataire}<p className="text-xs text-muted-foreground">{c.type} · fin {c.date_fin} · {c.statut}</p></div>):<p className="text-sm text-muted-foreground">Aucun contrat.</p>}</section></div> : tab === 'equipements' ? (
        equipements.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl"><Cog className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Aucun équipement enregistré</p></div>
        ) : (
          <div className="space-y-2">
            {equipements.map((eq) => (
              <div key={eq.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{eq.designation} <span className="text-xs text-muted-foreground">({eq.code})</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{eq.categorie} · {eq.localisation ?? '—'} · {eq.dateAchat ?? '—'}</div>
                </div>
                <button onClick={() => openInterventionFromEquip(eq.id, eq.designation)} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">Créer intervention</button>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex gap-1 flex-wrap">
            {[{ value: '', label: 'Toutes' }, { value: 'demandee', label: 'Demandées' }, { value: 'planifiee', label: 'Planifiées' }, { value: 'en_cours', label: 'En cours' }, { value: 'terminee', label: 'Terminées' }, { value: 'annulee', label: 'Annulées' }].map(s => (
              <button key={s.value} onClick={() => setStatutFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statutFilter === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{s.label}</button>
            ))}
          </div>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : interventions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Aucune intervention</p></div>
          ) : (
            <div className="space-y-2">
              {interventions.map(i => (
                <div key={i.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex gap-3 items-start min-w-0">
                    {statutIcon(i.statut)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{i.titre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioriteColor(i.priorite)}`}>{i.priorite}</span>
                      </div>
                      {i.equipementDesignation && <p className="text-xs text-muted-foreground mt-0.5">Équipement: {i.equipementDesignation}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(['demandee', 'planifiee'].includes(i.statut)) && <button onClick={() => commencer.mutate(i.id)} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg">Commencer</button>}
                    {i.statut === 'en_cours' && <button onClick={() => terminer.mutate(i.id)} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg">Terminer</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle intervention</h2>
            <div className="space-y-3">
              <input placeholder="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={form.equipementId || ''} onChange={e => setForm(f => ({ ...f, equipementId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="">Équipement (optionnel)</option>
                {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.designation}</option>)}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={form.typeIntervention} onChange={e => setForm(f => ({ ...f, typeIntervention: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Préventive</option>
                  <option value="ameliorative">Améliorative</option>
                </select>
                <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <label className="text-xs text-muted-foreground">Date planifiée<input type="date" value={form.datePlanifiee} onChange={e => setForm(f => ({ ...f, datePlanifiee: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" /></label>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.titre || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      )}

      {showEquipForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvel équipement</h2>
            <div className="space-y-3">
              <input placeholder="Code *" value={equipForm.code} onChange={e => setEquipForm(f => ({ ...f, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Désignation *" value={equipForm.designation} onChange={e => setEquipForm(f => ({ ...f, designation: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Catégorie" value={equipForm.categorie} onChange={e => setEquipForm(f => ({ ...f, categorie: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Emplacement" value={equipForm.localisation} onChange={e => setEquipForm(f => ({ ...f, localisation: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input type="date" value={equipForm.dateAchat} onChange={e => setEquipForm(f => ({ ...f, dateAchat: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEquipForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => createEquip.mutate()} disabled={!equipForm.code || !equipForm.designation || createEquip.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
