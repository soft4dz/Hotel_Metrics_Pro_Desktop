import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { CreateRetenueInput, RetenueSource } from '@/shared/types/fiscalite';

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-[13px] shadow-sm outline-none focus:border-primary/50';

const emptyForm: CreateRetenueInput = {
  fournisseurNom: '',
  baseHt: 0,
  taux: 0.05,
  dateRetenue: new Date().toISOString().slice(0, 10),
};

export function FiscaliteRetenuePage() {
  const [items, setItems] = useState<RetenueSource[]>([]);
  const [form, setForm] = useState<CreateRetenueInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = unwrapIpc(await window.electronAPI.fiscalite.listRetenues());
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!form.fournisseurNom.trim()) { setError('Nom du fournisseur obligatoire.'); return; }
    setSaving(true);
    setError(null);
    try {
      unwrapIpc(await window.electronAPI.fiscalite.createRetenue(form));
      setForm({ ...emptyForm, dateRetenue: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Nouvelle retenue à la source</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-muted-foreground">Fournisseur</span>
            <input className={inputCls} value={form.fournisseurNom} onChange={(e) => setForm((f) => ({ ...f, fournisseurNom: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Base HT</span>
            <input type="number" min={0} step="0.01" className={inputCls} value={form.baseHt} onChange={(e) => setForm((f) => ({ ...f, baseHt: Number(e.target.value) }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Taux (%)</span>
            <input type="number" min={0} max={100} step="0.01" className={inputCls} value={(form.taux ?? 0) * 100} onChange={(e) => setForm((f) => ({ ...f, taux: Number(e.target.value) / 100 }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Date</span>
            <input type="date" className={inputCls} value={form.dateRetenue} onChange={(e) => setForm((f) => ({ ...f, dateRetenue: e.target.value }))} />
          </label>
        </div>
        <Button size="sm" onClick={() => void handleCreate()} disabled={saving} className="h-8 gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Enregistrer
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune retenue enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Fournisseur', 'Date', 'Base HT', 'Taux', 'Montant retenu'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-medium">{r.fournisseurNom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.dateRetenue}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(r.baseHt)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{(r.taux * 100).toFixed(2)} %</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(r.montantRetenu)}</td>
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
