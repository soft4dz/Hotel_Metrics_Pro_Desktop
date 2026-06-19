import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { CreateReclamationInput, Reclamation } from '@/shared/types/reclamations';
import { useHotelsList } from '@/hooks/useHotelsList';
import { MessageSquareWarning, Plus, CheckCircle } from 'lucide-react';

const STATUTS = [
  { value: '', label: 'Toutes' },
  { value: 'ouverte', label: 'Ouvertes' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'resolue', label: 'Résolues' },
];
const CANAUX = [
  { value: 'reception', label: 'Accueil' },
  { value: 'email', label: 'E-mail' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'web', label: 'Web' },
  { value: 'autre', label: 'Autre' },
];
const CATEGORIES = [
  { value: 'chambre', label: 'Chambre' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'service', label: 'Service' },
  { value: 'proprete', label: 'Propreté' },
  { value: 'bruit', label: 'Bruit' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'autre', label: 'Autre' },
];

const prioriteColor = (p: string) =>
  ({ basse: 'text-gray-500', normale: 'text-blue-500', haute: 'text-orange-500', urgente: 'text-red-500' }[p] ?? 'text-gray-500');

const canalLabel = (canal: string) => CANAUX.find((c) => c.value === canal)?.label ?? canal;

export default function ReclamationsPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [statut, setStatut] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    objet: '',
    clientNom: '',
    clientEmail: '',
    canal: 'reception',
    categorie: 'chambre',
    priorite: 'normale',
    description: '',
  });

  const { data: reclamations = [], isLoading } = useQuery({
    queryKey: ['reclamations', hotelId, statut],
    queryFn: async () =>
      unwrapIpc(await ipcClient.reclamations.list(hotelId, statut || undefined)) as Reclamation[],
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: CreateReclamationInput = {
        hotelId,
        clientNom: form.clientNom.trim() || 'Client',
        clientEmail: form.clientEmail || undefined,
        canal: form.canal,
        categorie: form.categorie,
        objet: form.objet.trim(),
        description: form.description || undefined,
        priorite: form.priorite,
      };
      return unwrapIpc(await ipcClient.reclamations.create(payload));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reclamations'] });
      setShowForm(false);
      setForm({ objet: '', clientNom: '', clientEmail: '', canal: 'reception', categorie: 'chambre', priorite: 'normale', description: '' });
      notify.success('Réclamation enregistrée');
    },
    onError: () => notify.error('Erreur lors de l\'enregistrement'),
  });

  const resoudre = useMutation({
    mutationFn: async (id: number) =>
      unwrapIpc(await ipcClient.reclamations.update(id, { statut: 'resolue', dateResolution: new Date().toISOString().slice(0, 10) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reclamations'] });
      notify.success('Réclamation résolue');
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquareWarning className="w-7 h-7 text-yellow-600" />
          <div>
            <h1 className="text-2xl font-bold">Qualité & Réclamations</h1>
            <p className="text-sm text-muted-foreground">Gestion des réclamations clients et suivi qualité</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Nouvelle réclamation
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={hotelId ?? ''}
          onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)}
          className="border rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">Tous les hôtels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {STATUTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatut(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statut === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : reclamations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquareWarning className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune réclamation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reclamations.map((r) => (
            <div key={r.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                  <span className="font-semibold text-sm">{r.objet}</span>
                  <span className={`text-xs font-medium ${prioriteColor(r.priorite)}`}>{r.priorite}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{r.categorie}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{r.statut}</span>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                  <span>{r.clientNom}</span>
                  <span>· {canalLabel(r.canal)}</span>
                  <span>· {r.dateReception}</span>
                  {r.hotelNom && <span>· {r.hotelNom}</span>}
                </div>
              </div>
              {r.statut !== 'resolue' && r.statut !== 'fermee' && (
                <button
                  onClick={() => resoudre.mutate(r.id)}
                  className="shrink-0 flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100"
                >
                  <CheckCircle className="w-3 h-3" /> Résoudre
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle réclamation</h2>
            <div className="space-y-3">
              <input
                placeholder="Objet *"
                value={form.objet}
                onChange={(e) => setForm((f) => ({ ...f, objet: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Nom du client"
                  value={form.clientNom}
                  onChange={(e) => setForm((f) => ({ ...f, clientNom: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm bg-background"
                />
                <input
                  placeholder="Email"
                  value={form.clientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.canal}
                  onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm bg-background"
                >
                  {CANAUX.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm bg-background"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button
                onClick={() => create.mutate()}
                disabled={!form.objet.trim() || create.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
