import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Anchor,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Cable,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Database,
  Gavel,
  Gauge,
  HardDrive,
  HeartHandshake,
  History,
  Landmark,
  Layers,
  LayoutDashboard,
  ListTree,
  Lock,
  MoonStar,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Wallet,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useEnabledModules } from '@/hooks/useEnabledModules';
import { isConfiguredModule } from '@/shared/constants/configuredModules';
import {
  canAccessPortmaster,
  canExportReports,
  canManageClients,
  canManageHotels,
  canManageSync,
  canManageUsers,
  canReadAudit,
  canViewRecettes,
  canViewDashboard,
  canViewObjectifs,
  canManageRh,
  canValidateRhTeam,
  canAccessRhSelf,
  isAdminRole,
} from '@/shared/permissions';
import { MODULES } from '@/modules/moduleCatalog';
import type { ModuleDefinition } from '@/modules/moduleCatalog';
import { MODULE_SUITES, getModuleSuite } from '@/pages/modules/moduleSuites';
import type { ModuleSuiteTone } from '@/pages/modules/moduleSuites';

type IconType = LucideIcon;

const MODULE_ICONS: Record<string, IconType> = {
  'administration-utilisateurs': Users,
  'parametrage-global': Settings,
  'unites-hotelieres': Building2,
  'recettes-journalieres': Receipt,
  'cloture-night-audit': MoonStar,
  'encaissements-tresorerie': Wallet,
  'comptabilite-scf': BookOpen,
  'fiscalite-dgi': Landmark,
  'budget-previsions': Target,
  'hebergement-occupation': LayoutDashboard,
  'housekeeping-chambres': ClipboardCheck,
  'crm-experience-client': HeartHandshake,
  'groupes-mice': CalendarDays,
  facturation: Receipt,
  'creances-recouvrement': AlertCircle,
  'contrats-conventions': ClipboardList,
  'stocks-consommations': Database,
  'cuisine-qualite': UtensilsCrossed,
  'pos-restauration': Receipt,
  'achats-approvisionnements': ListTree,
  'appels-offres': Gavel,
  'maintenance-interventions': Wrench,
  'integrations-materielles': Cable,
  'rh-productivite': Users,
  'pointeuses-badgeuses': Gauge,
  'tarifs-conventions': Target,
  'audit-controle-interne': Shield,
  'workflows-validations': Workflow,
  'checklists-controle': ClipboardCheck,
  'journal-anomalies': AlertCircle,
  'decisions-instructions': ClipboardCheck,
  'qualite-reclamations': ClipboardCheck,
  'conformite-hoteliere': Shield,
  'protection-donnees-personnelles': Shield,
  'modules-legaux': Gavel,
  'veille-reglementaire': ScrollText,
  portmaster: Anchor,
  clients: Users,
  'commercial-partenariats': TrendingUp,
  'tableaux-bord-directionnels': BarChart3,
  'dashboard-pdg': BarChart3,
  'cockpit-dec': Gauge,
  'rapports-automatiques': BarChart3,
  'alertes-notifications': Bell,
  'comparatif-inter-unites': Layers,
  'gestion-documentaire': ClipboardList,
  'sauvegarde-restauration': HardDrive,
  'synchronisation-multi-postes': Cloud,
  'journalisation-tracabilite': History,
};

const MODULE_DESC: Record<string, string> = {
  'administration-utilisateurs': 'Comptes, rôles et droits',
  'parametrage-global': 'Configuration générale',
  'unites-hotelieres': 'Hôtels et unités',
  'recettes-journalieres': 'CA consolidé ERP',
  'cloture-night-audit': 'Clôture et date métier',
  'encaissements-tresorerie': 'Trésorerie et encaissements',
  'comptabilite-scf': 'Comptabilité générale SCF',
  'fiscalite-dgi': 'TVA, liasse et SIFEC',
  'budget-previsions': 'Objectifs et budgets',
  'hebergement-occupation': 'Chambres et occupation',
  'housekeeping-chambres': 'Chambres et équipes',
  'crm-experience-client': 'Relation et fidélisation client',
  'groupes-mice': 'Groupes et événements',
  facturation: 'Factures clients',
  'creances-recouvrement': 'Créances et recouvrement',
  'contrats-conventions': 'Contrats et conventions',
  'stocks-consommations': 'Stocks internes',
  'cuisine-qualite': 'Production, HACCP et qualité',
  'pos-restauration': 'Points de vente restauration',
  'achats-approvisionnements': 'Achats et fournisseurs',
  'appels-offres': 'Consultations et marchés',
  'maintenance-interventions': 'Maintenance',
  'integrations-materielles': 'TPE, serrures et périphériques',
  'rh-productivite': 'RH et effectifs',
  'pointeuses-badgeuses': 'Temps et présence',
  'tarifs-conventions': 'Grilles tarifaires',
  'audit-controle-interne': 'Audit et contrôle',
  'workflows-validations': 'Circuits d’approbation',
  'checklists-controle': 'Contrôles opérationnels',
  'journal-anomalies': 'Suivi des anomalies',
  'decisions-instructions': 'Décisions direction',
  'qualite-reclamations': 'Qualité et réclamations',
  'conformite-hoteliere': 'Police, séjour et tourisme',
  'protection-donnees-personnelles': 'Loi 18-07 et ANPDP',
  'modules-legaux': 'Immobilisations, CASNOS, inventaire',
  'veille-reglementaire': 'Textes de loi et mise en conformité',
  portmaster: 'Capitainerie',
  clients: 'Fichier clients',
  'commercial-partenariats': 'Commercial',
  'tableaux-bord-directionnels': 'KPIs temps réel',
  'dashboard-pdg': 'Vision consolidée direction',
  'cockpit-dec': 'Pilotage exploitation et contrôle',
  'rapports-automatiques': 'Exports PDF / Excel',
  'alertes-notifications': 'Alertes système',
  'comparatif-inter-unites': 'Comparatif unités',
  'gestion-documentaire': 'Documents et GED',
  'sauvegarde-restauration': 'Sauvegardes',
  'synchronisation-multi-postes': 'Sync multi-postes',
  'journalisation-tracabilite': 'Logs et traçabilité',
};

const MODULE_ACCESS: Record<string, (role?: string) => boolean> = {
  'administration-utilisateurs': canManageUsers,
  'parametrage-global': () => true,
  'unites-hotelieres': canManageHotels,
  'recettes-journalieres': canViewRecettes,
  'cloture-night-audit': canViewRecettes,
  'encaissements-tresorerie': isAdminRole,
  'comptabilite-scf': isAdminRole,
  'fiscalite-dgi': isAdminRole,
  'budget-previsions': canViewObjectifs,
  'hebergement-occupation': isAdminRole,
  'housekeeping-chambres': isAdminRole,
  'crm-experience-client': canManageClients,
  'groupes-mice': isAdminRole,
  facturation: canAccessPortmaster,
  'creances-recouvrement': canAccessPortmaster,
  'contrats-conventions': canAccessPortmaster,
  'stocks-consommations': isAdminRole,
  'cuisine-qualite': isAdminRole,
  'pos-restauration': isAdminRole,
  'achats-approvisionnements': isAdminRole,
  'maintenance-interventions': isAdminRole,
  'integrations-materielles': isAdminRole,
  'rh-productivite': (role) => canManageRh(role) || canValidateRhTeam(role) || canAccessRhSelf(role),
  'pointeuses-badgeuses': (role) => canManageRh(role) || canValidateRhTeam(role) || canAccessRhSelf(role),
  'tarifs-conventions': isAdminRole,
  'audit-controle-interne': canReadAudit,
  'workflows-validations': isAdminRole,
  'checklists-controle': isAdminRole,
  'journal-anomalies': isAdminRole,
  'decisions-instructions': isAdminRole,
  'qualite-reclamations': isAdminRole,
  'conformite-hoteliere': isAdminRole,
  'protection-donnees-personnelles': canManageUsers,
  'modules-legaux': canManageUsers,
  'veille-reglementaire': isAdminRole,
  portmaster: canAccessPortmaster,
  clients: isAdminRole,
  'commercial-partenariats': isAdminRole,
  'tableaux-bord-directionnels': canViewDashboard,
  'dashboard-pdg': canViewDashboard,
  'cockpit-dec': canViewDashboard,
  'rapports-automatiques': canExportReports,
  'alertes-notifications': () => true,
  'comparatif-inter-unites': canViewDashboard,
  'gestion-documentaire': isAdminRole,
  'sauvegarde-restauration': canManageUsers,
  'synchronisation-multi-postes': canManageSync,
  'journalisation-tracabilite': canReadAudit,
};

const SUITE_ICONS: Record<string, IconType> = {
  pilotage: BarChart3,
  finance: Wallet,
  'hotel-commercial': Building2,
  'restauration-evenements': UtensilsCrossed,
  'achats-patrimoine': Wrench,
  'ressources-humaines': Users,
  'controle-conformite': Shield,
  'port-administration': Anchor,
};

const SUITE_TONE_CLASS: Record<ModuleSuiteTone, string> = {
  navy: 'workspace-tone-navy',
  blue: 'workspace-tone-blue',
  teal: 'workspace-tone-teal',
  sand: 'workspace-tone-sand',
  slate: 'workspace-tone-slate',
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function WorkspaceModuleRow({
  module,
  disabledByConfig,
}: {
  module: ModuleDefinition;
  disabledByConfig: boolean;
}) {
  const Icon = MODULE_ICONS[module.id] ?? Layers;
  const ready = !!module.existingRoute && !disabledByConfig;
  const target = module.existingRoute ?? module.route;
  const comingSoon = module.status === 'a-developper' || !module.existingRoute;
  const suite = getModuleSuite(module.id);

  const content = (
    <>
      <span className={cn('workspace-module-icon', suite && SUITE_TONE_CLASS[suite.tone])} aria-hidden>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="workspace-module-label">{module.name}</span>
        <span className="workspace-module-desc">{MODULE_DESC[module.id] ?? module.group}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {disabledByConfig ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground" title="Module désactivé">
            <Lock className="h-3 w-3" />
          </span>
        ) : null}
        {comingSoon && !disabledByConfig ? (
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            En préparation
          </span>
        ) : null}
        {ready ? <ArrowRight className="h-4 w-4 text-muted-foreground" /> : null}
      </span>
    </>
  );

  if (!ready) {
    return (
      <div
        className="workspace-module-row workspace-module-row--disabled"
        title={disabledByConfig ? 'Module désactivé' : 'Module en cours de développement'}
      >
        {content}
      </div>
    );
  }

  return (
    <Link to={target} className="workspace-module-row group" title={MODULE_DESC[module.id]}>
      {content}
    </Link>
  );
}

export function ModulesIndexPage() {
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  const enabledModules = useEnabledModules();
  const [query, setQuery] = useState('');
  const [activeSuite, setActiveSuite] = useState('pilotage');

  useEffect(() => {
    const state = location.state as { disabledModuleName?: string } | null;
    if (!state?.disabledModuleName) return;
    notify.warning(
      'Module désactivé',
      `« ${state.disabledModuleName} » n'est pas activé pour cette installation.`,
    );
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const accessibleModules = useMemo(
    () =>
      MODULES.filter((m) => {
        const check = MODULE_ACCESS[m.id];
        return check ? check(role) : true;
      }),
    [role],
  );

  const normalizedQuery = normalizeSearch(query);

  const visibleSuites = useMemo(
    () =>
      MODULE_SUITES.map((suite) => ({
        ...suite,
        count: accessibleModules.filter((module) => getModuleSuite(module.id)?.id === suite.id).length,
      })).filter((suite) => suite.count > 0),
    [accessibleModules],
  );

  const effectiveActiveSuite = visibleSuites.some((suite) => suite.id === activeSuite)
    ? activeSuite
    : (visibleSuites[0]?.id ?? activeSuite);

  const selectedSuite = MODULE_SUITES.find((suite) => suite.id === effectiveActiveSuite) ?? MODULE_SUITES[0];

  const filteredModules = useMemo(() => {
    return accessibleModules.filter((module) => {
      if (!normalizedQuery && getModuleSuite(module.id)?.id !== effectiveActiveSuite) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeSearch(
        `${module.name} ${module.group} ${MODULE_DESC[module.id] ?? ''} ${module.capabilities?.join(' ') ?? ''}`,
      );
      return haystack.includes(normalizedQuery);
    });
  }, [accessibleModules, effectiveActiveSuite, normalizedQuery]);

  const quickModuleIds = [
    'dashboard-pdg',
    'cockpit-dec',
    'recettes-journalieres',
    'hebergement-occupation',
    'encaissements-tresorerie',
    'portmaster',
  ];
  const quickModules = quickModuleIds
    .map((moduleId) => accessibleModules.find((module) => module.id === moduleId))
    .filter((module): module is ModuleDefinition => !!module)
    .slice(0, 5);

  const isModuleDisabled = (moduleId: string) =>
    isConfiguredModule(moduleId) &&
    enabledModules.size > 0 &&
    !enabledModules.has(moduleId);

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div className="min-w-0">
          <p className="section-label text-accent">Raqmi System · رقمي سيستم</p>
          <h2 className="workspace-title">Espace de travail</h2>
          <p className="workspace-subtitle">Un système. Toute votre entreprise.</p>
        </div>

        <div className="workspace-search-wrap">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module ou une fonction…"
            className="workspace-search"
            aria-label="Rechercher un module ou une fonction"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      {!normalizedQuery && quickModules.length > 0 ? (
        <section className="workspace-quick-access" aria-labelledby="workspace-quick-heading">
          <div>
            <h3 id="workspace-quick-heading" className="text-xs font-semibold text-foreground">Accès directs</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Vos fonctions de pilotage prioritaires</p>
          </div>
          <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
            {quickModules.map((module) => (
              <Link key={module.id} to={module.existingRoute ?? module.route} className="workspace-quick-link">
                {module.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {filteredModules.length === 0 ? (
        <div className="workspace-empty">
          <Layers className="mx-auto h-9 w-9 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">Aucun module trouvé</p>
          <p className="mt-1 text-xs text-muted-foreground">Modifiez votre recherche</p>
        </div>
      ) : normalizedQuery ? (
        <section className="workspace-results">
          <div className="workspace-panel-heading">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Résultats</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{filteredModules.length} résultat(s) pour « {query} »</p>
            </div>
          </div>
          <div className="workspace-module-grid">
            {filteredModules.map((module) => (
              <WorkspaceModuleRow key={module.id} module={module} disabledByConfig={isModuleDisabled(module.id)} />
            ))}
          </div>
        </section>
      ) : (
        <div className="workspace-layout">
          <nav className="workspace-suite-list" aria-label="Suites métier">
            {visibleSuites.map((suite) => {
              const Icon = SUITE_ICONS[suite.id] ?? Layers;
              const active = suite.id === effectiveActiveSuite;
              return (
                <button
                  key={suite.id}
                  type="button"
                  onClick={() => setActiveSuite(suite.id)}
                  className={cn('workspace-suite-button', active && 'workspace-suite-button--active')}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={cn('workspace-suite-icon', SUITE_TONE_CLASS[suite.tone])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold">{suite.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{suite.count} modules</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </nav>

          <section className="workspace-results">
            <div className="workspace-panel-heading">
              <div>
                <p className="section-label">Suite métier</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedSuite.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{selectedSuite.description}</p>
              </div>
              <span className="workspace-count">{filteredModules.length} modules</span>
            </div>
            <div className="workspace-module-grid">
              {filteredModules.map((module) => (
                <WorkspaceModuleRow key={module.id} module={module} disabledByConfig={isModuleDisabled(module.id)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
