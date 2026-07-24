import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { CreateIncidentInput, RgpdIncident } from '@/shared/types/rgpd';
import { Plus } from 'lucide-react';

const graviteColor: Record<string, string> = {
  faible: 'bg-gray-100', moderee: 'bg-yellow-100', grave: 'bg-orange-100', critique: 'bg-red-100',
};

export function RgpdIncidentsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Partial<CreateIncidentInput>>({
    gravite: 'moderee',
    dateIncident: today,
    dateDetection: today,
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['rgpd-incidents'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.listIncidents()) as RgpdIncident[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.rgpd.createIncident(form as CreateIncidentInput)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rgpd-incidents'] });
      qc.invalidateQueries({ queryKey: ['rgpd-dashboard'] });
      setShowForm(false);
      notify.success('Incident enregistré');
    },
    onError: () => notify.error('Erreur enregistrement'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Déclarer un incident
        </button>
      </div>
      {showForm && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.gravite} onChange={(e) => setForm({ ...form, gravite: e.target.value as CreateIncidentInput['gravite'] })}>
            <option value="faible">Faible</option>
            <option value="moderee">Modérée</option>
            <option value="grave">Grave</option>
            <option value="critique">Critique</option>
          </select>
          <input className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Nature de l'incident" value={form.nature ?? ''} onChange={(e) => setForm({ ...form, nature: e.target.value })} />
          <textarea className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Données concernées" value={form.donneesConcernees ?? ''} onChange={(e) => setForm({ ...form, donneesConcernees: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.notificationAnpdp ?? false} onChange={(e) => setForm({ ...form, notificationAnpdp: e.target.checked })} />
            Notification ANPDP effectuée ou planifiée
          </label>
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
          {incidents.map((i) => (
            <div key={i.id} className={`border rounded-xl p-3 ${graviteColor[i.gravite] ?? ''}`}>
              <div className="flex justify-between gap-2">
                <p className="font-medium text-sm">{i.nature}</p>
                <span className="text-xs font-medium">{i.gravite} · {i.statut}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Incident {i.dateIncident} · Détecté {i.dateDetection}
                {i.notificationAnpdp ? ' · ANPDP notifiée' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
