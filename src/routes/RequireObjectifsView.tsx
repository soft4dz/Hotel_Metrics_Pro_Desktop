import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canViewObjectifs } from '@/shared/permissions';

export function RequireObjectifsView({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canViewObjectifs(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
