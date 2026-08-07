import { useEffect, useState } from 'react';
import { Briefcase, KeyRound, Loader2, Lock, RefreshCw, Server } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { notifyBrandingUpdated } from '@/lib/branding';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { LicenseConfigDto, LicenseStatusDto } from '@/shared/types/license';
function licenseBadgeClass(state: LicenseStatusDto['state']): string {
  switch (state) {
    case 'active':
    case 'development':
      return 'bg-brand-success/15 text-brand-success';
    case 'trial':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'expired':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function LicenseSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [license, setLicense] = useState<LicenseStatusDto | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseBusy, setLicenseBusy] = useState(false);

  const [config, setConfig] = useState<LicenseConfigDto>({
    licenseMode: 'offline',
    remoteServerUrl: '',
    organizationCode: '',
    remoteServerReachable: null,
  });
  const [configBusy, setConfigBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setLicense(unwrapIpc(await ipcClient.license.getStatus()));
      try {
        setConfig(unwrapIpc(await ipcClient.license.getConfig()));
      } catch {
        /* non-admin en lecture seule */
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSaveConfig = async () => {
    setConfigBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = unwrapIpc(await ipcClient.license.updateConfig(config));
      setConfig(updated);
      setMessage('Configuration licence enregistrée.');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur configuration.');
    } finally {
      setConfigBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLicenseBusy(true);
    setError('');
    setMessage('');
    try {
      const status = unwrapIpc(await ipcClient.license.activate(licenseKey.trim()));
      setLicense(status);
      setLicenseKey('');
      setMessage('Licence activée — profil métier appliqué automatiquement.');
      notifyBrandingUpdated();    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible.');
    } finally {
      setLicenseBusy(false);
    }
  };

  const handleSync = async () => {
    setSyncBusy(true);
    setError('');
    setMessage('');
    try {
      const status = unwrapIpc(await ipcClient.license.syncRemote());
      setLicense(status);
      setMessage('Licence synchronisée avec le serveur distant.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synchronisation impossible.');
    } finally {
      setSyncBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Licence"
        description="Droit d'usage de l'application — géré localement ou via le serveur Raqmi (multi-sociétés)."
      />

      {(message || error) && (
        <p
          className={cn(
            'mb-4 rounded-md px-3 py-2 text-sm',
            error ? 'bg-destructive/10 text-destructive' : 'bg-brand-success/10 text-brand-success',
          )}
        >
          {error || message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              État & activation
            </CardTitle>
            <CardDescription>
              Chaque société cliente active sa clé sur son poste. L&apos;éditeur émet les clés à distance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {license && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium uppercase', licenseBadgeClass(license.state))}>
                    {license.state}
                  </span>
                  {license.edition && <span className="text-muted-foreground">{license.edition}</span>}
                  <span className="text-xs text-muted-foreground">
                    ({license.licenseSource === 'remote' ? 'distante' : license.licenseSource === 'offline' ? 'locale' : 'dev'})
                  </span>
                </div>
                <p>{license.message}</p>
                {license.organizationCode && (
                  <p>
                    <span className="text-muted-foreground">Organisation :</span> {license.organizationCode}
                  </p>
                )}
                {license.expiresAt && (
                  <p>
                    <span className="text-muted-foreground">Expiration :</span> {license.expiresAt}
                  </p>
                )}
                {license.businessSectorLabel && (
                  <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <Briefcase className="h-4 w-4 shrink-0" />
                      {license.packLabel ?? `Profil métier : ${license.businessSectorLabel}`}
                      <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </p>
                    {license.licensedModuleCount != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pack complet : {license.licensedModuleCount} modules actifs — défini par Raqmi, non modifiable.
                      </p>
                    )}
                  </div>
                )}                {license.lastRemoteSyncAt && (
                  <p>
                    <span className="text-muted-foreground">Dernière sync :</span>{' '}
                    {new Date(license.lastRemoteSyncAt).toLocaleString('fr-FR')}
                  </p>
                )}
                <p className="break-all font-mono text-xs">
                  <span className="font-sans text-muted-foreground">Identifiant poste :</span> {license.machineId}
                </p>
              </>
            )}
            <div className="space-y-2 pt-1">
              <Label htmlFor="licenseKey">Clé de licence</Label>
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="RS-PRO-20271231-COMM-XXXXXXXX"
                disabled={licenseBusy}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={licenseBusy || !licenseKey.trim()} onClick={() => void handleActivate()}>
                {licenseBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Activer
              </Button>
              {config.licenseMode === 'remote' && config.remoteServerUrl && (
                <Button type="button" size="sm" variant="outline" disabled={syncBusy} onClick={() => void handleSync()}>
                  {syncBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Synchroniser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Serveur de licences (Raqmi)
            </CardTitle>
            <CardDescription>
              Mode <strong>remote</strong> : activation et contrôle centralisés pour toutes les sociétés vendues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <Label htmlFor="licenseMode">Mode</Label>
              <select
                id="licenseMode"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={config.licenseMode}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, licenseMode: e.target.value as LicenseConfigDto['licenseMode'] }))
                }
                disabled={configBusy}
              >
                <option value="offline">Offline — clé locale uniquement</option>
                <option value="remote">Remote — serveur Raqmi</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseServerUrl">URL serveur</Label>
              <Input
                id="licenseServerUrl"
                value={config.remoteServerUrl}
                onChange={(e) => setConfig((c) => ({ ...c, remoteServerUrl: e.target.value }))}
                placeholder="https://licences.raqmi.dz/api/v1"
                disabled={configBusy}
              />
              {config.remoteServerReachable === true && (
                <p className="text-xs text-brand-success">Serveur joignable.</p>
              )}
              {config.remoteServerReachable === false && (
                <p className="text-xs text-amber-600">Serveur injoignable — vérifiez l&apos;URL ou le réseau.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgCode">Code organisation client</Label>
              <Input
                id="orgCode"
                value={config.organizationCode}
                onChange={(e) => setConfig((c) => ({ ...c, organizationCode: e.target.value.toUpperCase() }))}
                placeholder="ORG-ACME"
                disabled={configBusy}
              />
              <p className="text-xs text-muted-foreground">
                Identifiant société chez Raqmi — permet de lier plusieurs postes à la même organisation.
              </p>
            </div>
            <Button type="button" size="sm" disabled={configBusy} onClick={() => void handleSaveConfig()}>
              {configBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer la configuration
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Architecture multi-sociétés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Vous vendez l&apos;ERP à plusieurs sociétés : déployez le <strong className="text-foreground">serveur de licences</strong> chez
            Raqmi (module NestJS dans <code className="rounded bg-muted px-1">server/</code>), pas chez chaque client.
          </p>
          <p>
            Chaque client installe l&apos;ERP desktop, configure l&apos;URL serveur + son code organisation, puis active sa clé.
            Le <strong className="text-foreground">profil métier</strong> (hôtellerie, commerce, port…) est embarqué dans la clé et appliqué automatiquement — seul Raqmi le choisit à l&apos;émission.
          </p>          <p>
            Documentation : <code className="rounded bg-muted px-1">docs/erp/ARCHITECTURE_LICENCES.md</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
