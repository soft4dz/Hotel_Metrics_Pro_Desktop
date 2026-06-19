/** Palette graphiques — dérivée des tokens CSS (--chart-*, --primary) */

const FALLBACK = {
  grid: '#E2E8F0',
  axis: '#64748B',
  primary: '#1E3A8A',
  secondary: '#3B82F6',
  accent: '#0891B2',
  gold: '#CA8A04',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F97316',
  muted: '#94A3B8',
  series: ['#1E3A8A', '#3B82F6', '#0891B2', '#16A34A', '#CA8A04', '#64748B', '#8B5CF6'],
} as const;

function readCssVar(name: `--${string}`, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

/** Couleurs graphiques lues à la volée depuis les variables CSS du thème actif */
export const CHART = {
  get grid() {
    return readCssVar('--chart-grid', FALLBACK.grid);
  },
  get axis() {
    return readCssVar('--chart-axis', FALLBACK.axis);
  },
  get primary() {
    return readCssVar('--chart-primary', FALLBACK.primary);
  },
  get secondary() {
    return readCssVar('--chart-secondary', FALLBACK.secondary);
  },
  get accent() {
    return readCssVar('--chart-accent', FALLBACK.accent);
  },
  get gold() {
    return readCssVar('--chart-gold', FALLBACK.gold);
  },
  get success() {
    return readCssVar('--chart-success', FALLBACK.success);
  },
  get danger() {
    return readCssVar('--chart-danger', FALLBACK.danger);
  },
  get warning() {
    return readCssVar('--chart-warning', FALLBACK.warning);
  },
  get muted() {
    return readCssVar('--chart-muted', FALLBACK.muted);
  },
  get series() {
    return [
      this.primary,
      this.secondary,
      this.accent,
      this.success,
      this.gold,
      this.muted,
      '#8B5CF6',
    ] as const;
  },
};

export const chartGrid = {
  strokeDasharray: '3 3',
  get stroke() {
    return CHART.grid;
  },
  vertical: false as const,
};

export const chartAxisTick = {
  fontSize: 11,
  get fill() {
    return CHART.axis;
  },
};

export const chartTooltipStyle = {
  get contentStyle() {
    return {
      borderRadius: '10px',
      border: `1px solid ${CHART.grid}`,
      boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
      fontSize: '12px',
    };
  },
};
