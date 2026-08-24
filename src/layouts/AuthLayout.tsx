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
      <div className="hidden w-1/2 flex-col justify-between border-r border-white/10 bg-[#071525] p-12 text-white lg:flex">
        <div>
          <img
            src={APP_BILINGUAL_WHITE_URL}
            alt="Raqmi System"
            className="h-28 w-[360px] object-contain object-left"
          />
        </div>

        <div className="space-y-6">
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

        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} Raqmi System
        </p>
      </div>

      <div className="page-mesh flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
