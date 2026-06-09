import { Outlet } from 'react-router-dom';
import { Anchor, BarChart3, Building2 } from 'lucide-react';
import { APP_LOGO_URL } from '@/lib/logos';

/**
 * Layout pour les écrans non authentifiés (login, activation licence).
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-full">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#172554] p-12 text-white lg:flex">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO_URL}
              alt="Hotel Metrics Pro"
              className="h-12 w-12 rounded-xl object-contain shadow-lg"
            />
            <div>
              <p className="font-heading text-lg font-semibold">Hotel Metrics Pro</p>
              <p className="text-sm text-white/60">Desktop Edition</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight">
            Pilotage hôtelier
            <span className="mt-2 block text-brand-gold"> &amp; port de plaisance</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            Recettes, objectifs, tableaux de bord, facturation et module PortMaster — une plateforme
            unifiée pour la direction et le contrôle d&apos;exploitation.
          </p>
          <ul className="flex flex-wrap gap-4 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              Multi-unités
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              KPI temps réel
            </li>
            <li className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              PortMaster
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Hotel Metrics Pro
        </p>

        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-brand-blue/25 blur-3xl"
          aria-hidden
        />
      </div>

      <div className="page-mesh flex flex-1 items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
