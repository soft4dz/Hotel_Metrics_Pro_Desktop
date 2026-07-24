import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { CreateDemandeInput, RgpdDemandeDroit, RgpdDemandeStatut } from '@/shared/types/rgpd';
import { Plus } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  acces: 'Accès', rectification: 'Rectification', suppression: 'Suppression',
  opposition: 'Opposition', portabilite: 'Portabilité',
};

export function RgpdDemandesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreateDemandeInput>>({
    typeDemande: 'acces',
    sujetType: 'client',
    dateReception: new Date().toISOString().slice(0, 10),
  });

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['rgpd-demandes'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.listDemandes()) as RgpdDemandeDroit[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.rgpd.createDemande(form as CreateDemandeInput)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rgpd-demandes'] });
      qc.invalidateQueries({ queryKey: ['rgpd-dashboard'] });
      setShowForm(false);
      notify.success('Demande enregistrée — workflow créé');
    },
    onError: () => notify.error('Erreur enregistrement'),
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: RgpdDemandeStatut }) =>
      unwrapIpc(await ipcClient.rgpd.updateDemande(id, statut)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rgpd-demandes'] });
      qc.invalidateQueries({ queryKey: ['rgpd-dashboard'] });
      notify.success('Statut mis à jour');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>
      {showForm && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.typeDemande} onChange={(e) => setForm({ ...form, typeDemande: e.target.value as CreateDemandeInput['typeDemande'] })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Nom du demandeur" value={form.sujetLabel ?? ''} onChange={(e) => setForm({ ...form, sujetLabel: e.target.value })} />
          <textarea className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={() => create.mutate()} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">Enregistrer</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      ) : (
        <div className="space-y-2">
          {demandes.map((d) => (
            <div key={d.id} className="bg-card border rounded-xl p-3">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{TYPE_LABELS[d.typeDemande]} — {d.sujetLabel}</p>
                  <p className="text-xs text-muted-foreground">Reçue {d.dateReception} · Échéance {d.dateEcheance ?? '—'}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted h-fit">{d.statut}</span>
              </div>
              {d.statut === 'recue' && (
                <button type="button" onClick={() => updateStatut.mutate({ id: d.id, statut: 'en_cours' })} className="text-xs text-primary mt-2 hover:underline">
                  Prendre en charge
                </button>
              )}
              {d.statut === 'en_cours' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => updateStatut.mutate({ id: d.id, statut: 'traitee' })} className="text-xs text-green-700 hover:underline">Traiter</button>
                  <button type="button" onClick={() => updateStatut.mutate({ id: d.id, statut: 'refusee' })} className="text-xs text-red-700 hover:underline">Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
