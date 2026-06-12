import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClients, useClientsDashboard } from '@/hooks/useClients';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { TypeClient } from '@/shared/types/clients';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'h-9 rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', color)}>{value}</p>
          {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color.replace('text-', 'bg-').replace('-600', '-50').replace('-700', '-50'))}>
          <Icon className={cn('h-5 w-5', color)} />
        </span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientsListPage() {
  const navigate = useNavigate();
  const { data: dash } = useClientsDashboard();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeClient | ''>('');
  const [actifFilter, setActifFilter] = useState<'tous' | 'actifs' | 'inactifs'>('tous');

  const { items, loading, error, setFilters, toggleActif, remove } = useClients();

  const applyFilters = (s: string, t: TypeClient | '', a: 'tous' | 'actifs' | 'inactifs') => {
    setFilters({
      search: s || undefined,
      type: (t || undefined) as TypeClient | undefined,
      actif: a === 'actifs' ? true : a === 'inactifs' ? false : undefined,
    });
  };

  const handleSearch = (v: string) => { setSearch(v); applyFilters(v, typeFilter, actifFilter); };
  const handleType = (v: TypeClient | '') => { setTypeFilter(v); applyFilters(search, v, actifFilter); };
  const handleActif = (v: 'tous' | 'actifs' | 'inactifs') => { setActifFilter(v); applyFilters(search, typeFilter, v); };

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    try {
      await remove(id);
      setConfirmDelete(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur suppression');
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard icon={Users} label="Total clients" value={dash?.totalClients ?? '—'} color="text-primary" />
        <KpiCard icon={UserCheck} label="Clients actifs" value={dash?.clientsActifs ?? '—'} color="text-emerald-600" />
        <KpiCard icon={Building2} label="Entreprises" value={dash?.clientsEntreprises ?? '—'} color="text-blue-600" />
        <KpiCard icon={User} label="Particuliers" value={dash?.clientsParticuliers ?? '—'} color="text-violet-600" />
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Total facturé TTC</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{formatMoney(dash?.totalFactureTtc ?? 0)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">HT : {formatMoney(dash?.totalFactureHt ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-red-50/40 p-5 shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-red-500">Restant dû</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-destructive">{formatMoney(dash?.montantRestant ?? 0)}</p>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className={`${inputCls} pl-9 w-full`}
            placeholder="Nom, email, téléphone, NIF…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select className={inputCls} value={typeFilter} onChange={(e) => handleType(e.target.value as TypeClient | '')}>
          <option value="">Tous types</option>
          <option value="entreprise">Entreprises</option>
          <option value="particulier">Particuliers</option>
        </select>
        <select className={inputCls} value={actifFilter} onChange={(e) => handleActif(e.target.value as typeof actifFilter)}>
          <option value="tous">Tous statuts</option>
          <option value="actifs">Actifs</option>
          <option value="inactifs">Inactifs</option>
        </select>
        <Button onClick={() => void navigate('/clients/nouveau')} className="ml-auto gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
      </div>

      {deleteError && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{deleteError}</p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Aucun client trouvé</p>
            <p className="mt-1 text-xs text-muted-foreground">Ajoutez votre premier client</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Client</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Contact</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Localisation</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Factures</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Total TTC</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">Restant</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((c) => {
                  const displayName = c.type === 'entreprise'
                    ? (c.raisonSociale ?? c.nom)
                    : `${c.civilite ? `${c.civilite} ` : ''}${c.nom}${c.prenom ? ` ${c.prenom}` : ''}`;
                  const isDeleting = confirmDelete === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{displayName}</div>
                        <span className={cn(
                          'mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          c.type === 'entreprise'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-violet-50 text-violet-700',
                        )}>
                          {c.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                          {c.formeJuridique ? ` · ${c.formeJuridique}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.telephone && <div className="text-[12px]">{c.telephone}</div>}
                        {c.email && <div className="text-[12px]">{c.email}</div>}
                        {c.nif && <div className="text-[11px] text-slate-400">NIF: {c.nif}</div>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {c.ville && <span>{c.ville}</span>}
                        {c.ville && c.wilaya && ' — '}
                        {c.wilaya && <span>{c.wilaya}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                        {c.stats.nbFactures}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                        {formatMoney(c.stats.totalFactureTtc)}
                      </td>
                      <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums', c.stats.montantRestant > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {c.stats.montantRestant > 0 ? formatMoney(c.stats.montantRestant) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          c.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                        )}>
                          {c.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isDeleting ? (
                            <>
                              <button
                                onClick={() => void handleDelete(c.id)}
                                className="rounded px-2 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/10"
                              >Confirmer</button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="rounded px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-slate-100"
                              >Annuler</button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => void navigate(`/clients/${c.id}`)}
                                className="rounded px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/10"
                              >Voir</button>
                              <button
                                onClick={() => void toggleActif(c.id)}
                                className="rounded px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-slate-100"
                              >{c.actif ? 'Désactiver' : 'Activer'}</button>
                              <button
                                onClick={() => setConfirmDelete(c.id)}
                                className="rounded px-2 py-1 text-[12px] font-medium text-destructive/70 hover:bg-destructive/10"
                              >Supprimer</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-right text-[12px] text-muted-foreground">{items.length} client{items.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
