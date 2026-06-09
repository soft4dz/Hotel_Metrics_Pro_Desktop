import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/** Bloque l'accès à l'app tant que le mot de passe initial n'a pas été changé. */
export function RequirePasswordChanged() {
  const user = useAuthStore((s) => s.user);

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password-required" replace />;
  }

  return <Outlet />;
}
