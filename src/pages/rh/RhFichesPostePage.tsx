import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { FichePoste } from '@/shared/types/phase2';
import { FileText, Plus } from 'lucide-react';

type FichePosteExtended = FichePoste & {
  missionPrincipale?: string | null;
  competencesRequises?: string | null;
  indicateursPerformance?: string | null;
};

export default function RhFichesPostePage() {
  const qc = useQueryClient();
  const [posteIdFilter, setPosteIdFilter] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    posteId: '',
    missionPrincipale: '',
    responsabilites: '',
    competencesRequises: '',
    indicateursPerformance: '',
  });

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches-poste', posteIdFilter],
    queryFn: async () =>
      unwrapIpc(await ipcClient.rh.listFichesPoste(posteIdFilter)) as FichePosteExtended[],
  });

  const upsert = useMutation({
    mutationFn: async () =>
      unwrapIpc(await ipcClient.rh.upsertFichePoste({
        posteId: Number(form.posteId),
        missionPrincipale: form.missionPrincipale || undefined,
        responsabilites: form.responsabilites || undefined,
        competencesRequises: form.competencesRequises || undefined,
        indicateursPerformance: form.indicateursPerformance || undefined,
      } as Parameters<typeof ipcClient.rh.upsertFichePoste>[0])),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiches-poste'] });
      setShowForm(false);
      setForm({ posteId: '', missionPrincipale: '', responsabilites: '', competencesRequises: '', indicateursPerformance: '' });
      notify.success('Fiche de poste enregistrée');
    },
    onError: () => notify.error('Erreur enregistrement fiche'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fiches de poste</h1>
            <p className="text-sm text-muted-foreground">Référentiel des missions et compétences</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Nouvelle fiche
        </button>
      </div>

      <input
        type="number"
        placeholder="Filtrer par ID poste (optionnel)"
        value={posteIdFilter ?? ''}
        onChange={(e) => setPosteIdFilter(e.target.value ? Number(e.target.value) : undefined)}
        className="border rounded-lg px-3 py-2 text-sm bg-background w-64"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : fiches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune fiche de poste.</p>
      ) : (
        <div className="space-y-3">
          {fiches.map((f) => (
            <div key={f.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{f.posteLibelle}</span>
                <span className="text-xs text-muted-foreground">v{f.version}</span>
              </div>
              {(f.missionPrincipale ?? f.missions) && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {f.missionPrincipale ?? f.missions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle fiche de poste</h2>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="ID poste *"
                value={form.posteId}
                onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              />
              <textarea
                placeholder="Mission principale"
                value={form.missionPrincipale}
                onChange={(e) => setForm((f) => ({ ...f, missionPrincipale: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
              />
              <textarea
                placeholder="Responsabilités"
                value={form.responsabilites}
                onChange={(e) => setForm((f) => ({ ...f, responsabilites: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
              />
              <textarea
                placeholder="Compétences requises"
                value={form.competencesRequises}
                onChange={(e) => setForm((f) => ({ ...f, competencesRequises: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
              />
              <textarea
                placeholder="Indicateurs de performance"
                value={form.indicateursPerformance}
                onChange={(e) => setForm((f) => ({ ...f, indicateursPerformance: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">
                Annuler
              </button>
              <button
                onClick={() => upsert.mutate()}
                disabled={!form.posteId || upsert.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {upsert.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
