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
import type { AppInfoDto } from '@/shared/types/settings';

export function SettingsPage() {  const user = useAuthStore((s) => s.user);
  const isAdmin = canManageUsers(user?.role);

  const [info, setInfo] = useState<AppInfoDto | null>(null);
  const [tauxTva, setTauxTva] = useState('19');
  const [maxAttempts, setMaxAttempts] = useState('5');
  const [lockoutMin, setLockoutMin] = useState('15');
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
        setTauxTva(String(data.settings.tauxTvaPort));
        setMaxAttempts(String(data.settings.maxLoginAttempts));
        setLockoutMin(String(data.settings.lockoutMinutes));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = unwrapIpc(
        await ipcClient.settings.update({
          tauxTvaPort: parseFloat(tauxTva),
          maxLoginAttempts: parseInt(maxAttempts, 10),
          lockoutMinutes: parseInt(lockoutMin, 10),
        }),
      );
      setMessage('Paramètres enregistrés.');
      if (info) {
        setInfo({ ...info, settings: updated });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Paramètres"
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
              <span className="text-muted-foreground">Base locale :</span>{' '}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Préférences</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'TVA port par défaut et sécurité des connexions.'
              : 'Seul un administrateur peut modifier ces valeurs.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSave(e)} className="grid max-w-md gap-4">
            <div className="space-y-2">
              <Label>Taux TVA port (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={tauxTva}
                onChange={(e) => setTauxTva(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Tentatives de connexion max</Label>
              <Input
                type="number"
                min={3}
                max={20}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Verrouillage (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={lockoutMin}
                onChange={(e) => setLockoutMin(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-brand-success">{message}</p>}
            {isAdmin && (
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
