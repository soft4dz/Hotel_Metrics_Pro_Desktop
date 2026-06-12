import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { Chambre } from '@/shared/types/hebergement';

const STATUT_COLORS: Record<string, string> = {
  libre:        '#10b981',
  occupee:      '#3b82f6',
  menage:       '#f59e0b',
  hors_service: '#ef4444',
};

const STATUT_LABELS: Record<string, string> = {
  libre:        'Libre',
  occupee:      'Occupée',
  menage:       'Ménage',
  hors_service: 'Hors service',
};

const STATUTS = ['libre', 'occupee', 'menage', 'hors_service'] as const;

interface Props {
  chambres: Chambre[];
}

interface HotelBar {
  hotel: string;
  libre: number;
  occupee: number;
  menage: number;
  hors_service: number;
  total: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.fill }} />
            <span className="text-slate-600">{STATUT_LABELS[p.dataKey]}</span>
          </div>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-border pt-1.5 flex justify-between font-semibold">
        <span className="text-slate-500">Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
};

export function ChartEtatChambres({ chambres }: Props) {
  if (chambres.length === 0) return null;

  // Agréger par hôtel
  const byHotel = chambres.reduce<Record<string, HotelBar>>((acc, c) => {
    if (!acc[c.hotelId]) {
      acc[c.hotelId] = { hotel: c.hotelName, libre: 0, occupee: 0, menage: 0, hors_service: 0, total: 0 };
    }
    acc[c.hotelId][c.statut]++;
    acc[c.hotelId].total++;
    return acc;
  }, {});

  const data: HotelBar[] = Object.values(byHotel);

  // Totaux globaux pour les badges
  const totaux = STATUTS.reduce((acc, s) => {
    acc[s] = chambres.filter((c) => c.statut === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Répartition des chambres par statut</h3>
        <div className="flex flex-wrap gap-2">
          {STATUTS.map((s) => (
            <span key={s}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${STATUT_COLORS[s]}18`, color: STATUT_COLORS[s] }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUT_COLORS[s] }} />
              {STATUT_LABELS[s]}
              <span className="ml-1 rounded-full bg-white/60 px-1.5 font-bold">{totaux[s]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="30%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="hotel"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend
              iconType="square"
              iconSize={10}
              formatter={(value) => (
                <span style={{ fontSize: 11, color: '#64748b' }}>{STATUT_LABELS[value] ?? value}</span>
              )}
            />
            {STATUTS.map((s) => (
              <Bar key={s} dataKey={s} stackId="a" fill={STATUT_COLORS[s]} radius={s === 'hors_service' ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={STATUT_COLORS[s]} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
