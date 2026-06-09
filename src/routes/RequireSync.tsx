import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canManageSync } from '@/shared/permissions';

export function RequireSync({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canManageSync(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
