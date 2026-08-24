import { Link } from 'react-router-dom';
import { CalendarDays, Menu, PanelLeft } from 'lucide-react';
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge';
import { NotificationBell } from '@/components/common/NotificationBell';
import { GlobalCommandPalette } from '@/components/navigation/GlobalCommandPalette';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/layouts/LanguageSwitcher';
import { APP_LOGO_URL } from '@/lib/logos';
import { useUiStore } from '@/stores/ui.store';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';
import { DATE_LOCALES, translate } from '@/lib/localization';

export function TopNavbar() {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const locale = useUiStore((s) => s.locale);

  const today = new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="navbar-shell sticky top-0 z-30 shrink-0 border-b border-border safe-top">
      <div className="layout-navbar mx-auto flex h-14 items-center gap-2 sm:h-[3.75rem] sm:gap-3 lg:h-16 2xl:h-[4.25rem]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={translate(locale, 'Ouvrir le menu')}
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
          aria-label={translate(locale, sidebarCollapsed ? 'Déplier le menu latéral' : 'Replier le menu latéral')}
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>

        <Link
          to={DEFAULT_HOME_PATH}
          className="flex shrink-0 items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:bg-muted sm:gap-2.5 sm:pr-2 lg:hidden"
        >
          <img
            src={APP_LOGO_URL}
            alt="Raqmi System"
            className="h-8 w-8 rounded-md object-contain ring-1 ring-border sm:h-9 sm:w-9"
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold leading-tight text-foreground lg:text-[15px] 2xl:text-base">
              Raqmi System
            </p>
            <p className="hidden text-[10px] leading-tight text-muted-foreground sm:block 2xl:text-[11px]">
              ERP intégré
            </p>
          </div>
        </Link>

        <div className="mx-auto hidden min-w-0 flex-1 justify-center px-2 md:flex lg:px-6">
          <GlobalCommandPalette />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
          <SyncStatusBadge
            compact
            className="md:inline-flex"
          />

          <NotificationBell />

          <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground xl:flex lg:px-3 2xl:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-accent 2xl:h-4 2xl:w-4" />
            <span className="hidden 2xl:inline">{today}</span>
            <span className="hidden lg:inline 2xl:hidden">{today.split(' ').slice(0, 2).join(' ')}</span>
          </div>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
