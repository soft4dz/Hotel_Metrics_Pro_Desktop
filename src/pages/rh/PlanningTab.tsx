import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2, Users } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { canManageRh } from '@/shared/permissions';
import type { HotelListItem } from '@/shared/types/admin';
import type {
  RhEmploye,
  RhEquipeMembre,
  RhPlanning,
  RhPlanningSynthese,
  RhPoste,
  RhSuggestionRenfort,
  ShiftPlanning,
} from '@/shared/types/rh';

const SHIFTS: { id: ShiftPlanning; label: string }[] = [
  { id: 'matin', label: 'Matin' },
  { id: 'jour', label: 'Journée' },
  { id: 'apres_midi', label: 'Après-midi' },
  { id: 'soir', label: 'Soir' },
  { id: 'nuit', label: 'Nuit' },
];

const SHIFT_LABELS: Record<ShiftPlanning, string> = Object.fromEntries(
  SHIFTS.map((s) => [s.id, s.label]),
) as Record<ShiftPlanning, string>;

function weekRange(anchor: string): { debut: string; fin: string } {
  const d = new Date(anchor + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const debut = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 6);
  const fin = d.toISOString().slice(0, 10);
  return { debut, fin };
}

export function PlanningTab() {
  const role = useAuthStore((s) => s.user?.role);
  const isRhManager = canManageRh(role);
  const [plannings, setPlannings] = useState<RhPlanning[]>([]);
  const [synthese, setSynthese] = useState<RhPlanningSynthese | null>(null);
  const [suggestions, setSuggestions] = useState<RhSuggestionRenfort[]>([]);
  const [equipes, setEquipes] = useState<RhEquipeMembre[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterHotelId, setFilterHotelId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEquipeForm, setShowEquipeForm] = useState(false);
  const [form, setForm] = useState({
    hotelId: '',
    employeId: '',
    posteId: '',
    date: new Date().toISOString().slice(0, 10),
    shift: 'jour' as ShiftPlanning,
  });
  const [equipeForm, setEquipeForm] = useState({ chefId: '', membreId: '', hotelId: '' });

  const periode = useMemo(() => weekRange(weekAnchor), [weekAnchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hotelId = filterHotelId ? Number(filterHotelId) : undefined;
      const [pls, syn, sug, emps, pts, htls, eq] = await Promise.all([
        ipcClient.rh.listPlannings({ hotelId, dateDebut: periode.debut, dateFin: periode.fin }),
        ipcClient.rh.getPlanningSynthese(periode.debut, periode.fin, hotelId),
        ipcClient.rh.getSuggestionsRenfort(85),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listPostes(),
        ipcClient.hotels.list(),
        isRhManager ? ipcClient.rh.listEquipes() : Promise.resolve({ success: true, data: [] }),
      ]);
      setPlannings(unwrapIpc(pls));
      setSynthese(unwrapIpc(syn));
      setSuggestions(unwrapIpc(sug));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPostes(unwrapIpc(pts));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
      if (isRhManager) setEquipes(unwrapIpc(eq as Awaited<ReturnType<typeof ipcClient.rh.listEquipes>>));
    } finally {
      setLoading(false);
    }
  }, [filterHotelId, periode.debut, periode.fin, isRhManager]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.hotelId || !form.employeId) return;
    try {
      unwrapIpc(
        await ipcClient.rh.createPlanning({
          hotelId: Number(form.hotelId),
          employeId: Number(form.employeId),
          posteId: form.posteId ? Number(form.posteId) : null,
          date: form.date,
          shift: form.shift,
        }),
      );
      setShowForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleDelete = async (pl: RhPlanning) => {
    if (!window.confirm(`Annuler le créneau de ${pl.employeNom} le ${pl.date} ?`)) return;
    try {
      unwrapIpc(await ipcClient.rh.deletePlanning(pl.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleRemoveEquipe = async (id: number) => {
    try {
      unwrapIpc(await ipcClient.rh.removeEquipeMembre(id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleAddEquipe = async () => {
    if (!equipeForm.chefId || !equipeForm.membreId) return;
    try {
      unwrapIpc(
        await ipcClient.rh.addEquipeMembre({
          chefEmployeId: Number(equipeForm.chefId),
          membreEmployeId: Number(equipeForm.membreId),
          hotelId: equipeForm.hotelId ? Number(equipeForm.hotelId) : null,
        }),
      );
      setShowEquipeForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const planningColumns: Column<RhPlanning>[] = [
    { key: 'date', header: 'Date', render: (p) => p.date },
    { key: 'employe', header: 'Employé', render: (p) => <span className="font-medium">{p.employeNom}</span> },
    { key: 'hotel', header: 'Unité', render: (p) => p.hotelName },
    { key: 'shift', header: 'Shift', render: (p) => SHIFT_LABELS[p.shift] },
    {
      key: 'horaires',
      header: 'Horaires',
      render: (p) => `${p.heureDebut ?? '—'} → ${p.heureFin ?? '—'}`,
    },
    {
      key: 'prevues',
      header: 'H. prévues',
      render: (p) => <span className="tabular-nums">{p.heuresPrevues} h</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button variant="ghost" size="icon" onClick={() => void handleDelete(p)}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
    },
  ];

  const syntheseColumns: Column<RhPlanningSynthese['lignes'][number]>[] = [
    { key: 'employe', header: 'Employé', render: (l) => l.employeNom },
    { key: 'prevues', header: 'Prévues', render: (l) => `${l.heuresPrevues} h` },
    { key: 'pointees', header: 'Pointées', render: (l) => `${l.heuresPointees} h` },
    {
      key: 'ecart',
      header: 'Écart',
      render: (l) => (
        <span className={l.ecart < 0 ? 'text-destructive font-medium' : l.ecart > 0 ? 'text-emerald-600' : ''}>
          {l.ecart > 0 ? `+${l.ecart}` : l.ecart} h
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.hotelId}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{s.hotelName}</p>
                <p>{s.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Semaine (date au sein de la semaine)</Label>
          <Input type="date" value={weekAnchor} onChange={(e) => setWeekAnchor(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label>Unité</Label>
          <select
            className="flex h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
            value={filterHotelId}
            onChange={(e) => setFilterHotelId(e.target.value)}
          >
            <option value="">Toutes</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground pb-2">
          Période : {periode.debut} → {periode.fin}
        </p>
        <Button className="ml-auto" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Créneau
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Unité</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.hotelId} onChange={(e) => setForm((f) => ({ ...f, hotelId: e.target.value }))}>
              <option value="">—</option>
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Employé</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.employeId} onChange={(e) => setForm((f) => ({ ...f, employeId: e.target.value }))}>
              <option value="">—</option>
              {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <Label>Poste</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.posteId} onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}>
              <option value="">—</option>
              {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label>Shift</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value as ShiftPlanning }))}>
              {SHIFTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <Button onClick={() => void handleCreate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {synthese && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">Synthèse prévu vs pointé</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Total prévu : <strong>{synthese.totalHeuresPrevues} h</strong></span>
            <span>Total pointé : <strong>{synthese.totalHeuresPointees} h</strong></span>
            <Badge variant={synthese.totalHeuresPointees >= synthese.totalHeuresPrevues ? 'success' : 'warning'}>
              Écart global : {Math.round((synthese.totalHeuresPointees - synthese.totalHeuresPrevues) * 100) / 100} h
            </Badge>
          </div>
          <DataTable
            columns={syntheseColumns}
            data={synthese.lignes}
            keyExtractor={(l) => l.employeId}
            emptyMessage="Aucune donnée sur cette période."
          />
        </div>
      )}

      <DataTable
        columns={planningColumns}
        data={plannings}
        keyExtractor={(p) => p.id}
        loading={loading}
        emptyMessage="Aucun créneau planifié cette semaine."
      />

      {isRhManager && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Équipes (chef → membres)
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowEquipeForm((v) => !v)}>
              Ajouter membre
            </Button>
          </div>
          {showEquipeForm && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Chef</Label>
                <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={equipeForm.chefId} onChange={(e) => setEquipeForm((f) => ({ ...f, chefId: e.target.value }))}>
                  <option value="">—</option>
                  {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div>
                <Label>Membre</Label>
                <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={equipeForm.membreId} onChange={(e) => setEquipeForm((f) => ({ ...f, membreId: e.target.value }))}>
                  <option value="">—</option>
                  {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleAddEquipe()}>Enregistrer</Button>
              </div>
            </div>
          )}
          <ul className="text-sm divide-y">
            {equipes.map((eq) => (
              <li key={eq.id} className="flex justify-between py-2">
                <span>{eq.chefNom} → {eq.membreNom}</span>
                <Button size="sm" variant="ghost" onClick={() => void handleRemoveEquipe(eq.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
            {equipes.length === 0 && <li className="py-2 text-muted-foreground">Aucune équipe définie.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
