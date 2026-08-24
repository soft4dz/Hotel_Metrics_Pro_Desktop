import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Layers, Lock, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OdooAppDefinition = {
  id: string;
  name: string;
  description?: string;
  route: string;
  group: string;
  color: string;
  icon: LucideIcon;
  disabled?: boolean;
  comingSoon?: boolean;
};

export type OdooAppLauncherProps = {
  title: string;
  subtitle: string;
  apps: OdooAppDefinition[];
  groups: string[];
  searchPlaceholder?: string;
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function SuiteAppRow({ app }: { app: OdooAppDefinition }) {
  const Icon = app.icon;
  const ready = !app.disabled && !app.comingSoon;

  const content = (
    <>
      <div className="relative shrink-0">
        <div className="app-launcher-icon" aria-hidden>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {app.disabled ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow-sm">
            <Lock className="h-3 w-3" />
          </span>
        ) : null}
        {app.comingSoon ? (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            Bientôt
          </span>
        ) : null}
      </div>
      <span className="min-w-0 flex-1">
        <span className="app-launcher-label">{app.name}</span>
        {app.description ? <span className="app-launcher-desc">{app.description}</span> : null}
      </span>
    </>
  );

  if (!ready) {
    return (
      <div className="app-launcher-row app-launcher-row--disabled" title={app.description}>
        {content}
      </div>
    );
  }

  return (
    <Link to={app.route} className="app-launcher-row group" title={app.description}>
      {content}
    </Link>
  );
}

export function OdooAppLauncher({
  title,
  subtitle,
  apps,
  groups,
  searchPlaceholder = 'Rechercher une application…',
}: OdooAppLauncherProps) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const normalizedQuery = normalizeSearch(query);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (activeGroup !== 'all' && app.group !== activeGroup) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeSearch(`${app.name} ${app.group} ${app.description ?? ''}`);
      return haystack.includes(normalizedQuery);
    });
  }, [apps, activeGroup, normalizedQuery]);

  const orderedApps = useMemo(() => {
    if (activeGroup !== 'all' || normalizedQuery) return filteredApps;
    return groups.flatMap((group) => filteredApps.filter((app) => app.group === group));
  }, [filteredApps, activeGroup, normalizedQuery, groups]);

  const visibleGroups = useMemo(
    () => groups.filter((group) => apps.some((app) => app.group === group)),
    [apps, groups],
  );

  return (
    <div className="app-launcher-page">
      <div className="app-launcher-toolbar">
        <div className="min-w-0 flex-1">
          <p className="section-label text-accent">Raqmi System · رقمي سيستم</p>
          <h2 className="app-launcher-title">{title}</h2>
          <p className="app-launcher-subtitle">{subtitle}</p>
        </div>

        <div className="app-launcher-search-wrap">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="app-launcher-search"
            aria-label={searchPlaceholder}
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="app-launcher-filters" role="tablist" aria-label="Filtrer par catégorie">
        <button
          type="button"
          role="tab"
          aria-selected={activeGroup === 'all'}
          className={cn('app-launcher-filter', activeGroup === 'all' && 'app-launcher-filter--active')}
          onClick={() => setActiveGroup('all')}
        >
          Toutes
        </button>
        {visibleGroups.map((group) => (
          <button
            key={group}
            type="button"
            role="tab"
            aria-selected={activeGroup === group}
            className={cn('app-launcher-filter', activeGroup === group && 'app-launcher-filter--active')}
            onClick={() => setActiveGroup(group)}
          >
            {group}
          </button>
        ))}
      </div>

      {filteredApps.length === 0 ? (
        <div className="app-launcher-empty">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Aucune application trouvée</p>
          <p className="mt-1 text-xs text-slate-400">Modifiez votre recherche ou changez de catégorie</p>
        </div>
      ) : (
        <div className="app-launcher-grid">
          {orderedApps.map((app) => (
            <SuiteAppRow key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
