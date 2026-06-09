import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canViewRecettes } from '@/shared/permissions';

interface RequireRecettesViewProps {
  children: React.ReactNode;
  fallbackTo?: string;
}

export function RequireRecettesView({
  children,
  fallbackTo = '/dashboard',
}: RequireRecettesViewProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!canViewRecettes(role)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
