import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { useAuthStore } from '@/stores/auth.store';
import { mockAdminUser } from './fixtures/mockData';
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary';

export function bootstrapAuthenticatedAdmin(): void {
  useAuthStore.setState({
    user: mockAdminUser,
    isAuthenticated: true,
    rememberMe: false,
    sessionToken: 'test-token',
    sessionChecked: true,
  });
}

export function resetAuthStore(): void {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    rememberMe: false,
    sessionToken: null,
    sessionChecked: true,
  });
}

export function navigateTo(route: string): void {
  window.location.hash = route.startsWith('#') ? route : `#${route}`;
}

function TestShell() {
  return (
    <GlobalErrorBoundary>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </HashRouter>
    </GlobalErrorBoundary>
  );
}

export function renderAuthenticatedApp(): RenderResult {
  bootstrapAuthenticatedAdmin();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TestShell />
    </QueryClientProvider>,
  );
}
