import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Banknote, Calendar, GraduationCap, TrendingDown, TrendingUp, UserCheck, UserPlus, Users } from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { HotelListItem } from '@/shared/types/admin';
import type { RhDashboard } from '@/shared/types/rh';

export function RhDashboardTab() {
  const [data, setData] = useState<RhDashboard | null>(null);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hId = hotelId ? Number(hotelId) : undefined;
      const [dash, htls] = await Promise.all([
        ipcClient.rh.getDashboard(undefined, undefined, hId),
        ipcClient.hotels.list(),
      ]);
      setData(unwrapIpc(dash));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des indicateurs…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Aucune donnée de pilotage disponible.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dash-hotel">Unité</Label>
          <select
            id="dash-hotel"
            className="flex h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Toutes les unités</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground pb-2">
          Période : {data.periodeDebut} → {data.periodeFin}
          {data.hotelName && ` — ${data.hotelName}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Effectif actif" value={String(data.effectifActif)} icon={Users} accent="primary" />
        <KpiCard title="Recrutements en cours" value={String(data.recrutementsEnCours)} icon={UserPlus} accent="accent" />
        <KpiCard title="Manque d'effectif" value={String(data.manqueEffectifTotal)} icon={TrendingDown} accent="warning" />
        <KpiCard title="CDD ≤ 60 j" value={String(data.contratsEcheanceProche)} icon={AlertCircle} accent="danger" />
        <KpiCard title="Certif. ≤ 90 j" value={String(data.certificationsEcheanceProche)} icon={GraduationCap} accent="warning" />
        <KpiCard title="Entretiens 30 j" value={String(data.entretiensPlanifies)} icon={Calendar} accent="accent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Absences à valider" value={String(data.absencesEnAttente)} icon={AlertCircle} accent="warning" />
        <KpiCard title="Comptes en attente" value={String(data.comptesEnAttente)} icon={UserCheck} accent="gold" />
        <KpiCard title="Recettes / effectif" value={formatMoney(data.recettesParEffectif)} icon={TrendingUp} accent="success" />
        <KpiCard title="Turnover" value={`${data.tauxTurnover} %`} icon={Users} accent="danger" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Taux de présence" value={`${data.tauxPresence} %`} icon={UserCheck} accent="primary" />
        <KpiCard title="Taux d'absentéisme" value={`${data.tauxAbsenteisme} %`} icon={AlertCircle} accent="warning" />
        <KpiCard title="Masse salariale" value={formatMoney(data.masseSalariale)} subtitle="Brut + CNAS/IRG" icon={Banknote} accent="neutral" />
        <KpiCard title="Coût moyen / employé" value={formatMoney(data.coutMoyenEmploye)} icon={Banknote} accent="accent" />
      </div>

      {data.pointagesASoumettre > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.pointagesASoumettre} pointage(s) en attente de validation.
        </div>
      )}
      {data.manqueEffectifTotal > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {data.manqueEffectifTotal} poste(s) en sous-effectif selon l&apos;organisation. Consultez l&apos;onglet Organisation pour recruter.
        </div>
      )}
      {data.certificationsEcheanceProche > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.certificationsEcheanceProche} certification(s) à renouveler dans les 90 prochains jours.
        </div>
      )}
    </div>
  );
}
