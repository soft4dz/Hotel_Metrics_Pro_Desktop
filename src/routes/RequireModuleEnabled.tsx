import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { getModuleById } from '@/modules/moduleCatalog';
import {
  isConfiguredModule,
  resolveModuleIdForPath,
} from '@/routes/routeModuleAccess';

export function RequireModuleEnabled() {
  const { pathname } = useLocation();
  const moduleId = resolveModuleIdForPath(pathname);

  const { data: enabledIds = [], isLoading, isSuccess } = useQuery({
    queryKey: ['modules-enabled'],
    queryFn: async () => unwrapIpc(await ipcClient.modules.listEnabled()),
    staleTime: 5 * 60_000,
  });

  if (!moduleId || !isConfiguredModule(moduleId)) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Vérification des modules…
      </div>
    );
  }

  const enabled = new Set(enabledIds);
  if (isSuccess && !enabled.has(moduleId)) {
    const moduleName = getModuleById(moduleId)?.name ?? moduleId;
    return (
      <Navigate
        to="/modules"
        replace
        state={{ disabledModule: moduleId, disabledModuleName: moduleName }}
      />
    );
  }

  return <Outlet />;
}
