import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Anchor,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Database,
  HardDrive,
  History,
  Layers,
  LayoutDashboard,
  ListTree,
  Receipt,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  canAccessPortmaster,
  canExportReports,
  canManageHotels,
  canManageSync,
  canManageUsers,
  canReadAudit,
  canSaisieRecettes,
  canViewDashboard,
  canViewObjectifs,
  isAdminRole,
} from '@/shared/permissions';
import { MODULE_GROUPS, getModulesByGroup } from '@/modules/moduleCatalog';
import type { ModuleDefinition } from '@/modules/moduleCatalog';

type IconType = LucideIcon;

// ── Icône par module ──────────────────────────────────────────────────────────
const MODULE_ICONS: Record<string, IconType> = {
  'administration-utilisateurs':  Users,
  'parametrage-global':           Settings,
  'unites-hotelieres':            Building2,
  'recettes-journalieres':        Receipt,
  'encaissements-tresorerie':     Wallet,
  'budget-previsions':            Target,
  'hebergement-occupation':       LayoutDashboard,
  'facturation':                  Receipt,
  'creances-recouvrement':        AlertCircle,
  'contrats-conventions':         ClipboardList,
  'stocks-consommations':         Database,
  'achats-approvisionnements':    ListTree,
  'maintenance-interventions':    Wrench,
  'rh-productivite':              Users,
  'audit-controle-interne':       Shield,
  'journal-anomalies':            AlertCircle,
  'decisions-instructions':       ClipboardCheck,
  'qualite-reclamations':         ClipboardCheck,
  'plage-piscine':                Anchor,
  'parking':                      Database,
  'portmaster':                   Anchor,
  'commercial-partenariats':      TrendingUp,
  'tableaux-bord-directionnels':  BarChart3,
  'rapports-automatiques':        BarChart3,
  'alertes-notifications':        Bell,
  'comparatif-inter-unites':      Layers,
  'gestion-documentaire':         ClipboardList,
  'sauvegarde-restauration':      HardDrive,
  'synchronisation-multi-postes': Cloud,
  'journalisation-tracabilite':   History,
};

// ── Descriptions courtes ──────────────────────────────────────────────────────
const MODULE_DESC: Record<string, string> = {
  'administration-utilisateurs':  'Comptes, rôles et droits d\'accès',
  'parametrage-global':           'Configuration générale de l\'application',
  'unites-hotelieres':            'Hôtels et unités d\'exploitation',
  'recettes-journalieres':        'Saisie quotidienne des recettes par rubrique',
  'encaissements-tresorerie':     'Flux d\'encaissement et trésorerie',
  'budget-previsions':            'Objectifs financiers et suivi de réalisation',
  'hebergement-occupation':       'Chambres, nuitées et taux d\'occupation',
  'facturation':                  'Émission et suivi des factures clients',
  'creances-recouvrement':        'Suivi des créances et recouvrement',
  'contrats-conventions':         'Gestion des contrats et conventions',
  'stocks-consommations':         'Suivi des stocks et consommations internes',
  'achats-approvisionnements':    'Achats, fournisseurs et approvisionnements',
  'maintenance-interventions':    'Suivi des interventions de maintenance',
  'rh-productivite':              'Personnel, planning et indicateurs RH',
  'audit-controle-interne':       'Journal d\'audit et contrôle interne',
  'journal-anomalies':            'Enregistrement et suivi des anomalies',
  'decisions-instructions':       'Décisions de direction et instructions',
  'qualite-reclamations':         'Qualité de service et réclamations clients',
  'plage-piscine':                'Activités plage et piscine',
  'parking':                      'Gestion du parking et stationnement',
  'portmaster':                   'Gestion complète du port de plaisance',
  'commercial-partenariats':      'Gestion commerciale et partenariats',
  'tableaux-bord-directionnels':  'KPIs et tableaux de bord temps réel',
  'rapports-automatiques':        'Génération et export de rapports PDF / Excel',
  'alertes-notifications':        'Alertes automatiques et notifications',
  'comparatif-inter-unites':      'Analyse comparative entre unités',
  'gestion-documentaire':         'Archivage et gestion documentaire',
  'sauvegarde-restauration':      'Sauvegarde et restauration des données',
  'synchronisation-multi-postes': 'Synchronisation entre postes de travail',
  'journalisation-tracabilite':   'Logs système et traçabilité des actions',
};

// ── Permissions par module ────────────────────────────────────────────────────
const MODULE_ACCESS: Record<string, (role?: string) => boolean> = {
  'administration-utilisateurs':  canManageUsers,
  'parametrage-global':           () => true,
  'unites-hotelieres':            canManageHotels,
  'recettes-journalieres':        canSaisieRecettes,
  'encaissements-tresorerie':     isAdminRole,
  'budget-previsions':            canViewObjectifs,
  'hebergement-occupation':       isAdminRole,
  'facturation':                  canAccessPortmaster,
  'creances-recouvrement':        canAccessPortmaster,
  'contrats-conventions':         canAccessPortmaster,
  'stocks-consommations':         isAdminRole,
  'achats-approvisionnements':    isAdminRole,
  'maintenance-interventions':    isAdminRole,
  'rh-productivite':              isAdminRole,
  'audit-controle-interne':       canReadAudit,
  'journal-anomalies':            isAdminRole,
  'decisions-instructions':       isAdminRole,
  'qualite-reclamations':         isAdminRole,
  'plage-piscine':                canSaisieRecettes,
  'parking':                      canSaisieRecettes,
  'portmaster':                   canAccessPortmaster,
  'commercial-partenariats':      isAdminRole,
  'tableaux-bord-directionnels':  canViewDashboard,
  'rapports-automatiques':        canExportReports,
  'alertes-notifications':        () => true,
  'comparatif-inter-unites':      canViewDashboard,
  'gestion-documentaire':         isAdminRole,
  'sauvegarde-restauration':      canManageUsers,
  'synchronisation-multi-postes': canManageSync,
  'journalisation-tracabilite':   canReadAudit,
};

// ── Couleur accent par groupe ────────────────────────────────────────────────
const GROUP_ICON_CLS: Record<string, string> = {
  'Socle':                  'bg-blue-500/10 text-blue-600',
  'Finance':                'bg-emerald-500/10 text-emerald-600',
  'Exploitation':           'bg-orange-500/10 text-orange-600',
  'Juridique & commercial': 'bg-purple-500/10 text-purple-600',
  'Ressources humaines':    'bg-indigo-500/10 text-indigo-600',
  'Contrôle':               'bg-red-500/10 text-red-600',
  'Pilotage':               'bg-cyan-500/10 text-cyan-600',
  'Spécifique':             'bg-teal-500/10 text-teal-600',
  'Système documentaire':   'bg-amber-500/10 text-amber-600',
  'Système':                'bg-slate-100 text-slate-500',
};

// ── Badge statut ──────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  operationnel:   { label: 'Disponible', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  socle:          { label: 'Socle',      cls: 'bg-amber-50   text-amber-700   border-amber-200'  },
  'a-developper': { label: 'À venir',    cls: 'bg-slate-50   text-slate-500   border-slate-200'  },
};

// ── Carte module ──────────────────────────────────────────────────────────────
function ModuleCard({
  module,
  group,
}: {
  module: ModuleDefinition;
  group: string;
}) {
  const Icon    = MODULE_ICONS[module.id] ?? Layers;
  const desc    = MODULE_DESC[module.id] ?? '';
  const iconCls = GROUP_ICON_CLS[group] ?? 'bg-primary/10 text-primary';
  const badge   = STATUS_BADGE[module.status];
  const ready   = !!module.existingRoute;
  const target  = module.existingRoute ?? module.route;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm transition-all duration-200',
        ready && 'hover:border-primary/20 hover:shadow-md',
        !ready && 'opacity-70',
      )}
    >
      {/* Corps */}
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconCls)}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <span className={cn('mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', badge.cls)}>
            {badge.label}
          </span>
        </div>
        <h3 className="mt-4 text-[13px] font-semibold leading-snug text-foreground">
          {module.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>

      {/* Pied — action */}
      <div className="border-t border-border/50 px-5 py-3">
        {ready ? (
          <Link
            to={target}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-colors hover:text-primary/75"
          >
            Ouvrir
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-[12px] text-muted-foreground/60">En cours de développement</span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ModulesIndexPage() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <div className="space-y-8">
      {MODULE_GROUPS.map((group) => {
        const modules = getModulesByGroup(group).filter((m) => {
          const check = MODULE_ACCESS[m.id];
          return check ? check(role) : true;
        });

        if (modules.length === 0) return null;

        return (
          <section key={group}>
            {/* En-tête catégorie */}
            <div className="mb-4 flex items-center gap-3">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {group}
              </span>
              <div className="h-px flex-1 bg-border/60" />
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {modules.length} module{modules.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Grille */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modules.map((module) => (
                <ModuleCard key={module.id} module={module} group={group} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
