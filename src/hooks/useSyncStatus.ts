import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { canManageSync } from '@/shared/permissions';

export function useSyncStatus() {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = canManageSync(role);

  return useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => unwrapIpc(await ipcClient.sync.getStatus()),
    enabled: allowed,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
