import { useState, useMemo } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { usePlans, useFormules, useGrille } from '@/hooks/useTarifs';
import { useTypesChambre } from '@/hooks/useHebergement';
import { cn } from '@/lib/utils';
import type { UpsertTarifsBulkInput } from '@/shared/types/tarifs';

function firstDayOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function lastDayOfMonth() {
  const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

function dayLabel(date: string): string {
  const d = new Date(date);
  return d.getDate().toString();
}

function dayName(date: string): string {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(date).getDay()];
}

export function GrilleTarifaire() {
  const [hotelId, setHotelId]   = useState<number>(0);
  const [planId, setPlanId]     = useState<number>(0);
  const [formuleId, setFormuleId] = useState<number | undefined>(undefined);
  const [dateDebut, setDateDebut] = useState(firstDayOfMonth());
  const [dateFin, setDateFin]   = useState(lastDayOfMonth());

  // Bulk edit state
  const [bulkMode, setBulkMode]   = useState(false);
  const [bulkPrix, setBulkPrix]   = useState<number>(0);
  const [bulkTcIds, setBulkTcIds] = useState<number[]>([]);
  const [bulkMsg, setBulkMsg]     = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const { data: allPlans }      = usePlans();
  const { data: allFormules }   = useFormules();
  const { data: allTypes }      = useTypesChambre();

  // Filtrer par hôtel sélectionné
  const hotels = useMemo(() => {
    const map = new Map<number, string>();
    allPlans.forEach((p) => map.set(p.hotelId, p.hotelName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allPlans]);

  const plans    = allPlans.filter((p) => !hotelId || p.hotelId === hotelId);
  const formules = allFormules.filter((f) => !hotelId || f.hotelId === hotelId);
  const types    = allTypes.filter((t) => !hotelId || t.hotelId === hotelId);

  const effectiveHotelId = hotelId || plans[0]?.hotelId || 0;
  const effectivePlanId  = planId  || plans[0]?.id || 0;

  const { data: grille, loading, upsert, upsertBulk } = useGrille(
    effectiveHotelId, effectivePlanId, dateDebut, dateFin, formuleId
  );

  const dates = useMemo(() => datesInRange(dateDebut, dateFin), [dateDebut, dateFin]);

  // Indexer grille par typeChambreId × date
  const grilleIndex = useMemo(() => {
    const idx: Record<string, (typeof grille)[0]> = {};
    grille.forEach((t) => { idx[`${t.typeChambreId}_${t.dateApplication}`] = t; });
    return idx;
  }, [grille]);

  const handleCellSave = async (typeChambreId: number, date: string, prix: number) => {
    await upsert({
      hotelId: effectiveHotelId, typeChambreId, planId: effectivePlanId,
      formuleId, dateApplication: date, prixBase: prix,
    });
  };

  const handleBulkSave = async () => {
    if (!bulkTcIds.length) { setBulkMsg('Sélectionnez au moins un type de chambre.'); return; }
    setBulkSaving(true); setBulkMsg(null);
    try {
      const input: UpsertTarifsBulkInput = {
        hotelId: effectiveHotelId, typeChambreIds: bulkTcIds,
        planId: effectivePlanId, formuleId,
        dateDebut, dateFin, prixBase: bulkPrix,
      };
      const count = await upsertBulk(input);
      setBulkMsg(`✓ ${count} tarifs mis à jour.`);
      setBulkMode(false); setBulkTcIds([]);
    } catch (e) { setBulkMsg((e as Error).message); }
    finally { setBulkSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Unité</label>
          <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={hotelId} onChange={(e) => { setHotelId(+e.target.value); setPlanId(0); }}>
            <option value={0}>— Toutes —</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Plan tarifaire</label>
          <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={planId} onChange={(e) => setPlanId(+e.target.value)}>
            <option value={0}>— Sélectionner —</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Formule</label>
          <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={formuleId ?? ''} onChange={(e) => setFormuleId(e.target.value ? +e.target.value : undefined)}>
            <option value="">Hébergement seul</option>
            {formules.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Du</label>
          <input type="date" className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Au</label>
          <input type="date" className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        </div>
        <div className="ml-auto flex items-end">
          <button onClick={() => setBulkMode((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors',
              bulkMode
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}>
            {bulkMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {bulkMode ? 'Mode masse actif' : 'Mise à jour en masse'}
          </button>
        </div>
      </div>

      {/* Panneau mise à jour en masse */}
      {bulkMode && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
          <p className="text-xs font-semibold text-primary">Appliquer un tarif à toute la période sélectionnée</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prix de base (DA)</label>
              <input type="number" min={0} className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-36"
                value={bulkPrix} onChange={(e) => setBulkPrix(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Types de chambres</label>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox"
                      checked={bulkTcIds.includes(t.id)}
                      onChange={(e) => setBulkTcIds((ids) => e.target.checked ? [...ids, t.id] : ids.filter((i) => i !== t.id))}
                      className="rounded border-border" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleBulkSave} disabled={bulkSaving}
              className="rounded-lg bg-primary px-5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {bulkSaving ? 'Application…' : 'Appliquer'}
            </button>
          </div>
          {bulkMsg && (
            <p className={cn('text-xs', bulkMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500')}>{bulkMsg}</p>
          )}
        </div>
      )}

      {/* Grille calendaire */}
      {!effectivePlanId ? (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Sélectionnez un plan tarifaire pour afficher la grille</p>
        </div>
      ) : loading ? (
        <div className="h-40 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : (
        <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="sticky left-0 bg-slate-50/80 px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-r border-border/40 min-w-[140px]">
                    Type de chambre
                  </th>
                  {dates.map((d) => (
                    <th key={d} className={cn(
                      'px-1.5 py-2 text-center font-semibold border-b border-border/30 min-w-[60px]',
                      ['0', '6'].includes(String(new Date(d).getDay())) ? 'text-primary/70' : 'text-muted-foreground',
                    )}>
                      <div>{dayName(d)}</div>
                      <div className="font-bold">{dayLabel(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {types.map((tc) => (
                  <tr key={tc.id} className="border-b border-border/20 hover:bg-slate-50/30">
                    <td className="sticky left-0 bg-white px-3 py-2 font-medium border-r border-border/30">
                      {tc.label}
                    </td>
                    {dates.map((d) => {
                      const cell = grilleIndex[`${tc.id}_${d}`];
                      return (
                        <td key={d} className="px-1 py-1 text-center border-r border-border/10 last:border-r-0">
                          <CellInput
                            value={cell?.prixBase ?? null}
                            ferme={cell?.fermetureVente ?? false}
                            onSave={(v) => handleCellSave(tc.id, d, v)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/30 bg-slate-50/40 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 border border-emerald-300" /> Tarif saisi</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-100 border border-border" /> Non défini</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-red-400" /> Fermé à la vente</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cellule éditable ──────────────────────────────────────────────────────────

function CellInput({ value, ferme, onSave }: {
  value: number | null;
  ferme: boolean;
  onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => { setVal(value !== null ? String(value) : ''); setEditing(true); };

  const commit = async () => {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setSaving(true);
      try { await onSave(n); } finally { setSaving(false); }
    }
    setEditing(false);
  };

  if (ferme) return (
    <div className="flex items-center justify-center h-8 w-full rounded-md bg-red-50">
      <Lock className="h-3 w-3 text-red-400" />
    </div>
  );

  if (editing) return (
    <input autoFocus
      className="w-14 rounded-md border border-primary/50 px-1 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
      value={val} onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    />
  );

  return (
    <button
      onClick={startEdit}
      disabled={saving}
      className={cn(
        'w-14 rounded-md py-1 text-center text-xs font-medium transition-colors hover:ring-2 hover:ring-primary/30 hover:ring-offset-1',
        value !== null
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-50 text-slate-400 border border-dashed border-border hover:bg-white',
      )}
    >
      {saving ? '…' : value !== null ? value.toLocaleString('fr-DZ') : '—'}
    </button>
  );
}
