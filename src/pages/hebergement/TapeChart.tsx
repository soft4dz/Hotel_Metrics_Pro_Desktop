import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X, LogIn, LogOut, CheckCircle, XCircle, User } from 'lucide-react';
import { useChambres, useReservations } from '@/hooks/useHebergement';
import { useHotelsList } from '@/hooks/useHotelsList';
import { cn } from '@/lib/utils';
import type { Chambre, Reservation, StatutReservation } from '@/shared/types/hebergement';

const VISIBLE_DAYS = 14;

const STATUT_BAR: Record<StatutReservation, string> = {
  provisoire: 'bg-slate-300 text-slate-800 hover:bg-slate-400',
  confirmee:  'bg-blue-400 text-white hover:bg-blue-500',
  arrivee:    'bg-emerald-500 text-white hover:bg-emerald-600',
  depart:     'bg-violet-400 text-white hover:bg-violet-500',
  annulee:    'bg-red-200 text-red-700',
  no_show:    'bg-orange-200 text-orange-700',
};

const STATUT_LABELS: Record<StatutReservation, string> = {
  provisoire: 'Provisoire', confirmee: 'Confirmée', arrivee: 'En séjour',
  depart: 'Partie', annulee: 'Annulée', no_show: 'No show',
};

function toIso(d: Date) { return d.toISOString().slice(0, 10); }
function todayIso() { return toIso(new Date()); }

function datesFrom(start: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < count; i++) {
    out.push(toIso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function dayName(date: string) { return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(date).getDay()]; }
function dayNum(date: string) { return new Date(date).getDate(); }
function isWeekend(date: string) { const d = new Date(date).getDay(); return d === 0 || d === 6; }

interface RowCell {
  date: string;
  span: number;
  reservation: Reservation | null;
}

function buildRowCells(dates: string[], reservations: Reservation[]): RowCell[] {
  const cells: RowCell[] = [];
  let i = 0;
  while (i < dates.length) {
    const date = dates[i];
    const res = reservations.find((r) => r.dateArrivee <= date && r.dateDepart > date);
    if (res) {
      let span = 0;
      let j = i;
      while (j < dates.length && dates[j] < res.dateDepart) { span++; j++; }
      cells.push({ date, span, reservation: res });
      i += span;
    } else {
      cells.push({ date, span: 1, reservation: null });
      i++;
    }
  }
  return cells;
}

export function TapeChart() {
  const { operationalHotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState(0);
  const effectiveHotelId = hotelId || defaultHotelId || 0;

  const [start, setStart] = useState(todayIso());
  const dates = useMemo(() => datesFrom(start, VISIBLE_DAYS), [start]);
  const today = todayIso();

  const { data: chambres } = useChambres(effectiveHotelId || undefined);
  const { data: reservations, updateStatut } = useReservations(
    effectiveHotelId || undefined, dates[0], dates[dates.length - 1],
  );

  const rooms = useMemo(
    () => [...chambres].sort((a, b) => a.etage - b.etage || a.numero.localeCompare(b.numero)),
    [chambres],
  );

  const reservationsByChambre = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    for (const r of reservations) {
      if (r.statut === 'annulee' || r.statut === 'no_show' || !r.chambreId) continue;
      const list = map.get(r.chambreId) ?? [];
      list.push(r);
      map.set(r.chambreId, list);
    }
    return map;
  }, [reservations]);

  const [selected, setSelected] = useState<Reservation | null>(null);
  const [acting, setActing] = useState(false);

  const shift = (days: number) => setStart((s) => { const d = new Date(s); d.setDate(d.getDate() + days); return toIso(d); });

  const doAction = async (statut: StatutReservation) => {
    if (!selected) return;
    setActing(true);
    try {
      await updateStatut(selected.id, statut);
      setSelected(null);
    } finally { setActing(false); }
  };

  const actionsFor = (r: Reservation): { label: string; statut: StatutReservation; icon: React.ElementType }[] =>
    ([
      { label: 'Check-in', statut: 'arrivee' as StatutReservation, icon: LogIn },
      { label: 'Check-out', statut: 'depart' as StatutReservation, icon: LogOut },
      { label: 'Confirmer', statut: 'confirmee' as StatutReservation, icon: CheckCircle },
      { label: 'Annuler', statut: 'annulee' as StatutReservation, icon: XCircle },
    ]).filter((a) => a.statut !== r.statut);

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Unité</label>
          <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={hotelId} onChange={(e) => setHotelId(+e.target.value)}>
            <option value={0}>— Toutes / par défaut —</option>
            {operationalHotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => shift(-7)} className="rounded-lg border border-border p-1.5 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setStart(todayIso())}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
            <CalendarDays className="h-3.5 w-3.5" /> Aujourd'hui
          </button>
          <button onClick={() => shift(7)} className="rounded-lg border border-border p-1.5 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Détail réservation sélectionnée */}
      {selected && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.clientNom} {selected.clientPrenom ?? ''}</p>
                <p className="text-xs text-muted-foreground">
                  Ch. {selected.chambreNumero} · {selected.dateArrivee} → {selected.dateDepart} ({selected.nbNuits} nuit{selected.nbNuits > 1 ? 's' : ''})
                  {' · '}<span className="font-medium">{STATUT_LABELS[selected.statut]}</span>
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {actionsFor(selected).map((a) => (
              <button key={a.statut} disabled={acting} onClick={() => void doAction(a.statut)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50">
                <a.icon className="h-3.5 w-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grille rack */}
      {rooms.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Aucune chambre configurée pour cette unité</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="sticky left-0 z-10 bg-slate-50/80 px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-r border-border/40 min-w-[130px]">
                    Chambre
                  </th>
                  {dates.map((d) => (
                    <th key={d} className={cn(
                      'px-1.5 py-2 text-center font-semibold border-b border-l border-border/20 min-w-[54px]',
                      d === today ? 'bg-primary/10 text-primary' : isWeekend(d) ? 'text-primary/70' : 'text-muted-foreground',
                    )}>
                      <div>{dayName(d)}</div>
                      <div className="font-bold">{dayNum(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room: Chambre) => {
                  const cells = buildRowCells(dates, reservationsByChambre.get(room.id) ?? []);
                  return (
                    <tr key={room.id} className="border-b border-border/20">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium border-r border-border/30">
                        <p>{room.numero}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">{room.typeChambreLabel ?? `Étage ${room.etage}`}</p>
                      </td>
                      {cells.map((cell) => (
                        <td key={cell.date} colSpan={cell.span}
                          className={cn('px-0.5 py-1.5 border-l border-border/10', cell.reservation && 'cursor-pointer')}
                          onClick={() => cell.reservation && setSelected(cell.reservation)}
                        >
                          {cell.reservation ? (
                            <div className={cn(
                              'truncate rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                              STATUT_BAR[cell.reservation.statut],
                            )}>
                              {cell.reservation.clientNom}
                            </div>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-border/30 bg-slate-50/40 text-[11px] text-muted-foreground">
            {(Object.keys(STATUT_LABELS) as StatutReservation[]).filter((s) => s !== 'annulee' && s !== 'no_show').map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn('inline-block h-2.5 w-4 rounded-sm', STATUT_BAR[s].split(' ')[0])} /> {STATUT_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
