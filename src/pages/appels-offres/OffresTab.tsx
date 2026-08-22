import { useState } from 'react';
import { Plus, Gavel, AlertCircle, FileCheck2, Trash2 } from 'lucide-react';
import { useLotsAo, useOffresAo, useFournisseursAo, usePvAo, useCommissionAo } from '@/hooks/useAppelsOffres';
import { cn } from '@/lib/utils';
import type { AppelOffres, RoleCommission } from '@/shared/types/appelsOffres';

const ROLE_LABELS: Record<RoleCommission, string> = { president: 'Président', membre: 'Membre', rapporteur: 'Rapporteur' };

function today() { return new Date().toISOString().slice(0, 10); }

function OffreForm({ dossier, lotId }: { dossier: AppelOffres; lotId: number }) {
  const { create } = useOffresAo(dossier.id, lotId);
  const { data: invites } = useFournisseursAo(dossier.id);
  const [form, setForm] = useState({ fournisseurId: 0, reference: '', montantHt: 0, delaiLivraisonJours: 0, conditionsPaiement: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.fournisseurId || form.montantHt <= 0) { setError('Fournisseur et montant HT obligatoires.'); return; }
    setSaving(true); setError(null);
    try {
      await create({ appelOffresId: dossier.id, lotId, fournisseurId: form.fournisseurId, reference: form.reference || undefined, montantHt: form.montantHt, delaiLivraisonJours: form.delaiLivraisonJours, conditionsPaiement: form.conditionsPaiement || undefined });
      setForm({ fournisseurId: 0, reference: '', montantHt: 0, delaiLivraisonJours: 0, conditionsPaiement: '' });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
      <div className="flex flex-wrap gap-2 items-end">
        <select className="rounded-lg border border-border px-2 py-1.5 text-xs" value={form.fournisseurId}
          onChange={(e) => setForm({ ...form, fournisseurId: +e.target.value })}>
          <option value={0}>Fournisseur…</option>
          {invites.map((i) => <option key={i.fournisseurId} value={i.fournisseurId}>{i.fournisseurNom}</option>)}
        </select>
        <input className="w-28 rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Référence" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <input type="number" min={0} className="w-32 rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Montant HT" value={form.montantHt || ''} onChange={(e) => setForm({ ...form, montantHt: +e.target.value })} />
        <input type="number" min={0} className="w-24 rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Délai (j)" value={form.delaiLivraisonJours || ''} onChange={(e) => setForm({ ...form, delaiLivraisonJours: +e.target.value })} />
        <input className="w-40 rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Conditions paiement" value={form.conditionsPaiement} onChange={(e) => setForm({ ...form, conditionsPaiement: e.target.value })} />
        <button onClick={submit} disabled={saving} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Enregistrer l’offre
        </button>
      </div>
    </div>
  );
}

function LotOffres({ dossier, lotId, lotLabel }: { dossier: AppelOffres; lotId: number; lotLabel: string }) {
  const { data: offres } = useOffresAo(dossier.id, lotId);
  const canReceive = ['publie', 'ouvert'].includes(dossier.statut);
  return (
    <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold">{lotLabel}</h4>
      {canReceive && <OffreForm dossier={dossier} lotId={lotId} />}
      {offres.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left border-b border-border/40 text-muted-foreground">
              <th className="py-1.5 pr-2">Fournisseur</th><th className="py-1.5 pr-2">Réf.</th>
              <th className="py-1.5 pr-2 text-right">Montant TTC</th><th className="py-1.5 pr-2">Délai</th><th className="py-1.5 pr-2">Conforme</th>
            </tr></thead>
            <tbody>
              {offres.map((o) => (
                <tr key={o.id} className="border-b border-border/10">
                  <td className="py-1.5 pr-2 font-medium">{o.fournisseurNom}{o.retenue && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Retenue</span>}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{o.reference ?? '—'}</td>
                  <td className="py-1.5 pr-2 text-right">{o.montantTtc.toLocaleString('fr-DZ')} DA</td>
                  <td className="py-1.5 pr-2">{o.delaiLivraisonJours} j</td>
                  <td className="py-1.5 pr-2">{o.conformeAdministrativement ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function OffresTab({ dossier }: { dossier: AppelOffres }) {
  const { data: lots } = useLotsAo(dossier.id);
  const { data: pvList } = usePvAo(dossier.id);
  const { data: commission } = useCommissionAo(dossier.id);
  const { ouvrirPlis } = usePvAo(dossier.id);

  const [membres, setMembres] = useState<{ nom: string; fonction: string; role: RoleCommission }[]>([
    { nom: '', fonction: '', role: 'president' },
  ]);
  const [dateSeance, setDateSeance] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMembre = () => setMembres([...membres, { nom: '', fonction: '', role: 'membre' }]);
  const updateMembre = (i: number, patch: Partial<{ nom: string; fonction: string; role: RoleCommission }>) =>
    setMembres(membres.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMembre = (i: number) => setMembres(membres.filter((_, idx) => idx !== i));

  const submitOuverture = async () => {
    const valid = membres.filter((m) => m.nom.trim());
    if (!valid.length) { setError('Renseignez au moins un membre de la commission.'); return; }
    setBusy(true); setError(null);
    try {
      await ouvrirPlis({ appelOffresId: dossier.id, dateSeance, membres: valid });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const ouverturePv = pvList.find((pv) => pv.typePv === 'ouverture');

  return (
    <div className="space-y-5">
      {lots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Ajoutez des lots avant de saisir des offres.</p>
      ) : (
        <div className="space-y-3">
          {lots.map((l) => <LotOffres key={l.id} dossier={dossier} lotId={l.id} lotLabel={`${l.numeroLot} — ${l.designation}`} />)}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Ouverture des plis</h3>
        {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}

        {ouverturePv ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-emerald-700"><FileCheck2 className="h-4 w-4" /> Plis ouverts le {ouverturePv.dateSeance}</p>
            <p className="text-xs text-emerald-700/80 mt-1">
              Commission : {commission.map((m) => `${m.nom} (${ROLE_LABELS[m.role]})`).join(', ')}
            </p>
          </div>
        ) : dossier.statut === 'publie' ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Membres de la commission</label>
              {membres.map((m, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <input className="rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Nom" value={m.nom} onChange={(e) => updateMembre(i, { nom: e.target.value })} />
                  <input className="rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Fonction" value={m.fonction} onChange={(e) => updateMembre(i, { fonction: e.target.value })} />
                  <select className="rounded-lg border border-border px-2 py-1.5 text-xs" value={m.role} onChange={(e) => updateMembre(i, { role: e.target.value as RoleCommission })}>
                    <option value="president">Président</option>
                    <option value="membre">Membre</option>
                    <option value="rapporteur">Rapporteur</option>
                  </select>
                  {membres.length > 1 && (
                    <button onClick={() => removeMembre(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
              <button onClick={addMembre} className="text-xs font-medium text-primary hover:underline">+ Ajouter un membre</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Date de séance</label>
              <input type="date" className="rounded-lg border border-border px-2 py-1.5 text-xs" value={dateSeance} onChange={(e) => setDateSeance(e.target.value)} />
            </div>
            <button onClick={() => void submitOuverture()} disabled={busy}
              className={cn('rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50')}>
              {busy ? 'Génération…' : 'Générer le PV d’ouverture'}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Le dossier doit être publié pour procéder à l’ouverture des plis.</p>
        )}
      </div>
    </div>
  );
}
