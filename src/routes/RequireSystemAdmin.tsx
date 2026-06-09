import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canManageUsers } from '@/shared/permissions';

/** Administration système : base de données, sauvegarde, etc. */
export function RequireSystemAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canManageUsers(role)) {
    return <Navigate to="/settings" replace />;
  }
  return <>{children}</>;
}
