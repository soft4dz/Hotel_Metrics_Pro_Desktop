import { useAuthStore } from '@/stores/auth.store';

export function useActorId(): number {
  const user = useAuthStore((s) => s.user);
  if (!user) throw new Error('Utilisateur non connecté');
  return user.id;
}
