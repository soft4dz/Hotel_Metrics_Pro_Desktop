import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { ModuleConfigItem } from '@/shared/types/modules';

export function useModulesConfig() {
  return useQuery({
    queryKey: ['modules-config'],
    queryFn: async () => unwrapIpc(await ipcClient.modules.listConfig()),
    staleTime: 30_000,
  });
}

export function useSetModuleEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) =>
      unwrapIpc(await ipcClient.modules.setEnabled(moduleId, enabled)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules-config'] });
      void queryClient.invalidateQueries({ queryKey: ['modules-enabled'] });
    },
  });
}

export function moduleConfigMap(items: ModuleConfigItem[] | undefined): Map<string, ModuleConfigItem> {
  return new Map((items ?? []).map((item) => [item.moduleId, item]));
}
