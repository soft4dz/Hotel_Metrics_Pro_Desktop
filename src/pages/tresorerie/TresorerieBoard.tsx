import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, TrendingUp, Wallet } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTresorerieDashboard } from '@/hooks/useTresorerie';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { MODE_LABELS, STATUT_LABELS } from '@/shared/types/tresorerie';
import type { ModePaiement, EncaissementStatut } from '@/shared/types/tresorerie';

const MODE_COLORS: Record<ModePaiement, string> = {
  especes:  '#2563EB',
  cheque:   '#16A34A',
  virement: '#0891B2',
  carte:    '#7C3AED',
  effet:    '#F97316',
  autre:    '#94A3B8',
};

const STATUT_CLS: Record<EncaissementStatut, string> = {
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirme:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejete:     'bg-red-50 text-red-600 border-red-200',
};

export function TresorerieBoard() {
  const { data, loading, error } = useTresorerieDashboard();

  if (loading) return (
    <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
      Chargement…
    </div>
  );
  if (error) return <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Encaissé aujourd'hui"
          value={formatMoney(data.totalEncaisseJour)}
          icon={<Wallet className="h-5 w-5" />}
          color="primary"
        />
        <KpiCard
          label="Encaissé ce mois"
          value={formatMoney(data.totalEncaisseMois)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="success"
        />
        <KpiCard
          label="En attente"
          value={formatMoney(data.totalEnAttente)}
          sub={`${data.nombreEnAttente} opération${data.nombreEnAttente > 1 ? 's' : ''}`}
          icon={<Clock className="h-5 w-5" />}
          color="warning"
        />
        <KpiCard
          label="Taux de couverture"
          value={formatPercent(data.tauxCouverture)}
          sub="Confirmé / Total"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color={data.tauxCouverture >= 75 ? 'success' : 'warning'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        {/* Évolution 30 jours */}
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Évolution des encaissements</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">30 derniers jours · montants confirmés</p>
          </div>
          <div className="p-5">
            {data.evolutionJours.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun encaissement sur la période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.evolutionJours} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-enc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [formatMoney(v), 'Encaissé']}
                    labelFormatter={(l: string) => `Date : ${l}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="montant" stroke="#2563EB" strokeWidth={2} fill="url(#grad-enc)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Répartition par mode */}
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Par mode de paiement</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Mois en cours</p>
          </div>
          <div className="p-5">
            {data.parMode.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data.parMode} dataKey="montant" nameKey="mode" cx="50%" cy="50%" outerRadius={60} strokeWidth={1}>
                      {data.parMode.map((entry) => (
                        <Cell key={entry.mode} fill={MODE_COLORS[entry.mode] ?? '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {data.parMode.map((m) => (
                    <li key={m.mode} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MODE_COLORS[m.mode] }} />
                        <span className="text-muted-foreground">{MODE_LABELS[m.mode]}</span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">{formatMoney(m.montant)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Par hôtel */}
      {data.parHotel.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Encaissements par unité</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Mois en cours</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Unité</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Confirmé</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">En attente</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.parHotel.map((h) => (
                  <tr key={h.hotelId} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-foreground">{h.hotelName}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-600">{formatMoney(h.encaisse)}</td>
                    <td className="px-5 py-3 text-right font-mono text-amber-600">{formatMoney(h.enAttente)}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-foreground">{formatMoney(h.encaisse + h.enAttente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Derniers encaissements */}
      <div className="rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Derniers encaissements</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">10 plus récents</p>
          </div>
          <Link
            to="/encaissements/liste"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/75"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recentEncaissements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun encaissement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Unité</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Mode</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Référence</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Montant</th>
                  <th className="px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.recentEncaissements.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-muted-foreground">{e.dateEncaissement}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{e.hotelName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{MODE_LABELS[e.mode]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.reference ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatMoney(e.montant)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STATUT_CLS[e.statut])}>
                        {STATUT_LABELS[e.statut]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card locale ───────────────────────────────────────────────────────────
type Color = 'primary' | 'success' | 'warning';
const colorMap: Record<Color, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
};

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: Color;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[color])}>
        {icon}
      </div>
      <p className="mt-4 font-mono text-[1.65rem] font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
