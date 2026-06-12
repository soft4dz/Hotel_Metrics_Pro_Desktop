import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Filter, Loader2, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEncaissements } from '@/hooks/useTresorerie';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { EncaissementFilters, EncaissementStatut, ModePaiement } from '@/shared/types/tresorerie';
import { MODE_LABELS, STATUT_LABELS } from '@/shared/types/tresorerie';

const STATUT_CLS: Record<EncaissementStatut, string> = {
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirme:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejete:     'bg-red-50 text-red-600 border-red-200',
};

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] text-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

export function EncaissementsListPage() {
  const navigate = useNavigate();
  const { hotels } = useHotelsList();

  const [draft, setDraft] = useState<EncaissementFilters>({});
  const { items, loading, error, setFilters, confirmer, rejeter, remove } = useEncaissements(draft);
  const [actionId, setActionId] = useState<number | null>(null);

  const handleApply = () => setFilters(draft);
  const handleReset = () => { setDraft({}); setFilters({}); };

  const handleConfirmer = async (id: number) => {
    setActionId(id);
    try { await confirmer(id); } finally { setActionId(null); }
  };

  const handleRejeter = async (id: number) => {
    const motif = window.prompt('Motif du rejet :');
    if (!motif) return;
    setActionId(id);
    try { await rejeter(id, motif); } finally { setActionId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet encaissement ?')) return;
    setActionId(id);
    try { await remove(id); } finally { setActionId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtres</span>

        {hotels.length > 0 && (
          <select className={selectCls} value={draft.hotelId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, hotelId: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">Toutes les unités</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        <select className={selectCls} value={draft.mode ?? ''} onChange={(e) => setDraft((d) => ({ ...d, mode: (e.target.value as ModePaiement) || undefined }))}>
          <option value="">Tous les modes</option>
          {(Object.keys(MODE_LABELS) as ModePaiement[]).map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
        </select>

        <select className={selectCls} value={draft.statut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, statut: (e.target.value as EncaissementStatut) || undefined }))}>
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUT_LABELS) as EncaissementStatut[]).map((s) => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
        </select>

        <input type="date" className={selectCls} value={draft.dateDebut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateDebut: e.target.value || undefined }))} />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" className={selectCls} value={draft.dateFin ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateFin: e.target.value || undefined }))} />

        <div className="flex-1" />

        <Button size="sm" onClick={handleApply} className="h-8 gap-1.5 px-3 text-[13px]">
          <Filter className="h-3.5 w-3.5" /> Appliquer
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-8 gap-1.5 px-3 text-[13px]">
          <RotateCcw className="h-3 w-3" /> Réinitialiser
        </Button>
        <Button size="sm" onClick={() => void navigate('/encaissements/nouveau')} className="h-8 gap-1.5 px-3 text-[13px]">
          <Plus className="h-4 w-4" /> Nouvel encaissement
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun encaissement sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Date', 'Unité', 'Mode', 'Référence', 'Description', 'Compte', 'Montant', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className={cn('px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400', h === 'Montant' || h === 'Actions' ? 'text-right' : 'text-left')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{e.dateEncaissement}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.hotelName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{MODE_LABELS[e.mode]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.reference ?? '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.compteBancaireIntitule ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatMoney(e.montant)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STATUT_CLS[e.statut])}>
                        {STATUT_LABELS[e.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {e.statut === 'en_attente' && (
                          <>
                            <button
                              disabled={actionId === e.id}
                              onClick={() => void handleConfirmer(e.id)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              title="Confirmer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              disabled={actionId === e.id}
                              onClick={() => void handleRejeter(e.id)}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                              title="Rejeter"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          disabled={actionId === e.id}
                          onClick={() => void handleDelete(e.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-right text-[11px] text-muted-foreground">{items.length} résultat{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
