import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { Anomalie, CreateAnomalieInput } from '@/shared/types/anomalies';
import { useHotelsList } from '@/hooks/useHotelsList';
import { AlertTriangle, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';

const STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'resolue', label: 'Résolue' },
  { value: 'fermee', label: 'Fermée' },
];

const GRAVITES = ['mineure', 'moderee', 'grave', 'critique'];
const TYPES = ['technique', 'securite', 'hygiene', 'service', 'autre'];

const statIcon = (s: string) => {
  if (s === 'resolue' || s === 'fermee') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (s === 'en_cours') return <Clock className="w-4 h-4 text-blue-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
};
const graviteColor = (g: string) => ({ mineure: 'bg-gray-100 text-gray-700', moderee: 'bg-yellow-100 text-yellow-800', grave: 'bg-orange-100 text-orange-800', critique: 'bg-red-100 text-red-800' }[g] ?? 'bg-gray-100');

export default function AnomaliesPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [statut, setStatut] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreateAnomalieInput>>({});

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ['anomalies', hotelId, statut],
    queryFn: async () => unwrapIpc(await ipcClient.anomalies.list(hotelId, statut || undefined)) as Anomalie[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.anomalies.create(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['anomalies'] }); setShowForm(false); setForm({}); notify.success('Anomalie enregistrée'); },
    onError: () => notify.error('Erreur lors de l\'enregistrement'),
  });

  const resolve = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.anomalies.update(id, { statut: 'resolue' })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['anomalies'] }); notify.success('Anomalie résolue'); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Journal des Anomalies</h1>
            <p className="text-sm text-muted-foreground">Suivi et résolution des anomalies opérationnelles</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Nouvelle anomalie
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={hotelId ?? ''} onChange={e => setHotelId(e.target.value ? Number(e.target.value) : undefined)} className="border rounded-lg px-3 py-2 text-sm bg-background">
          <option value="">Tous les hôtels</option>
          {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <div className="flex gap-1">
          {STATUTS.map(s => (
            <button key={s.value} onClick={() => setStatut(s.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statut === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune anomalie trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((a) => (
            <div key={a.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {statIcon(a.statut)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.titre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${graviteColor(a.gravite)}`}>{a.gravite}</span>
                    <span className="text-xs text-muted-foreground">{a.typeAnomalie}</span>
                  </div>
                  {a.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{a.dateAnomalie}</span>
                    {a.hotelNom && <span>· {a.hotelNom}</span>}
                    {a.localisation && <span>· {a.localisation}</span>}
                  </div>
                </div>
              </div>
              {(a.statut === 'ouverte' || a.statut === 'en_cours') && (
                <button onClick={() => resolve.mutate(a.id)} className="shrink-0 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100">
                  Résoudre
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle anomalie</h2>
            <div className="space-y-3">
              <select value={form.hotelId ?? ''} onChange={e => setForm(f => ({ ...f, hotelId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="">Sélectionner un hôtel</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input placeholder="Titre *" value={form.titre ?? ''} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <textarea placeholder="Description" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.typeAnomalie ?? ''} onChange={e => setForm(f => ({ ...f, typeAnomalie: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Type</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.gravite ?? ''} onChange={e => setForm(f => ({ ...f, gravite: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Gravité</option>
                  {GRAVITES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <input placeholder="Localisation" value={form.localisation ?? ''} onChange={e => setForm(f => ({ ...f, localisation: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.titre || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
