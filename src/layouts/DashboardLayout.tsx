import { Outlet, useLocation } from 'react-router-dom';
import { PremiumHeader } from '@/layouts/PremiumHeader';
import { PremiumSidebar } from '@/layouts/PremiumSidebar';
import { MobileNavDrawer } from '@/layouts/MobileNavDrawer';
import { getPageTitle } from '@/shared/constants/pageTitles';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const { title, subtitle } = getPageTitle(pathname || '/dashboard');

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <PremiumSidebar />
      <MobileNavDrawer />
      <div className="flex min-w-0 flex-1 flex-col">
        <PremiumHeader title={title} subtitle={subtitle} />
        <main className="page-mesh flex-1 overflow-y-auto overflow-x-hidden">
          <div className="page-content mx-auto w-full max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
