import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { WorkflowHistoryWidget } from '@/components/workflow/WorkflowHistoryWidget';
import type { WorkflowPendingItem } from '@/shared/types/workflowProcedure';
import { GitBranch, CheckCircle, XCircle, Settings2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function WorkflowsPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [showReject, setShowReject] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['workflows-pending', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.workflow.listPendingWithContext({ pendingOnly: true, hotelId })) as WorkflowPendingItem[],
  });

  const approve = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.workflow.approve(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows-pending'] });
      qc.invalidateQueries({ queryKey: ['workflow-history'] });
      notify.success('Workflow approuvé');
    },
    onError: (err: Error) => notify.error(err.message || 'Erreur lors de l\'approbation'),
  });

  const reject = useMutation({
    mutationFn: async ({ id, motif }: { id: number; motif: string }) =>
      unwrapIpc(await ipcClient.workflow.reject(id, motif)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows-pending'] });
      qc.invalidateQueries({ queryKey: ['workflow-history'] });
      setShowReject(null);
      setRejectMotif('');
      notify.success('Workflow refusé');
    },
    onError: (err: Error) => notify.error(err.message || 'Erreur lors du refus'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Workflows en attente</h1>
            <p className="text-sm text-muted-foreground">Validation selon les procédures paramétrées</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/workflows/procedures">
            <Settings2 className="w-4 h-4 mr-2" /> Procédures
          </Link>
        </Button>
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

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun workflow en attente</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {items.map(({ workflow: w, context: ctx }) => (
              <div
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-colors ${selectedId === w.id ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="font-semibold text-sm">{ctx.procedureLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.module} · {w.entityType} #{w.entityId} · Priorité {w.priorite}
                    </div>
                    <Badge variant="muted" className="text-[10px]">
                      Étape {ctx.stepIndex}/{ctx.stepTotal} — {ctx.currentStepLabel}
                    </Badge>
                    {ctx.hint && <p className="text-xs text-amber-700 dark:text-amber-400">{ctx.hint}</p>}
                    {w.commentaire && <p className="text-sm text-muted-foreground">{w.commentaire}</p>}
                    {ctx.moduleRoute && ctx.approvalMode === 'module_only' && (
                      <Button size="sm" variant="ghost" className="h-auto p-0" asChild onClick={(e) => e.stopPropagation()}>
                        <Link to={ctx.moduleRoute}>
                          <ExternalLink className="w-3 h-3 mr-1 inline" /> Traiter dans l&apos;écran métier
                        </Link>
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); approve.mutate(w.id); }}
                      disabled={approve.isPending || !ctx.canApprove}
                      title={ctx.canApprove ? 'Approuver cette étape' : 'Action non autorisée ou réservée à l\'écran métier'}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" /> Approuver
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowReject(w.id); setSelectedId(w.id); }}
                      disabled={!ctx.canReject}
                      className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" /> Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedId && (
            <WorkflowHistoryWidget workflowId={selectedId} />
          )}
        </div>
      )}

      {showReject !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Refuser le workflow</h2>
            <textarea
              placeholder="Motif du refus *"
              value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReject(null)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">
                Annuler
              </button>
              <button
                onClick={() => reject.mutate({ id: showReject, motif: rejectMotif })}
                disabled={!rejectMotif.trim() || reject.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:opacity-90 disabled:opacity-50"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
