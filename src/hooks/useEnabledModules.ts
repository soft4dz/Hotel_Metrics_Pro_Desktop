import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';

export function useEnabledModules(): Set<string> {
  const { data = [] } = useQuery({
    queryKey: ['modules-enabled'],
    queryFn: async () => unwrapIpc(await ipcClient.modules.listEnabled()),
    staleTime: 5 * 60_000,
  });
  return new Set(data);
}
