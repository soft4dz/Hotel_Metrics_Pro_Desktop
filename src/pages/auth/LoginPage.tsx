import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { logoUrl, companyName } = useCompanyBranding();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(DEFAULT_HOME_PATH, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const clearLocalSession = () => {
    localStorage.removeItem('hmp-auth');
    setError('');
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, false);
      if (result.ok) {
        const user = useAuthStore.getState().user;
        if (user?.mustChangePassword) {
          navigate('/change-password-required', { replace: true });
        } else {
          navigate(DEFAULT_HOME_PATH, { replace: true });
        }
      } else {
        setError(result.error ?? 'Identifiants incorrects.');
      }
    } catch {
      setError("Impossible de contacter l'application. Relancez l'application desktop.");
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
        <CardTitle className="text-2xl text-foreground">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace de pilotage hôtelier et portuaire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
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
            <Label htmlFor="password">Mot de passe</Label>
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
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Pour des raisons de sécurité, une nouvelle connexion est exigée après chaque redémarrage.
          </p>

          {error && <p className="status-banner-error">{error}</p>}

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </Button>

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={clearLocalSession}
          >
            Réinitialiser la session locale
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
