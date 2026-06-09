import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { SyncConfigDto, SyncQueueItem, SyncStatusDto } from '@/shared/types/sync';

export function SyncPage() {
  const [config, setConfig] = useState<SyncConfigDto | null>(null);
  const [status, setStatus] = useState<SyncStatusDto | null>(null);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [apiUrl, setApiUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, st, q] = await Promise.all([
        ipcClient.sync.getConfig(),
        ipcClient.sync.getStatus(),
        ipcClient.sync.listQueue(),
      ]);
      const c = unwrapIpc(cfg);
      setConfig(c);
      setApiUrl(c.apiBaseUrl);
      setStatus(unwrapIpc(st));
      setQueue(unwrapIpc(q));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    const c = unwrapIpc(await ipcClient.sync.updateConfig({ apiBaseUrl: apiUrl }));
    setConfig(c);
    setMessage('Configuration enregistrée.');
    await load();
  };

  const runSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const r = unwrapIpc(await ipcClient.sync.run());
      setMessage(r.message);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSyncing(false);
    }
  };

  const queueColumns: Column<SyncQueueItem>[] = [
    { key: 'date', header: 'Créé', render: (q) => q.createdAt.slice(0, 16) },
    { key: 'type', header: 'Entité', render: (q) => q.entityType },
    { key: 'action', header: 'Action', render: (q) => q.action },
    {
      key: 'status',
      header: 'Statut',
      render: (q) => (
        <Badge variant={q.status === 'synced' ? 'success' : q.status === 'failed' ? 'danger' : 'muted'}>
          {q.status}
        </Badge>
      ),
    },
    { key: 'err', header: 'Erreur', render: (q) => q.errorMessage ?? '—' },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Synchronisation"
        description="File d'attente offline et échange avec l'API centrale"
        action={
          <Button onClick={() => void runSync()} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Synchroniser maintenant
          </Button>
        }
      />

      {status && (
        <div className="flex flex-wrap gap-4">
          <Card className="min-w-[200px]">
            <CardContent className="flex items-center gap-3 pt-4">
              {status.online ? (
                <Cloud className="h-8 w-8 text-brand-success" />
              ) : (
                <CloudOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{status.online ? 'API en ligne' : 'API hors ligne'}</p>
                <p className="text-xs text-muted-foreground">{status.apiBaseUrl}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-2xl font-semibold">{status.pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Échecs</p>
              <p className="text-2xl font-semibold text-destructive">{status.failedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Dernière sync</p>
              <p className="text-sm">{status.lastSyncAt?.slice(0, 19) ?? 'Jamais'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Démarrez l&apos;API locale : <code className="text-xs">npm run server:dev</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>URL API centrale</Label>
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
          </div>
          {config && (
            <p className="text-xs text-muted-foreground">Identifiant poste : {config.deviceId}</p>
          )}
          <Button type="button" variant="secondary" onClick={() => void saveConfig()}>
            Enregistrer l&apos;URL
          </Button>
        </CardContent>
      </Card>

      {message && <p className="text-sm text-brand-turquoise">{message}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-medium">File d&apos;attente</h3>
          <DataTable columns={queueColumns} data={queue} keyExtractor={(q) => String(q.id)} />
        </div>
      )}
    </div>
  );
}
