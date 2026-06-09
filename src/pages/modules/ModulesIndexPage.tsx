import { Link } from 'react-router-dom';
import { Layers, Network, Sparkles } from 'lucide-react';
import { MODULE_GROUPS, MODULE_STATUS_LABELS, MODULES, getModulesByGroup } from '@/modules/moduleCatalog';

const statusClass = {
  operationnel: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  socle: 'border-amber-200 bg-amber-50 text-amber-700',
  'a-developper': 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ModulesIndexPage() {
  const total = MODULES.length;
  const operationnels = MODULES.filter((module) => module.status === 'operationnel').length;
  const socles = MODULES.filter((module) => module.status === 'socle').length;
  const aDevelopper = MODULES.filter((module) => module.status === 'a-developper').length;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-elevated">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
              Cartographie SI
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight lg:text-5xl">Centre de pilotage des modules métier</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 lg:text-base">
              Accédez rapidement aux modules opérationnels et gardez une vision claire des socles prêts et des chantiers à venir.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-gold">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-white/50">modules reliés</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="metric-card">
          <p className="section-label">Total</p>
          <p className="mt-2 text-3xl font-bold">{total}</p>
        </div>
        <div className="metric-card">
          <p className="section-label">Opérationnels</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{operationnels}</p>
        </div>
        <div className="metric-card">
          <p className="section-label">Socles prêts</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{socles}</p>
        </div>
        <div className="metric-card">
          <p className="section-label">À développer</p>
          <p className="mt-2 text-3xl font-bold text-slate-500">{aDevelopper}</p>
        </div>
      </div>

      {MODULE_GROUPS.map((group) => {
        const modules = getModulesByGroup(group);
        return (
          <div key={group} className="app-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-label">Famille fonctionnelle</p>
                <h2 className="mt-1 text-xl font-semibold">{group}</h2>
              </div>
              <span className="pill-soft">{modules.length} module(s)</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <Link key={module.id} to={module.route} className="module-card group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">N°{module.order}</p>
                        <p className="mt-1 font-semibold leading-snug">{module.name}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClass[module.status]}`}>
                      {MODULE_STATUS_LABELS[module.status]}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    Connecté à : {module.connectedTo.join(', ')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
