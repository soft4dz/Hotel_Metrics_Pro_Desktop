import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';
import { ipcClient } from '@/lib/ipcClient';
import { DEMO_PROFILE_PASSWORD } from '@/shared/constants/demoProfileAccounts';
import { useTranslation } from '@/hooks/useTranslation';

interface DemoAccountRow {
  email: string;
  fullName: string;
  roleCode: string;
  roleLabel: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { logoUrl, companyName } = useCompanyBranding();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountRow[]>([]);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(DEFAULT_HOME_PATH, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void (async () => {
      try {
        const rows = await ipcClient.auth.listDemoAccounts();
        setDemoAccounts(rows);
      } catch {
        /* API indisponible hors Electron */
      }
    })();
  }, []);

  const clearLocalSession = () => {
    localStorage.removeItem('hmp-auth');
    setError('');
    window.location.reload();
  };

  const fillDemoAccount = (account: DemoAccountRow) => {
    setEmail(account.email);
    setPassword(DEMO_PROFILE_PASSWORD);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.ok) {
        const user = useAuthStore.getState().user;
        if (user?.mustChangePassword) {
          navigate('/change-password-required', { replace: true });
        } else {
          navigate(DEFAULT_HOME_PATH, { replace: true });
        }
      } else {
        setError(result.error ?? t('Identifiants incorrects.'));
      }
    } catch {
      setError("Impossible de contacter l'application. Lancez via dev.bat ou npm run dev.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-elevated">
      <CardHeader className="space-y-1 pb-2">
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <img
            src={logoUrl}
            alt={companyName}
            className="h-10 w-10 rounded-lg object-contain"
          />
          <span className="font-heading font-semibold text-primary">{companyName}</span>
        </div>
        <CardTitle className="text-2xl text-foreground">{t('Connexion')}</CardTitle>
        <CardDescription>
          {t('Accédez à votre espace de pilotage hôtelier et portuaire.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('Adresse e-mail')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@etablissement.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('Mot de passe')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t(showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-ring"
            />
            <Label htmlFor="remember" className="cursor-pointer font-normal">
              {t('Mémoriser la session sur cet ordinateur')}
            </Label>
          </div>

          {error && <p className="status-banner-error">{error}</p>}

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('Connexion')}…
              </>
            ) : (
              t('Se connecter')
            )}
          </Button>

          {import.meta.env.DEV && (
            <div className="space-y-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">{t('Comptes administrateur')}</strong>
                <br />
                <span className="text-foreground">admin@hotelmetrics.local</span> — mot de passe initial
                dans <span className="font-mono">INITIAL_ADMIN_CREDENTIALS.txt</span>
              </p>

              {demoAccounts.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-left font-medium text-foreground"
                    onClick={() => setShowDemoAccounts((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      {t('Profils démo')} ({demoAccounts.length})
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <p className="mt-1">
                    {t('Mot de passe commun')} :{' '}
                    <strong className="font-mono text-foreground">{DEMO_PROFILE_PASSWORD}</strong>
                  </p>
                  {showDemoAccounts && (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {demoAccounts.map((account) => (
                        <li key={account.email}>
                          <button
                            type="button"
                            className="w-full rounded px-1 py-0.5 text-left hover:bg-background/80"
                            onClick={() => fillDemoAccount(account)}
                          >
                            <span className="text-foreground">{account.roleLabel}</span>
                            <span className="ml-1 font-mono text-[10px]">{account.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="text-[11px]">
                Fermez l&apos;application, lancez <strong>dev.bat</strong> (pas Chrome seul sur
                localhost:5173).
              </p>
            </div>
          )}

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={clearLocalSession}
          >
            {t('Réinitialiser la session locale')}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
