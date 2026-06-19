import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Plus, SendHorizonal, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useFactureDetail } from '@/hooks/useFacturation';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ModePaiementFact } from '@/shared/types/facturation';
import { MODE_FACT_LABELS, STATUT_FACT_LABELS } from '@/shared/types/facturation';

const today = () => new Date().toISOString().slice(0, 10);

const STATUT_CLS: Record<string, string> = {
  brouillon: 'border-slate-200 bg-slate-100 text-slate-600',
  soumise:   'border-blue-200 bg-blue-50 text-blue-700',
  validee:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  payee:     'border-green-200 bg-green-100 text-green-800',
  annulee:   'border-red-200 bg-red-50 text-red-600',
};

const inputCls = 'h-9 rounded-lg border border-border/60 bg-white px-3 text-[13px] text-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

export function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const factureId = Number(id);

  const { facture, loading, error, reload, addPaiement, deletePaiement } = useFactureDetail(factureId);

  const [actionLoading, setActionLoading] = useState(false);
  const [paiementForm, setPaiementForm] = useState({ date: today(), montant: '', mode: 'especes' as ModePaiementFact, reference: '' });
  const [showPmt, setShowPmt] = useState(false);
  const [pmtError, setPmtError] = useState<string | null>(null);

  const handleAction = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try { await fn(); void reload(); } finally { setActionLoading(false); }
  };

  const handleSoumettre = () => handleAction(async () => { unwrapIpc(await ipcClient.facturation.soumettre(factureId)); });
  const handleValider   = () => handleAction(async () => { unwrapIpc(await ipcClient.facturation.valider(factureId)); });
  const handleAnnuler   = () => {
    if (!window.confirm('Annuler cette facture ?')) return;
    void handleAction(async () => { unwrapIpc(await ipcClient.facturation.annuler(factureId)); });
  };

  const handleAddPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paiementForm.montant || parseFloat(paiementForm.montant) <= 0) { setPmtError('Montant requis.'); return; }
    setPmtError(null);
    setActionLoading(true);
    try {
      await addPaiement({
        factureId,
        datePaiement: paiementForm.date,
        montant: parseFloat(paiementForm.montant),
        mode: paiementForm.mode,
        reference: paiementForm.reference || undefined,
      });
      setPaiementForm({ date: today(), montant: '', mode: 'especes', reference: '' });
      setShowPmt(false);
    } catch (err) {
      setPmtError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePmt = async (pmtId: number) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    setActionLoading(true);
    try { await deletePaiement(pmtId); } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  if (error || !facture) return <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error ?? 'Facture introuvable.'}</p>;

  const canSoumettre = facture.statut === 'brouillon';
  const canValider   = facture.statut === 'soumise';
  const canAnnuler   = ['brouillon', 'soumise'].includes(facture.statut);
  const canAddPmt    = facture.statut === 'validee' && facture.montantRestant > 0;
  const canExportPdf = ['validee', 'payee'].includes(facture.statut);

  const handleExportPdf = async () => {
    setActionLoading(true);
    try {
      const res = unwrapIpc(await ipcClient.facturation.exportPdf(factureId));
      if (res.ok && res.filePath) alert(`Facture PDF enregistree : ${res.filePath}`);
      else if (res.message) alert(res.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur export PDF');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate(-1)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-bold text-foreground">{facture.numero}</h1>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', STATUT_CLS[facture.statut])}>
              {STATUT_FACT_LABELS[facture.statut]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{facture.hotelName} · {facture.clientNom}</p>
        </div>
        <div className="flex gap-2">
          {canExportPdf && (
            <Button size="sm" variant="outline" onClick={() => void handleExportPdf()} disabled={actionLoading} className="gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </Button>
          )}
          {canSoumettre && <Button size="sm" onClick={() => void handleSoumettre()} disabled={actionLoading} className="gap-1.5"><SendHorizonal className="h-4 w-4" /> Soumettre</Button>}
          {canValider   && <Button size="sm" onClick={() => void handleValider()} disabled={actionLoading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Valider</Button>}
          {canAnnuler   && <Button size="sm" variant="outline" onClick={() => void handleAnnuler()} disabled={actionLoading} className="gap-1.5 text-amber-600 hover:bg-amber-50"><XCircle className="h-4 w-4" /> Annuler</Button>}
        </div>
      </div>

      {/* Infos + Totaux */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Informations</h3>
          <Row label="Émission" value={facture.dateEmission} />
          <Row label="Échéance" value={facture.dateEcheance ?? '—'} />
          <Row label="Client" value={facture.clientNom || '—'} />
          <Row label="Unité" value={facture.hotelName} />
          {facture.notes && <Row label="Notes" value={facture.notes} />}
        </div>
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Récapitulatif</h3>
          <Row label="Montant HT"  value={formatMoney(facture.montantHt)} mono />
          <Row label="TVA"         value={formatMoney(facture.montantTva)} mono />
          <Row label="Total TTC"   value={formatMoney(facture.montantTtc)} mono highlight />
          <Row label="Encaissé"    value={formatMoney(facture.montantPaye)} mono />
          <Row label="Reste dû"    value={formatMoney(facture.montantRestant)} mono warn={facture.montantRestant > 0} />
        </div>
      </div>

      {/* Lignes */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-foreground">Lignes de facturation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-slate-50/60">
                {['Désignation', 'Qté', 'P.U. HT', 'TVA %', 'Montant HT', 'TVA', 'Total TTC'].map((h, i) => (
                  <th key={i} className={cn('px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {facture.lignes.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/40">
                  <td className="px-5 py-3 text-foreground">{l.designation}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{l.quantite}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{formatMoney(l.prixUnitaire)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{l.tauxTva}%</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{formatMoney(l.montantHt)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{formatMoney(l.montantTva)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatMoney(l.montantTtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paiements */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-foreground">Paiements reçus</h3>
          {canAddPmt && (
            <Button size="sm" variant="outline" onClick={() => setShowPmt((v) => !v)} className="h-8 gap-1.5 text-[13px]">
              <Plus className="h-3.5 w-3.5" /> Enregistrer un paiement
            </Button>
          )}
        </div>

        {showPmt && (
          <form onSubmit={(e) => void handleAddPaiement(e)} className="flex flex-wrap items-end gap-3 border-b border-border/40 bg-blue-50/40 px-5 py-4">
            {pmtError && <p className="w-full text-xs text-destructive">{pmtError}</p>}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Date</label>
              <input type="date" className={inputCls} value={paiementForm.date} onChange={(e) => setPaiementForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Montant (DA)</label>
              <input type="number" min="0.01" step="0.01" className={inputCls} value={paiementForm.montant} onChange={(e) => setPaiementForm((f) => ({ ...f, montant: e.target.value }))} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Mode</label>
              <select className={inputCls} value={paiementForm.mode} onChange={(e) => setPaiementForm((f) => ({ ...f, mode: e.target.value as ModePaiementFact }))}>
                {(Object.keys(MODE_FACT_LABELS) as ModePaiementFact[]).map((m) => <option key={m} value={m}>{MODE_FACT_LABELS[m]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Référence</label>
              <input type="text" className={inputCls} value={paiementForm.reference} onChange={(e) => setPaiementForm((f) => ({ ...f, reference: e.target.value }))} placeholder="N° chèque…" />
            </div>
            <Button type="submit" size="sm" disabled={actionLoading} className="h-9 gap-1.5">Enregistrer</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPmt(false)}>Annuler</Button>
          </form>
        )}

        {facture.paiements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun paiement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Date', 'Mode', 'Référence', 'Montant', ''].map((h, i) => (
                    <th key={i} className={cn('px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i === 3 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {facture.paiements.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40">
                    <td className="px-5 py-3 text-muted-foreground">{p.datePaiement}</td>
                    <td className="px-5 py-3 text-foreground">{MODE_FACT_LABELS[p.mode]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.reference ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-emerald-600">{formatMoney(p.montant)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => void handleDeletePmt(p.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
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

function Row({ label, value, mono, highlight, warn }: { label: string; value: string; mono?: boolean; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn('text-[13px]', mono && 'font-mono tabular-nums', highlight && 'text-base font-bold text-foreground', warn && 'font-semibold text-amber-600')}>
        {value}
      </span>
    </div>
  );
}
