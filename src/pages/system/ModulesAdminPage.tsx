import { useMemo, useState } from 'react';
import { Layers, Loader2, Search, Shield } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/toast';
import { moduleConfigMap, useModulesConfig, useSetModuleEnabled } from '@/hooks/useModulesAdmin';
import {
  MODULE_GROUPS,
  MODULE_STATUS_LABELS,
  getModulesByGroup,
} from '@/modules/moduleCatalog';
import { PROTECTED_MODULE_IDS } from '@/shared/constants/configuredModules';

type FilterMode = 'all' | 'enabled' | 'disabled';

export function ModulesAdminPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const { data: config = [], isLoading, error } = useModulesConfig();
  const setEnabled = useSetModuleEnabled();
  const configById = useMemo(() => moduleConfigMap(config), [config]);

  const stats = useMemo(() => {
    const enabled = config.filter((row) => row.isEnabled).length;
    return { enabled, total: config.length };
  }, [config]);

  const normalizedSearch = search.trim().toLowerCase();

  const handleToggle = (moduleId: string, enabled: boolean, moduleName: string) => {
    setEnabled.mutate(
      { moduleId, enabled },
      {
        onSuccess: () => {
          notify.success(
            enabled ? 'Module activé' : 'Module désactivé',
            `« ${moduleName} » ${enabled ? 'est accessible' : "n'est plus accessible"}.`,
          );
        },
        onError: (err) => {
          notify.error('Modification impossible', err instanceof Error ? err.message : 'Erreur inconnue');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Chargement des modules…
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Modules activés"
          description="Seuls les administrateurs peuvent gérer l'activation des modules."
        />
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Impossible de charger la configuration.'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Modules activés"
        description="Activez ou désactivez les modules métier pour cette installation. Les routes et menus des modules désactivés sont bloqués."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Modules actifs</CardDescription>
            <CardTitle className="text-2xl">{stats.enabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total configurable</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Désactivés</CardDescription>
            <CardTitle className="text-2xl">{stats.total - stats.enabled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un module…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'enabled', 'disabled'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === mode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {mode === 'all' ? 'Tous' : mode === 'enabled' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
        </div>
      </div>

      {MODULE_GROUPS.map((group) => {
        const modules = getModulesByGroup(group).filter((module) => {
          const row = configById.get(module.id);
          if (!row) return false;

          if (normalizedSearch) {
            const haystack = `${module.name} ${module.id} ${group}`.toLowerCase();
            if (!haystack.includes(normalizedSearch)) return false;
          }

          if (filter === 'enabled' && !row.isEnabled) return false;
          if (filter === 'disabled' && row.isEnabled) return false;
          return true;
        });

        if (modules.length === 0) return null;

        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                {group}
              </CardTitle>
              <CardDescription>
                {modules.filter((m) => configById.get(m.id)?.isEnabled).length} / {modules.length} actif
                {modules.length > 1 ? 's' : ''} dans cette catégorie
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border rounded-lg border border-border">
              {modules.map((module) => {
                const row = configById.get(module.id)!;
                const protectedModule = PROTECTED_MODULE_IDS.has(module.id);
                const busy = setEnabled.isPending && setEnabled.variables?.moduleId === module.id;

                return (
                  <div
                    key={module.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{module.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {MODULE_STATUS_LABELS[module.status]}
                        </Badge>
                        {protectedModule && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Shield className="h-3 w-3" />
                            Socle
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {module.existingRoute ?? `/modules/${module.id}`}
                        {row.updatedAt ? ` · MAJ ${new Date(row.updatedAt).toLocaleString('fr-DZ')}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          row.isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                        )}
                      >
                        {row.isEnabled ? 'Activé' : 'Désactivé'}
                      </span>
                      <Switch
                        checked={row.isEnabled}
                        disabled={protectedModule || busy || setEnabled.isPending}
                        aria-label={`${row.isEnabled ? 'Désactiver' : 'Activer'} ${module.name}`}
                        onCheckedChange={(checked) => handleToggle(module.id, checked, module.name)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Les modules marqués « Socle » restent toujours actifs. La désactivation prend effet immédiatement
        sur les routes et la sidebar.
      </p>
    </div>
  );
}
