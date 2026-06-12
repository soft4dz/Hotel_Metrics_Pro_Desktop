import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, TrendingUp } from 'lucide-react';
import { useFacturationDashboard } from '@/hooks/useFacturation';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { STATUT_FACT_LABELS } from '@/shared/types/facturation';
import type { FactureStatut } from '@/shared/types/facturation';

const STATUT_CLS: Record<FactureStatut, string> = {
  brouillon: 'border-slate-200 bg-slate-100 text-slate-600',
  soumise:   'border-blue-200 bg-blue-50 text-blue-700',
  validee:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  payee:     'border-green-200 bg-green-100 text-green-800',
  annulee:   'border-red-200 bg-red-50 text-red-600',
};

export function FacturationBoard() {
  const { data, loading, error } = useFacturationDashboard();

  if (loading) return <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Facturé (TTC)" value={formatMoney(data.totalFactureTtc)} icon={<FileText className="h-5 w-5" />} color="primary" />
        <KpiCard label="Encaissé ce mois" value={formatMoney(data.totalEncaisseMois)} icon={<TrendingUp className="h-5 w-5" />} color="success" />
        <KpiCard
          label="En attente de paiement"
          value={formatMoney(data.totalEnAttente)}
          sub={data.nombreEnRetard > 0 ? `${data.nombreEnRetard} en retard` : undefined}
          icon={<Clock className="h-5 w-5" />}
          color={data.nombreEnRetard > 0 ? 'danger' : 'warning'}
        />
        <KpiCard
          label="Taux de recouvrement"
          value={formatPercent(data.tauxRecouvrement)}
          sub="Encaissé / Facturé"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color={data.tauxRecouvrement >= 80 ? 'success' : data.tauxRecouvrement >= 50 ? 'warning' : 'danger'}
        />
      </div>

      {data.nombreEnRetard > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{data.nombreEnRetard} facture{data.nombreEnRetard > 1 ? 's' : ''}</span> en retard de paiement — échéance dépassée.
          </p>
          <Link to="/facturation/factures?statut=validee" className="ml-auto text-[13px] font-semibold text-amber-700 hover:text-amber-900">
            Voir →
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        {/* Évolution mensuelle */}
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Évolution mensuelle</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Facturé vs encaissé — 6 derniers mois</p>
          </div>
          <div className="p-5">
            {data.evolutionMensuelle.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée sur la période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.evolutionMensuelle} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatMoney(v), name === 'facture' ? 'Facturé' : 'Encaissé']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="facture" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="facture" />
                  <Bar dataKey="encaisse" fill="#2563EB" radius={[3, 3, 0, 0]} name="encaisse" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Par hôtel */}
        {data.parHotel.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-white shadow-sm">
            <div className="border-b border-border/50 px-5 py-3.5">
              <h3 className="text-[13px] font-semibold text-foreground">Par établissement</h3>
            </div>
            <div className="divide-y divide-border/40">
              {data.parHotel.map((h) => (
                <div key={h.hotelId} className="px-5 py-3.5">
                  <p className="text-[13px] font-medium text-foreground">{h.hotelName}</p>
                  <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>Facturé : <span className="font-mono font-semibold text-foreground">{formatMoney(h.facture)}</span></span>
                    <span>Encaissé : <span className="font-mono font-semibold text-emerald-600">{formatMoney(h.encaisse)}</span></span>
                  </div>
                  {h.enAttente > 0 && (
                    <p className="mt-0.5 text-[11px] text-amber-600">{formatMoney(h.enAttente)} en attente</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Récentes */}
      <div className="rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Dernières factures</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">8 plus récentes</p>
          </div>
          <Link to="/facturation/factures" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/75">
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recentesFactures.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['N°', 'Unité', 'Client', 'Date', 'TTC', 'Reste', 'Statut'].map((h, i) => (
                    <th key={i} className={cn('px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 4 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.recentesFactures.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <Link to={`/facturation/factures/${f.id}`} className="font-mono text-[12px] font-semibold text-primary hover:underline">{f.numero}</Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{f.hotelName}</td>
                    <td className="max-w-[140px] truncate px-5 py-3 font-medium text-foreground">{f.clientNom || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{f.dateEmission}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(f.montantTtc)}</td>
                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', f.montantRestant > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {f.montantRestant > 0 ? formatMoney(f.montantRestant) : '✓'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STATUT_CLS[f.statut])}>
                        {STATUT_FACT_LABELS[f.statut]}
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

// ── KPI Card ──────────────────────────────────────────────────────────────────
type Color = 'primary' | 'success' | 'warning' | 'danger';
const colorMap: Record<Color, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger:  'bg-red-500/10 text-red-600',
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
