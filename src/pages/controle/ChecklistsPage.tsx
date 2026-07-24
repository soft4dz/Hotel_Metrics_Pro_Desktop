import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { ChecklistTemplate, ChecklistRun, ChecklistResultItem } from '@/shared/types/phase2';
import { ClipboardCheck, Play } from 'lucide-react';

const RESULT_STATUTS = ['conforme', 'non_conforme', 'na', 'partiel'];

export default function ChecklistsPage() {
  const qc = useQueryClient();
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>(defaultHotelId || undefined);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [localResults, setLocalResults] = useState<Record<number, { statut: string; commentaire: string }>>({});

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => unwrapIpc(await ipcClient.checklist.templates()) as ChecklistTemplate[],
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['checklist-runs', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.checklist.list(hotelId)) as ChecklistRun[],
  });

  const { data: runDetail } = useQuery({
    queryKey: ['checklist-run', activeRunId],
    queryFn: async () => unwrapIpc(await ipcClient.checklist.get(activeRunId!)),
    enabled: activeRunId !== null,
  });

  const start = useMutation({
    mutationFn: async (templateId: number) =>
      unwrapIpc(await ipcClient.checklist.start(templateId, hotelId)),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['checklist-runs'] });
      setActiveRunId((run as ChecklistRun).id);
      setLocalResults({});
      notify.success('Contrôle démarré');
    },
    onError: () => notify.error('Erreur démarrage contrôle'),
  });

  const updateResult = useMutation({
    mutationFn: async ({ itemId, statut, commentaire }: { itemId: number; statut: string; commentaire?: string }) =>
      unwrapIpc(await ipcClient.checklist.updateResult(activeRunId!, itemId, { statut, commentaire })),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const results = runDetail?.results as ChecklistResultItem[] | undefined;
      if (results) {
        for (const r of results) {
          const local = localResults[r.itemId];
          if (local) {
            await unwrapIpc(await ipcClient.checklist.updateResult(activeRunId!, r.itemId, local));
          }
        }
      }
      return unwrapIpc(await ipcClient.checklist.submit(activeRunId!));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-runs'] });
      qc.invalidateQueries({ queryKey: ['checklist-run'] });
      setActiveRunId(null);
      setLocalResults({});
      notify.success('Checklist soumise');
    },
    onError: () => notify.error('Erreur soumission'),
  });

  const results = (runDetail?.results ?? []) as ChecklistResultItem[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Checklists de contrôle</h1>
          <p className="text-sm text-muted-foreground">Modèles et exécutions des contrôles internes</p>
        </div>
      </div>

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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Modèles disponibles</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun modèle.</p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">{t.libelle}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.domaine} · {t.frequence} · {t.itemsCount} items
                </p>
              </div>
              <button
                onClick={() => start.mutate(t.id)}
                disabled={start.isPending}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90"
              >
                <Play className="w-3 h-3" /> Démarrer
              </button>
            </div>
          ))
        )}
      </div>

      {activeRunId && results.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold">Exécution en cours</h2>
          {results.map((r) => (
            <div key={r.itemId} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{r.libelle}</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={localResults[r.itemId]?.statut ?? r.statut}
                  onChange={(e) => {
                    const statut = e.target.value;
                    setLocalResults((prev) => ({ ...prev, [r.itemId]: { ...prev[r.itemId], statut, commentaire: prev[r.itemId]?.commentaire ?? '' } }));
                    updateResult.mutate({ itemId: r.itemId, statut });
                  }}
                  className="border rounded-lg px-2 py-1 text-sm bg-background"
                >
                  {RESULT_STATUTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  placeholder="Commentaire"
                  value={localResults[r.itemId]?.commentaire ?? r.commentaire ?? ''}
                  onChange={(e) => setLocalResults((prev) => ({
                    ...prev,
                    [r.itemId]: { statut: prev[r.itemId]?.statut ?? r.statut, commentaire: e.target.value },
                  }))}
                  className="flex-1 border rounded-lg px-2 py-1 text-sm bg-background min-w-[120px]"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Soumettre la checklist
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Historique</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune exécution.</p>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              onClick={() => setActiveRunId(run.id)}
              className={`bg-card border rounded-xl p-4 flex justify-between cursor-pointer ${activeRunId === run.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div>
                <span className="font-medium text-sm">{run.templateLibelle}</span>
                <span className="text-xs text-muted-foreground ml-2">{run.dateControle}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {run.statut}{run.score != null && ` · ${run.score}%`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
