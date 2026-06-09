import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, HardDrive, Loader2, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatBytes, formatDateTime } from '@/lib/formatters';
import type { BackupListItem } from '@/shared/types/database';

export function BackupPage() {
  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [backupsDir, setBackupsDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyFile, setBusyFile] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, dbInfo] = await Promise.all([
        ipcClient.backup.list(),
        ipcClient.database.getInfo(),
      ]);
      setBackups(unwrapIpc(list));
      setBackupsDir(unwrapIpc(dbInfo).backupsDirectory);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createBackup = async () => {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const created = unwrapIpc(await ipcClient.backup.create());
      setMessage(`Sauvegarde créée : ${created.filename} (${formatBytes(created.sizeBytes)})`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    const ok = window.confirm(
      `Restaurer la sauvegarde « ${filename} » ?\n\nLes données actuelles seront remplacées. L’application redémarrera.`,
    );
    if (!ok) return;

    setBusyFile(filename);
    setError('');
    setMessage('');
    try {
      const result = unwrapIpc(await ipcClient.backup.restore(filename));
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusyFile('');
    }
  };

  const deleteBackup = async (filename: string) => {
    const ok = window.confirm(`Supprimer définitivement « ${filename} » ?`);
    if (!ok) return;

    setBusyFile(filename);
    setError('');
    setMessage('');
    try {
      unwrapIpc(await ipcClient.backup.delete(filename));
      setMessage(`Sauvegarde supprimée : ${filename}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusyFile('');
    }
  };

  const columns: Column<BackupListItem>[] = [
    {
      key: 'filename',
      header: 'Fichier',
      render: (b) => <span className="font-mono text-xs">{b.filename}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (b) => formatDateTime(b.createdAt),
    },
    {
      key: 'size',
      header: 'Taille',
      render: (b) => formatBytes(b.sizeBytes),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={busyFile === b.filename}
            onClick={() => void restoreBackup(b.filename)}
          >
            {busyFile === b.filename ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-3 w-3" />
            )}
            Restaurer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            disabled={busyFile === b.filename}
            onClick={() => void deleteBackup(b.filename)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Sauvegarde"
        description="Copies de sécurité de la base SQLite locale"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => void createBackup()} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Nouvelle sauvegarde
            </Button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-brand-success/10 px-4 py-3 text-sm text-brand-success">
          {message}
        </p>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Dossier de sauvegarde
          </CardTitle>
          <CardDescription>
            Les copies sont stockées localement sur cette machine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="break-all font-mono text-xs text-muted-foreground">{backupsDir || '—'}</p>
          <p className="text-muted-foreground">
            Utilisez l’API SQLite <code className="rounded bg-secondary px-1">backup()</code> pour une
            copie cohérente, même pendant l’utilisation de l’application.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/database">
              <Database className="mr-2 h-4 w-4" />
              Base de données
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sauvegardes disponibles</CardTitle>
          <CardDescription>
            {loading ? 'Chargement…' : `${backups.length} fichier(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : backups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Aucune sauvegarde. Cliquez sur « Nouvelle sauvegarde » pour créer une copie.
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={backups}
              keyExtractor={(b) => b.filename}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
