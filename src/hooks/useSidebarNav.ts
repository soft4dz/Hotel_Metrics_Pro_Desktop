import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useEnabledModules } from '@/hooks/useEnabledModules';
import { canManageRh, canManageUsers, canValidateRhTeam } from '@/shared/permissions';
import {
  buildSidebarModules,
  findActiveModuleId,
  type SidebarModule,
} from '@/layouts/sidebarModules';

export function useSidebarNav(options?: { autoExpandOnNavigate?: boolean }) {
  const autoExpandOnNavigate = options?.autoExpandOnNavigate ?? false;
  const role = useAuthStore((state) => state.user?.role);
  const enabledModules = useEnabledModules();
  const { pathname } = useLocation();
  const { logoUrl: brandLogoUrl } = useCompanyBranding();
  const [pendingUsers, setPendingUsers] = useState(0);
  const [pendingValidationsN1, setPendingValidationsN1] = useState(0);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [flyoutModuleId, setFlyoutModuleId] = useState<string | null>(null);
  const prevPathname = useRef<string | null>(null);

  const modules = useMemo(
    () =>
      buildSidebarModules(role, pendingUsers, pendingValidationsN1).filter((mod) => {
        if (mod.visible === false) return false;
        if (mod.moduleId && enabledModules.size > 0 && !enabledModules.has(mod.moduleId)) return false;
        return mod.items.some((item) => item.visible !== false);
      }),
    [role, pendingUsers, pendingValidationsN1, enabledModules],
  );

  useEffect(() => {
    if (!canManageUsers(role)) return;
    void ipcClient.users
      .pendingCount()
      .then((r) => setPendingUsers(unwrapIpc(r)))
      .catch(() => setPendingUsers(0));
  }, [role, pathname]);

  useEffect(() => {
    if (!canManageRh(role) && !canValidateRhTeam(role)) return;
    void ipcClient.rh
      .countValidationsN1()
      .then((r) => setPendingValidationsN1(unwrapIpc(r)))
      .catch(() => setPendingValidationsN1(0));
  }, [role, pathname]);

  useEffect(() => {
    if (modules.length === 0) return;
    const routeChanged = prevPathname.current !== pathname;
    const firstLoad = prevPathname.current === null;

    if (!autoExpandOnNavigate) {
      if (routeChanged || firstLoad) {
        setOpenModuleId(null);
        prevPathname.current = pathname;
      }
      return;
    }

    const activeId = findActiveModuleId(modules, pathname);
    if (activeId && (routeChanged || firstLoad)) {
      setOpenModuleId(activeId);
      prevPathname.current = pathname;
    }
  }, [pathname, modules, autoExpandOnNavigate]);

  useEffect(() => {
    setFlyoutModuleId(null);
  }, [pathname]);

  const handleToggle = (moduleId: string) => {
    setOpenModuleId((prev) => (prev === moduleId ? null : moduleId));
  };

  const toggleFlyout = (moduleId: string) => {
    setFlyoutModuleId((prev) => (prev === moduleId ? null : moduleId));
  };

  const closeFlyout = useCallback(() => setFlyoutModuleId(null), []);
  const closeOpenModule = useCallback(() => setOpenModuleId(null), []);

  return {
    modules,
    brandLogoUrl,
    openModuleId,
    flyoutModuleId,
    handleToggle,
    toggleFlyout,
    closeFlyout,
    closeOpenModule,
  };
}

export type { SidebarModule };
