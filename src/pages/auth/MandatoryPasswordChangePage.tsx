import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ipcClient } from '@/lib/ipcClient';
import { useAuthStore } from '@/stores/auth.store';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const segmentColor = ['', 'bg-destructive', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][score];
  const label = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][score];
  const labelColor = ['', 'text-destructive', 'text-amber-500', 'text-blue-500', 'text-emerald-500'][score];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= score ? segmentColor : 'bg-border',
            )}
          />
        ))}
      </div>
      <p className={cn('text-[10px]', labelColor)}>{label}</p>
    </div>
  );
}

/**
 * Écran bloquant : changement de mot de passe obligatoire (première connexion ou compte importé).
 */
export function MandatoryPasswordChangePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const result = await ipcClient.auth.changePassword({
        currentPassword,
        newPassword,
      });

      if (!result.success) {
        setError(result.error ?? 'Impossible de mettre à jour le mot de passe.');
        return;
      }

      const fresh = await ipcClient.auth.getCurrentUser();
      if (fresh) {
        useAuthStore.setState({ user: fresh, isAuthenticated: true });
      }

      navigate(DEFAULT_HOME_PATH, { replace: true });
    } catch {
      setError('Erreur de communication avec l\'application.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Card className="border-amber-500/30 shadow-elevated">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold to-amber-600 text-xs font-bold text-white">
            HM
          </div>
          <span className="font-heading font-semibold">Hotel Metrics Pro</span>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <CardTitle className="text-lg">Changement de mot de passe requis</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant
              d&apos;accéder à l&apos;application.
            </CardDescription>
          </div>
        </div>

        {user && (
          <p className="text-xs text-muted-foreground">
            Compte : <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Masquer' : 'Afficher'}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pw">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Masquer' : 'Afficher'}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
            <p className="text-[10px] text-muted-foreground">
              8 caractères minimum, une majuscule, un chiffre et un caractère spécial.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirmer le mot de passe</Label>
            <Input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Enregistrer et continuer
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => void handleLogout()}
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
