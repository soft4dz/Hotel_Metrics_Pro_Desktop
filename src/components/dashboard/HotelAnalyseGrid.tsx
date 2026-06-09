import { memo } from 'react';
import { Building2 } from 'lucide-react';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { StatutHotelBadge } from '@/components/dashboard/StatutHotelBadge';
import type { HotelAnalyseRow, HotelRubriqueRow } from '@/shared/types/dashboard';

/* ── Rubrique colour map ─────────────────────────────────── */
const RUB_COLORS: Record<string, string> = {
  HEBERGEMENT:  '#1E3A8A',
  RESTAURATION: '#F97316',
  BOISSONS:     '#16A34A',
  LOCATIONS:    '#7C3AED',
  PORT:         '#0891B2',
  AUTRES:       '#64748B',
};

function rubColor(code: string): string {
  return RUB_COLORS[code] ?? '#94A3B8';
}

interface HotelAnalyseGridProps {
  hotels: HotelAnalyseRow[];
}

function HotelAnalyseGridComponent({ hotels }: HotelAnalyseGridProps) {
  if (hotels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune donnée par unité sur cette période.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {hotels.map((h) => (
        <HotelCard key={h.hotelId} hotel={h} />
      ))}
    </div>
  );
}

const HotelCard = memo(function HotelCard({ hotel }: { hotel: HotelAnalyseRow }) {
  const pct      = Math.min(hotel.tauxRealisation, 150);
  const barWidth = Math.min(100, (pct / 100) * 100);
  const barColor =
    hotel.statut === 'bon'
      ? 'bg-emerald-500'
      : hotel.statut === 'moyen'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const hasRubriques = hotel.rubriques.length > 0;

  return (
    <article className="group flex flex-col rounded-xl border border-border/80 bg-card shadow-card transition-all duration-200 hover:border-primary/20 hover:shadow-elevated">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <h4 className="truncate text-sm font-semibold text-foreground" title={hotel.hotelName}>
              {hotel.hotelName}
            </h4>
          </div>
          <StatutHotelBadge statut={hotel.statut} />
        </div>

        <p className="mt-3 font-mono text-xl font-semibold tabular-nums text-foreground">
          {formatMoney(hotel.realise)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Objectif {formatMoney(hotel.objectif)} · Écart {formatMoney(hotel.ecartObjectif)}
        </p>

        {/* Réalisation bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Réalisation</span>
            <span className="tabular-nums text-foreground">
              {formatPercent(hotel.tauxRealisation)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Encaissements */}
        <div className="mt-3 flex justify-between border-t border-border/60 pt-3 text-xs">
          <span className="text-muted-foreground">Encaissements</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatPercent(hotel.tauxEncaissement)}
          </span>
        </div>
      </div>

      {/* ── Rubriques ──────────────────────────────────── */}
      {hasRubriques && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3">
          {/* Stacked bar */}
          <StackedBar rubriques={hotel.rubriques} />

          {/* Row list */}
          <ul className="mt-2.5 space-y-1.5">
            {hotel.rubriques.map((r) => (
              <RubriqueRow key={r.code} row={r} />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
});

/* ── Stacked proportional bar ────────────────────────────── */
function StackedBar({ rubriques }: { rubriques: HotelRubriqueRow[] }) {
  const total = rubriques.reduce((s, r) => s + r.realise, 0);
  if (total === 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full">
      {rubriques.map((r) => (
        <div
          key={r.code}
          style={{
            width:      `${(r.realise / total) * 100}%`,
            background: rubColor(r.code),
          }}
          title={`${r.label} — ${formatPercent(r.pctTotal)}`}
        />
      ))}
    </div>
  );
}

/* ── Single rubrique row ─────────────────────────────────── */
function RubriqueRow({ row }: { row: HotelRubriqueRow }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: rubColor(row.code) }}
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
        {row.label}
      </span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground">
        {formatMoney(row.realise)}
      </span>
      <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground/70 tabular-nums">
        {row.pctTotal}%
      </span>
    </li>
  );
}

export const HotelAnalyseGrid = memo(HotelAnalyseGridComponent);
