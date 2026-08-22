import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, CheckCircle2, GitBranch, Hammer } from 'lucide-react';
import { getModuleById, MODULE_STATUS_LABELS, MODULES } from '@/modules/moduleCatalog';

const statusClass = {
  operationnel: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  socle: 'border-amber-200 bg-amber-50 text-amber-700',
  'a-developper': 'border-slate-200 bg-slate-50 text-slate-600',
};

function getModuleMessage(status: string) {
  if (status === 'operationnel') {
    return {
      title: 'Module opérationnel',
      label: 'État du module',
      text: 'Ce module dispose déjà d’écrans métier utilisables. Utilisez le bouton d’accès pour ouvrir directement la partie opérationnelle.',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (status === 'socle') {
    return {
      title: 'Socle prêt',
      label: 'Prochaine étape',
      text: 'Le module dispose d’une base fonctionnelle ou d’un rattachement existant. Les écrans métier détaillés peuvent être complétés progressivement.',
      icon: Hammer,
      iconClass: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    title: 'Développement métier',
    label: 'Prochaine étape',
    text: 'Définir le cahier des charges, puis créer les tables, services IPC, validations, écrans, rapports et règles d’audit.',
    icon: Hammer,
    iconClass: 'bg-slate-100 text-slate-700',
  };
}

export function ModulePlaceholderPage() {
  const { moduleId } = useParams();
  const module = getModuleById(moduleId);

  if (!module) {
    return (
      <section className="hero-panel space-y-4">
        <h1 className="text-2xl font-semibold">Module introuvable</h1>
        <p className="text-muted-foreground">Le module demandé n’existe pas dans le catalogue.</p>
        <Link className="inline-flex items-center gap-2 text-primary underline" to="/modules">
          <ArrowLeft className="h-4 w-4" />
          Retour aux modules
        </Link>
      </section>
    );
  }

  const relatedModules = MODULES.filter((item) => module.connectedTo.includes(item.name));
  const moduleMessage = getModuleMessage(module.status);
  const MessageIcon = moduleMessage.icon;

  return (
    <section className="space-y-6">
      <div className="hero-panel">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary" to="/modules">
          <ArrowLeft className="h-4 w-4" />
          Retour aux modules
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <p className="section-label">Module n°{module.order} · {module.group}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">{module.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
              Ce module est inscrit dans l’architecture de pilotage interconnectée de Raqmi System.
              Son état réel est indiqué ci-dessous afin de distinguer les modules opérationnels des modules à développer.
            </p>
          </div>

          <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass[module.status]}`}>
            {MODULE_STATUS_LABELS[module.status]}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {module.existingRoute ? (
            <Link className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:shadow-elevated" to={module.existingRoute}>
              Ouvrir le module opérationnel
            </Link>
          ) : null}
          <Link className="rounded-xl border bg-white/80 px-4 py-2.5 text-sm font-semibold transition hover:bg-muted" to="/modules">
            Voir tous les modules
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="metric-card lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">Interconnexions</p>
              <h2 className="text-lg font-semibold">Modules connectés</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {module.connectedTo.map((name) => (
              <span key={name} className="pill-soft">{name}</span>
            ))}
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${moduleMessage.iconClass}`}>
              <MessageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">{moduleMessage.label}</p>
              <h2 className="text-lg font-semibold">{moduleMessage.title}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {moduleMessage.text}
          </p>
        </div>
      </div>

      {module.capabilities?.length ? (
        <div className="app-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">Périmètre fonctionnel</p>
              <h2 className="text-lg font-semibold">Fonctions rattachées au module</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {module.capabilities.map((capability) => (
              <span key={capability} className="pill-soft">{capability}</span>
            ))}
          </div>
        </div>
      ) : null}

      {relatedModules.length > 0 ? (
        <div className="app-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">Navigation transverse</p>
              <h2 className="text-lg font-semibold">Modules liés</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {relatedModules.map((item) => (
              <Link key={item.id} className="module-card" to={item.route}>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.group} · {MODULE_STATUS_LABELS[item.status]}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
