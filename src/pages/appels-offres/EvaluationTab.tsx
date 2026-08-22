import { useState } from 'react';
import { Plus, Trash2, AlertCircle, ClipboardCheck, Gavel, XCircle } from 'lucide-react';
import { useLotsAo, useCriteresAo, useOffresAo, useNotesAo, useAttributionAo } from '@/hooks/useAppelsOffres';
import { cn } from '@/lib/utils';
import type { AppelOffres, LotAppelOffres, TypeCritere } from '@/shared/types/appelsOffres';

const TYPE_LABELS: Record<TypeCritere, string> = { prix: 'Prix', technique: 'Technique', delai: 'Délai', autre: 'Autre' };

function CriteresGrille({ dossier }: { dossier: AppelOffres }) {
  const { data: criteres, create, remove } = useCriteresAo(dossier.id);
  const total = criteres.reduce((s, c) => s + c.ponderationPct, 0);
  const [form, setForm] = useState<{ libelle: string; typeCritere: TypeCritere; ponderationPct: number }>({ libelle: '', typeCritere: 'technique', ponderationPct: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = ['attribue', 'annule'].includes(dossier.statut);

  const submit = async () => {
    if (!form.libelle.trim() || form.ponderationPct <= 0) { setError('Libellé et pondération obligatoires.'); return; }
    setSaving(true); setError(null);
    try {
      await create({ appelOffresId: dossier.id, libelle: form.libelle.trim(), typeCritere: form.typeCritere, ponderationPct: form.ponderationPct });
      setForm({ libelle: '', typeCritere: 'technique', ponderationPct: 0 });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Grille d’évaluation</h3>
        <span className={cn('text-xs font-semibold', total === 100 ? 'text-emerald-600' : 'text-amber-600')}>
          Pondération totale : {total}% {total !== 100 && '(doit atteindre 100% avant attribution)'}
        </span>
      </div>
      {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
      {criteres.length > 0 && (
        <div className="space-y-1">
          {criteres.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="flex-1 font-medium">{c.libelle}</span>
              <span className="text-muted-foreground">{TYPE_LABELS[c.typeCritere]}</span>
              <span className="font-semibold">{c.ponderationPct}%</span>
              {!locked && (
                <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {!locked && (
        <div className="flex flex-wrap gap-2 items-end">
          <input className="rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="Libellé" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
          <select className="rounded-lg border border-border px-2 py-1.5 text-xs" value={form.typeCritere} onChange={(e) => setForm({ ...form, typeCritere: e.target.value as TypeCritere })}>
            <option value="prix">Prix (calcul automatique)</option>
            <option value="technique">Technique</option>
            <option value="delai">Délai</option>
            <option value="autre">Autre</option>
          </select>
          <input type="number" min={1} max={100} className="w-20 rounded-lg border border-border px-2 py-1.5 text-xs" placeholder="%" value={form.ponderationPct || ''} onChange={(e) => setForm({ ...form, ponderationPct: +e.target.value })} />
          <button onClick={submit} disabled={saving} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      )}
    </div>
  );
}

function LotAttribution({ dossier, lot, criteres }: { dossier: AppelOffres; lot: LotAppelOffres; criteres: ReturnType<typeof useCriteresAo>['data'] }) {
  const { data: offres, saveNote } = useOffresAo(dossier.id, lot.id);
  const { data: notes } = useNotesAo(lot.id);
  const { attribuer, marquerInfructueux } = useAttributionAo(dossier.id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notableCriteres = criteres.filter((c) => c.typeCritere !== 'prix');
  const totalPonderation = criteres.reduce((s, c) => s + c.ponderationPct, 0);
  const canEvaluate = lot.statut === 'ouvert' && dossier.statut === 'ouvert';

  const noteFor = (offreId: number, critereId: number) => notes.find((n) => n.offreId === offreId && n.critereId === critereId)?.note ?? 0;

  const handleAttribuer = async (offreId: number) => {
    setBusy(true); setError(null);
    try { await attribuer({ lotId: lot.id, offreId }); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleInfructueux = async () => {
    setBusy(true); setError(null);
    try { await marquerInfructueux(lot.id); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{lot.numeroLot} — {lot.designation}</h4>
        {lot.statut !== 'ouvert' && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {lot.statut === 'attribue' ? 'Attribué' : lot.statut === 'infructueux' ? 'Infructueux' : 'Annulé'}
          </span>
        )}
      </div>
      {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}

      {offres.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune offre reçue pour ce lot.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-border/40 text-muted-foreground">
                <th className="py-1.5 pr-2">Fournisseur</th>
                <th className="py-1.5 pr-2 text-right">Montant TTC</th>
                {notableCriteres.map((c) => <th key={c.id} className="py-1.5 pr-2 text-center">{c.libelle} ({c.ponderationPct}%)</th>)}
                <th className="py-1.5 pr-2 text-right">Score</th>
                {canEvaluate && <th className="py-1.5 pr-2" />}
              </tr>
            </thead>
            <tbody>
              {offres.map((o) => (
                <tr key={o.id} className="border-b border-border/10">
                  <td className="py-1.5 pr-2 font-medium">{o.fournisseurNom}{o.retenue && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Retenue</span>}</td>
                  <td className="py-1.5 pr-2 text-right">{o.montantTtc.toLocaleString('fr-DZ')} DA</td>
                  {notableCriteres.map((c) => (
                    <td key={c.id} className="py-1.5 pr-2 text-center">
                      <input type="number" min={0} max={100} disabled={!canEvaluate}
                        defaultValue={noteFor(o.id, c.id)}
                        onBlur={(e) => void saveNote({ offreId: o.id, critereId: c.id, note: +e.target.value, commentaire: null })}
                        className="w-14 rounded border border-border px-1 py-0.5 text-center disabled:bg-slate-50" />
                    </td>
                  ))}
                  <td className="py-1.5 pr-2 text-right font-semibold">{o.score != null ? o.score.toFixed(1) : '—'}</td>
                  {canEvaluate && (
                    <td className="py-1.5 pr-2">
                      <button disabled={busy || totalPonderation !== 100} onClick={() => void handleAttribuer(o.id)}
                        title={totalPonderation !== 100 ? 'La grille doit totaliser 100%' : undefined}
                        className="flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-40">
                        <Gavel className="h-3 w-3" /> Attribuer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEvaluate && (
        <button onClick={() => void handleInfructueux()} disabled={busy}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-500">
          <XCircle className="h-3.5 w-3.5" /> Déclarer ce lot infructueux
        </button>
      )}
    </div>
  );
}

export function EvaluationTab({ dossier }: { dossier: AppelOffres }) {
  const { data: lots } = useLotsAo(dossier.id);
  const { data: criteres } = useCriteresAo(dossier.id);

  if (!['publie', 'ouvert', 'attribue'].includes(dossier.statut)) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Publiez le dossier pour configurer la grille d’évaluation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CriteresGrille dossier={dossier} />
      {dossier.statut === 'brouillon' || dossier.statut === 'publie' ? (
        <p className="text-sm text-muted-foreground text-center py-6">Procédez d’abord à l’ouverture des plis (onglet Offres & ouverture) pour évaluer et attribuer.</p>
      ) : (
        <div className="space-y-3">
          {lots.map((l) => <LotAttribution key={l.id} dossier={dossier} lot={l} criteres={criteres} />)}
        </div>
      )}
    </div>
  );
}
