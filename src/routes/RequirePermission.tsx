import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/shared/permissions';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  fallbackTo?: string;
}

export function RequirePermission({
  permission,
  children,
  fallbackTo = '/dashboard',
}: RequirePermissionProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!hasPermission(role, permission)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
