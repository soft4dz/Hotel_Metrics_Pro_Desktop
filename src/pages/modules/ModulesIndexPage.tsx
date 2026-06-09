import { Link } from 'react-router-dom';
import { MODULE_GROUPS, MODULE_STATUS_LABELS, MODULES, getModulesByGroup } from '@/modules/moduleCatalog';

export function ModulesIndexPage() {
  const total = MODULES.length;
  const operationnels = MODULES.filter((module) => module.status === 'operationnel').length;
  const aDevelopper = MODULES.filter((module) => module.status === 'a-developper').length;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Architecture de pilotage</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Modules de pilotage interconnectés</h1>
        <p className="mt-4 max-w-4xl text-muted-foreground">
          Cette page regroupe les modules de Hotel Metrics Pro. Les modules opérationnels renvoient vers les écrans existants.
          Les modules à développer sont déclarés comme socle fonctionnel pour un développement progressif et maîtrisé.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total modules</p>
          <p className="mt-2 text-3xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Opérationnels</p>
          <p className="mt-2 text-3xl font-bold">{operationnels}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">À développer</p>
          <p className="mt-2 text-3xl font-bold">{aDevelopper}</p>
        </div>
      </div>

      {MODULE_GROUPS.map((group) => {
        const modules = getModulesByGroup(group);
        return (
          <div key={group} className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-semibold">{group}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <Link key={module.id} to={module.route} className="rounded-xl border p-4 transition hover:border-primary hover:bg-muted/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">N°{module.order}</p>
                      <p className="mt-1 font-semibold">{module.name}</p>
                    </div>
                    <span className="rounded-full border px-2 py-1 text-[11px] text-muted-foreground">
                      {MODULE_STATUS_LABELS[module.status]}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
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
