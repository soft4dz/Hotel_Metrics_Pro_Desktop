import { useState } from 'react';
import { TrendingUp, BedDouble, Users, DollarSign, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useOccupationKpis } from '@/hooks/useHebergement';
import { cn } from '@/lib/utils';

function today() { return new Date().toISOString().slice(0, 10); }
function firstDayOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <span className={cn('flex items-center gap-0.5 text-xs font-medium',
            trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400')}>
            {trend > 0 ? <ArrowUp className="h-3 w-3" /> : trend < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function OccupationDashboard() {
  const [dateDebut, setDateDebut] = useState(firstDayOfMonth());
  const [dateFin, setDateFin]     = useState(today());
  const { data, loading } = useOccupationKpis(dateDebut, dateFin);

  const fmt = (n: number, suffix = '') => `${n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}${suffix}`;
  const fmtDa = (n: number) => `${n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} DA`;

  return (
    <div className="space-y-6">
      {/* Filtres période */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Du</label>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Au</label>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
      ) : (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Taux d'occupation" value={`${data.tauxOccupationMoyen}%`}
              sub={`${data.totalChambres} chambres total`}
              icon={TrendingUp} color="bg-emerald-500/10 text-emerald-600" />
            <KpiCard label="ADR moyen" value={fmtDa(data.adrMoyen)}
              sub="Tarif moyen / nuitée vendue"
              icon={DollarSign} color="bg-blue-500/10 text-blue-600" />
            <KpiCard label="RevPAR" value={fmtDa(data.revparMoyen)}
              sub="Revenu / chambre disponible"
              icon={BedDouble} color="bg-violet-500/10 text-violet-600" />
            <KpiCard label="Revenu total" value={fmtDa(data.totalRevenu)}
              sub={`${dateDebut} → ${dateFin}`}
              icon={Users} color="bg-amber-500/10 text-amber-600" />
          </div>

          {/* Tableau par hôtel */}
          {data.hotels.length > 1 && (
            <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40">
                <h3 className="text-sm font-semibold">Détail par unité hôtelière</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-slate-50/60">
                      {['Hôtel', 'Chambres', 'Nuitées', 'TO %', 'ADR', 'RevPAR', 'Arrivées', 'Départs'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.hotels.map((h) => (
                      <tr key={h.hotelId} className="border-b border-border/20 hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium">{h.hotelName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{h.totalChambres}</td>
                        <td className="px-4 py-3">{h.nbNuiteesVendues}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            h.tauxOccupation >= 80 ? 'bg-emerald-50 text-emerald-700' :
                            h.tauxOccupation >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600')}>
                            {h.tauxOccupation}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{fmt(h.adr)} DA</td>
                        <td className="px-4 py-3">{fmt(h.revpar)} DA</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{h.arrivees}</td>
                        <td className="px-4 py-3 text-blue-600 font-medium">{h.departs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KPIs d'un seul hôtel */}
          {data.hotels.length === 1 && data.hotels[0] && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Total chambres',   value: fmt(data.hotels[0].totalChambres) },
                { label: 'Hors service',     value: fmt(data.hotels[0].chambresHorsService) },
                { label: 'Nuitées vendues',  value: fmt(data.hotels[0].nbNuiteesVendues) },
                { label: 'Arrivées',         value: fmt(data.hotels[0].arrivees) },
                { label: 'Départs',          value: fmt(data.hotels[0].departs) },
                { label: 'Montant payé',     value: fmtDa(data.hotels[0].revpar * data.hotels[0].chambresDisponibles) },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-border/50 bg-slate-50/50 p-4">
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
