import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { Handshake, Plus, TrendingUp, Users, Trophy } from 'lucide-react';

interface Opportunite { id: number; titre: string; type: string; statut: string; partenaireNom: string | null; montantEstime: number | null; probabilite: number; dateEcheance: string | null; commercialNom: string | null }
interface CommercialStats { totalPartenaires: number; opportunitesActives: number; montantPipeline: number; tauxConversion: number }

const statutColor = (s: string) => ({ prospection: 'bg-gray-100', qualification: 'bg-blue-100', proposition: 'bg-yellow-100', negociation: 'bg-orange-100', gagne: 'bg-green-100 text-green-700', perdu: 'bg-red-100 text-red-700', annule: 'bg-gray-100' }[s] ?? 'bg-gray-100');

export default function CommercialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'opportunites' | 'partenaires'>('opportunites');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', type: 'groupe', probabilite: 50, montantEstime: 0, dateEcheance: '' });

  const { data: opportunites = [] } = useQuery({
    queryKey: ['commercial-opportunites'],
    queryFn: async () => unwrapIpc(await ipcClient.commercial.listOpportunites()) as Opportunite[],
  });
  const { data: stats } = useQuery({
    queryKey: ['commercial-stats'],
    queryFn: async () => unwrapIpc(await ipcClient.commercial.stats()) as CommercialStats,
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.commercial.createOpportunite(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial'] }); setShowForm(false); notify.success('Opportunité créée'); },
    onError: () => notify.error('Erreur'),
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => unwrapIpc(await ipcClient.commercial.updateOpportunite(id, { statut })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial'] }); },
  });

  const actives = opportunites.filter(o => !['gagne', 'perdu', 'annule'].includes(o.statut));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Handshake className="w-7 h-7 text-green-700" />
          <div>
            <h1 className="text-2xl font-bold">Commercial</h1>
            <p className="text-sm text-muted-foreground">Pipeline commercial et partenariats</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Nouvelle opportunité
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Partenaires</p>
          <p className="text-3xl font-bold text-green-700">{stats?.totalPartenaires ?? '--'}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Opportunités actives</p>
          <p className="text-3xl font-bold">{stats?.opportunitesActives ?? '--'}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pipeline estimé</p>
          <p className="text-2xl font-bold">{stats ? `${stats.montantPipeline.toLocaleString()} DA` : '--'}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3" /> Taux de conversion</p>
          <p className="text-3xl font-bold text-amber-600">{stats ? `${stats.tauxConversion}%` : '--'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['opportunites', 'partenaires'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === 'opportunites' ? `Opportunités (${actives.length})` : 'Partenaires'}
          </button>
        ))}
      </div>

      {tab === 'opportunites' && (
        <div className="space-y-2">
          {actives.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Aucune opportunité active</p>
            </div>
          ) : actives.map(o => (
            <div key={o.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{o.titre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColor(o.statut)}`}>{o.statut}</span>
                  <span className="text-xs text-muted-foreground">{o.type}</span>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  {o.partenaireNom && <span>{o.partenaireNom}</span>}
                  <span>· {o.probabilite}% de probabilité</span>
                  {o.montantEstime && <span>· {o.montantEstime.toLocaleString()} DA</span>}
                  {o.dateEcheance && <span>· {o.dateEcheance}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => updateStatut.mutate({ id: o.id, statut: 'gagne' })} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100">Gagné</button>
                <button onClick={() => updateStatut.mutate({ id: o.id, statut: 'perdu' })} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100">Perdu</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'partenaires' && (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Gestion des partenaires disponible prochainement</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle opportunité</h2>
            <div className="space-y-3">
              <input placeholder="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  {['groupe', 'agence', 'entreprise', 'evenement', 'autre'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" min={0} max={100} placeholder="Probabilité %" value={form.probabilite} onChange={e => setForm(f => ({ ...f, probabilite: Number(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <input type="number" placeholder="Montant estimé (DA)" value={form.montantEstime || ''} onChange={e => setForm(f => ({ ...f, montantEstime: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input type="date" value={form.dateEcheance} onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.titre || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {create.isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
