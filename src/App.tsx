import { useEffect } from 'react';
import { HashRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/AppRoutes';
import { applyUiTheme } from '@/lib/applyUiTheme';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
    applyUiTheme(accentColor, density);
  }, [accentColor, density]);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <SessionBootstrap />
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton duration={4000} />
        </HashRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
