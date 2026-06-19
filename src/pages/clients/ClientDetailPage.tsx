import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit2,
  FileText,
  MapPin,
  Phone,
  Plus,
  Save,
  Shield,
  StickyNote,
  Trash2,
  User,
  UserCircle,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientDetail } from '@/hooks/useClients';
import { useFactures } from '@/hooks/useFacturation';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CreateClientInput, CreateContactInput, TypeContact } from '@/shared/types/clients';
import {
  REGIME_IMPOSITION_LABELS,
  TYPE_CONTACT_LABELS,
} from '@/shared/types/clients';
import { WilayaCommuneFields } from '@/components/common/WilayaCommuneFields';
import type { RegimeImposition } from '@/shared/types/clients';

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-muted-foreground';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className={labelCls}>{label}</dt>
      <dd className={cn('text-sm text-foreground', mono && 'font-mono font-medium tracking-wide')}>
        {value || <span className="text-muted-foreground font-normal tracking-normal">—</span>}
      </dd>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'apercu',    label: 'Aperçu',              icon: User },
  { id: 'contact',   label: 'Contact & Adresse',   icon: Phone },
  { id: 'contacts',  label: 'Personnes de contact', icon: UserCircle },
  { id: 'fiscal',    label: 'Fiscal & Légal',       icon: Shield },
  { id: 'banque',    label: 'Banque',               icon: Wallet },
  { id: 'factures',  label: 'Factures',             icon: FileText },
  { id: 'notes',     label: 'Notes',                icon: StickyNote },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── Factures tab ──────────────────────────────────────────────────────────────

function FacturesTab({ clientId }: { clientId: number }) {
  const navigate = useNavigate();
  const { items, loading } = useFactures({ clientId });

  if (loading) return <p className="text-sm text-muted-foreground py-4">Chargement…</p>;
  if (!items.length) return (
    <div className="flex flex-col items-center py-10 text-center">
      <FileText className="mb-3 h-9 w-9 text-slate-300" />
      <p className="text-sm text-muted-foreground">Aucune facture pour ce client</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => void navigate('/facturation/nouvelle')}>
        Créer une facture
      </Button>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-slate-50/60">
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">N°</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Date</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Statut</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">TTC</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Restant</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 font-mono text-[12px] font-medium">{f.numero}</td>
              <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{f.dateEmission}</td>
              <td className="px-4 py-2.5">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  f.statut === 'payee' ? 'bg-emerald-50 text-emerald-700' :
                  f.statut === 'annulee' ? 'bg-slate-100 text-slate-500' :
                  f.statut === 'validee' ? 'bg-blue-50 text-blue-700' :
                  'bg-amber-50 text-amber-700',
                )}>
                  {f.statut}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{formatMoney(f.montantTtc)}</td>
              <td className={cn('px-4 py-2.5 text-right font-mono font-semibold tabular-nums', f.montantRestant > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {f.montantRestant > 0 ? formatMoney(f.montantRestant) : '—'}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link to={`/facturation/factures/${f.id}`} className="text-[12px] font-medium text-primary hover:underline">Voir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

const EMPTY_CONTACT: CreateContactInput = { type: 'autre', nom: '', principal: false };

function ContactsTab({ contacts, onAdd, onUpdate, onDelete }: {
  contacts: import('@/shared/types/clients').ClientContact[];
  onAdd: (input: CreateContactInput) => Promise<void>;
  onUpdate: (id: number, input: Partial<CreateContactInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateContactInput>({ ...EMPTY_CONTACT });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateContactInput>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setF = (k: keyof CreateContactInput, v: string | boolean | null) =>
    setForm((p) => ({ ...p, [k]: v === '' ? null : v }));
  const setE = (k: keyof CreateContactInput, v: string | boolean | null) =>
    setEditForm((p) => ({ ...p, [k]: v === '' ? null : v }));

  const handleAdd = async () => {
    if (!form.nom.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError(null);
    try {
      await onAdd(form);
      setForm({ ...EMPTY_CONTACT }); setShowForm(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: number) => {
    setSaving(true); setError(null);
    try {
      await onUpdate(id, editForm);
      setEditingId(null); setEditForm({});
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce contact ?')) return;
    await onDelete(id);
  };

  const TYPE_OPTS: { value: TypeContact; label: string }[] = (Object.entries(TYPE_CONTACT_LABELS) as [TypeContact, string][])
    .map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</p>}

      {contacts.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-8 text-center">
          <UserCircle className="mb-3 h-9 w-9 text-slate-300" />
          <p className="text-sm text-muted-foreground">Aucun contact enregistré</p>
        </div>
      )}

      {/* Contact cards */}
      {contacts.map((c) => (
        <div key={c.id} className={cn(
          'rounded-xl border p-4',
          c.principal ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-white',
        )}>
          {editingId === c.id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fonction</label>
                  <select className={inputCls} value={editForm.type ?? c.type} onChange={(e) => setE('type', e.target.value)}>
                    {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nom complet *</label>
                  <input type="text" className={inputCls} value={editForm.nom ?? c.nom} onChange={(e) => setE('nom', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Titre / Poste</label>
                  <input type="text" className={inputCls} value={editForm.titre ?? c.titre ?? ''} onChange={(e) => setE('titre', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input type="tel" className={inputCls} value={editForm.telephone ?? c.telephone ?? ''} onChange={(e) => setE('telephone', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} value={editForm.email ?? c.email ?? ''} onChange={(e) => setE('email', e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editForm.principal ?? c.principal} onChange={(e) => setE('principal', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                Contact principal
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => void handleUpdate(c.id)} disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />{saving ? 'Sauvegarde…' : 'Enregistrer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">{c.nom}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {TYPE_CONTACT_LABELS[c.type]}
                  </span>
                  {c.principal && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Principal
                    </span>
                  )}
                </div>
                {c.titre && <p className="text-[12px] text-muted-foreground">{c.titre}</p>}
                <div className="mt-1.5 flex flex-wrap gap-4 text-[12px]">
                  {c.telephone && <span className="text-foreground">{c.telephone}</span>}
                  {c.email && <span className="text-muted-foreground">{c.email}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => { setEditingId(c.id); setEditForm({}); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void handleDelete(c.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h4 className="text-[13px] font-semibold text-foreground">Nouveau contact</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fonction *</label>
              <select className={inputCls} value={form.type} onChange={(e) => setF('type', e.target.value as TypeContact)}>
                {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Nom complet *</label>
              <input type="text" className={inputCls} value={form.nom} onChange={(e) => setF('nom', e.target.value)} placeholder="Prénom et Nom" />
            </div>
            <div>
              <label className={labelCls}>Titre / Poste</label>
              <input type="text" className={inputCls} value={form.titre ?? ''} onChange={(e) => setF('titre', e.target.value)} placeholder="Directeur, Comptable…" />
            </div>
            <div>
              <label className={labelCls}>Téléphone direct</label>
              <input type="tel" className={inputCls} value={form.telephone ?? ''} onChange={(e) => setF('telephone', e.target.value)} placeholder="+213…" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email ?? ''} onChange={(e) => setF('email', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.principal ?? false} onChange={(e) => setF('principal', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
            Définir comme contact principal
          </label>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => void handleAdd()} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />{saving ? 'Ajout…' : 'Ajouter'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setForm({ ...EMPTY_CONTACT }); setError(null); }}>Annuler</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 py-3 text-[13px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" /> Ajouter un contact
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = id ? Number(id) : null;

  const { client, loading, error, update, toggleActif, createContact, updateContact, deleteContact } = useClientDetail(clientId);
  const [activeTab, setActiveTab] = useState<TabId>('apercu');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CreateClientInput>>({});

  useEffect(() => {
    if (client && isEditing) {
      setForm({
        type: client.type,
        civilite: client.civilite,
        nom: client.nom,
        prenom: client.prenom,
        raisonSociale: client.raisonSociale,
        formeJuridique: client.formeJuridique,
        email: client.email,
        telephone: client.telephone,
        mobile: client.mobile,
        fax: client.fax,
        siteWeb: client.siteWeb,
        adresseLigne1: client.adresseLigne1,
        adresseLigne2: client.adresseLigne2,
        ville: client.ville,
        wilaya: client.wilaya,
        codePostal: client.codePostal,
        pays: client.pays,
        nif: client.nif,
        dateExpirationNif: client.dateExpirationNif,
        rc: client.rc,
        dateExpirationNrc: client.dateExpirationNrc,
        nis: client.nis,
        ai: client.ai,
        dateCreationEntreprise: client.dateCreationEntreprise,
        numeroAgrement: client.numeroAgrement,
        assujettITva: client.assujettITva,
        numeroTva: client.numeroTva,
        regimeImposition: client.regimeImposition,
        banqueClient: client.banqueClient,
        agenceBancaire: client.agenceBancaire,
        rib: client.rib,
        notesInternes: client.notesInternes,
      });
    }
  }, [client, isEditing]);

  const set = (key: keyof CreateClientInput, val: string | boolean | null) =>
    setForm((p) => ({ ...p, [key]: val === '' ? null : val }));

  const handleSave = async () => {
    if (!clientId || !form.nom?.trim()) { setSaveError('Le nom est obligatoire.'); return; }
    setSaving(true); setSaveError(null);
    try {
      await update(form);
      setIsEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  if (error || !client) return <div className="flex min-h-[300px] items-center justify-center text-sm text-destructive">{error ?? 'Client introuvable'}</div>;

  const displayName = client.type === 'entreprise'
    ? (client.raisonSociale ?? client.nom)
    : `${client.civilite ? `${client.civilite} ` : ''}${client.nom}${client.prenom ? ` ${client.prenom}` : ''}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => void navigate('/clients')} className="mt-1 gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Clients
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-foreground">{displayName}</h1>
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', client.type === 'entreprise' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700')}>
              {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
              {client.formeJuridique ? ` · ${client.formeJuridique}` : ''}
            </span>
            <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', client.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
              {client.actif ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {client.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
            {client.stats.nbFactures > 0 && <span>{client.stats.nbFactures} facture{client.stats.nbFactures !== 1 ? 's' : ''}</span>}
            {client.stats.totalFactureTtc > 0 && <span>Total : {formatMoney(client.stats.totalFactureTtc)}</span>}
            {client.stats.montantRestant > 0 && <span className="font-semibold text-destructive">Restant : {formatMoney(client.stats.montantRestant)}</span>}
            {client.contacts.length > 0 && <span>{client.contacts.length} contact{client.contacts.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setSaveError(null); }} disabled={saving} className="gap-1.5">
                <X className="h-4 w-4" /> Annuler
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" />{saving ? 'Sauvegarde…' : 'Enregistrer'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => void toggleActif()}>
                {client.actif ? 'Désactiver' : 'Activer'}
              </Button>
              <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                <Edit2 className="h-4 w-4" /> Modifier
              </Button>
            </>
          )}
        </div>
      </div>

      {saveError && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{saveError}</p>}

      {/* Tabs nav */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setActiveTab(tid)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
              activeTab === tid ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />{label}
            {tid === 'contacts' && client.contacts.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-600">{client.contacts.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Aperçu ── */}
      {activeTab === 'apercu' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Identification" icon={client.type === 'entreprise' ? Building2 : User}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Type" value={client.type === 'entreprise' ? 'Entreprise' : 'Particulier'} />
              {client.type === 'particulier' && <Field label="Civilité" value={client.civilite} />}
              <Field label="Nom" value={client.nom} />
              {client.type === 'particulier' && <Field label="Prénom" value={client.prenom} />}
              {client.type === 'entreprise' && <Field label="Raison sociale" value={client.raisonSociale} />}
              {client.type === 'entreprise' && <Field label="Forme juridique" value={client.formeJuridique} />}
            </dl>
          </SectionCard>

          <SectionCard title="Statistiques" icon={FileText}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div><dt className={labelCls}>Factures</dt><dd className="text-2xl font-bold tabular-nums">{client.stats.nbFactures}</dd></div>
              <div><dt className={labelCls}>Total TTC</dt><dd className="text-2xl font-bold tabular-nums">{formatMoney(client.stats.totalFactureTtc)}</dd></div>
              <div><dt className={labelCls}>Payé</dt><dd className="text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(client.stats.montantPaye)}</dd></div>
              <div>
                <dt className={labelCls}>Restant dû</dt>
                <dd className={cn('text-lg font-semibold tabular-nums', client.stats.montantRestant > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {client.stats.montantRestant > 0 ? formatMoney(client.stats.montantRestant) : '—'}
                </dd>
              </div>
              {client.stats.derniereFactureDate && (
                <div className="col-span-2"><dt className={labelCls}>Dernière facture</dt><dd className="text-sm">{client.stats.derniereFactureDate}</dd></div>
              )}
            </dl>
          </SectionCard>

          <SectionCard title="Contact principal" icon={Phone}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Téléphone" value={client.telephone} />
              <Field label="Mobile" value={client.mobile} />
              <Field label="Email" value={client.email} />
              <Field label="Fax" value={client.fax} />
              {(client.adresseLigne1 || client.adresse) && (
                <div className="col-span-2">
                  <dt className={labelCls}>Adresse</dt>
                  <dd className="text-sm">
                    {client.adresseLigne1 || client.adresse}
                    {(client.codePostal || client.ville) && <><br />{[client.codePostal, client.ville].filter(Boolean).join(' ')}</>}
                    {client.wilaya && <><br />{client.wilaya}</>}
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>

          <SectionCard title="Identifiants clés" icon={Shield}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="NIF" value={client.nif} mono />
              <Field label="NRC" value={client.rc} mono />
              <Field label="NIS" value={client.nis} mono />
              <Field label="Régime d'imposition" value={client.regimeImposition ? REGIME_IMPOSITION_LABELS[client.regimeImposition] : null} />
              <Field label="Assujetti TVA" value={client.assujettITva ? 'Oui' : 'Non'} />
              {client.assujettITva && <Field label="N° TVA" value={client.numeroTva} mono />}
            </dl>
          </SectionCard>
        </div>
      )}

      {/* ── Contact & Adresse ── */}
      {activeTab === 'contact' && (
        isEditing ? (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-[13px] font-semibold">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Téléphone</label><input type="tel" className={inputCls} value={form.telephone ?? ''} onChange={(e) => set('telephone', e.target.value)} /></div>
              <div><label className={labelCls}>Mobile</label><input type="tel" className={inputCls} value={form.mobile ?? ''} onChange={(e) => set('mobile', e.target.value)} /></div>
              <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
              <div><label className={labelCls}>Fax</label><input type="tel" className={inputCls} value={form.fax ?? ''} onChange={(e) => set('fax', e.target.value)} /></div>
              <div className="col-span-2"><label className={labelCls}>Site web</label><input type="url" className={inputCls} value={form.siteWeb ?? ''} onChange={(e) => set('siteWeb', e.target.value)} placeholder="https://" /></div>
            </div>
            <h3 className="text-[13px] font-semibold pt-2">Adresse</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={labelCls}>Ligne 1</label><input type="text" className={inputCls} value={form.adresseLigne1 ?? ''} onChange={(e) => set('adresseLigne1', e.target.value)} /></div>
              <div className="col-span-2"><label className={labelCls}>Ligne 2</label><input type="text" className={inputCls} value={form.adresseLigne2 ?? ''} onChange={(e) => set('adresseLigne2', e.target.value)} /></div>
              <div><label className={labelCls}>Code postal</label><input type="text" className={inputCls} value={form.codePostal ?? ''} onChange={(e) => set('codePostal', e.target.value)} /></div>
              <WilayaCommuneFields
                wilaya={form.wilaya ?? ''}
                commune={form.ville ?? ''}
                communeLabel="Ville / Commune"
                selectClassName={inputCls}
                onWilayaChange={(w) => set('wilaya', w)}
                onCommuneChange={(c) => set('ville', c)}
              />
              <div><label className={labelCls}>Pays</label><input type="text" className={inputCls} value={form.pays ?? 'Algérie'} onChange={(e) => set('pays', e.target.value)} /></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Coordonnées" icon={Phone}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Téléphone" value={client.telephone} />
                <Field label="Mobile" value={client.mobile} />
                <Field label="Email" value={client.email} />
                <Field label="Fax" value={client.fax} />
                <div className="col-span-2"><Field label="Site web" value={client.siteWeb} /></div>
              </dl>
            </SectionCard>
            <SectionCard title="Adresse" icon={MapPin}>
              <dl className="space-y-3">
                <Field label="Ligne 1" value={client.adresseLigne1 || client.adresse} />
                <Field label="Ligne 2" value={client.adresseLigne2} />
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Code postal" value={client.codePostal} />
                  <Field label="Ville" value={client.ville} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Wilaya" value={client.wilaya} />
                  <Field label="Pays" value={client.pays} />
                </div>
              </dl>
            </SectionCard>
          </div>
        )
      )}

      {/* ── Personnes de contact ── */}
      {activeTab === 'contacts' && (
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5 flex items-center gap-2.5">
            <UserCircle className="h-4 w-4 text-primary" />
            <h3 className="text-[13px] font-semibold">Personnes de contact</h3>
          </div>
          <div className="p-5">
            <ContactsTab
              contacts={client.contacts}
              onAdd={async (input) => { await createContact(input); }}
              onUpdate={async (id, input) => { await updateContact(id, input); }}
              onDelete={async (id) => { await deleteContact(id); }}
            />
          </div>
        </div>
      )}

      {/* ── Fiscal & Légal ── */}
      {activeTab === 'fiscal' && (
        isEditing ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-semibold">Identifiants fiscaux</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>NIF</label><input type="text" className={inputCls} value={form.nif ?? ''} onChange={(e) => set('nif', e.target.value)} /></div>
                <div><label className={labelCls}>Date expiration NIF</label><input type="date" className={inputCls} value={form.dateExpirationNif ?? ''} onChange={(e) => set('dateExpirationNif', e.target.value)} /></div>
                <div><label className={labelCls}>NRC (Registre du commerce)</label><input type="text" className={inputCls} value={form.rc ?? ''} onChange={(e) => set('rc', e.target.value)} /></div>
                <div><label className={labelCls}>Date expiration NRC</label><input type="date" className={inputCls} value={form.dateExpirationNrc ?? ''} onChange={(e) => set('dateExpirationNrc', e.target.value)} /></div>
                <div><label className={labelCls}>NIS (N° identification statistique)</label><input type="text" className={inputCls} value={form.nis ?? ''} onChange={(e) => set('nis', e.target.value)} /></div>
                <div><label className={labelCls}>Article d'imposition</label><input type="text" className={inputCls} value={form.ai ?? ''} onChange={(e) => set('ai', e.target.value)} /></div>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-semibold">Légal & Régime fiscal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Date création entreprise</label><input type="date" className={inputCls} value={form.dateCreationEntreprise ?? ''} onChange={(e) => set('dateCreationEntreprise', e.target.value)} /></div>
                <div><label className={labelCls}>N° agrément / décision</label><input type="text" className={inputCls} value={form.numeroAgrement ?? ''} onChange={(e) => set('numeroAgrement', e.target.value)} /></div>
                <div>
                  <label className={labelCls}>Régime d'imposition</label>
                  <select className={inputCls} value={form.regimeImposition ?? ''} onChange={(e) => set('regimeImposition', e.target.value as RegimeImposition || null)}>
                    <option value="">— Sélectionner —</option>
                    {(Object.entries(REGIME_IMPOSITION_LABELS) as [RegimeImposition, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assujetti TVA</label>
                  <label className="flex cursor-pointer items-center gap-2 pt-2 text-sm">
                    <input type="checkbox" checked={form.assujettITva ?? false} onChange={(e) => set('assujettITva', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                    Assujetti à la TVA
                  </label>
                </div>
                {form.assujettITva && (
                  <div className="col-span-2"><label className={labelCls}>Numéro TVA</label><input type="text" className={inputCls} value={form.numeroTva ?? ''} onChange={(e) => set('numeroTva', e.target.value)} /></div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Identifiants fiscaux" icon={Shield}>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
                <div>
                  <dt className={labelCls}>NIF</dt>
                  <dd className="font-mono text-sm font-medium">{client.nif || <span className="text-muted-foreground font-normal">—</span>}</dd>
                  {client.dateExpirationNif && <p className="mt-0.5 text-[11px] text-muted-foreground">Expire : {client.dateExpirationNif}</p>}
                </div>
                <div>
                  <dt className={labelCls}>NRC</dt>
                  <dd className="font-mono text-sm font-medium">{client.rc || <span className="text-muted-foreground font-normal">—</span>}</dd>
                  {client.dateExpirationNrc && <p className="mt-0.5 text-[11px] text-muted-foreground">Expire : {client.dateExpirationNrc}</p>}
                </div>
                <div><dt className={labelCls}>NIS</dt><dd className="font-mono text-sm font-medium">{client.nis || <span className="text-muted-foreground font-normal">—</span>}</dd></div>
                <div><dt className={labelCls}>Article d'imposition</dt><dd className="font-mono text-sm font-medium">{client.ai || <span className="text-muted-foreground font-normal">—</span>}</dd></div>
              </dl>
            </SectionCard>
            <SectionCard title="Légal & Régime fiscal" icon={Building2}>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
                <Field label="Date création" value={client.dateCreationEntreprise} />
                <Field label="N° agrément" value={client.numeroAgrement} />
                <Field label="Régime d'imposition" value={client.regimeImposition ? REGIME_IMPOSITION_LABELS[client.regimeImposition] : null} />
                <div>
                  <dt className={labelCls}>TVA</dt>
                  <dd className="text-sm font-medium">{client.assujettITva ? <span className="text-emerald-700">Assujetti</span> : <span className="text-muted-foreground">Non assujetti</span>}</dd>
                  {client.assujettITva && client.numeroTva && <p className="mt-0.5 font-mono text-[12px] text-foreground">{client.numeroTva}</p>}
                </div>
              </dl>
            </SectionCard>
          </div>
        )
      )}

      {/* ── Banque ── */}
      {activeTab === 'banque' && (
        isEditing ? (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Banque domiciliataire</label><input type="text" className={inputCls} value={form.banqueClient ?? ''} onChange={(e) => set('banqueClient', e.target.value)} /></div>
              <div><label className={labelCls}>Agence bancaire</label><input type="text" className={inputCls} value={form.agenceBancaire ?? ''} onChange={(e) => set('agenceBancaire', e.target.value)} /></div>
              <div className="col-span-2"><label className={labelCls}>RIB / Numéro de compte</label><input type="text" className={inputCls} value={form.rib ?? ''} onChange={(e) => set('rib', e.target.value)} placeholder="XX XXXX XXXX XXXX XXXX XXXX XX" /></div>
            </div>
          </div>
        ) : (
          <SectionCard title="Informations bancaires" icon={Wallet}>
            <dl className="grid grid-cols-3 gap-x-8 gap-y-5">
              <Field label="Banque" value={client.banqueClient} />
              <Field label="Agence" value={client.agenceBancaire} />
              <Field label="RIB" value={client.rib} mono />
            </dl>
          </SectionCard>
        )
      )}

      {/* ── Factures ── */}
      {activeTab === 'factures' && (
        <div className="rounded-xl border border-border/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-[13px] font-semibold">Factures</h3>
            </div>
            <Link to="/facturation/nouvelle" className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
              Nouvelle facture <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-2"><FacturesTab clientId={client.id} /></div>
        </div>
      )}

      {/* ── Notes ── */}
      {activeTab === 'notes' && (
        isEditing ? (
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-[13px] font-semibold">Notes internes</label>
            <textarea
              className="h-40 w-full resize-none rounded-lg border border-border/60 bg-white p-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              value={form.notesInternes ?? ''}
              onChange={(e) => set('notesInternes', e.target.value)}
            />
          </div>
        ) : (
          <SectionCard title="Notes internes" icon={StickyNote}>
            {client.notesInternes
              ? <p className="whitespace-pre-wrap text-sm">{client.notesInternes}</p>
              : <p className="text-sm text-muted-foreground">Aucune note.</p>}
          </SectionCard>
        )
      )}
    </div>
  );
}
