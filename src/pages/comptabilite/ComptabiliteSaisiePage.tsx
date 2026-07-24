import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { Compte, LigneEcritureInput } from '@/shared/types/comptabilite';

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-[13px] shadow-sm outline-none focus:border-primary/50';
const selectCls = `${inputCls} max-w-none`;

type LigneForm = LigneEcritureInput & { key: number };

const emptyLine = (key: number): LigneForm => ({ key, compteNumero: '', libelle: '', debit: 0, credit: 0 });

export function ComptabiliteSaisiePage() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loadingComptes, setLoadingComptes] = useState(true);
  const [dateEcriture, setDateEcriture] = useState(() => new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState('');
  const [piece, setPiece] = useState('');
  const [lignes, setLignes] = useState<LigneForm[]>([emptyLine(1), emptyLine(2)]);
  const [nextKey, setNextKey] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = unwrapIpc(await window.electronAPI.comptabilite.listComptes());
        setComptes(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement comptes');
      } finally {
        setLoadingComptes(false);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    const totalDebit = lignes.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lignes.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { totalDebit, totalCredit, equilibre: Math.abs(totalDebit - totalCredit) < 0.01 };
  }, [lignes]);

  const updateLigne = (key: number, patch: Partial<LigneForm>) => {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLigne = () => {
    setLignes((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  };

  const removeLigne = (key: number) => {
    if (lignes.length <= 2) return;
    setLignes((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!libelle.trim()) { setError('Libellé obligatoire.'); return; }
    if (!totals.equilibre) { setError('Écriture déséquilibrée — débit et crédit doivent être égaux.'); return; }
    if (lignes.some((l) => !l.compteNumero)) { setError('Chaque ligne doit avoir un compte.'); return; }

    setSaving(true);
    try {
      unwrapIpc(await window.electronAPI.comptabilite.createEcriture({
        journalCode: 'OD',
        dateEcriture,
        libelle: libelle.trim(),
        piece: piece.trim() || undefined,
        lignes: lignes.map(({ compteNumero, libelle: ll, debit, credit }) => ({
          compteNumero,
          libelle: ll || undefined,
          debit: Number(debit) || 0,
          credit: Number(credit) || 0,
        })),
      }));
      setSuccess('Écriture OD enregistrée.');
      setLibelle('');
      setPiece('');
      setLignes([emptyLine(nextKey), emptyLine(nextKey + 1)]);
      setNextKey((k) => k + 2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold">Écriture manuelle — journal OD</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Date</span>
            <input type="date" className={inputCls} value={dateEcriture} onChange={(e) => setDateEcriture(e.target.value)} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-muted-foreground">Libellé</span>
            <input type="text" className={inputCls} value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Libellé de l'écriture" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Pièce (optionnel)</span>
            <input type="text" className={inputCls} value={piece} onChange={(e) => setPiece(e.target.value)} />
          </label>
        </div>

        {loadingComptes ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement comptes…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Compte', 'Libellé ligne', 'Débit', 'Crédit', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {lignes.map((l) => (
                  <tr key={l.key}>
                    <td className="px-2 py-2">
                      <select className={selectCls} value={l.compteNumero} onChange={(e) => updateLigne(l.key, { compteNumero: e.target.value })}>
                        <option value="">— Compte —</option>
                        {comptes.map((c) => <option key={c.id} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" className={inputCls} value={l.libelle ?? ''} onChange={(e) => updateLigne(l.key, { libelle: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} step="0.01" className={inputCls} value={l.debit ?? 0} onChange={(e) => updateLigne(l.key, { debit: Number(e.target.value), credit: 0 })} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} step="0.01" className={inputCls} value={l.credit ?? 0} onChange={(e) => updateLigne(l.key, { credit: Number(e.target.value), debit: 0 })} />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => removeLigne(l.key)} disabled={lignes.length <= 2} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30" title="Supprimer ligne">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/40 bg-slate-50/40 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-right text-muted-foreground">Totaux</td>
                  <td className="px-2 py-2 font-mono tabular-nums">{formatMoney(totals.totalDebit)}</td>
                  <td className="px-2 py-2 font-mono tabular-nums">{formatMoney(totals.totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addLigne} className="h-8 gap-1.5">
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </Button>
          <div className="flex-1" />
          {!totals.equilibre && (
            <span className="text-[13px] text-amber-600">Écriture déséquilibrée</span>
          )}
          <Button size="sm" onClick={() => void handleSubmit()} disabled={saving || !totals.equilibre} className="h-8 gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}
    </div>
  );
}
