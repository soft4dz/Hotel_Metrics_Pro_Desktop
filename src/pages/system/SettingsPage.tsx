import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Database, Loader2, Save, User } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { canManageSync, canManageUsers } from '@/shared/permissions';
import type { AppInfoDto, AppSettingsDto } from '@/shared/types/settings';

const DEFAULT_SETTINGS: AppSettingsDto = {
  companyName: 'EGT Sidi Fredj',
  companyLegalName: 'Entreprise de Gestion Touristique de Sidi Fredj',
  companyAddress: 'Sidi Fredj, Staoueli, Alger',
  companyPhone: '',
  companyEmail: '',
  defaultHomePage: '/modules',
  defaultCurrency: 'DZD',
  amountDecimals: 2,
  dailyRevenueDeadline: '09:30',
  validationRequired: true,
  correctionRequiresReason: true,
  autoBackupEnabled: true,
  autoBackupTime: '18:00',
  backupRetentionCount: 30,
  auditEnabled: true,
  reportHeader: 'Hotel Metrics Pro - Rapport interne',
  reportFooter: 'Document généré automatiquement',
  tauxTvaPort: 19,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
};

function mergeSettings(partial?: Partial<AppSettingsDto>): AppSettingsDto {
  return { ...DEFAULT_SETTINGS, ...partial };
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = canManageUsers(user?.role);

  const [info, setInfo] = useState<AppInfoDto | null>(null);
  const [form, setForm] = useState<AppSettingsDto>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = unwrapIpc(await ipcClient.settings.getAppInfo());
        setInfo(data);
        setForm(mergeSettings(data.settings));
      } catch {
        setForm(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const setField = <K extends keyof AppSettingsDto>(key: K, value: AppSettingsDto[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = unwrapIpc(await ipcClient.settings.update(form));
      setForm(mergeSettings(updated));
      if (info) {
        setInfo({ ...info, settings: mergeSettings(updated) });
      }
      setMessage('Paramètres enregistrés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
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

  const disabled = !isAdmin;

  return (
    <div className="page-shell">
      <PageHeader
        title="Paramètres généraux"
        description="Compte, application et préférences métier"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Mon compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nom :</span>{' '}
              {user?.fullName ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">E-mail :</span> {user?.email ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Rôle :</span>{' '}
              {user?.roleLabel ?? user?.role ?? '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Version :</span>{' '}
              {info?.version ?? '—'}
            </p>
            <p className="break-all">
              <span className="text-muted-foreground">Chemin de la base locale :</span>{' '}
              {info?.databaseFile ?? '—'}
            </p>
            {canManageSync(user?.role) && (
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/system/sync">
                  <Cloud className="mr-2 h-4 w-4" />
                  Synchronisation
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations entreprise</CardTitle>
            <CardDescription>Identité affichée sur les documents et rapports internes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom court</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyLegalName">Raison sociale</Label>
              <Input
                id="companyLegalName"
                value={form.companyLegalName}
                onChange={(e) => setField('companyLegalName', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyAddress">Adresse</Label>
              <Input
                id="companyAddress"
                value={form.companyAddress}
                onChange={(e) => setField('companyAddress', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={form.companyPhone}
                onChange={(e) => setField('companyPhone', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">E-mail officiel</Label>
              <Input
                id="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={(e) => setField('companyEmail', e.target.value)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exploitation &amp; finances</CardTitle>
            <CardDescription>Préférences par défaut pour la navigation et les montants.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultHomePage">Page d&apos;accueil par défaut</Label>
              <Input
                id="defaultHomePage"
                value={form.defaultHomePage}
                onChange={(e) => setField('defaultHomePage', e.target.value)}
                placeholder="/modules"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Devise par défaut</Label>
              <Input
                id="defaultCurrency"
                value={form.defaultCurrency}
                onChange={(e) => setField('defaultCurrency', e.target.value)}
                placeholder="DZD"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountDecimals">Nombre de décimales</Label>
              <Input
                id="amountDecimals"
                type="number"
                min={0}
                max={4}
                value={form.amountDecimals}
                onChange={(e) => setField('amountDecimals', parseInt(e.target.value, 10) || 0)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyRevenueDeadline">Heure limite saisie CA quotidien</Label>
              <Input
                id="dailyRevenueDeadline"
                type="time"
                value={form.dailyRevenueDeadline}
                onChange={(e) => setField('dailyRevenueDeadline', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tauxTvaPort">Taux TVA port (%)</Label>
              <Input
                id="tauxTvaPort"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.tauxTvaPort}
                onChange={(e) => setField('tauxTvaPort', parseFloat(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>Règles de validation des recettes et corrections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.validationRequired}
                onChange={(e) => setField('validationRequired', e.target.checked)}
                disabled={disabled}
              />
              Validation obligatoire
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.correctionRequiresReason}
                onChange={(e) => setField('correctionRequiresReason', e.target.checked)}
                disabled={disabled}
              />
              Motif obligatoire en cas de correction
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sécurité</CardTitle>
            <CardDescription>Politique de verrouillage après échecs de connexion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min={3}
                max={20}
                value={form.maxLoginAttempts}
                onChange={(e) => setField('maxLoginAttempts', parseInt(e.target.value, 10) || 3)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockoutMinutes">Verrouillage (minutes)</Label>
              <Input
                id="lockoutMinutes"
                type="number"
                min={5}
                max={120}
                value={form.lockoutMinutes}
                onChange={(e) => setField('lockoutMinutes', parseInt(e.target.value, 10) || 5)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sauvegarde</CardTitle>
            <CardDescription>Sauvegarde automatique de la base locale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoBackupEnabled}
                onChange={(e) => setField('autoBackupEnabled', e.target.checked)}
                disabled={disabled}
              />
              Sauvegarde automatique activée
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="autoBackupTime">Heure de sauvegarde</Label>
                <Input
                  id="autoBackupTime"
                  type="time"
                  value={form.autoBackupTime}
                  onChange={(e) => setField('autoBackupTime', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupRetentionCount">Nombre de sauvegardes à conserver</Label>
                <Input
                  id="backupRetentionCount"
                  type="number"
                  min={1}
                  max={365}
                  value={form.backupRetentionCount}
                  onChange={(e) =>
                    setField('backupRetentionCount', parseInt(e.target.value, 10) || 1)
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rapports &amp; audit</CardTitle>
            <CardDescription>En-têtes des rapports et journalisation des actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.auditEnabled}
                onChange={(e) => setField('auditEnabled', e.target.checked)}
                disabled={disabled}
              />
              Audit activé
            </label>
            <div className="space-y-2">
              <Label htmlFor="reportHeader">En-tête rapport</Label>
              <Input
                id="reportHeader"
                value={form.reportHeader}
                onChange={(e) => setField('reportHeader', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportFooter">Pied de page rapport</Label>
              <Input
                id="reportFooter"
                value={form.reportFooter}
                onChange={(e) => setField('reportFooter', e.target.value)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-brand-success">{message}</p>}

        {isAdmin && (
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer les paramètres
          </Button>
        )}

        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            Seul un administrateur peut modifier les paramètres généraux.
          </p>
        )}
      </form>
    </div>
  );
}
