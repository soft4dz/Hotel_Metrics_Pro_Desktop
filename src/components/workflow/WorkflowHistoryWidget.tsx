import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatDateTime } from '@/lib/formatters';
import type { WorkflowHistoryEntry } from '@/shared/types/phase2';
import { History } from 'lucide-react';

interface WorkflowHistoryWidgetProps {
  workflowId: number;
}

export function WorkflowHistoryWidget({ workflowId }: WorkflowHistoryWidgetProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['workflow-history', workflowId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.workflow.history(workflowId)) as WorkflowHistoryEntry[],
    enabled: workflowId > 0,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-muted/50 p-4 animate-pulse h-24" />
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Aucun historique pour ce workflow.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="w-4 h-4" />
        Historique du workflow
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((entry) => (
          <div key={entry.id} className="border rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{entry.action}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
            </div>
            {(entry.ancienStatut || entry.nouveauStatut) && (
              <p className="text-xs text-muted-foreground mt-1">
                {entry.ancienStatut ?? '—'} → {entry.nouveauStatut ?? '—'}
              </p>
            )}
            {entry.actorNom && <p className="text-xs mt-1">Par {entry.actorNom}</p>}
            {entry.commentaire && <p className="text-xs mt-1">{entry.commentaire}</p>}
            {entry.motif && <p className="text-xs mt-1 text-red-600">Motif : {entry.motif}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkflowHistoryWidget;
