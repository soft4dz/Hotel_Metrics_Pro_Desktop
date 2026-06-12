import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canAccessRhSelf, canManageRh, canValidateRhTeam } from '@/shared/permissions';

export function RequireRh() {
  const role = useAuthStore((s) => s.user?.role);
  if (!canManageRh(role) && !canValidateRhTeam(role) && !canAccessRhSelf(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
