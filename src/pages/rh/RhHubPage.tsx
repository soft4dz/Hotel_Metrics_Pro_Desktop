import { useMemo } from 'react';
import { OdooAppLauncher } from '@/components/apps/OdooAppLauncher';
import { useAuthStore } from '@/stores/auth.store';
import { buildRhAppsForRole, RH_APP_GROUPS } from './rhApps.config';

export function RhHubPage() {
  const role = useAuthStore((s) => s.user?.role);
  const apps = useMemo(() => buildRhAppsForRole(role), [role]);

  return (
    <OdooAppLauncher
      title="RH & productivité"
      subtitle={`${apps.length} application${apps.length > 1 ? 's' : ''} RH`}
      apps={apps}
      groups={[...RH_APP_GROUPS]}
      searchPlaceholder="Rechercher dans RH…"
    />
  );
}
