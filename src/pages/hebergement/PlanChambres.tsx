import { useState } from 'react';
import { BedDouble, Wrench, Wind, CheckCircle2 } from 'lucide-react';
import { useChambres } from '@/hooks/useHebergement';
import { cn } from '@/lib/utils';
import type { Chambre, StatutChambre } from '@/shared/types/hebergement';
import { ChartEtatChambres } from './ChartEtatChambres';

const STATUT_CONFIG: Record<StatutChambre, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  libre:        { label: 'Libre',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  icon: CheckCircle2 },
  occupee:      { label: 'Occupée',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',        icon: BedDouble },
  menage:       { label: 'Ménage',       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',      icon: Wind },
  hors_service: { label: 'Hors service', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',          icon: Wrench },
};

function ChambreCard({ chambre, onChangeStatut }: { chambre: Chambre; onChangeStatut: (id: number, s: StatutChambre) => void }) {
  const cfg = STATUT_CONFIG[chambre.statut];
  const Icon = cfg.icon;

  return (
    <div className={cn('rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all duration-200', cfg.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold">{chambre.numero}</p>
          <p className="text-xs text-muted-foreground">Étage {chambre.etage}</p>
          {chambre.typeChambreLabel && (
            <p className="text-xs font-medium mt-1">{chambre.typeChambreLabel}</p>
          )}
        </div>
        <Icon className={cn('h-5 w-5 mt-0.5', cfg.color)} />
      </div>
      <div className="mt-3">
        <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
      </div>
      {/* Actions rapides */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(STATUT_CONFIG) as StatutChambre[]).filter((s) => s !== chambre.statut).map((s) => (
          <button
            key={s}
            onClick={(e) => { e.stopPropagation(); onChangeStatut(chambre.id, s); }}
            className="rounded-md bg-white/70 border border-border/40 px-2 py-0.5 text-[10px] font-medium hover:bg-white transition-colors"
          >
            → {STATUT_CONFIG[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlanChambres() {
  const { data: chambres, loading, updateStatut } = useChambres();
  const [filterStatut, setFilterStatut] = useState<StatutChambre | ''>('');

  const filtrees = filterStatut ? chambres.filter((c) => c.statut === filterStatut) : chambres;

  // Grouper par hôtel puis par étage
  const byHotel = filtrees.reduce<Record<string, { name: string; etages: Record<number, Chambre[]> }>>((acc, c) => {
    if (!acc[c.hotelId]) acc[c.hotelId] = { name: c.hotelName, etages: {} };
    if (!acc[c.hotelId].etages[c.etage]) acc[c.hotelId].etages[c.etage] = [];
    acc[c.hotelId].etages[c.etage].push(c);
    return acc;
  }, {});

  const stats = {
    libre: chambres.filter((c) => c.statut === 'libre').length,
    occupee: chambres.filter((c) => c.statut === 'occupee').length,
    menage: chambres.filter((c) => c.statut === 'menage').length,
    hors_service: chambres.filter((c) => c.statut === 'hors_service').length,
  };

  if (loading) return <div className="h-40 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />;

  if (chambres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
        <BedDouble className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Aucune chambre configurée</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Ajoutez des chambres depuis les paramètres de l'hôtel</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diagramme états */}
      <ChartEtatChambres chambres={chambres} />

      {/* Légende + stats */}
      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(STATUT_CONFIG) as StatutChambre[]).map((s) => {
          const cfg = STATUT_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatut(filterStatut === s ? '' : s)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                cfg.bg, cfg.color,
                filterStatut === s ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100',
              )}
            >
              <cfg.icon className="h-3.5 w-3.5" />
              {cfg.label}
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 font-bold">{stats[s]}</span>
            </button>
          );
        })}
        <span className="text-xs text-muted-foreground ml-auto">{chambres.length} chambre{chambres.length > 1 ? 's' : ''} total</span>
      </div>

      {/* Plan par hôtel / étage */}
      {Object.entries(byHotel).map(([hotelId, hotel]) => (
        <div key={hotelId} className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{hotel.name}</h3>
          {Object.entries(hotel.etages).sort(([a], [b]) => Number(a) - Number(b)).map(([etage, chmbrs]) => (
            <div key={etage}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {Number(etage) === 0 ? 'Rez-de-chaussée' : `Étage ${etage}`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {chmbrs.map((c) => (
                  <ChambreCard key={c.id} chambre={c} onChangeStatut={updateStatut} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
