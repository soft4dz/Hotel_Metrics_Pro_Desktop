import { CloudOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface SyncStatusBadgeProps {
  className?: string;
  /** Icône seule sur petits écrans */
  compact?: boolean;
}

export function SyncStatusBadge({ className, compact = false }: SyncStatusBadgeProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data } = useSyncStatus();

  if (!data) return null;

  const pending = data.pendingCount + data.failedCount;
  if (pending <= 0) return null;

  const label =
    data.failedCount > 0
      ? `${data.failedCount} ${t('sync en échec')}`
      : `${data.pendingCount} ${t('en attente')}`;

  const shortLabel = data.failedCount > 0 ? `${data.failedCount} ${t('échec')}` : `${data.pendingCount}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100',
        compact ? 'inline-flex px-2 md:px-3' : 'hidden md:inline-flex',
        className,
      )}
      onClick={() => navigate('/system/sync')}
      title={label}
    >
      {data.failedCount > 0 ? (
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
      )}
      {compact ? (
        <>
          <span className="text-xs font-medium md:hidden">{shortLabel}</span>
          <span className="hidden text-xs font-medium md:inline">{label}</span>
        </>
      ) : (
        <span className="text-xs font-medium">{label}</span>
      )}
    </Button>
  );
}
