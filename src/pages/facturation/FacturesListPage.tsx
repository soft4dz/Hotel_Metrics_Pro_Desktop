import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Filter, Loader2, Plus, RotateCcw, SendHorizonal, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFactures } from '@/hooks/useFacturation';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FactureFilters, FactureStatut } from '@/shared/types/facturation';
import { STATUT_FACT_LABELS } from '@/shared/types/facturation';

const STATUT_CLS: Record<FactureStatut, string> = {
  brouillon: 'border-slate-200 bg-slate-100 text-slate-600',
  soumise:   'border-blue-200 bg-blue-50 text-blue-700',
  validee:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  payee:     'border-green-200 bg-green-100 text-green-800',
  annulee:   'border-red-200 bg-red-50 text-red-600',
};

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

export function FacturesListPage() {
  const navigate = useNavigate();
  const { hotels } = useHotelsList();

  const [draft, setDraft] = useState<FactureFilters>({});
  const { items, loading, error, setFilters, soumettre, valider, annuler, remove } = useFactures(draft);
  const [actionId, setActionId] = useState<number | null>(null);

  const handleApply = () => setFilters(draft);
  const handleReset = () => { setDraft({}); setFilters({}); };

  const act = async (fn: () => Promise<unknown>, id: number) => {
    setActionId(id);
    try { await fn(); } finally { setActionId(null); }
  };

  const handleSoumettre = (id: number) => act(() => soumettre(id), id);
  const handleValider   = (id: number) => act(() => valider(id), id);
  const handleAnnuler   = async (id: number) => {
    if (!window.confirm('Annuler cette facture ?')) return;
    await act(() => annuler(id), id);
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cette facture brouillon ?')) return;
    await act(() => remove(id), id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtres</span>

        <select className={selectCls} value={draft.hotelId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, hotelId: e.target.value ? Number(e.target.value) : undefined }))}>
          <option value="">Toutes les unités</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>

        <select className={selectCls} value={draft.statut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, statut: (e.target.value as FactureStatut) || undefined }))}>
          <option value="">Tous statuts</option>
          {(Object.keys(STATUT_FACT_LABELS) as FactureStatut[]).map((s) => <option key={s} value={s}>{STATUT_FACT_LABELS[s]}</option>)}
        </select>

        <input
          type="text"
          placeholder="N° facture, client…"
          className={`${selectCls} w-[160px]`}
          value={draft.search ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
        />
        <input type="date" className={selectCls} value={draft.dateDebut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateDebut: e.target.value || undefined }))} />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" className={selectCls} value={draft.dateFin ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateFin: e.target.value || undefined }))} />

        <div className="flex-1" />
        <Button size="sm" onClick={handleApply} className="h-8 gap-1.5 px-3 text-[13px]">
          <Filter className="h-3.5 w-3.5" /> Appliquer
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-8 gap-1.5 px-3 text-[13px]">
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button size="sm" onClick={() => void navigate('/facturation/nouvelle')} className="h-8 gap-1.5 px-3 text-[13px]">
          <Plus className="h-4 w-4" /> Nouvelle facture
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune facture trouvée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['N°', 'Unité', 'Client', 'Date', 'Échéance', 'HT', 'TTC', 'Reste', 'Statut', 'Actions'].map((h, i) => (
                    <th key={i} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 5 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3">
                      <Link to={`/facturation/factures/${f.id}`} className="font-mono text-[12px] font-semibold text-primary hover:underline">{f.numero}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{f.hotelName}</td>
                    <td className="max-w-[120px] truncate px-4 py-3 font-medium text-foreground">{f.clientNom || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{f.dateEmission}</td>
                    <td className={cn('whitespace-nowrap px-4 py-3', f.dateEcheance && f.statut === 'validee' && f.dateEcheance < new Date().toISOString().slice(0,10) ? 'font-semibold text-red-600' : 'text-muted-foreground')}>
                      {f.dateEcheance ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{formatMoney(f.montantHt)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatMoney(f.montantTtc)}</td>
                    <td className={cn('px-4 py-3 text-right font-mono tabular-nums', f.montantRestant > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {f.montantRestant > 0 ? formatMoney(f.montantRestant) : '✓'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STATUT_CLS[f.statut])}>
                        {STATUT_FACT_LABELS[f.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {f.statut === 'brouillon' && (
                          <button disabled={actionId === f.id} onClick={() => void handleSoumettre(f.id)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50" title="Soumettre">
                            <SendHorizonal className="h-4 w-4" />
                          </button>
                        )}
                        {f.statut === 'soumise' && (
                          <button disabled={actionId === f.id} onClick={() => void handleValider(f.id)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Valider">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {['brouillon', 'soumise'].includes(f.statut) && (
                          <button disabled={actionId === f.id} onClick={() => void handleAnnuler(f.id)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50" title="Annuler">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {['brouillon', 'annulee'].includes(f.statut) && (
                          <button disabled={actionId === f.id} onClick={() => void handleDelete(f.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50" title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{items.length} facture{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
