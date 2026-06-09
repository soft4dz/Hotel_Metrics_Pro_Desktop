import { Link, Outlet, useLocation } from 'react-router-dom';
import { PremiumHeader } from '@/layouts/PremiumHeader';
import { PremiumSidebar } from '@/layouts/PremiumSidebar';
import { getPageTitle } from '@/shared/constants/pageTitles';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const { title, subtitle } = getPageTitle(pathname || '/dashboard');

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <PremiumSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PremiumHeader title={title} subtitle={subtitle} />
        <main className="page-mesh flex-1 overflow-y-auto">
          <div className="page-content mx-auto max-w-[1680px] px-6 py-6 lg:px-8 lg:py-8">
            <div className="mb-5 flex justify-end lg:hidden">
              <Link to="/modules" className="rounded-xl border bg-card/90 px-4 py-2 text-sm font-semibold shadow-card transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-elevated">
                Modules de pilotage
              </Link>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
