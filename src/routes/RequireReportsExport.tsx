import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { canExportReports } from '@/shared/permissions';

export function RequireReportsExport({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canExportReports(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
