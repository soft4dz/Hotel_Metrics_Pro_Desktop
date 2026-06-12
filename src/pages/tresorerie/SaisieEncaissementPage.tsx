import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useHotelsList } from '@/hooks/useHotelsList';
import { useComptesBancaires } from '@/hooks/useTresorerie';
import type { CreateEncaissementInput, ModePaiement } from '@/shared/types/tresorerie';
import { MODE_LABELS } from '@/shared/types/tresorerie';

const today = () => new Date().toISOString().slice(0, 10);

const inputCls = 'h-10 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
const labelCls = 'mb-1.5 block text-[12px] font-semibold text-slate-600';

export function SaisieEncaissementPage() {
  const navigate = useNavigate();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | ''>('');
  const { comptes } = useComptesBancaires(hotelId !== '' ? hotelId : undefined);

  const [form, setForm] = useState<Omit<CreateEncaissementInput, 'hotelId'>>({
    dateEncaissement: today(),
    montant: 0,
    mode: 'especes',
    reference: '',
    description: '',
    statut: 'en_attente',
    compteBancaireId: undefined,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hotelId === '') { setError('Sélectionnez un établissement.'); return; }
    if (form.montant <= 0) { setError('Le montant doit être supérieur à 0.'); return; }

    setSaving(true);
    setError(null);
    try {
      unwrapIpc(await ipcClient.tresorerie.createEncaissement({
        hotelId: Number(hotelId),
        ...form,
        reference: form.reference || undefined,
        description: form.description || undefined,
      }));
      navigate('/encaissements/liste');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la saisie.');
    } finally {
      setSaving(false);
    }
  };

  const comptesActifs = comptes.filter((c) => c.actif);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate(-1)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-foreground">Nouvel encaissement</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Enregistrez un encaissement reçu</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-6">
          {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

          {/* Établissement */}
          <div>
            <label className={labelCls}>Établissement *</label>
            <select className={inputCls} value={hotelId} onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : '')} required>
              <option value="">— Sélectionner —</option>
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          {/* Date + Montant */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" className={inputCls} value={form.dateEncaissement} onChange={(e) => setForm((f) => ({ ...f, dateEncaissement: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>Montant (DA) *</label>
              <input type="number" min="0.01" step="0.01" className={inputCls} value={form.montant || ''} onChange={(e) => setForm((f) => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} placeholder="0.00" required />
            </div>
          </div>

          {/* Mode + Référence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mode de paiement *</label>
              <select className={inputCls} value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as ModePaiement }))} required>
                {(Object.keys(MODE_LABELS) as ModePaiement[]).map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Référence</label>
              <input type="text" className={inputCls} value={form.reference ?? ''} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="N° chèque, référence virement…" />
            </div>
          </div>

          {/* Compte bancaire */}
          {comptesActifs.length > 0 && (
            <div>
              <label className={labelCls}>Compte bancaire de destination</label>
              <select className={inputCls} value={form.compteBancaireId ?? ''} onChange={(e) => setForm((f) => ({ ...f, compteBancaireId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">— Aucun —</option>
                {comptesActifs.map((c) => <option key={c.id} value={c.id}>{c.intitule} — {c.banque}</option>)}
              </select>
            </div>
          )}

          {/* Statut */}
          <div>
            <label className={labelCls}>Statut initial</label>
            <select className={inputCls} value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as 'en_attente' | 'confirme' }))}>
              <option value="en_attente">En attente de confirmation</option>
              <option value="confirme">Directement confirmé</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description / Observation</label>
            <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Informations complémentaires…" />
          </div>

          <div className="flex justify-end gap-3 border-t border-border/50 pt-5">
            <Button type="button" variant="outline" onClick={() => void navigate(-1)} disabled={saving}>Annuler</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
