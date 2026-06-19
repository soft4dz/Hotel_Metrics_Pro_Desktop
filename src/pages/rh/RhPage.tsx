import { Navigate, NavLink, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canManageRh, canValidateRhTeam, canAccessRhSelf } from '@/shared/permissions';
import {
  getDefaultRhPath,
  RH_LEGACY_REDIRECTS,
  isRhLegacySection,
  resolveRhHub,
  resolveRhSub,
  type RhHub,
} from './rhNavigation';
import { RhHubContent } from './RhHubContent';

function visibleSubs(hub: RhHub, canManage: boolean, canTeam: boolean, canSelf: boolean) {
  return hub.subs.filter((s) => {
    if (hub.id === 'mon-espace') return canSelf;
    if (hub.id === 'validations') return canTeam || canManage;
    if (hub.id === 'temps') {
      if (canManage || canTeam) return true;
      if (canSelf) return s.id === 'pointages' || s.id === 'absences';
      return false;
    }
    if (hub.id === 'collaborateurs' && s.id === 'affectations') return canManage || canTeam;
    return canManage;
  });
}

export function RhPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { hub: hubParam, sub: subParam } = useParams<{ hub?: string; sub?: string }>();
  const canManage = canManageRh(role);
  const canTeam = canValidateRhTeam(role);
  const canSelf = canAccessRhSelf(role);

  if (hubParam && isRhLegacySection(hubParam) && !subParam) {
    return <Navigate to={RH_LEGACY_REDIRECTS[hubParam]} replace />;
  }

  if (!hubParam) {
    return <Navigate to={getDefaultRhPath(role)} replace />;
  }

  const hub = resolveRhHub(hubParam, role);
  if (!hub) {
    const legacy = hubParam ? RH_LEGACY_REDIRECTS[hubParam] : undefined;
    if (legacy) return <Navigate to={legacy} replace />;
    return <Navigate to={getDefaultRhPath(role)} replace />;
  }

  const subs = visibleSubs(hub, canManage, canTeam, canSelf);
  const hasSubs = subs.length > 1;
  const activeSub = hasSubs ? resolveRhSub(hub, subParam, role, canTeam) : hub.defaultSub;
  const subPath = hasSubs && subs.some((s) => s.id === activeSub) ? activeSub : (subs[0]?.id ?? hub.defaultSub);

  if (hasSubs && subParam !== subPath) {
    return <Navigate to={`${hub.path}/${subPath}`} replace />;
  }
  if (!hasSubs && subParam) {
    return <Navigate to={hub.path} replace />;
  }

  return (
    <div className="space-y-6">
      {hasSubs && (
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-border pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {subs.map((s) => (
            <NavLink
              key={s.id}
              to={`${hub.path}/${s.id}`}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px min-h-[44px] flex items-center',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </div>
      )}

      <RhHubContent
        hub={hub}
        sub={subPath}
        canManage={canManage}
        canTeam={canTeam}
        canSelf={canSelf}
      />
    </div>
  );
}
