export function DashboardChartSkeleton() {
  return (
    <div
      className="flex min-h-[280px] animate-pulse flex-col gap-3 rounded-xl border border-border/60 bg-secondary/30 p-6 motion-reduce:animate-none"
      role="status"
      aria-label="Chargement des graphiques"
    >
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="mt-4 flex-1 rounded-lg bg-muted/80" />
    </div>
  );
}
