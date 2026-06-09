import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canAccessPortmaster } from '@/shared/permissions';

export function RequirePortmaster({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canAccessPortmaster(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
