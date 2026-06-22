import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';

/** Redirection intelligente selon l'état de session. */
export function DefaultRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (mustChangePassword) {
    return <Navigate to="/change-password-required" replace />;
  }
  return <Navigate to={DEFAULT_HOME_PATH} replace />;
}
