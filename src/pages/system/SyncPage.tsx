import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { SyncConfigDto, SyncConflictItem, SyncQueueItem, SyncStatusDto } from '@/shared/types/sync';

export function SyncPage() {
  const [config, setConfig] = useState<SyncConfigDto | null>(null);
  const [status, setStatus] = useState<SyncStatusDto | null>(null);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([]);
  const [apiUrl, setApiUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsWarning, setMessageIsWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, st, q, conflictRows] = await Promise.all([
        ipcClient.sync.getConfig(),
        ipcClient.sync.getStatus(),
        ipcClient.sync.listQueue(),
        ipcClient.sync.listConflicts(),
      ]);
      const c = unwrapIpc(cfg);
      setConfig(c);
      setApiUrl(c.apiBaseUrl);
      setStatus(unwrapIpc(st));
      setQueue(unwrapIpc(q));
      setConflicts(unwrapIpc(conflictRows));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de charger la synchronisation.');
      setMessageIsWarning(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    try {
      const c = unwrapIpc(await ipcClient.sync.updateConfig({ apiBaseUrl: apiUrl }));
      setConfig(c);
      setMessage('Configuration enregistrée.');
      setMessageIsWarning(false);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Configuration invalide.');
      setMessageIsWarning(true);
    }
  };

  const setAutoSync = async (enabled: boolean) => {
    try {
      const c = unwrapIpc(await ipcClient.sync.updateConfig({ autoSync: enabled }));
      setConfig(c);
      setMessage(enabled ? 'Synchronisation automatique activée.' : 'Synchronisation automatique désactivée.');
      setMessageIsWarning(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de modifier la synchronisation automatique.');
      setMessageIsWarning(true);
    }
  };

  const retryFailed = async () => {
    try {
      const count = unwrapIpc(await ipcClient.sync.retryFailed());
      setMessage(`${count} élément(s) replacé(s) dans la file d'attente.`);
      setMessageIsWarning(false);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de relancer les éléments en échec.');
      setMessageIsWarning(true);
    }
  };

  const resolveConflict = async (item: SyncConflictItem, decision: 'keep_local' | 'apply_remote') => {
    const label = decision === 'keep_local' ? 'conserver la version locale' : 'appliquer la version distante';
    if (!window.confirm(`Confirmer : ${label} pour ${item.entityType} ${item.entityUuid} ?`)) return;
    try {
      unwrapIpc(await ipcClient.sync.resolveConflict(item.id, decision));
      setMessage(`Conflit #${item.id} résolu.`);
      setMessageIsWarning(false);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de résoudre ce conflit.');
      setMessageIsWarning(true);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setMessage('');
    setMessageIsWarning(false);
    try {
      const r = unwrapIpc(await ipcClient.sync.run());
      setMessage(r.message);
      setMessageIsWarning(r.failed > 0 || r.conflicts > 0 || r.quarantined > 0);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
      setMessageIsWarning(true);
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

  const conflictColumns: Column<SyncConflictItem>[] = [
    { key: 'date', header: 'Détecté', render: (c) => c.createdAt.slice(0, 16) },
    { key: 'type', header: 'Entité', render: (c) => `${c.entityType} · ${c.entityUuid.slice(0, 8)}` },
    { key: 'action', header: 'Action distante', render: (c) => c.remoteAction },
    { key: 'reason', header: 'Motif', render: (c) => c.reason },
    {
      key: 'status', header: 'Statut', render: (c) => (
        <Badge variant={c.status === 'open' ? 'danger' : 'success'}>{c.status === 'open' ? 'À résoudre' : 'Résolu'}</Badge>
      ),
    },
    {
      key: 'actions', header: 'Décision', render: (c) => c.status === 'open' ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void resolveConflict(c, 'keep_local')}>
            Garder local
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={() => void resolveConflict(c, 'apply_remote')}>
            Appliquer distant
          </Button>
        </div>
      ) : '—',
    },
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
              <p className="text-xs text-muted-foreground">Conflits ouverts</p>
              <p className="text-2xl font-semibold text-destructive">{status.openConflictCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Quarantaine</p>
              <p className="text-2xl font-semibold text-brand-warning">{status.quarantinedCount}</p>
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
            <>
              <p className="text-xs text-muted-foreground">Identifiant poste : {config.deviceId}</p>
              <div className="flex items-center gap-3">
                <Switch id="auto-sync" checked={config.autoSync} onCheckedChange={(checked) => void setAutoSync(checked)} />
                <Label htmlFor="auto-sync">Synchronisation automatique toutes les 5 minutes</Label>
              </div>
            </>
          )}
          <Button type="button" variant="secondary" onClick={() => void saveConfig()}>
            Enregistrer l&apos;URL
          </Button>
          <p className="text-xs text-muted-foreground">
            Les changements distants valides sont appliqués automatiquement. Les suppressions,
            références manquantes et versions locales plus récentes sont placées en conflit ou en quarantaine.
          </p>
        </CardContent>
      </Card>

      {message && (
        <p className={`text-sm ${messageIsWarning ? 'text-brand-warning' : 'text-brand-turquoise'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">File d&apos;attente</h3>
              {status && status.failedCount > 0 && (
                <Button type="button" size="sm" variant="secondary" onClick={() => void retryFailed()}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Relancer les échecs
                </Button>
              )}
            </div>
            <DataTable columns={queueColumns} data={queue} keyExtractor={(q) => String(q.id)} />
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-brand-warning" /> Conflits de synchronisation
            </h3>
            <DataTable columns={conflictColumns} data={conflicts} keyExtractor={(c) => String(c.id)} />
          </div>
        </div>
      )}
    </div>
  );
}
