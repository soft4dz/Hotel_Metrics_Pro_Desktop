import { Link, useParams } from 'react-router-dom';
import { getModuleById, MODULE_STATUS_LABELS, MODULES } from '@/modules/moduleCatalog';

export function ModulePlaceholderPage() {
  const { moduleId } = useParams();
  const module = getModuleById(moduleId);

  if (!module) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Module introuvable</h1>
        <p className="text-muted-foreground">Le module demandé n’existe pas dans le catalogue.</p>
        <Link className="text-primary underline" to="/modules">Retour aux modules</Link>
      </section>
    );
  }

  const relatedModules = MODULES.filter((item) => module.connectedTo.includes(item.name));

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Module n°{module.order} · {module.group}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{module.name}</h1>
          <span className="rounded-full border px-3 py-1 text-sm font-medium">
            {MODULE_STATUS_LABELS[module.status]}
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Ce module est déclaré dans l’architecture de pilotage interconnectée de Hotel Metrics Pro.
          Les écrans métier détaillés seront développés progressivement, sans modification massive non maîtrisée.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {module.existingRoute ? (
            <Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" to={module.existingRoute}>
              Ouvrir le module existant
            </Link>
          ) : null}
          <Link className="rounded-lg border px-4 py-2 text-sm font-semibold" to="/modules">
            Voir tous les modules
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Modules connectés</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {module.connectedTo.map((name) => (
              <span key={name} className="rounded-full border bg-muted px-3 py-1 text-sm">{name}</span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Prochaine étape</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Définir le cahier des charges du module, puis créer les tables SQLite, les services Electron IPC,
            les validations, les écrans React, les rapports et la journalisation.
          </p>
        </div>
      </div>

      {relatedModules.length > 0 ? (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Navigation vers les modules liés</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {relatedModules.map((item) => (
              <Link key={item.id} className="rounded-xl border p-4 transition hover:border-primary hover:bg-muted/60" to={item.route}>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.group} · {MODULE_STATUS_LABELS[item.status]}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
