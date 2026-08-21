import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { formatMoney } from '@/lib/formatters';
import type { LettrageComptable, LigneLettrable } from '@/shared/types/comptabilite';

export function ComptabiliteLettragePage() {
  const qc = useQueryClient();
  const [compte, setCompte] = useState('411000');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data: lignes = [], isLoading } = useQuery({ queryKey: ['lettrage-lignes', compte], queryFn: async () => unwrapIpc(await ipcClient.comptabilite.listLignesLettrables(compte)) as LigneLettrable[], enabled: /^(401|411)\d*$/.test(compte) });
  const { data: history = [] } = useQuery({ queryKey: ['lettrages'], queryFn: async () => unwrapIpc(await ipcClient.comptabilite.listLettrages()) as LettrageComptable[] });
  const totals = useMemo(() => lignes.filter((l) => selected.has(l.ligneId)).reduce((a, l) => ({ debit: a.debit + l.debit, credit: a.credit + l.credit }), { debit: 0, credit: 0 }), [lignes, selected]);
  const ecart = Math.round((totals.debit - totals.credit) * 100) / 100;
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['lettrage-lignes'] }); void qc.invalidateQueries({ queryKey: ['lettrages'] }); };
  const create = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.comptabilite.creerLettrage([...selected])), onSuccess: () => { setSelected(new Set()); refresh(); notify.success('Lettrage créé'); }, onError: (e) => notify.error(e instanceof Error ? e.message : 'Échec du lettrage') });
  const cancel = useMutation({ mutationFn: async (id: number) => unwrapIpc(await ipcClient.comptabilite.annulerLettrage(id)), onSuccess: () => { refresh(); notify.success('Lettrage annulé'); } });
  const toggle = (id: number) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return <div className="space-y-5">
    <header><h1 className="text-xl font-semibold">Lettrage des comptes tiers</h1><p className="text-sm text-muted-foreground">Associez factures et règlements validés sur les comptes 401/411.</p></header>
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Compte tiers</span><input value={compte} onChange={(e) => { setCompte(e.target.value); setSelected(new Set()); }} className="rounded-lg border bg-background px-3 py-2" /></label>
        <div className="text-sm">Débit <strong>{formatMoney(totals.debit)}</strong></div><div className="text-sm">Crédit <strong>{formatMoney(totals.credit)}</strong></div>
        <div className={`text-sm ${Math.abs(ecart) >= .01 ? 'text-orange-600' : 'text-emerald-600'}`}>Écart <strong>{formatMoney(ecart)}</strong></div>
        <button type="button" onClick={() => create.mutate()} disabled={selected.size < 2 || Math.abs(ecart) >= .01 || create.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Lettrer la sélection</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Choix</th><th>Date</th><th>Pièce</th><th>Libellé</th><th className="text-right">Débit</th><th className="text-right">Crédit</th></tr></thead><tbody>
        {!isLoading && lignes.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucune ligne non lettrée.</td></tr>}
        {lignes.map((l) => <tr key={l.ligneId} className="border-b last:border-0"><td className="p-2"><input aria-label={`Sélectionner la ligne ${l.ligneId}`} type="checkbox" checked={selected.has(l.ligneId)} onChange={() => toggle(l.ligneId)} /></td><td>{l.dateEcriture}</td><td>{l.piece ?? '—'}</td><td>{l.libelle}</td><td className="text-right">{formatMoney(l.debit)}</td><td className="text-right">{formatMoney(l.credit)}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="space-y-2"><h2 className="font-semibold">Historique</h2>{history.map((l) => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm"><span><strong>{l.code}</strong> · {l.compteNumero} · {l.lignesCount} lignes</span><span>{formatMoney(l.totalDebit)} · {l.statut}</span>{l.statut === 'valide' && <button type="button" onClick={() => cancel.mutate(l.id)} className="rounded border px-3 py-1 hover:bg-muted">Annuler</button>}</div>)}</section>
  </div>;
}
