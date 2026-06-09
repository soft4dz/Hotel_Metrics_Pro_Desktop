import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatBytes, formatDateTime } from '@/lib/formatters';
import type { DatabaseInfoDto, IntegrityCheckResult } from '@/shared/types/database';

export function DatabasePage() {
  const [info, setInfo] = useState<DatabaseInfoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [integrity, setIntegrity] = useState<IntegrityCheckResult | null>(null);
  const [importPath, setImportPath] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setInfo(unwrapIpc(await ipcClient.database.getInfo()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runIntegrity = async () => {
    setBusy('integrity');
    setError('');
    setMessage('');
    try {
      const result = unwrapIpc(await ipcClient.database.integrityCheck());
      setIntegrity(result);
      setMessage(result.ok ? 'Intégrité vérifiée : aucune anomalie.' : 'Anomalies détectées.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  const runVacuum = async () => {
    if (!window.confirm('Exécuter VACUUM ? Cela peut prendre quelques secondes.')) return;
    setBusy('vacuum');
    setError('');
    setMessage('');
    try {
      const result = unwrapIpc(await ipcClient.database.vacuum());
      setMessage(
        `VACUUM terminé — ${formatBytes(result.sizeBefore)} → ${formatBytes(result.sizeAfter)}`,
      );
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  const pickImport = async () => {
    setError('');
    try {
      const path = unwrapIpc(await ipcClient.database.pickImportFile());
      if (path) setImportPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const runImport = async () => {
    if (!importPath) {
      setError('Sélectionnez d’abord un fichier SQL.');
      return;
    }
    const ok = window.confirm(
      'Cet import remplace les données métier (hôtels, utilisateurs, recettes, rubriques, objectifs). Continuer ?',
    );
    if (!ok) return;

    setBusy('import');
    setError('');
    setMessage('');
    try {
      const result = unwrapIpc(await ipcClient.database.importLegacy(importPath));
      const total = Object.values(result.stats).reduce((a, b) => a + b, 0);
      setMessage(`Import réussi — ${total} enregistrements importés. Reconnectez-vous si nécessaire.`);
      setImportPath('');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Base de données"
        description="État SQLite locale, maintenance et import legacy"
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={!!busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Fichier SQLite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="break-all">
              <span className="text-muted-foreground">Chemin :</span> {info?.databaseFile}
            </p>
            <p>
              <span className="text-muted-foreground">Taille :</span>{' '}
              {info ? formatBytes(info.sizeBytes) : '—'}
              {info && info.walSizeBytes > 0 && (
                <span className="text-muted-foreground"> (+ WAL {formatBytes(info.walSizeBytes)})</span>
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Mode journal :</span>{' '}
              <Badge variant="muted">{info?.journalMode ?? '—'}</Badge>
            </p>
            <p>
              <span className="text-muted-foreground">SQLite :</span> {info?.sqliteVersion}
            </p>
            <p>
              <span className="text-muted-foreground">Application :</span> v{info?.appVersion}
            </p>
            <p className="break-all pt-2 text-xs text-muted-foreground">
              Dossier données : {info?.dataDirectory}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              Logos application : {info?.logosDirectory}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              Logos projet (sources) : {info?.projectLogosDirectory}
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/settings/backup">
                <HardDrive className="mr-2 h-4 w-4" />
                Gérer les sauvegardes
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistiques</CardTitle>
            <CardDescription>Nombre d’enregistrements par table clé</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {info?.tableStats.map((row) => (
                <li key={row.table} className="flex items-center justify-between py-2">
                  <span>{row.label}</span>
                  <span className="font-mono tabular-nums">{row.count.toLocaleString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Migrations appliquées</CardTitle>
          <CardDescription>{info?.migrations.length ?? 0} migration(s) SQLite</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Fichier</th>
                  <th className="px-3 py-2 text-left font-medium">Appliquée le</th>
                </tr>
              </thead>
              <tbody>
                {info?.migrations.map((m) => (
                  <tr key={m.name} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-mono">{m.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDateTime(m.appliedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Maintenance
            </CardTitle>
            <CardDescription>Contrôle d’intégrité et compactage (VACUUM)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => void runIntegrity()}
              disabled={!!busy}
            >
              {busy === 'integrity' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Contrôle intégrité
            </Button>
            <Button variant="outline" onClick={() => void runVacuum()} disabled={!!busy}>
              {busy === 'vacuum' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="mr-2 h-4 w-4" />
              )}
              VACUUM
            </Button>
          </CardContent>
          {integrity && (
            <CardContent className="border-t pt-4">
              <div className="flex items-start gap-2 text-sm">
                {integrity.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <ul className="space-y-1 font-mono text-xs">
                  {integrity.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="h-4 w-4" />
              Import legacy (MySQL)
            </CardTitle>
            <CardDescription>
              Dump phpMyAdmin (.sql) — remplace les données métier existantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-all rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              {importPath || 'Aucun fichier sélectionné'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void pickImport()} disabled={!!busy}>
                Parcourir…
              </Button>
              <Button
                onClick={() => void runImport()}
                disabled={!!busy || !importPath}
                variant="destructive"
              >
                {busy === 'import' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" />
                )}
                Importer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
