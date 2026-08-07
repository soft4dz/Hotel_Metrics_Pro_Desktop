import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  buildLicensePackSummary,
  listEditionOptions,
  type LicenseEdition,
} from '@/lib/packCatalog';
import { SECTOR_OPTIONS, type BusinessSectorId } from '@/lib/sectors';

export function PackCatalogTab() {
  const [edition, setEdition] = useState<LicenseEdition>('PRO');
  const [sector, setSector] = useState<BusinessSectorId>('commerce');

  const summary = useMemo(() => buildLicensePackSummary(edition, sector), [edition, sector]);
  const editions = listEditionOptions();

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Layers className="h-4 w-4 text-brand" />
          Catalogue des packs (édition × secteur)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Édition</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={edition}
              onChange={(e) => setEdition(e.target.value as LicenseEdition)}
            >
              {editions.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {editions.find((e) => e.id === edition)?.description}
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Secteur métier</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={sector}
              onChange={(e) => setSector(e.target.value as BusinessSectorId)}
            >
              {SECTOR_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Pack</p>
            <p className="font-semibold text-brand">{summary.editionLabel} · {summary.sectorLabel}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Modules actifs</p>
            <p className="font-semibold">{summary.enabledCount} / {summary.totalModules}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Hors pack</p>
            <p className="font-semibold">{summary.disabledModuleIds.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-emerald-800">Modules inclus</h3>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-xs text-slate-700">
            {summary.enabledModuleIds.map((id: string) => (
              <li key={id} className="rounded bg-emerald-50/60 px-2 py-1 font-mono">{id}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Modules exclus</h3>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-xs text-slate-500">
            {summary.disabledModuleIds.length === 0 ? (
              <li className="text-emerald-600">Pack complet — tous les modules du secteur sont inclus.</li>
            ) : (
              summary.disabledModuleIds.map((id: string) => (
                <li key={id} className="rounded bg-slate-50 px-2 py-1 font-mono">{id}</li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
