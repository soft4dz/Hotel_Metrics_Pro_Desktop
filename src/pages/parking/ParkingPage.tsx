import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { Car, Plus, LogOut, BarChart3, Settings } from 'lucide-react';

interface ParkingConfig { capacite: number; tarifHeure: number; tarifJour: number; tarifNuit: number }

interface ParkingTicket { id: number; immatriculation: string; typeVehicule: string; statut: string; dateEntree: string; dateSortie?: string; montantTotal?: number; hotel_id?: number }
interface ParkingStats {
  placesTotal: number;
  placesOccupees: number;
  placesLibres: number;
  entreesAujourdhui: number;
  chiffreAffaireJour: number;
  tauxOccupation: number;
}

export default function ParkingPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const [pageTab, setPageTab] = useState<'exploitation' | 'parametrage'>('exploitation');
  const [showEntree, setShowEntree] = useState(false);
  const [form, setForm] = useState({ immatriculation: '', typeVehicule: 'voiture' });
  const [cfgForm, setCfgForm] = useState<ParkingConfig>({ capacite: 0, tarifHeure: 0, tarifJour: 0, tarifNuit: 0 });

  const { data: config } = useQuery({
    queryKey: ['parking-config', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.parking.getConfig(hotelId)) as ParkingConfig,
  });

  useEffect(() => {
    if (config) setCfgForm(config);
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.parking.saveConfig(hotelId, cfgForm)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parking'] }); notify.success('Paramètres parking enregistrés'); },
    onError: () => notify.error('Erreur enregistrement'),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['parking-tickets', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.parking.listTickets(hotelId, 'en_cours')) as ParkingTicket[],
  });
  const { data: stats } = useQuery({
    queryKey: ['parking-stats', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.parking.stats(hotelId)) as ParkingStats,
  });

  const entree = useMutation({
    mutationFn: async () =>
      unwrapIpc(await ipcClient.parking.entree({
        hotelId,
        immatriculation: form.immatriculation,
        typeVehicule: form.typeVehicule,
      })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parking'] }); setShowEntree(false); setForm({ immatriculation: '', typeVehicule: 'voiture' }); notify.success('Entrée enregistrée'); },
    onError: () => notify.error('Erreur entrée'),
  });

  const sortie = useMutation({
    mutationFn: async (ticketId: number) => unwrapIpc(await ipcClient.parking.sortie(ticketId)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parking'] }); notify.success('Sortie enregistrée'); },
  });

  const tauxOccupation = stats?.tauxOccupation ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Car className="w-7 h-7 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold">Parking</h1>
            <p className="text-sm text-muted-foreground">Gestion des entrées et sorties de véhicules</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={hotelId} onChange={e => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={() => setShowEntree(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Entrée véhicule
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
          <h2 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4" /> Tarifs & capacité</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">Capacité max<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.capacite} onChange={(e) => setCfgForm((c) => ({ ...c, capacite: Number(e.target.value) }))} /></label>
            <label className="text-xs">Tarif / heure (DA)<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifHeure} onChange={(e) => setCfgForm((c) => ({ ...c, tarifHeure: Number(e.target.value) }))} /></label>
            <label className="text-xs">Tarif journée<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifJour} onChange={(e) => setCfgForm((c) => ({ ...c, tarifJour: Number(e.target.value) }))} /></label>
            <label className="text-xs">Tarif nuit<input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-background" value={cfgForm.tarifNuit} onChange={(e) => setCfgForm((c) => ({ ...c, tarifNuit: Number(e.target.value) }))} /></label>
          </div>
          <button type="button" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">Enregistrer</button>
        </div>
      )}

      {pageTab === 'exploitation' && (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Places totales', value: stats?.placesTotal ?? '--', icon: Car, color: 'text-slate-600' },
          { label: 'Occupées', value: stats?.placesOccupees ?? '--', icon: Car, color: 'text-red-500' },
          { label: 'Libres', value: stats?.placesLibres ?? '--', icon: Car, color: 'text-green-600' },
          { label: 'Entrées aujourd\'hui', value: stats?.entreesAujourdhui ?? '--', icon: Plus, color: 'text-blue-500' },
          { label: 'CA du jour', value: stats ? `${stats.chiffreAffaireJour.toLocaleString()} DA` : '--', icon: BarChart3, color: 'text-yellow-600' },
        ].map(k => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Taux occupation */}
      {stats && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Taux d'occupation</span>
            <span className="font-bold">{tauxOccupation}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${tauxOccupation > 80 ? 'bg-red-500' : tauxOccupation > 60 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${tauxOccupation}%` }} />
          </div>
        </div>
      )}

      {/* Tickets en cours */}
      <div>
        <h2 className="font-semibold mb-3">Véhicules présents ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Aucun véhicule actuellement</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-lg">{t.immatriculation ?? '—'}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.typeVehicule} · Entrée {new Date(t.dateEntree).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button onClick={() => sortie.mutate(t.id)} className="flex items-center gap-1.5 text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100">
                  <LogOut className="w-4 h-4" /> Sortie
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {showEntree && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Entrée véhicule</h2>
            <div className="space-y-3">
              <input placeholder="Immatriculation *" value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value.toUpperCase() }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono" />
              <select value={form.typeVehicule} onChange={e => setForm(f => ({ ...f, typeVehicule: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                {['voiture', 'moto', 'camionnette', 'bus', 'autre'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowEntree(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button type="button" onClick={() => entree.mutate()} disabled={!form.immatriculation || entree.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {entree.isPending ? 'Enregistrement...' : 'Enregistrer entrée'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
