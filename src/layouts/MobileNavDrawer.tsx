import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SidebarNav } from '@/layouts/SidebarNav';
import { useUiStore } from '@/stores/ui.store';

export function MobileNavDrawer() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setMobileNavOpen(false);
      prevPathname.current = pathname;
    }
  }, [pathname, setMobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Fermer le menu"
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        className={cn(
          'sidebar-shell absolute inset-y-0 left-0 flex w-[min(92vw,300px)] flex-col border-r border-white/10 shadow-sidebar sm:w-[min(88vw,320px)]',
          'animate-in slide-in-from-left duration-200 motion-reduce:animate-none',
          'pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]',
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarNav
          collapsed={false}
          onNavigate={() => setMobileNavOpen(false)}
          className="pt-1"
        />
      </aside>
    </div>
  );
}
