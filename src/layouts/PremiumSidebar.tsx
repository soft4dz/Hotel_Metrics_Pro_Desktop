import { cn } from '@/lib/utils';
import { SidebarNav } from '@/layouts/SidebarNav';
import { useUiStore } from '@/stores/ui.store';

export function PremiumSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        'sidebar-shell relative hidden h-full shrink-0 flex-col overflow-visible border-r border-white/10 transition-[width] duration-300 motion-reduce:transition-none lg:flex',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <SidebarNav
        collapsed={sidebarCollapsed}
        showCollapseControl
        onToggleCollapse={toggleSidebar}
      />
    </aside>
  );
}
