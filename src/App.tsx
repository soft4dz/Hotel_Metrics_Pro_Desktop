import { useEffect } from 'react';
import { HashRouter, useNavigate } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

function SessionBootstrap() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);
  const navigate = useNavigate();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isAuthenticated && mustChangePassword) {
      navigate('/change-password-required', { replace: true });
    }
  }, [isAuthenticated, mustChangePassword, navigate]);

  return null;
}

export default function App() {
  const accentColor = useUiStore((s) => s.accentColor);
  const density = useUiStore((s) => s.density);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.forEach((c) => {
      if (c.startsWith('accent-') || c.startsWith('density-')) {
        el.classList.remove(c);
      }
    });
    if (accentColor !== 'navy') el.classList.add(`accent-${accentColor}`);
    if (density !== 'comfortable') el.classList.add(`density-${density}`);
  }, [accentColor, density]);

  return (
    <HashRouter>
      <SessionBootstrap />
      <AppRoutes />
    </HashRouter>
  );
}
