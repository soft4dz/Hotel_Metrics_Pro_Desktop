import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Phone, Shield, Wallet, StickyNote, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { cn } from '@/lib/utils';
import { FORMES_JURIDIQUES, REGIME_IMPOSITION_LABELS, WILAYAS_ALGERIE } from '@/shared/types/clients';
import type { CreateClientInput, RegimeImposition, TypeClient } from '@/shared/types/clients';

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identification', label: 'Identification', icon: User },
  { id: 'contact',        label: 'Contact',        icon: Phone },
  { id: 'adresse',        label: 'Adresse',        icon: Building2 },
  { id: 'fiscal',         label: 'Fiscal',         icon: Shield },
  { id: 'banque',         label: 'Banque',         icon: Wallet },
  { id: 'notes',          label: 'Notes',          icon: StickyNote },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── Component ─────────────────────────────────────────────────────────────────

export function NouveauClientPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('identification');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateClientInput>({
    type: 'entreprise',
    nom: '',
    pays: 'Algérie',
    actif: true,
  });

  const set = (key: keyof CreateClientInput, val: string | boolean | null) =>
    setForm((p) => ({ ...p, [key]: val === '' ? null : val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim()) { setError('Le nom / raison sociale est obligatoire.'); setActiveTab('identification'); return; }

    setSaving(true);
    setError(null);
    try {
      const created = unwrapIpc(await ipcClient.clients.create(form));
      void navigate(`/clients/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate('/clients')} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Clients
        </Button>
        <h1 className="text-lg font-bold text-foreground">Nouveau client</h1>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Tab nav */}
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                activeTab === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Identification ── */}
        {activeTab === 'identification' && (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div>
              <label className={labelCls}>Type de client *</label>
              <div className="flex gap-3">
                {(['entreprise', 'particulier'] as TypeClient[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={cn(
                      'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                      form.type === t
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {t === 'entreprise' ? 'Entreprise' : 'Particulier'}
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'particulier' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Civilité</label>
                  <select className={inputCls} value={form.civilite ?? ''} onChange={(e) => set('civilite', e.target.value)}>
                    <option value="">—</option>
                    <option>M.</option>
                    <option>Mme</option>
                    <option>Dr</option>
                    <option>Prof</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input type="text" className={inputCls} required value={form.nom ?? ''} onChange={(e) => set('nom', e.target.value)} placeholder="Nom de famille" />
                </div>
                <div>
                  <label className={labelCls}>Prénom</label>
                  <input type="text" className={inputCls} value={form.prenom ?? ''} onChange={(e) => set('prenom', e.target.value)} />
                </div>
              </div>
            )}

            {form.type === 'entreprise' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Raison sociale *</label>
                  <input
                    type="text"
                    className={inputCls}
                    required
                    value={form.nom ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value, raisonSociale: e.target.value }))}
                    placeholder="Dénomination officielle"
                  />
                </div>
                <div>
                  <label className={labelCls}>Forme juridique</label>
                  <select className={inputCls} value={form.formeJuridique ?? ''} onChange={(e) => set('formeJuridique', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {FORMES_JURIDIQUES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nom court (interne)</label>
                  <input type="text" className={inputCls} value={form.prenom ?? ''} onChange={(e) => set('prenom', e.target.value)} placeholder="Abréviation ou nom courant" />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Statut</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.actif !== false}
                  onChange={(e) => set('actif', e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Client actif
              </label>
            </div>
          </div>
        )}

        {/* ── Contact ── */}
        {activeTab === 'contact' && (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Téléphone</label>
                <input type="tel" className={inputCls} value={form.telephone ?? ''} onChange={(e) => set('telephone', e.target.value)} placeholder="+213 XXX XXX XXX" />
              </div>
              <div>
                <label className={labelCls}>Mobile</label>
                <input type="tel" className={inputCls} value={form.mobile ?? ''} onChange={(e) => set('mobile', e.target.value)} placeholder="+213 XXX XXX XXX" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="contact@exemple.com" />
              </div>
              <div>
                <label className={labelCls}>Fax</label>
                <input type="tel" className={inputCls} value={form.fax ?? ''} onChange={(e) => set('fax', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Site web</label>
                <input type="url" className={inputCls} value={form.siteWeb ?? ''} onChange={(e) => set('siteWeb', e.target.value)} placeholder="https://" />
              </div>
            </div>
          </div>
        )}

        {/* ── Adresse ── */}
        {activeTab === 'adresse' && (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Adresse (ligne 1)</label>
                <input type="text" className={inputCls} value={form.adresseLigne1 ?? ''} onChange={(e) => set('adresseLigne1', e.target.value)} placeholder="N° et nom de rue, zone industrielle…" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Adresse (ligne 2 — complément)</label>
                <input type="text" className={inputCls} value={form.adresseLigne2 ?? ''} onChange={(e) => set('adresseLigne2', e.target.value)} placeholder="Bâtiment, appartement, BP…" />
              </div>
              <div>
                <label className={labelCls}>Code postal</label>
                <input type="text" className={inputCls} value={form.codePostal ?? ''} onChange={(e) => set('codePostal', e.target.value)} maxLength={5} />
              </div>
              <div>
                <label className={labelCls}>Ville / Commune</label>
                <input type="text" className={inputCls} value={form.ville ?? ''} onChange={(e) => set('ville', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Wilaya</label>
                <select className={inputCls} value={form.wilaya ?? ''} onChange={(e) => set('wilaya', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {WILAYAS_ALGERIE.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Pays</label>
                <input type="text" className={inputCls} value={form.pays ?? 'Algérie'} onChange={(e) => set('pays', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Fiscal ── */}
        {activeTab === 'fiscal' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-semibold text-foreground">Identifiants fiscaux</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>NIF — Numéro d'identification fiscale</label>
                  <input type="text" className={inputCls} value={form.nif ?? ''} onChange={(e) => set('nif', e.target.value)} placeholder="XXXXXXXXXXXXXXXX" />
                </div>
                <div>
                  <label className={labelCls}>Date expiration NIF</label>
                  <input type="date" className={inputCls} value={form.dateExpirationNif ?? ''} onChange={(e) => set('dateExpirationNif', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>NRC — Registre du commerce</label>
                  <input type="text" className={inputCls} value={form.rc ?? ''} onChange={(e) => set('rc', e.target.value)} placeholder="XX/XXXXX/X/XXXX" />
                </div>
                <div>
                  <label className={labelCls}>Date expiration NRC</label>
                  <input type="date" className={inputCls} value={form.dateExpirationNrc ?? ''} onChange={(e) => set('dateExpirationNrc', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>NIS — N° identification statistique</label>
                  <input type="text" className={inputCls} value={form.nis ?? ''} onChange={(e) => set('nis', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Article d'imposition (AI)</label>
                  <input type="text" className={inputCls} value={form.ai ?? ''} onChange={(e) => set('ai', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-semibold text-foreground">Légal & Régime fiscal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date de création entreprise</label>
                  <input type="date" className={inputCls} value={form.dateCreationEntreprise ?? ''} onChange={(e) => set('dateCreationEntreprise', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>N° agrément / décision administrative</label>
                  <input type="text" className={inputCls} value={form.numeroAgrement ?? ''} onChange={(e) => set('numeroAgrement', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Régime d'imposition</label>
                  <select
                    className={inputCls}
                    value={form.regimeImposition ?? ''}
                    onChange={(e) => set('regimeImposition', (e.target.value as RegimeImposition) || null)}
                  >
                    <option value="">— Sélectionner —</option>
                    {(Object.entries(REGIME_IMPOSITION_LABELS) as [RegimeImposition, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>TVA</label>
                  <label className="flex cursor-pointer items-center gap-2 pt-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.assujettITva ?? false}
                      onChange={(e) => set('assujettITva', e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    Assujetti à la TVA
                  </label>
                </div>
                {form.assujettITva && (
                  <div className="col-span-2">
                    <label className={labelCls}>Numéro de TVA intracommunautaire</label>
                    <input type="text" className={inputCls} value={form.numeroTva ?? ''} onChange={(e) => set('numeroTva', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Banque ── */}
        {activeTab === 'banque' && (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Banque domiciliataire</label>
                <input type="text" className={inputCls} value={form.banqueClient ?? ''} onChange={(e) => set('banqueClient', e.target.value)} placeholder="BNA, CPA, BEA, BADR…" />
              </div>
              <div>
                <label className={labelCls}>Agence bancaire</label>
                <input type="text" className={inputCls} value={form.agenceBancaire ?? ''} onChange={(e) => set('agenceBancaire', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>RIB / Numéro de compte</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.rib ?? ''}
                  onChange={(e) => set('rib', e.target.value)}
                  placeholder="XX XXXX XXXX XXXX XXXX XXXX XX"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {activeTab === 'notes' && (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm">
            <label className={`${labelCls} mb-2`}>Notes internes (non communiquées au client)</label>
            <textarea
              className="h-36 w-full resize-none rounded-lg border border-border/60 bg-white p-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              value={form.notesInternes ?? ''}
              onChange={(e) => set('notesInternes', e.target.value)}
              placeholder="Particularités, conditions de paiement préférées, historique…"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={() => void navigate('/clients')} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Création…' : 'Créer le client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
