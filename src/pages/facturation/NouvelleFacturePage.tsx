import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useHotelsList } from '@/hooks/useHotelsList';
import { useClientsFacturation } from '@/hooks/useFacturation';
import { formatMoney } from '@/lib/formatters';
import type { LigneInput } from '@/shared/types/facturation';

const today = () => new Date().toISOString().slice(0, 10);
const inputCls = 'h-10 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
const labelCls = 'mb-1.5 block text-[12px] font-semibold text-slate-600';

const EMPTY_LIGNE: LigneInput = { designation: '', quantite: 1, prixUnitaire: 0, tauxTva: 19 };

function calcLigne(l: LigneInput) {
  const ht = Math.round(l.quantite * l.prixUnitaire * 100) / 100;
  const tva = Math.round(ht * (l.tauxTva ?? 19)) / 100;
  return { ht, tva, ttc: Math.round((ht + tva) * 100) / 100 };
}

export function NouvelleFacturePage() {
  const navigate = useNavigate();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | ''>('');

  const { clients } = useClientsFacturation();
  const [clientId, setClientId] = useState<number | ''>('');
  const [clientNom, setClientNom] = useState('');
  const [dateEmission, setDateEmission] = useState(today());
  const [dateEcheance, setDateEcheance] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<LigneInput[]>([{ ...EMPTY_LIGNE }]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLigne = () => setLignes((l) => [...l, { ...EMPTY_LIGNE }]);
  const removeLigne = (i: number) => setLignes((l) => l.filter((_, idx) => idx !== i));
  const updateLigne = (i: number, patch: Partial<LigneInput>) =>
    setLignes((l) => l.map((ligne, idx) => idx === i ? { ...ligne, ...patch } : ligne));

  const totals = lignes.reduce((acc, l) => {
    const c = calcLigne(l);
    return { ht: acc.ht + c.ht, tva: acc.tva + c.tva, ttc: acc.ttc + c.ttc };
  }, { ht: 0, tva: 0, ttc: 0 });

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : '';
    setClientId(id);
    if (id) {
      const c = clients.find((cl) => cl.id === Number(id));
      if (c) setClientNom(c.raisonSociale ?? c.nom);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) { setError('Sélectionnez un établissement.'); return; }
    if (lignes.some((l) => !l.designation.trim())) { setError('Chaque ligne doit avoir une désignation.'); return; }
    if (lignes.some((l) => l.prixUnitaire <= 0)) { setError('Le prix unitaire doit être > 0.'); return; }

    setSaving(true);
    setError(null);
    try {
      const facture = unwrapIpc(await ipcClient.facturation.createFacture({
        hotelId: Number(hotelId),
        clientId: clientId ? Number(clientId) : undefined,
        clientNom: clientNom || undefined,
        dateEmission,
        dateEcheance: dateEcheance || undefined,
        notes: notes || undefined,
        lignes: lignes.map((l, i) => ({ ...l, ordre: i })),
      }));
      void navigate(`/facturation/factures/${facture.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate(-1)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

        {/* En-tête */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-6 py-4">
            <h2 className="text-[15px] font-semibold text-foreground">Nouvelle facture</h2>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className={labelCls}>Établissement *</label>
              <select className={inputCls} value={hotelId} onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">— Sélectionner —</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Client (fichier)</label>
                <select className={inputCls} value={clientId} onChange={handleClientSelect}>
                  <option value="">— Sélectionner ou saisir libre —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.raisonSociale ?? c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nom du client (affiché)</label>
                <input type="text" className={inputCls} value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Raison sociale ou nom" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Date d'émission *</label>
                <input type="date" className={inputCls} value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Date d'échéance</label>
                <input type="date" className={inputCls} value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes / Observations</label>
              <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires…" />
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <h3 className="text-[13px] font-semibold text-foreground">Lignes de facturation</h3>
            <Button type="button" size="sm" variant="outline" onClick={addLigne} className="h-8 gap-1.5 text-[13px]">
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Désignation</th>
                  <th className="w-20 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Qté</th>
                  <th className="w-28 px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">P.U. HT</th>
                  <th className="w-16 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">TVA %</th>
                  <th className="w-28 px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Total TTC</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {lignes.map((l, i) => {
                  const c = calcLigne(l);
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="h-8 w-full rounded-lg border border-border/60 bg-white px-3 text-[13px] outline-none focus:border-primary/50"
                          value={l.designation}
                          onChange={(e) => updateLigne(i, { designation: e.target.value })}
                          placeholder="Prestation, hébergement, service…"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0.01" step="0.01"
                          className="h-8 w-full rounded-lg border border-border/60 bg-white px-2 text-center text-[13px] tabular-nums outline-none focus:border-primary/50"
                          value={l.quantite}
                          onChange={(e) => updateLigne(i, { quantite: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          className="h-8 w-full rounded-lg border border-border/60 bg-white px-2 text-right text-[13px] tabular-nums outline-none focus:border-primary/50"
                          value={l.prixUnitaire || ''}
                          onChange={(e) => updateLigne(i, { prixUnitaire: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          className="h-8 w-full rounded-lg border border-border/60 bg-white px-2 text-center text-[13px] tabular-nums outline-none focus:border-primary/50"
                          value={l.tauxTva ?? 19}
                          onChange={(e) => updateLigne(i, { tauxTva: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                        {formatMoney(c.ttc)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {lignes.length > 1 && (
                          <button type="button" onClick={() => removeLigne(i)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end gap-8 border-t border-border/50 bg-slate-50/60 px-6 py-4 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground">Total HT</p>
              <p className="font-mono font-semibold tabular-nums text-foreground">{formatMoney(totals.ht)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">TVA</p>
              <p className="font-mono font-semibold tabular-nums text-foreground">{formatMoney(totals.tva)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">Total TTC</p>
              <p className="font-mono text-lg font-bold tabular-nums text-primary">{formatMoney(totals.ttc)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => void navigate(-1)} disabled={saving}>Annuler</Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Création…' : 'Créer la facture'}
          </Button>
        </div>
      </form>
    </div>
  );
}
