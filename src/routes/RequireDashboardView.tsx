import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canViewDashboard } from '@/shared/permissions';

interface RequireDashboardViewProps {
  children: React.ReactNode;
}

export function RequireDashboardView({ children }: RequireDashboardViewProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!canViewDashboard(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
