import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Anchor,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Cable,
  CalendarDays,
  Car,
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
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Wallet,
  Waves,
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
import { MODULE_GROUPS, MODULES } from '@/modules/moduleCatalog';
import type { ModuleDefinition } from '@/modules/moduleCatalog';

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
  parking: Car,
  'plage-piscine': Waves,
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
  parking: 'Accès et recettes parking',
  'plage-piscine': 'Accès plage et piscine',
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
  parking: isAdminRole,
  'plage-piscine': isAdminRole,
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

/** Palette inspirée du lanceur d'applications Odoo */
const MODULE_COLORS: Record<string, string> = {
  'administration-utilisateurs': '#714B67',
  'parametrage-global': '#5C5C5C',
  'unites-hotelieres': '#875A7B',
  'recettes-journalieres': '#00A09D',
  'cloture-night-audit': '#155E75',
  'encaissements-tresorerie': '#1F8787',
  'comptabilite-scf': '#0F766E',
  'fiscalite-dgi': '#047857',
  'budget-previsions': '#4C9E8F',
  'hebergement-occupation': '#E46F78',
  'housekeeping-chambres': '#EC4899',
  'crm-experience-client': '#DB2777',
  'groupes-mice': '#7C3AED',
  facturation: '#00A09D',
  'creances-recouvrement': '#DC6965',
  'contrats-conventions': '#875A7B',
  'stocks-consommations': '#6C757D',
  'cuisine-qualite': '#EA580C',
  'pos-restauration': '#C2410C',
  'achats-approvisionnements': '#7C6576',
  'maintenance-interventions': '#4A4F59',
  'integrations-materielles': '#0369A1',
  'rh-productivite': '#A24689',
  'pointeuses-badgeuses': '#9333EA',
  'tarifs-conventions': '#E99D00',
  'audit-controle-interne': '#8F8F8F',
  'workflows-validations': '#4F46E5',
  'checklists-controle': '#6366F1',
  'journal-anomalies': '#DC6965',
  'decisions-instructions': '#714B67',
  'qualite-reclamations': '#E46F78',
  'conformite-hoteliere': '#0F766E',
  'protection-donnees-personnelles': '#1D4ED8',
  'modules-legaux': '#475569',
  parking: '#334155',
  'plage-piscine': '#0891B2',
  portmaster: '#1A5276',
  clients: '#3498DB',
  'commercial-partenariats': '#E67E22',
  'tableaux-bord-directionnels': '#714B67',
  'dashboard-pdg': '#4338CA',
  'cockpit-dec': '#1D4ED8',
  'rapports-automatiques': '#5278B8',
  'alertes-notifications': '#F39C12',
  'comparatif-inter-unites': '#9B59B6',
  'gestion-documentaire': '#7F8C8D',
  'sauvegarde-restauration': '#566573',
  'synchronisation-multi-postes': '#148F77',
  'journalisation-tracabilite': '#5D6D7E',
};

const GROUP_COLORS: Record<string, string> = {
  Socle: '#714B67',
  Finance: '#00A09D',
  Exploitation: '#E46F78',
  'Juridique & commercial': '#875A7B',
  'Ressources humaines': '#A24689',
  Contrôle: '#DC6965',
  'Conformité & légal': '#0F766E',
  Pilotage: '#5278B8',
  Spécifique: '#1A5276',
  'Système documentaire': '#7F8C8D',
  Système: '#5D6D7E',
};

function moduleColor(module: ModuleDefinition): string {
  return MODULE_COLORS[module.id] ?? GROUP_COLORS[module.group] ?? '#714B67';
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function OdooAppTile({
  module,
  disabledByConfig,
}: {
  module: ModuleDefinition;
  disabledByConfig: boolean;
}) {
  const Icon = MODULE_ICONS[module.id] ?? Layers;
  const color = moduleColor(module);
  const ready = !!module.existingRoute && !disabledByConfig;
  const target = module.existingRoute ?? module.route;
  const comingSoon = module.status === 'a-developper' || !module.existingRoute;

  const content = (
    <>
      <div className="relative">
        <div
          className="odoo-app-icon"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          <Icon className="h-8 w-8 text-white" strokeWidth={1.65} />
        </div>
        {disabledByConfig ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow-sm">
            <Lock className="h-3 w-3" />
          </span>
        ) : null}
        {comingSoon && !disabledByConfig ? (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            Bientôt
          </span>
        ) : null}
      </div>
      <p className="odoo-app-label">{module.name}</p>
      <p className="odoo-app-desc">{MODULE_DESC[module.id] ?? module.group}</p>
    </>
  );

  if (!ready) {
    return (
      <div
        className="odoo-app-tile odoo-app-tile--disabled"
        title={disabledByConfig ? 'Module désactivé' : 'Module en cours de développement'}
      >
        {content}
      </div>
    );
  }

  return (
    <Link to={target} className="odoo-app-tile group" title={MODULE_DESC[module.id]}>
      {content}
    </Link>
  );
}

export function ModulesIndexPage() {
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  const enabledModules = useEnabledModules();
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');

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

  const filteredModules = useMemo(() => {
    return accessibleModules.filter((module) => {
      if (activeGroup !== 'all' && module.group !== activeGroup) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeSearch(
        `${module.name} ${module.group} ${MODULE_DESC[module.id] ?? ''} ${module.capabilities?.join(' ') ?? ''}`,
      );
      return haystack.includes(normalizedQuery);
    });
  }, [accessibleModules, activeGroup, normalizedQuery]);

  const groupedModules = useMemo(() => {
    if (activeGroup !== 'all' || normalizedQuery) {
      return [{ group: activeGroup === 'all' ? 'Résultats' : activeGroup, modules: filteredModules }];
    }
    return MODULE_GROUPS.map((group) => ({
      group,
      modules: filteredModules.filter((m) => m.group === group),
    })).filter((section) => section.modules.length > 0);
  }, [filteredModules, activeGroup, normalizedQuery]);

  const visibleGroups = useMemo(
    () => MODULE_GROUPS.filter((group) => accessibleModules.some((m) => m.group === group)),
    [accessibleModules],
  );

  const isModuleDisabled = (moduleId: string) =>
    isConfiguredModule(moduleId) &&
    enabledModules.size > 0 &&
    !enabledModules.has(moduleId);

  return (
    <div className="odoo-apps-page">
      <div className="odoo-apps-toolbar">
        <div className="min-w-0 flex-1">
          <h2 className="odoo-apps-title">Applications</h2>
          <p className="odoo-apps-subtitle">
            {accessibleModules.length} modules disponibles pour votre profil
          </p>
        </div>

        <div className="odoo-apps-search-wrap">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une application…"
            className="odoo-apps-search"
            aria-label="Rechercher une application"
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

      <div className="odoo-apps-filters" role="tablist" aria-label="Filtrer par catégorie">
        <button
          type="button"
          role="tab"
          aria-selected={activeGroup === 'all'}
          className={cn('odoo-apps-filter', activeGroup === 'all' && 'odoo-apps-filter--active')}
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
            className={cn('odoo-apps-filter', activeGroup === group && 'odoo-apps-filter--active')}
            onClick={() => setActiveGroup(group)}
          >
            {group}
          </button>
        ))}
      </div>

      {filteredModules.length === 0 ? (
        <div className="odoo-apps-empty">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Aucune application trouvée</p>
          <p className="mt-1 text-xs text-slate-400">Modifiez votre recherche ou changez de catégorie</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedModules.map(({ group, modules }) => (
            <section key={group}>
              {(activeGroup === 'all' && !normalizedQuery) || group !== 'Résultats' ? (
                <h3 className="odoo-apps-section-title">{group}</h3>
              ) : null}
              <div className="odoo-apps-grid">
                {modules.map((module) => (
                  <OdooAppTile
                    key={module.id}
                    module={module}
                    disabledByConfig={isModuleDisabled(module.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
