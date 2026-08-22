import { Outlet } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Anchor, BarChart3, Building2 } from 'lucide-react';
import { APP_BILINGUAL_WHITE_URL } from '@/lib/logos';

/**
 * Layout pour les écrans non authentifiés (login, activation licence).
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#071525] p-12 text-white lg:flex">
        <div className="relative z-10">
          <img
            src={APP_BILINGUAL_WHITE_URL}
            alt="Raqmi System"
            className="h-28 w-[360px] object-contain object-left"
          />
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="max-w-lg text-balance text-3xl font-semibold leading-tight tracking-tight">
            {t('Un système.')}
            <span className="mt-2 block text-brand-gold">{t('Toute votre entreprise.')}</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            ERP intégré pour l&apos;exploitation, la finance, les achats, les stocks, les ressources
            humaines, le PMS, le CRM et le pilotage décisionnel.
          </p>
          <ul className="flex flex-wrap gap-4 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              {t('Multi-unités')}
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              {t('KPI temps réel')}
            </li>
            <li className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-brand-gold" strokeWidth={1.75} />
              PortMaster
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Raqmi System
        </p>

        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-brand-blue/30 blur-3xl"
          aria-hidden
        />
      </div>

      <div className="page-mesh flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
