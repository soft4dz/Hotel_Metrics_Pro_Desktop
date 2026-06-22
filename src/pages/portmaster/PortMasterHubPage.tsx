import { OdooAppLauncher } from '@/components/apps/OdooAppLauncher';
import { PORTMASTER_APPS, PORTMASTER_APP_GROUPS } from '@/pages/portmaster/portmasterApps.config';

export function PortMasterHubPage() {
  return (
    <OdooAppLauncher
      title="PortMaster"
      subtitle={`${PORTMASTER_APPS.length} applications portuaires`}
      apps={PORTMASTER_APPS}
      groups={[...PORTMASTER_APP_GROUPS]}
      searchPlaceholder="Rechercher dans PortMaster…"
    />
  );
}
