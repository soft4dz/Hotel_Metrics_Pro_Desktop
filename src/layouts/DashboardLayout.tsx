import { Outlet, useLocation } from 'react-router-dom';
import { PrintLetterhead } from '@/components/common/PrintLetterhead';
import { LicenseExpiryBanner } from '@/components/common/LicenseExpiryBanner';
import { TopNavbar } from '@/layouts/TopNavbar';
import { PageTitleBar } from '@/layouts/PageTitleBar';
import { MobileNavDrawer } from '@/layouts/MobileNavDrawer';
import { PremiumSidebar } from '@/layouts/PremiumSidebar';
import { getPageTitle } from '@/shared/constants/pageTitles';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';
import { useUiStore } from '@/stores/ui.store';
import { translate } from '@/lib/localization';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const locale = useUiStore((state) => state.locale);
  const pageTitle = getPageTitle(pathname || DEFAULT_HOME_PATH);
  const title = translate(locale, pageTitle.title);
  const subtitle = pageTitle.subtitle ? translate(locale, pageTitle.subtitle) : undefined;
  const hidePageTitle =
    pathname === '/modules' ||
    pathname.startsWith('/modules/') ||
    pathname === '/portmaster' ||
    pathname === '/ged';

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <PremiumSidebar />
      <MobileNavDrawer />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar />
        <LicenseExpiryBanner />
        {!hidePageTitle ? <PageTitleBar title={title} subtitle={subtitle} /> : null}
        <main className="page-mesh flex-1 overflow-y-auto overflow-x-hidden">
          <PrintLetterhead />
          <div className="layout-content-shell page-content min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
