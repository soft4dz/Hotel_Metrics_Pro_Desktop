import { Link, Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/layouts/Header';
import { Sidebar } from '@/layouts/Sidebar';
import { getPageTitle } from '@/shared/constants/pageTitles';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const { title, subtitle } = getPageTitle(pathname || '/dashboard');

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="page-mesh flex-1 overflow-y-auto">
          <div className="page-content mx-auto max-w-[1600px] px-6 py-6 lg:px-8 lg:py-8">
            <div className="mb-4 flex justify-end">
              <Link
                to="/modules"
                className="rounded-lg border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted"
              >
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
