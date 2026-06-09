import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatDateTime } from '@/lib/formatters';
import type { AuditLogItem } from '@/shared/types/admin';

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'accent'> = {
  LOGIN: 'success',
  LOGOUT: 'muted' as 'default',
  CREATE: 'accent',
  UPDATE: 'warning',
  DELETE: 'danger',
};

export function AuditLogPage() {  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = unwrapIpc(
        await ipcClient.audit.list({
          search: search || undefined,
          module: moduleFilter || undefined,
          limit: 300,
        }),
      );
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [search, moduleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (l) => (
        <span className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</span>
      ),
      className: 'w-36',
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <Badge variant={ACTION_VARIANT[l.action] ?? 'default'}>{l.action}</Badge>
      ),
    },
    { key: 'module', header: 'Module', render: (l) => l.module },
    {
      key: 'user',
      header: 'Utilisateur',
      render: (l) => (
        <div className="text-xs">
          <p>{l.userEmail ?? '—'}</p>
          {l.roleCode && (
            <p className="text-muted-foreground">{l.roleCode}</p>
          )}
        </div>
      ),
    },
    {
      key: 'desc',
      header: 'Description',
      render: (l) => <span className="text-sm">{l.description}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions sensibles sur la plateforme"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          <option value="">Tous les modules</option>
          <option value="auth">auth</option>
          <option value="administration">administration</option>
        </select>
        <Button variant="secondary" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(l) => l.id}
        loading={loading}
        emptyMessage="Aucune entrée d'audit"
      />
    </div>
  );
}
