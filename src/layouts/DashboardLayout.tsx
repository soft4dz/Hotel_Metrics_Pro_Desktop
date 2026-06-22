import { Outlet, useLocation } from 'react-router-dom';
import { TopNavbar } from '@/layouts/TopNavbar';
import { PageTitleBar } from '@/layouts/PageTitleBar';
import { MobileNavDrawer } from '@/layouts/MobileNavDrawer';
import { getPageTitle } from '@/shared/constants/pageTitles';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const { title, subtitle } = getPageTitle(pathname || DEFAULT_HOME_PATH);
  const hidePageTitle =
    pathname === '/modules' ||
    pathname.startsWith('/modules/') ||
    pathname === '/portmaster';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <TopNavbar />
      <MobileNavDrawer />
      {!hidePageTitle ? <PageTitleBar title={title} subtitle={subtitle} /> : null}
      <main className="page-mesh flex-1 overflow-y-auto overflow-x-hidden">
        <div className="layout-content-shell page-content min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
