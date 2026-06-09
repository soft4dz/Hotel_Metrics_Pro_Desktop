/** Palette graphiques — alignée UI UX Pro Max (financial dashboard) */
export const CHART = {
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

export const chartGrid = {
  strokeDasharray: '3 3',
  stroke: CHART.grid,
  vertical: false as const,
};

export const chartAxisTick = { fontSize: 11, fill: CHART.axis };

export const chartTooltipStyle = {
  contentStyle: {
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
    fontSize: '12px',
  },
};
