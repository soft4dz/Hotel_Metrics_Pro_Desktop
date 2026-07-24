import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { Waves, Plus, Users, Settings } from 'lucide-react';

interface PlageConfig { capacitePlage: number; capacitePiscine: number; tarifAdulte: number; tarifEnfant: number; tarifResident: number }

interface PlageEntree { id: number; typeVisiteur: string; nombrePersonnes: number; nombreAdultes: number; nombreEnfants: number; montantPaye: number; formule: string; dateEntree: string }
interface PlageStats { totalEntreesJour: number; totalVisiteursJour: number; chiffreAffaireJour: number; totalEntreesMois: number; totalVisiteursMois: number; chiffreAffaireMois: number }

export default function PlagePage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const today = new Date().toISOString().slice(0, 10);
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const [date, setDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ typeVisiteur: 'touriste', nombreAdultes: 1, nombreEnfants: 0, formule: 'plage' });
  const [pageTab, setPageTab] = useState<'exploitation' | 'parametrage'>('exploitation');
  const [cfgForm, setCfgForm] = useState<PlageConfig>({ capacitePlage: 0, capacitePiscine: 0, tarifAdulte: 0, tarifEnfant: 0, tarifResident: 0 });

  const { data: config } = useQuery({
    queryKey: ['plage-config', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.plage.getConfig(hotelId)) as PlageConfig,
  });

  useEffect(() => {
    if (config) setCfgForm(config);
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.plage.saveConfig(hotelId, cfgForm)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plage'] }); notify.success('Paramètres plage enregistrés'); },
  });

  const { data: entrees = [] } = useQuery({
    queryKey: ['plage-entrees', hotelId, date],
    queryFn: async () => unwrapIpc(await ipcClient.plage.listEntrees(hotelId, date)) as PlageEntree[],
  });
  const { data: stats } = useQuery({
    queryKey: ['plage-stats', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.plage.stats(hotelId)) as PlageStats,
  });

  const create = useMutation({
    mutationFn: async () => {
      const isResident = form.typeVisiteur === 'resident';
      const zone = form.formule === 'piscine' ? 'piscine' : 'plage';
      return unwrapIpc(await ipcClient.plage.createEntree({
        hotelId,
        zone,
        dateEntree: date,
        nbAdultes: isResident ? 0 : form.nombreAdultes,
        nbEnfants: isResident ? 0 : form.nombreEnfants,
        nbResidents: isResident ? form.nombreAdultes + form.nombreEnfants : 0,
        observation: form.typeVisiteur,
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plage'] }); setShowForm(false); notify.success('Entrée enregistrée'); },
    onError: () => notify.error('Erreur'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Waves className="w-7 h-7 text-cyan-600" />
          <div>
            <h1 className="text-2xl font-bold">Plage & Piscine</h1>
            <p className="text-sm text-muted-foreground">Accès et fréquentation plage / piscine</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={hotelId} onChange={e => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Enregistrer entrée
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(['exploitation', 'parametrage'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setPageTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${pageTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t === 'exploitation' ? 'Exploitation' : 'Paramétrage'}
          </button>
        ))}
      </div>

      {pageTab === 'parametrage' && (
        <div className="bg-card border rounded-xl p-6 space-y-4 max-w-lg">
          <h2 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4" /> Tarifs & capacités</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">Capacité plage<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.capacitePlage} onChange={(e) => setCfgForm((c) => ({ ...c, capacitePlage: Number(e.target.value) }))} /></label>
            <label className="text-xs">Capacité piscine<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.capacitePiscine} onChange={(e) => setCfgForm((c) => ({ ...c, capacitePiscine: Number(e.target.value) }))} /></label>
            <label className="text-xs">Tarif adulte<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifAdulte} onChange={(e) => setCfgForm((c) => ({ ...c, tarifAdulte: Number(e.target.value) }))} /></label>
            <label className="text-xs">Tarif enfant<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifEnfant} onChange={(e) => setCfgForm((c) => ({ ...c, tarifEnfant: Number(e.target.value) }))} /></label>
            <label className="text-xs col-span-2">Tarif résident<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifResident} onChange={(e) => setCfgForm((c) => ({ ...c, tarifResident: Number(e.target.value) }))} /></label>
          </div>
          <button type="button" onClick={() => saveConfig.mutate()} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">Enregistrer</button>
        </div>
      )}

      {pageTab === 'exploitation' && (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Visiteurs aujourd'hui</p>
          <p className="text-3xl font-bold text-cyan-600">{stats?.totalVisiteursJour ?? '--'}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats?.totalEntreesJour ?? 0} entrée(s)</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">CA du jour</p>
          <p className="text-2xl font-bold">{stats ? `${stats.chiffreAffaireJour.toLocaleString()} DA` : '--'}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Visiteurs ce mois</p>
          <p className="text-2xl font-bold">{stats?.totalVisiteursMois ?? '--'}</p>
          <p className="text-xs text-muted-foreground mt-1">CA: {stats ? `${stats.chiffreAffaireMois.toLocaleString()} DA` : '--'}</p>
        </div>
      </div>

      {/* Entrées du jour */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Entrées du</h2>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-background" />
        </div>
        {entrees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Aucune entrée ce jour</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entrees.map(e => (
              <div key={e.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{e.typeVisiteur}</span>
                    <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">{e.formule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {e.nombreAdultes} adulte(s) + {e.nombreEnfants} enfant(s)
                    {e.nombrePersonnes > e.nombreAdultes + e.nombreEnfants ? ` + ${e.nombrePersonnes - e.nombreAdultes - e.nombreEnfants} résident(s)` : ''}
                    {' · '}
                    {e.dateEntree}
                  </p>
                </div>
                <span className="font-bold text-sm">{e.montantPaye.toLocaleString()} DA</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Enregistrer une entrée</h2>
            <div className="space-y-3">
              <select value={form.typeVisiteur} onChange={e => setForm(f => ({ ...f, typeVisiteur: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                {['touriste', 'resident', 'membre', 'exterieur', 'vip'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.formule} onChange={e => setForm(f => ({ ...f, formule: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="plage">Plage</option>
                <option value="piscine">Piscine</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Adultes</label>
                  <input type="number" min={0} value={form.nombreAdultes} onChange={e => setForm(f => ({ ...f, nombreAdultes: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Enfants</label>
                  <input type="number" min={0} value={form.nombreEnfants} onChange={e => setForm(f => ({ ...f, nombreEnfants: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le montant est calculé automatiquement selon les tarifs configurés (adulte / enfant / résident).
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
