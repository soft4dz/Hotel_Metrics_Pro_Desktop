import { useState } from 'react';
import { Calculator, AlertCircle } from 'lucide-react';
import { useHotelsList } from '@/hooks/useHotelsList';
import { useTypesChambre } from '@/hooks/useHebergement';
import { usePlans, useFormules, useSimulateur } from '@/hooks/useTarifs';
import { useClients } from '@/hooks/useClients';
import { formatMoney } from '@/lib/formatters';
import type { ClientItem } from '@/shared/types/clients';

function today() { return new Date().toISOString().slice(0, 10); }
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function clientLabel(c: ClientItem) {
  if (c.type === 'entreprise') return c.raisonSociale || c.nom;
  return [c.nom, c.prenom].filter(Boolean).join(' ');
}

export function SimulateurTarifPage() {
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const { data: types } = useTypesChambre(hotelId);
  const { data: plans } = usePlans(hotelId);
  const { data: formules } = useFormules(hotelId);
  const { items: clients } = useClients({ actif: true });
  const { result, loading, error, simuler } = useSimulateur();

  const [form, setForm] = useState({
    typeChambreId: 0,
    planId: 0,
    formuleId: 0,
    dateArrivee: today(),
    dateDepart: tomorrow(),
    nbAdultes: 2,
    nbEnfants: 0,
    clientId: 0,
  });

  const typeChambreId = form.typeChambreId || types[0]?.id || 0;
  const planId = form.planId || plans[0]?.id || 0;

  const submit = () => {
    if (!hotelId || !typeChambreId || !planId) return;
    void simuler({
      hotelId,
      typeChambreId,
      planId,
      formuleId: form.formuleId || undefined,
      dateArrivee: form.dateArrivee,
      dateDepart: form.dateDepart,
      nbAdultes: form.nbAdultes,
      nbEnfants: form.nbEnfants || undefined,
      clientId: form.clientId || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calculator className="h-4 w-4" />
        <span>Estimez le prix d'un séjour (grille, convention client, promotions).</span>
      </div>

      <div className="rounded-xl border border-border/60 bg-white p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hôtel *</label>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={hotelId}
              onChange={(e) => setHotelId(Number(e.target.value))}
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type chambre *</label>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={typeChambreId}
              onChange={(e) => setForm((f) => ({ ...f, typeChambreId: Number(e.target.value) }))}
            >
              {types.length === 0 && <option value={0}>— Aucun type —</option>}
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Plan tarifaire *</label>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={planId}
              onChange={(e) => setForm((f) => ({ ...f, planId: Number(e.target.value) }))}
            >
              {plans.length === 0 && <option value={0}>— Aucun plan —</option>}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Formule</label>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.formuleId}
              onChange={(e) => setForm((f) => ({ ...f, formuleId: Number(e.target.value) }))}
            >
              <option value={0}>Hébergement seul</option>
              {formules.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Client (convention)</label>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: Number(e.target.value) }))}
            >
              <option value={0}>Tarif public</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{clientLabel(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Arrivée</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.dateArrivee}
              onChange={(e) => setForm((f) => ({ ...f, dateArrivee: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Départ</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.dateDepart}
              onChange={(e) => setForm((f) => ({ ...f, dateDepart: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Adultes</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.nbAdultes}
              onChange={(e) => setForm((f) => ({ ...f, nbAdultes: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Enfants</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={form.nbEnfants}
              onChange={(e) => setForm((f) => ({ ...f, nbEnfants: Number(e.target.value) }))}
            />
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={loading || !typeChambreId || !planId}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Calcul…' : 'Calculer le prix'}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total séjour ({result.nbNuits} nuit{result.nbNuits > 1 ? 's' : ''})</p>
              <p className="text-3xl font-bold text-primary">{formatMoney(result.prixTotal)}</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {result.conventionAppliquee && (
                <p>Convention : <strong className="text-foreground">{result.conventionAppliquee}</strong></p>
              )}
              {result.promoAppliquee && (
                <p>Promotion : <strong className="text-foreground">{result.promoAppliquee}</strong></p>
              )}
            </div>
          </div>

          {result.detail.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-right py-2 font-medium">Base</th>
                  <th className="text-right py-2 font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {result.detail.map((n) => (
                  <tr key={n.date} className="border-b border-border/30">
                    <td className="py-2">{n.date}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatMoney(n.prixBase)}</td>
                    <td className="py-2 text-right font-semibold">{formatMoney(n.prixFinal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
