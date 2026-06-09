import { Check, Layers, Maximize2, Minimize2, Minus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionBlock } from '@/components/common/SectionBlock';
import { cn } from '@/lib/utils';
import { useUiStore, type AccentColor, type Density } from '@/stores/ui.store';

/* ── Palette ──────────────────────────────────────────── */
const ACCENT_OPTIONS: { key: AccentColor; label: string; hex: string; dark: string }[] = [
  { key: 'navy',    label: 'Navy',      hex: '#1E3A8A', dark: '#0F172A' },
  { key: 'blue',    label: 'Bleu',      hex: '#3B82F6', dark: '#1E40AF' },
  { key: 'violet',  label: 'Violet',    hex: '#7C3AED', dark: '#2E1065' },
  { key: 'emerald', label: 'Émeraude',  hex: '#059669', dark: '#064E3B' },
  { key: 'rose',    label: 'Rose',      hex: '#E11D48', dark: '#881337' },
  { key: 'amber',   label: 'Ambre',     hex: '#D97706', dark: '#78350F' },
  { key: 'cyan',    label: 'Cyan',      hex: '#0891B2', dark: '#164E63' },
  { key: 'slate',   label: 'Ardoise',   hex: '#475569', dark: '#1E293B' },
];

const DENSITY_OPTIONS: { key: Density; label: string; desc: string; icon: typeof Minimize2 }[] = [
  { key: 'compact',     label: 'Compact',     desc: 'Interface condensée, maximum d\'informations visibles',  icon: Minimize2 },
  { key: 'comfortable', label: 'Confortable', desc: 'Équilibre optimal entre densité et lisibilité',          icon: Minus     },
  { key: 'spacious',    label: 'Spacieux',    desc: 'Interface aérée, idéale pour les grands écrans',         icon: Maximize2 },
];

/* ── Page ─────────────────────────────────────────────── */
export function InterfaceThemePage() {
  const { accentColor, density, sidebarCollapsed, setAccentColor, setDensity, setSidebarCollapsed } =
    useUiStore();

  const current = ACCENT_OPTIONS.find((a) => a.key === accentColor) ?? ACCENT_OPTIONS[0];

  return (
    <div className="page-shell">
      <PageHeader
        title="Interface & Thème"
        description="Personnalisez l'apparence de l'application"
        backTo="/settings"
      />

      {/* ── Couleur d'accentuation ──────────────────────── */}
      <SectionBlock
        title="Couleur d'accentuation"
        description="Appliquée aux boutons, liens actifs et sidebar"
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_OPTIONS.map((opt) => {
            const isActive = accentColor === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAccentColor(opt.key)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-150 hover:shadow-card',
                  isActive
                    ? 'border-primary shadow-card'
                    : 'border-transparent hover:border-border',
                )}
                title={opt.label}
              >
                {/* Swatch */}
                <div
                  className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${opt.dark} 0%, ${opt.hex} 100%)` }}
                >
                  {isActive && (
                    <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={2.5} />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionBlock>

      {/* ── Densité d'affichage ─────────────────────────── */}
      <SectionBlock
        title="Densité d'affichage"
        description="Contrôle l'espacement et l'arrondi des éléments"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {DENSITY_OPTIONS.map((opt) => {
            const isActive = density === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDensity(opt.key)}
                className={cn(
                  'relative flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all duration-150 hover:shadow-card',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-card'
                    : 'border-border bg-card hover:border-primary/40',
                )}
              >
                {isActive && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
                  </span>
                )}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', isActive && 'text-primary')}>
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {opt.desc}
                  </p>
                </div>

                {/* Radius preview */}
                <DensityPreview density={opt.key} active={isActive} />
              </button>
            );
          })}
        </div>
      </SectionBlock>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <SectionBlock
        title="Sidebar"
        description="Comportement par défaut au démarrage"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { val: false, label: 'Étendue', desc: 'Labels et icônes visibles', icon: Layers },
            { val: true,  label: 'Réduite', desc: 'Icônes uniquement — plus d\'espace', icon: Minimize2 },
          ].map(({ val, label, desc, icon: Icon }) => {
            const isActive = sidebarCollapsed === val;
            return (
              <button
                key={String(val)}
                type="button"
                onClick={() => setSidebarCollapsed(val)}
                className={cn(
                  'relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:shadow-card',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-card'
                    : 'border-border bg-card hover:border-primary/40',
                )}
              >
                {isActive && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
                  </span>
                )}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', isActive && 'text-primary')}>{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionBlock>

      {/* ── Prévisualisation ────────────────────────────── */}
      <SectionBlock title="Prévisualisation" description="Aperçu des réglages actifs">
        <div className="overflow-hidden rounded-xl border border-border">
          {/* Mini sidebar */}
          <div className="flex h-40">
            <div
              className="flex w-[160px] shrink-0 flex-col gap-1 p-3"
              style={{ background: `linear-gradient(180deg, ${current.dark} 0%, ${current.hex}CC 100%)` }}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <div
                  className="h-6 w-6 rounded-lg"
                  style={{ background: '#CA8A04' }}
                />
                <div className="h-2.5 w-16 rounded-full bg-white/30" />
              </div>
              {['Dashboard', 'Recettes', 'Rapports'].map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5',
                    i === 0 ? 'bg-white/15' : 'bg-transparent',
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-sm bg-white/60" />
                  <div className="h-2 w-14 rounded-full bg-white/40" />
                </div>
              ))}
            </div>

            {/* Mini content */}
            <div className="flex flex-1 flex-col gap-3 bg-secondary/30 p-4">
              <div className="flex gap-3">
                {[current.hex, '#0891B2', '#16A34A'].map((color) => (
                  <div
                    key={color}
                    className="flex-1 rounded-lg border border-border bg-card p-3 shadow-sm"
                    style={{ borderRadius: 'var(--radius)' }}
                  >
                    <div className="mb-1.5 h-1.5 w-8 rounded-full" style={{ background: color }} />
                    <div className="h-4 w-16 rounded font-mono text-[10px] font-bold" style={{ color }}>
                      KPI
                    </div>
                    <div className="mt-1 h-1.5 w-12 rounded-full bg-border" />
                  </div>
                ))}
              </div>
              <div
                className="flex-1 rounded-lg border border-border bg-card shadow-sm"
                style={{ borderRadius: 'var(--radius)' }}
              >
                <div
                  className="flex items-center border-b border-border/60 px-3 py-2"
                  style={{ background: 'hsl(var(--card))' }}
                >
                  <div className="h-2 w-20 rounded-full bg-foreground/20" />
                </div>
                <div className="space-y-1.5 p-3">
                  {[70, 50, 85].map((w) => (
                    <div key={w} className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-border" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

/* ── Density radius preview ───────────────────────────── */
function DensityPreview({ density, active }: { density: Density; active: boolean }) {
  const radii = {
    compact:     '4px',
    comfortable: '10px',
    spacious:    '16px',
  };
  return (
    <div className="flex gap-2 pt-1">
      {[40, 60, 48].map((w, i) => (
        <div
          key={i}
          className={cn('h-2', active ? 'bg-primary/40' : 'bg-border')}
          style={{ width: `${w}%`, borderRadius: radii[density] }}
        />
      ))}
    </div>
  );
}
