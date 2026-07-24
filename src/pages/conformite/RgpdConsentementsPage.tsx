import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { CreateConsentementInput, RgpdConsentement } from '@/shared/types/rgpd';
import { Plus } from 'lucide-react';

export function RgpdConsentementsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreateConsentementInput>>({
    sujetType: 'client',
    dateConsentement: new Date().toISOString().slice(0, 10),
  });

  const { data: consentements = [], isLoading } = useQuery({
    queryKey: ['rgpd-consentements'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.listConsentements()) as RgpdConsentement[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.rgpd.createConsentement(form as CreateConsentementInput)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rgpd-consentements'] });
      qc.invalidateQueries({ queryKey: ['rgpd-dashboard'] });
      setShowForm(false);
      setForm({ sujetType: 'client', dateConsentement: new Date().toISOString().slice(0, 10) });
      notify.success('Consentement enregistré');
    },
    onError: () => notify.error('Erreur enregistrement'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Nouveau consentement
        </button>
      </div>
      {showForm && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <input className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Nom du sujet" value={form.sujetLabel ?? ''} onChange={(e) => setForm({ ...form, sujetLabel: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Finalité" value={form.finalite ?? ''} onChange={(e) => setForm({ ...form, finalite: e.target.value })} />
          <select className="border rounded-lg px-3 py-2 text-sm" value={form.sujetType} onChange={(e) => setForm({ ...form, sujetType: e.target.value as CreateConsentementInput['sujetType'] })}>
            <option value="client">Client</option>
            <option value="employe">Employé</option>
            <option value="heberge">Hébergé</option>
            <option value="autre">Autre</option>
          </select>
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
          {consentements.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl p-3 flex justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{c.sujetLabel} <span className="text-muted-foreground">({c.sujetType})</span></p>
                <p className="text-xs text-muted-foreground">{c.finalite} — {c.dateConsentement}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full h-fit ${c.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-muted'}`}>{c.statut}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
