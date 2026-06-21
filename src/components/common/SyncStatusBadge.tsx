import { CloudOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatusBadge() {
  const navigate = useNavigate();
  const { data } = useSyncStatus();

  if (!data) return null;

  const pending = data.pendingCount + data.failedCount;
  if (pending <= 0) return null;

  const label =
    data.failedCount > 0
      ? `${data.failedCount} sync en échec`
      : `${data.pendingCount} en attente`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="hidden h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 md:inline-flex"
      onClick={() => navigate('/system/sync')}
      title="Ouvrir la synchronisation"
    >
      {data.failedCount > 0 ? (
        <CloudOff className="h-3.5 w-3.5" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}
